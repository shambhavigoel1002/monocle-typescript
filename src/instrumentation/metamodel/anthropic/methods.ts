
export const config = [
  {
    package: "@anthropic-ai/sdk",
    object: "messages",
    method: "create",
    spanName: "anthropic.messages.create",
    // spanType: "workflow",
    output_processor: [require("./entities/inference.js").config]
    // spanHandler: new NonFrameworkSpanHandler()
  }
];
