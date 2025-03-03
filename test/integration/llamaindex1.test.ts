// import { describe, it, expect, beforeAll } from "vitest";
// import { ChromaClient } from "chromadb";
// import * as path from "path";

// import { CustomConsoleSpanExporter } from "../common/custom_exporter";
// import { BatchSpanProcessor } from "@opentelemetry/sdk-trace-base";
// import {
//   OpenAIEmbedding,
//   SimpleDirectoryReader,
//   StorageContext,
//   storageContextFromDefaults,
//   VectorStoreIndex,
//   VectorStore
// } from "llamaindex";
// import { OpenAI, OpenAIAgent } from "@llamaindex/openai";
// import { ChromaVectorStore } from "llamaindex/vector_stores/chroma";
// import { setupMonocle } from "../../dist";
// import { exec } from "child_process";

// const customExporter = new CustomConsoleSpanExporter();
// let chromaProcess;
// beforeAll(async function () {
//   chromaProcess = exec("chroma run --host 127.0.0.1 --port 8000");
//   // Wait for server to start
//   await new Promise((resolve) => setTimeout(resolve, 3000));
//   setupMonocle({
//     workflowName: "llama_index_1",
//     spanProcessors: [new BatchSpanProcessor(customExporter)],
//     wrapperMethods: []
//   });
// });

// describe("Integration Test", function () {
//   it("test_llama_index_sample", async function () {
//     // Creating a Chroma client
//     // In your test or in the llamaIndexSample file
//     const chromaClient = new ChromaClient({ path: ":memory:" });
//     const chromaCollection = await chromaClient.createCollection({
//       name: "quickstart"
//     });

//     // Construct vector store
//     const vectorStore = new VectorStore({
//       chroma_collection: chromaCollection
//     });
//     const dirPath = path.dirname(__filename);
//     const documents = await new SimpleDirectoryReader(
//       path.join(dirPath, "..", "data")
//     ).load_data();

//     const embedModel = new OpenAIEmbedding({ model: "text-embedding-3-large" });
//     const storageContext = storageContextFromDefaults({
//       vectorStore
//     });
//     const index = await VectorStoreIndex.fromDocuments(documents);

//     const llm = new OpenAI({
//       temperature: 0.1,
//       model: "gpt-3.5-turbo-0125"
//     });

//     const queryEngine = index.asQueryEngine({ responseSynthesizer: llm });
//     const response = await queryEngine.query({
//       query: "What did the author do growing up?"
//     });

//     console.log(response);

//     const spans = customExporter.getCapturedSpans();
//     for (const span of spans) {
//       const spanAttributes = span.attributes;
//       if (spanAttributes["span.type"] === "retrieval") {
//         // Assertions for all retrieval attributes
//         expect(spanAttributes["entity.1.name"]).to.equal("ChromaVectorStore");
//         expect(spanAttributes["entity.1.type"]).to.equal(
//           "vectorstore.ChromaVectorStore"
//         );
//         expect(spanAttributes["entity.2.name"]).to.equal(
//           "text-embedding-3-large"
//         );
//         expect(spanAttributes["entity.2.type"]).to.equal(
//           "model.embedding.text-embedding-3-large"
//         );
//       }

//       if (spanAttributes["span.type"] === "inference") {
//         // Assertions for all inference attributes
//         expect(spanAttributes["entity.1.type"]).to.equal("inference.azure_oai");
//         expect(spanAttributes).to.have.property("entity.1.provider_name");
//         expect(spanAttributes).to.have.property("entity.1.inference_endpoint");
//         expect(spanAttributes["entity.2.name"]).to.equal("gpt-3.5-turbo-0125");
//         expect(spanAttributes["entity.2.type"]).to.equal(
//           "model.llm.gpt-3.5-turbo-0125"
//         );

//         // Assertions for metadata
//         const [spanMetadata] = span.events;
//         expect(spanMetadata.attributes).to.have.property("completion_tokens");
//         expect(spanMetadata.attributes).to.have.property("prompt_tokens");
//         expect(spanMetadata.attributes).to.have.property("total_tokens");
//       }

//       if (!span.parent && span.name === "llamaindex.query") {
//         // Root span
//         expect(spanAttributes["entity.1.name"]).to.equal("llama_index_1");
//         expect(spanAttributes["entity.1.type"]).to.equal("workflow.llamaindex");
//       }
//     }
//   });
// });
