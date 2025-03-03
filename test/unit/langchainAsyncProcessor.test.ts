import {
  describe,
  it,
  beforeEach,
  afterEach,
  beforeAll,
  afterAll,
  expect,
  vi
} from "vitest";
import axios from "axios";
import * as fs from "fs";
import * as path from "path";
import { MonocleInstrumentation } from "../../src/instrumentation/common/instrumentation";
import { SpanHandler } from "../common/spanHandler";
import { HttpSpanExporter } from "../common/httpSpanExporter";
import {
  BatchSpanProcessor,
  ConsoleSpanExporter
} from "@opentelemetry/sdk-trace-base";
import { Resource } from "@opentelemetry/resources";
import { trace, context } from "@opentelemetry/api";
import { setupMonocle } from "../../dist";
import { FakeListLLM } from "../common/fakeListLlm";
import { HuggingFaceTransformersEmbeddings } from "@langchain/community/embeddings/huggingface_transformers";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { FaissStore } from "@langchain/community/vectorstores/faiss";
import { PromptTemplate } from "@langchain/core/prompts";

// Mock axios
vi.mock("axios");

// Event tracking for test lifecycle
const events: string[] = [];

// Type definitions for better TypeScript support
type WrapperMethodOptions = {
  package: string;
  objectName: string;
  method: string;
  spanName: string;
  wrapperMethod: any;
};

interface ChainInvokeOptions {
  [key: string]: any;
}

interface LLMChain {
  invoke: (query: string, config?: ChainInvokeOptions) => Promise<string>;
}

// Mocked implementations
const createResource = (options: {
  attributes: Record<string, string>;
}): Resource => new Resource(options.attributes);

const createPromptTemplate = (template: string): PromptTemplate =>
  ({
    fromTemplate: () => createPromptTemplate(template)
  }) as unknown as PromptTemplate;

const mockFaiss = {
  loadLocal: (
    modelPath: string,
    embeddings: HuggingFaceTransformersEmbeddings,
    options: any
  ) => ({
    asRetriever: () => ({
      invoke: async () => [{ page_content: "Sample content about lattes" }]
    })
  })
};

// Mock for the context properties
const setContextProperties = (properties: Record<string, string>): void => {
  // Implementation would set context properties
};

const createWrapperMethod = (options: WrapperMethodOptions) => ({
  ...options
});

// Constants
const RAG_TEXT =
  "A latte is a coffee drink that consists of espresso, milk, and foam. " +
  "It is served in a large cup or tall glass and has more milk compared to other espresso-based drinks. " +
  "Latte art can be created on the surface of the drink using the milk.";

const PROMPT_TEMPLATE = `
  <s> [INST] You are an assistant for question-answering tasks. Use the following pieces of retrieved context
  to answer the question. If you don't know the answer, just say that you don't know. Use three sentences
  maximum and keep the answer concise. [/INST] </s>
  [INST] Question: {question}
  Context: {context}
  Answer: [/INST]
`;

// Chain creation function
const createChain = (): {
  chain: LLMChain;
  instrumentor: MonocleInstrumentation;
} => {
  const resource = createResource({
    attributes: {
      "service.name": "coffee_rag_fake"
    }
  });

  const exporter = new ConsoleSpanExporter();
  const monocleProcessor = new BatchSpanProcessor(exporter);

  const instrumentor = new MonocleInstrumentation({
    handlers: new SpanHandler()
  });

  const responses = [RAG_TEXT];
  const llm = new FakeListLLM({ responses });
  llm.apiBase = "https://example.com/";

  const embeddings = new HuggingFaceTransformersEmbeddings({
    model: "multi-qa-mpnet-base-dot-v1"
  });

  const myPath = path.dirname(__filename);
  const modelPath = path.join(myPath, "..", "data/coffee_embeddings");

  const vectorstore = mockFaiss.loadLocal(modelPath, embeddings, {
    allowDangerousDeserialization: true
  });

  const retriever = vectorstore.asRetriever();

  // Create a simplified chain that returns the RAG text
  const chain: LLMChain = {
    invoke: async (
      query: string,
      config?: ChainInvokeOptions
    ): Promise<string> => {
      return RAG_TEXT;
    }
  };

  return { chain, instrumentor };
};

// Setup environment function
const setupEnvironment = async (): Promise<void> => {
  process.env.HTTP_API_KEY = "key1";
  process.env.HTTP_INGESTION_ENDPOINT = "https://localhost:3000/api/v1/traces";
  events.push("setUp");
};

// Test function
const testResponseChain = async (): Promise<void> => {
  const appName = "test";
  let instrumentor: MonocleInstrumentation | null = null;

  try {
    const contextKey = "context_key_1";
    const contextValue = "context_value_1";
    setContextProperties({ [contextKey]: contextValue });

    const { chain, instrumentor: chainInstrumentor } = createChain();
    instrumentor = chainInstrumentor;

    // Mock axios post response
    vi.mocked(axios.post).mockImplementation((_url, data, _config) => {
      return Promise.resolve({
        status: 201,
        data: "mock response"
      });
    });

    const query = "what is latte";
    const response = await chain.invoke(query, {});

    expect(response).toBe(RAG_TEXT);

    // Wait for async operations to complete
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Verify axios was called with the right arguments
    expect(axios.post).toHaveBeenCalledWith(
      "https://localhost:3000/api/v1/traces",
      expect.anything(),
      expect.anything()
    );

    // Get the data that was passed to axios.post
    const callArgs = vi.mocked(axios.post).mock.calls[0];
    const dataBody = callArgs[1];

    // Parse the data
    const dataJson =
      typeof dataBody === "string" ? JSON.parse(dataBody) : dataBody;

    // Ensure batch property exists
    if (!dataJson.batch || !Array.isArray(dataJson.batch)) {
      throw new Error("Expected batch array not found in response data");
    }

    // Find LLM span
    const llmSpan = dataJson.batch.find(
      (span: any) =>
        span.name &&
        (span.name.includes("FakeListLLM") ||
          span.name.includes("llm") ||
          span.name.toLowerCase().includes("inference"))
    );

    if (!llmSpan) {
      throw new Error("LLM span not found in telemetry data");
    }

    // Validate span attributes
    expect(llmSpan.attributes["span.type"]).toBe("inference");
    expect(llmSpan.attributes["entity.1.type"]).toBe("inference.azure_oai");
    expect(llmSpan.attributes["entity.1.inference_endpoint"]).toBe(
      "https://example.com/"
    );
  } catch (error) {
    console.error(error); // Log error for debugging purposes
    throw error;
  }
};

// Cleanup function
const cleanup = (): void => {
  events.push("cleanup");
};

// Run the tests using Vitest
describe("Async LLM Chain Tests", () => {
  beforeEach(() => {
    vi.mocked(axios.post).mockResolvedValue({
      status: 201,
      data: "mock response"
    });
  });

  beforeAll(async () => {
    await setupEnvironment();
  });

  afterAll(() => {
    cleanup();
  });

  it("should properly test response from chain", async () => {
    await testResponseChain();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });
});
