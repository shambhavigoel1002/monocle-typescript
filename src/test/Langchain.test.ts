const { setupMonocle } = require("../instrumentation/common/instrumentation");
const { ChatOpenAI, OpenAIEmbeddings } = require("@langchain/openai");
// const { formatDocumentsAsString } = require("langchain/util/document");
const { PromptTemplate } = require("@langchain/core/prompts");
const { MemoryVectorStore } = require("langchain/vectorstores/memory");
// const {
//   RunnableSequence,
//   RunnablePassthrough
// } = require("@langchain/core/runnables");
// const { StringOutputParser } = require("@langchain/core/output_parsers");
import { OpenAI } from "@langchain/openai";

// Mock all external dependencies
jest.mock("@langchain/openai");
jest.mock("langchain/vectorstores/memory");
jest.mock("@opentelemetry/api");
jest.mock("@opentelemetry/resources");
jest.mock("@opentelemetry/context-async-hooks");
jest.mock("@opentelemetry/sdk-trace-node");

describe("Monocle LangChain Integration", () => {
  // Capture exported spans
  let exportedSpans = [];

  // Mock span exporter
  const mockExporter = {
    export: jest.fn((spans) => {
      exportedSpans = exportedSpans.concat(spans);
      return { code: 0 };
    }),
    shutdown: jest.fn(),
    forceFlush: jest.fn()
  };

  // Mock responses
  const mockChatResponse = "Coffee is a popular caffeinated beverage.";
  const mockEmbeddingResponse = [0.1, 0.2, 0.3];
  const mockDocuments = [
    {
      pageContent:
        "Coffee is a beverage brewed from roasted, ground coffee beans.",
      metadata: { id: 1 }
    }
  ];

  beforeEach(() => {
    exportedSpans = [];
    jest.clearAllMocks();

    // Mock ChatOpenAI
    ChatOpenAI.mockImplementation(() => ({
      invoke: jest.fn().mockResolvedValue(mockChatResponse),
      constructor: { name: "ChatOpenAI" },
      model: "gpt-3.5-turbo"
    }));

    // Mock OpenAIEmbeddings
    OpenAIEmbeddings.mockImplementation(() => ({
      embedQuery: jest.fn().mockResolvedValue(mockEmbeddingResponse),
      constructor: { name: "OpenAIEmbeddings" },
      model: "text-embedding-ada-002"
    }));
    const mockRetrieverRunnable = {
      invoke: jest.fn().mockResolvedValue(mockDocuments),
      pipe: jest.fn().mockImplementation((transform) => ({
        invoke: async (input) => {
          const docs = await mockRetrieverRunnable.invoke(input);
          return transform(docs);
        }
      }))
    };

    // Mock MemoryVectorStore
    MemoryVectorStore.fromTexts = jest.fn().mockResolvedValue({
      asRetriever: () => ({
        ...mockRetrieverRunnable,
        getRelevantDocuments: jest.fn().mockResolvedValue(mockDocuments),
        constructor: { name: "MemoryVectorStore" },
        vectorStore: {
          embeddings: { model: "text-embedding-ada-002" },
          constructor: { name: "MemoryVectorStore" }
        }
      })
    });
  });

  test("should create and export spans for LangChain operations", async () => {
    // Setup Monocle with our mock exporter
    setupMonocle("langchain.test", [mockExporter]);

    const langchainInvoke = async () => {
      //   const model = new ChatOpenAI({});
      //   const text =
      //     "Coffee is a beverage brewed from roasted, ground coffee beans.";
      //   const vectorStore = await MemoryVectorStore.fromTexts(
      //     [text],
      //     [{ id: 1 }],
      //     new OpenAIEmbeddings()
      //   );
      //   const retriever = vectorStore.asRetriever();

      const prompt = new PromptTemplate({
        template: "How to say {input} in {output_language}:\n",
        inputVariables: ["input", "output_language"]
      });
      const llm = new OpenAI({
        model: "gpt-3.5-turbo-instruct",
        temperature: 0,
        maxTokens: undefined,
        timeout: undefined,
        maxRetries: 2,
        apiKey: process.env.OPENAI_API_KEY
        // other params...
      });
      const inputText = "OpenAI is an AI company that ";

      const completion = await llm.invoke(inputText);
      completion;
      const chain = prompt.pipe(llm);
      const res = await chain.invoke({
        input: "I love programming.",
        output_language: "German"
      });

      return res;
    };

    // Execute the LangChain flow
    const result = await langchainInvoke();

    // Verify the result
    expect(result).toBe(mockChatResponse);

    // Wait for spans to be exported
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Verify spans were exported
    expect(exportedSpans.length).toBeGreaterThan(0);

    // Verify specific spans were created
    const spanTypes = exportedSpans
      .map((span) => span.attributes?.type)
      .filter(Boolean);

    // Check for inference spans
    expect(spanTypes).toContain("inference.openai");

    // Check for retrieval spans
    expect(spanTypes).toContain("vectorstore.MemoryVectorStore");

    // Check for sequence spans
    expect(spanTypes).toContain("langchain.sequence");

    // Verify span attributes for ChatOpenAI
    const chatSpan = exportedSpans.find(
      (span) => span.attributes?.type === "inference.openai"
    );
    expect(chatSpan).toBeTruthy();
    expect(chatSpan.attributes?.name).toBe("gpt-3.5-turbo");

    // Verify span attributes for Retriever
    const retrievalSpan = exportedSpans.find(
      (span) => span.attributes?.type === "vectorstore.MemoryVectorStore"
    );
    expect(retrievalSpan).toBeTruthy();
    expect(retrievalSpan.attributes?.["vector store type"]).toBe(
      "vectorstore.MemoryVectorStore"
    );

    // Verify events
    const events = exportedSpans.flatMap((span) => span.events || []);
    expect(events.some((event) => event.name === "data.input")).toBeTruthy();
    expect(events.some((event) => event.name === "data.output")).toBeTruthy();

    // Verify exporter was called
    expect(mockExporter.export).toHaveBeenCalled();
  });
});
