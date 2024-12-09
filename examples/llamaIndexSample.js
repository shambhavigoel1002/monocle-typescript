const { setupMonocle } = require("../src")
const { BatchSpanProcessor, ConsoleSpanExporter } = require("@opentelemetry/sdk-trace-node")

setupMonocle(
  "llamaindex.app",
  [
    new BatchSpanProcessor(
      new ConsoleSpanExporter(),
      config = {
        scheduledDelayMillis: 1
      })
  ]
)

const fs = require("node:fs/promises")

const {
  Document,
  MetadataMode,
  VectorStoreIndex,
} = require("llamaindex")

async function main() {
  // Load essay from abramov.txt in Node
  const path = "node_modules/llamaindex/examples/abramov.txt";

  const essay = await fs.readFile(path, "utf-8");

  // Create Document object with essay
  const document = new Document({ text: essay, id_: path });

  // Split text and create embeddings. Store them in a VectorStoreIndex
  const index = await VectorStoreIndex.fromDocuments([document]);

  // Query the index
  const queryEngine = index.asQueryEngine();
  const { response, sourceNodes } = await queryEngine.query({
    query: "What did the author do in college?",
  });

  // Output response with sources
  console.log(response);

  if (sourceNodes) {
    sourceNodes.forEach((source, index) => {
      console.log(
        `\n${index}: Score: ${source.score} - ${source.node.getContent(MetadataMode.NONE).substring(0, 50)}...\n`,
      );
     
    });
  }
  setTimeout(() => {
    console.log("shutting exporter")
  }, 1000);

}

main().catch(console.error);