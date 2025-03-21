export const config = {
  type: "retrieval",
  attributes: [
    [
      {
        _comment: "vector store name",
        attribute: "name",
        accessor: function ({ args }) {
          if (args && args[0] && args[0].input && args[0].input.collectionId) {
            return "BedrockKnowledgeBase";
          }
          return null;
        }
      },
      {
        attribute: "type",
        accessor: function ({ args }) {
          if (args && args[0] && args[0].input && args[0].input.collectionId) {
            return "vectorstore.BedrockKnowledgeBase";
          }
          return null;
        }
      },
      {
        attribute: "deployment",
        accessor: function ({ args }) {
          if (args && args[0] && args[0].input && args[0].input.collectionId) {
            return args[0].input.collectionId;
          }
          return "";
        }
      }
    ],
    [
      {
        _comment: "Embedding model name",
        attribute: "name",
        accessor: function ({ args }) {
          if (
            args &&
            args[0] &&
            args[0].input &&
            args[0].input.embeddingModelId
          ) {
            return args[0].input.embeddingModelId;
          }
          // Default model if not explicitly specified
          return "amazon.titan-embed-text-v1";
        }
      },
      {
        _comment: "Embedding model type",
        attribute: "type",
        accessor: function ({ args }) {
          if (
            args &&
            args[0] &&
            args[0].input &&
            args[0].input.embeddingModelId
          ) {
            return "model.embedding." + args[0].input.embeddingModelId;
          }
          return "model.embedding.amazon.titan-embed-text-v1";
        }
      }
    ]
  ],
  events: [
    {
      name: "data.input",
      attributes: [
        {
          _comment: "this is query to retrieval system",
          attribute: "input",
          accessor: function ({ args }) {
            if (args && args[0] && args[0].input) {
              if (args[0].input.text) {
                return args[0].input.text;
              }
              if (
                args[0].input.retrievalQuery &&
                args[0].input.retrievalQuery.text
              ) {
                return args[0].input.retrievalQuery.text;
              }
              // Try to parse the body if it's a string
              if (args[0].input.body) {
                try {
                  const bodyContent = JSON.parse(args[0].input.body);
                  if (
                    bodyContent.retrievalQuery &&
                    bodyContent.retrievalQuery.text
                  ) {
                    return bodyContent.retrievalQuery.text;
                  }
                  if (bodyContent.text) {
                    return bodyContent.text;
                  }
                } catch (e) {
                  console.error("Error parsing input body:", e);
                }
              }
            }
            return "";
          }
        }
      ]
    },
    {
      name: "data.output",
      attributes: [
        {
          _comment: "this is response from retrieval",
          attribute: "response",
          accessor: function ({ response }) {
            if (!response || !response.body) return "No response data";

            try {
              const buffer = Buffer.from(response.body);
              const decodedResponse = buffer.toString();
              const parsedResponse = JSON.parse(decodedResponse);

              if (parsedResponse.retrievalResults) {
                // Extract passages from the retrieval results
                const passages = parsedResponse.retrievalResults.map(
                  (result) => {
                    if (result.content && result.content.text) {
                      return result.content.text;
                    }
                    return JSON.stringify(result);
                  }
                );
                return passages.join("\n\n");
              }

              return JSON.stringify(parsedResponse);
            } catch (e) {
              console.error("Error parsing retrieval response:", e);
              return "Error parsing retrieval response";
            }
          }
        }
      ]
    }
  ]
};
