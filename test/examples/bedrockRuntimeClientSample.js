const { setupMonocle } = require("../../dist");

setupMonocle("bedrock.app");
const {
  BedrockRuntimeClient,
  InvokeModelCommand
} = require("@aws-sdk/client-bedrock-runtime");

async function invokeBedrockModel() {
  const client = new BedrockRuntimeClient({ region: "us-east-1" });

  const requestPayload = {
    prompt: "\n\nHuman: What is coffee?\n\nAssistant:",
    max_tokens_to_sample: 500,
    temperature: 0.7,
    top_k: 250,
    top_p: 0.999,
    stop_sequences: ["\n\nHuman:"]
  };
  const requestData = JSON.stringify(requestPayload);

  const command = new InvokeModelCommand({
    modelId: "anthropic.claude-v2",
    body: requestData,
    contentType: "application/json",
    accept: "application/json"
  });

  try {
    console.log("Invoking Bedrock model...");
    const response = await client.send(command);

    let decodedResponse;
    try {
      if (response.body) {
        const buffer = Buffer.from(response.body);
        decodedResponse = buffer.toString();
        decodedResponse = JSON.parse(decodedResponse);
      }
    } catch (e) {
      decodedResponse = "Error decoding response";
    }

    console.log("Bedrock Response:", {
      statusCode: response.$metadata.httpStatusCode,
      requestId: response.$metadata.requestId,
      payload: decodedResponse || "No payload"
    });

    return {
      command: {
        input: {
          modelId: "anthropic.claude-v2",
          body: requestData,
          contentType: "application/json",
          accept: "application/json"
        }
      },
      response: response
    };
  } catch (error) {
    console.error("Error invoking Bedrock model:", error);
    throw error;
  }
}

// Run the function
invokeBedrockModel().catch(console.error);
