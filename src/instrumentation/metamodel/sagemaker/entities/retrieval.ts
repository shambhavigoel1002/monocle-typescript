export const config = {
  type: "retrieval",
  attributes: [
    [
      {
        _comment: "SageMaker retrieval store name",
        attribute: "name",
        accessor: function ({ instance }) {
          //   console.log("instance", instance);
          return (
            instance?.endpointName ||
            instance?.featureGroupName ||
            "sagemaker-retrieval"
          );
        }
      },
      {
        attribute: "type",
        accessor: function ({ instance }) {
          // Determine if this is a feature store, vector endpoint, etc.
          if (instance?.featureGroupName) {
            return "sagemaker.featurestore";
          }
          if (
            instance?.endpointName &&
            instance?.endpointConfig?.includes("vector")
          ) {
            return "sagemaker.vectorendpoint";
          }
          return "sagemaker.endpoint";
        }
      },
      {
        attribute: "deployment",
        accessor: function ({ instance }) {
          // Extract region and other deployment info
          return instance?.region || instance?.awsRegion || "";
        }
      }
    ],
    [
      {
        _comment: "Embedding model details if using SageMaker for embeddings",
        attribute: "name",
        accessor: function ({ instance }) {
          return instance?.modelName || instance?.modelId || "";
        }
      },
      {
        _comment: "Embedding model type",
        attribute: "type",
        accessor: function ({ instance }) {
          // Try to determine the model type
          const modelName = instance?.modelName || instance?.modelId || "";
          if (modelName.includes("embedding")) {
            return "model.embedding." + modelName;
          }
          return "model.sagemaker." + modelName;
        }
      }
    ]
  ],
  events: [
    {
      name: "data.input",
      attributes: [
        {
          _comment: "query or input to SageMaker",
          attribute: "input",
          accessor: function ({ args }) {
            // Extract the query from invoke payload or other method arguments
            if (args[0] && args[0].Body) {
              // For SageMaker invoke endpoint
              return JSON.parse(args[0].Body.toString());
            }
            if (args[0] && args[0].QueryConfig) {
              // For SageMaker feature store query
              return args[0].QueryConfig;
            }
            return args[0];
          }
        },
        {
          _comment: "metadata about request",
          attribute: "request_metadata",
          accessor: function ({ instance, args }) {
            return {
              region: instance?.region || args[0]?.region,
              requestId: args[0]?.requestId || null,
              timestamp: new Date().toISOString()
            };
          }
        }
      ]
    },
    {
      name: "data.output",
      attributes: [
        {
          _comment: "response from SageMaker",
          attribute: "response",
          accessor: function (data) {
            let decodedResponse;
            const buffer = Buffer.from(data.response.Body);
            decodedResponse = buffer.toString();
            decodedResponse = JSON.parse(decodedResponse);
            return [decodedResponse.answer || JSON.stringify(decodedResponse)];
          }
        },
        {
          _comment: "performance metrics",
          attribute: "metrics",
          accessor: function ({ response }) {
            return {
              latency: response?.ResponseMetadata?.RequestLatency || null,
              statusCode: response?.ResponseMetadata?.HTTPStatusCode || 200,
              bytesProcessed: response?.Body ? response.Body.length : null
            };
          }
        }
      ]
    }
  ]
};
