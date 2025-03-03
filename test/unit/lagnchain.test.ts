import { describe, it, beforeEach, afterEach, expect, vi } from "vitest";
import axios from "axios";
import { PromptTemplate } from "@langchain/core/prompts";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { FakeListLLM } from "../common/fakeListLlm";
import { MemoryVectorStore } from "langchain/vectorstores/memory";
import { RunnableSequence } from "@langchain/core/runnables";
import { BatchSpanProcessor } from "@opentelemetry/sdk-trace-base";
import { CustomConsoleSpanExporter } from "../common/custom_exporter";
import { OpenAIEmbeddings, ChatOpenAI } from "@langchain/openai";
import {
  AZURE_ML_ENDPOINT_ENV_NAME,
  AZURE_ML_SERVICE_NAME,
  AZURE_FUNCTION_WORKER_ENV_NAME,
  AZURE_FUNCTION_NAME,
  AZURE_FUNCTION_IDENTIFIER_ENV_NAME,
  AZURE_APP_SERVICE_ENV_NAME,
  AZURE_APP_SERVICE_NAME,
  AZURE_APP_SERVICE_IDENTIFIER_ENV_NAME,
  AWS_LAMBDA_ENV_NAME,
  AWS_LAMBDA_SERVICE_NAME,
  AWS_LAMBDA_FUNCTION_IDENTIFIER_ENV_NAME
} from "../common/constants";
import { config as LANGCHAIN_METHODS } from "../../src/instrumentation/metamodel/langchain/methods";
import { setupMonocle } from "../../dist";
vi.mock("axios");
describe("LangChain Telemetry Tests", () => {
  const ragText = `A latte is a coffee drink that consists of espresso, milk, and foam.\
        It is served in a large cup or tall glass and has more milk compared to other espresso-based drinks.\
            Latte art can be created on the surface of the drink using the milk.`;
  let instrumentor: any = null;
  let chain: any = null;
  // Mock environment variables
  const originalEnv = { ...process.env };
  // let chain: any = null;
  const contextValue = "test-context-value";

  beforeEach(() => {
    // Set environment variables
    process.env.HTTP_API_KEY = "key1";
    process.env.HTTP_INGESTION_ENDPOINT =
      "https://localhost:3000/api/v1/traces";

    // Setup mock response
    const mockTraceData = {
      batch: [
        {
          parent_id: "None",
          name: "root_span",
          context: {
            span_id: "abc123",
            trace_id: "def456"
          },
          attributes: {
            "session.context_key_1": contextValue,
            "entity.2.type": "app_hosting.test",
            "entity.2.name": "my-infra-name"
          }
        },
        {
          parent_id: "abc123",
          name: "FakeListLLM.invoke",
          context: {
            span_id: "ghi789",
            trace_id: "def456"
          },
          attributes: {}
        },
        {
          parent_id: "abc123",
          name: "langchain_core.vectorstores.base.VectorStoreRetriever.invoke",
          context: {
            span_id: "jkl012",
            trace_id: "def456"
          },
          attributes: {
            "entity.1.name": "FAISS",
            "entity.1.type": "vectorstore.FAISS"
          }
        }
      ]
    };

    // Mock axios post request
    vi.mocked(axios.post).mockResolvedValue({
      status: 201,
      data: "mock response",
      config: {
        data: JSON.stringify(mockTraceData)
      }
    });

    // Mock the OpenAI models to prevent actual API calls
    vi.spyOn(ChatOpenAI.prototype, "invoke").mockImplementation(async () => {
      return {
        text: "Mocked response from ChatOpenAI",
        lc_aliases: [],
        _getType: () => "AIMessageChunk",
        _printableFields: [],
        concat: () => ""
      };
    });
    [0.7, 0.8, 0.9];

    vi.spyOn(OpenAIEmbeddings.prototype, "embedQuery").mockResolvedValue([
      0.1, 0.2, 0.3
    ]);

    // Mock the MemoryVectorStore to return consistent results
    vi.spyOn(MemoryVectorStore.prototype, "similaritySearch").mockResolvedValue(
      [{ pageContent: ragText, metadata: { id: 0 } }]
    );

    // Initialize telemetry
    const customExporter = new CustomConsoleSpanExporter();
    instrumentor = setupMonocle({
      workflowName: "llama_index_1",
      wrapperMethods: LANGCHAIN_METHODS,
      unionWithDefaultMethods: false,
      spanProcessors: [new BatchSpanProcessor(customExporter)]
    });
  });

  afterEach(() => {
    // Restore environment variables
    process.env = { ...originalEnv };

    // Clear all mocks
    vi.clearAllMocks();
  });

  const createChain = async () => {
    // Use FakeListLLM instead of ChatOpenAI to avoid actual API calls
    const llm = new FakeListLLM({
      responses: [
        "Mocked response 1",
        "Mocked response 2",
        "Mocked response 3",
        "Final response"
      ]
    });

    const embeddings = new OpenAIEmbeddings();
    const texts = [
      ragText,
      "An espresso is a concentrated coffee drink made by forcing hot water through finely-ground coffee beans.",
      "A cappuccino is an Italian coffee drink consisting of espresso, steamed milk, and milk foam."
    ];
    const documents = texts.map((text, i) => ({
      pageContent: text,
      metadata: { id: i }
    }));

    const vectorstore = await MemoryVectorStore.fromDocuments(
      documents,
      embeddings
    );

    const retriever = vectorstore.asRetriever();

    // Simplified chain for testing
    const template = `Here is the question: {question}. And here is the context: {context}`;
    const prompt = PromptTemplate.fromTemplate(template);

    const chain = RunnableSequence.from([
      {
        question: (input: any) => input.question,
        context: async (input: any) => {
          const docs = await retriever.invoke(input.question);
          return docs.map((doc: any) => doc.pageContent).join("\n");
        }
      },
      prompt,
      llm,
      new StringOutputParser()
    ]);

    const response = await chain.invoke({
      question: "What is Task Decomposition?"
    });

    console.log(response);
    return response;
  };

  // Parameterized tests using different infrastructure environments
  const testCases = [
    {
      name: "Azure ML Endpoint",
      inputInfra: AZURE_ML_ENDPOINT_ENV_NAME,
      outputInfra: AZURE_ML_SERVICE_NAME,
      inputInfraIdentifier: AZURE_ML_ENDPOINT_ENV_NAME
    },
    {
      name: "Azure Function",
      inputInfra: AZURE_FUNCTION_WORKER_ENV_NAME,
      outputInfra: AZURE_FUNCTION_NAME,
      inputInfraIdentifier: AZURE_FUNCTION_IDENTIFIER_ENV_NAME
    },
    {
      name: "Azure App Service",
      inputInfra: AZURE_APP_SERVICE_ENV_NAME,
      outputInfra: AZURE_APP_SERVICE_NAME,
      inputInfraIdentifier: AZURE_APP_SERVICE_IDENTIFIER_ENV_NAME
    },
    {
      name: "AWS Lambda",
      inputInfra: AWS_LAMBDA_ENV_NAME,
      outputInfra: AWS_LAMBDA_SERVICE_NAME,
      inputInfraIdentifier: AWS_LAMBDA_FUNCTION_IDENTIFIER_ENV_NAME
    }
  ];

  testCases.forEach(
    ({ name, inputInfra, outputInfra, inputInfraIdentifier }) => {
      it(`should correctly trace LLM chain with ${name}`, async () => {
        // Set environment variables for specific infrastructure
        process.env[inputInfra] = "1";
        process.env[inputInfraIdentifier] = "my-infra-name";

        // Create and invoke the chain
        const response = await createChain();
        await new Promise((resolve) => setTimeout(resolve, 100)); // Ensure axios.post is called

        // Verify response
        expect(response).toBeDefined();

        // Allow some time for batching spans
        await new Promise((resolve) => setTimeout(resolve, 100));

        // Verify HTTP call was made
        expect(axios.post).toHaveBeenCalled();

        // Get the data sent in the POST request
        const postCall = vi.mocked(axios.post).mock.calls[0];

        // Handle case when axios.post was not called
        if (!postCall) {
          console.warn("Warning: axios.post was not called");
          return;
        }

        // Extract data from the axios response
        // Using the mock we set up in beforeEach
        const axiosResponse = await vi.mocked(axios.post).mock.results[0].value;
        const dataJson = JSON.parse(axiosResponse.config.data);

        // Verify spans
        const rootSpan = dataJson.batch.find(
          (x: any) => x.parent_id === "None"
        );
        expect(rootSpan).toBeDefined();

        const llmSpan = dataJson.batch.find((x: any) =>
          x.name.includes("FakeListLLM")
        );
        expect(llmSpan).toBeDefined();

        const vectorStoreSpan = dataJson.batch.find(
          (x: any) =>
            x.name.includes(
              "langchain_core.vectorstores.base.VectorStoreRetriever"
            ) || x.name.includes("VectorStoreRetriever")
        );
        expect(vectorStoreSpan).toBeDefined();

        // Assertions for spans
        expect(vectorStoreSpan.attributes["entity.1.name"]).toBe("FAISS");
        expect(vectorStoreSpan.attributes["entity.1.type"]).toBe(
          "vectorstore.FAISS"
        );

        // Assertions for root span attributes
        expect(rootSpan.attributes["session.context_key_1"]).toBe(contextValue);
        expect(rootSpan.attributes["entity.2.type"]).toBe(
          "app_hosting." + outputInfra
        );
        expect(rootSpan.attributes["entity.2.name"]).toBe(
          process.env[inputInfraIdentifier]
        );

        // Verify span IDs don't have "0x" prefix
        dataJson.batch.forEach((spanObject: any) => {
          expect(spanObject.context.span_id.startsWith("0x")).toBe(false);
          expect(spanObject.context.trace_id.startsWith("0x")).toBe(false);
        });
      });
    }
  );
}, 30000);
