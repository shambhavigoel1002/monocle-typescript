import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import axios from "axios";
import { MonocleInstrumentation } from "../../src/instrumentation/common/instrumentation";
import { SpanHandler } from "../common/spanHandler";
import { HttpSpanExporter } from "../common/httpSpanExporter";
import { BatchSpanProcessor } from "@opentelemetry/sdk-trace-base";
import { Resource } from "@opentelemetry/resources";
import { trace, context } from "@opentelemetry/api";
import { SESSION_PROPERTIES_KEY } from "../common/constants";
import { setupMonocle } from "../../dist";
import { FakeListLLM } from "../common/fakeListLlm";
import { HuggingFaceTransformersEmbeddings } from "@langchain/community/embeddings/huggingface_transformers";
import * as path from "path";
import { StringOutputParser } from "@langchain/core/output_parsers";

import { PromptTemplate } from "@langchain/core/prompts";

// Mock FAISS implementation
class FAISS {
  static loadLocal(modelPath: string, embeddings: any, options: any) {
    return {
      asRetriever: () => ({
        invoke: vi
          .fn()
          .mockResolvedValue([{ page_content: "Test content about lattes" }])
      })
    };
  }
}

describe("RAG Chain Integration Test", () => {
  let instrumentor: MonocleInstrumentation;
  let processor: BatchSpanProcessor;
  let chain: any;
  let ragText = `A latte is a coffee drink that consists of espresso, milk, and foam.
    It is served in a large cup or tall glass and has more milk compared to other espresso-based drinks.
    Latte art can be created on the surface of the drink using the milk.`;

  beforeEach(() => {
    // Set up environment variables
    process.env.HTTP_API_KEY = "key1";
    process.env.HTTP_INGESTION_ENDPOINT =
      "https://localhost:3000/api/v1/traces";

    // Set up the trace provider
    const resource = new Resource({
      "service.name": "coffee_rag_fake"
    });

    const traceProvider = trace.getTracerProvider();
    const spanExporter = new HttpSpanExporter(
      "https://localhost:3000/api/v1/traces"
    );
    processor = new BatchSpanProcessor(spanExporter);

    // Mock the axios post method
    vi.spyOn(axios, "post").mockImplementation(async () => {
      return {
        status: 201,
        data: "mock response"
      };
    });
  });

  const formatDocs = (docs: any[]) => {
    return docs.map((doc) => doc.page_content).join("\n\n");
  };

  const createChain = () => {
    const tracerProvider = trace.getTracerProvider();
    instrumentor = new MonocleInstrumentation({ handlers: new SpanHandler() });
    // instrumentor.instrument();

    // Create the LLM and other components
    const responses = [ragText];
    const llm = new FakeListLLM({ responses });
    llm.apiBase = "https://example.com/";

    const embeddings = new HuggingFaceTransformersEmbeddings({
      model: "multi-qa-mpnet-base-dot-v1"
    });
    const myPath = path.resolve(__dirname);
    const modelPath = path.join(myPath, "..", "data/coffee_embeddings");

    const vectorstore = FAISS.loadLocal(modelPath, embeddings, {
      allowDangerousDeserialization: true
    });
    const retriever = vectorstore.asRetriever();

    // Create the prompt template
    const prompt = PromptTemplate.fromTemplate(`
      <s> [INST] You are an assistant for question-answering tasks. Use the following pieces of retrieved context
      to answer the question. If you don't know the answer, just say that you don't know. Use three sentences
      maximum and keep the answer concise. [/INST] </s>
      [INST] Question: {question}
      Context: {context}
      Answer: [/INST]
    `);

    // Create the chain
    const chain = {
      invoke: async (query: string, config: any) => {
        const context = await retriever.invoke(query);
        const formattedDocs = formatDocs(context);
        const promptInput = { question: query, context: formattedDocs };
        const promptOutput = prompt.format(promptInput);
        const llmOutput = await llm.invoke(promptOutput);
        return new StringOutputParser().parse(llmOutput);
      }
    };

    return chain;
  };

  it("should correctly process a RAG chain and send telemetry data", async () => {
    // Set up the test
    const appName = "test";
    const wrapMethod = vi.fn().mockReturnValue(3);

    setupMonocle({
      workflowName: appName,
      spanProcessors: [
        new BatchSpanProcessor(
          new HttpSpanExporter("https://localhost:3000/api/v1/traces")
        )
      ],
      wrapperMethods: [
        {
          package: "dummy_class",
          objectName: "DummyClass",
          method: "dummy_method",
          spanName: "langchain.workflow",
          wrapperMethod: wrapMethod
        }
      ]
    });

    // // Set context properties
    // const contextKey = "context_key_1";
    // const contextValue = "context_value_1";
    // setContextProperties({ [contextKey]: contextValue });

    // Create the chain
    chain = createChain();

    // Execute the query
    const query = "what is latte";
    const response = await chain.invoke(query, {});

    // Wait for the exporter to process spans
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Verify the response
    expect(response).toBe(ragText);
    await new Promise((resolve) => setTimeout(resolve, 6000));
    console.log(axios.post.call, "axios.post");
    // Verify the telemetry data
    expect(axios.post).toHaveBeenCalledWith(
      "https://localhost:3000/api/v1/traces"
    );

    // Get the data that was sent to the endpoint
    const postCall = (axios.post as any).mock.calls[0];
    const dataBodyStr = postCall[1];
    const dataJson = JSON.parse(dataBodyStr);

    // Find the root span and LLM span
    const rootSpan = dataJson.batch.find((x: any) => x.parent_id === "None");
    const llmSpan = dataJson.batch.find((x: any) =>
      x.name.includes("FakeListLLM")
    );

    // Verify span attributes
    expect(llmSpan.attributes["entity.1.inference_endpoint"]).toBe(
      "https://example.com/"
    );

    // Verify context properties were propagated
    const rootSpanAttributes = rootSpan.attributes;
    expect(rootSpanAttributes[`${SESSION_PROPERTIES_KEY}.${contextKey}`]).toBe(
      contextValue
    );

    // Verify span IDs don't start with "0x"
    for (const spanObject of dataJson.batch) {
      expect(spanObject.context.span_id.startsWith("0x")).toBe(false);
      expect(spanObject.context.trace_id.startsWith("0x")).toBe(false);
    }
  });

  afterEach(() => {
    // // Clean up
    // if (instrumentor) {
    //   instrumentor.uninstrument();
    // }
    vi.resetAllMocks();
  });
});
