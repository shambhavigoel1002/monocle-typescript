const { setupMonocle } = require("../../dist");
setupMonocle("anthropic.app");

const { Anthropic } = require("@anthropic-ai/sdk");
const client = new Anthropic();

async function main() {
  try {

    const message = await client.messages.create({
      max_tokens: 1024,
      messages: [{ role: "user", content: "What is coffee" }],
      model: "claude-3-5-sonnet-latest"
    });

    console.log("\nClaude Response Content:");
 
    console.log(message.content);
  } catch (error) {
    console.error("Error calling Anthropic API:", error);
  }
}

main();
