import { extractTeamsAiInfo } from "../../utils";

export const config = {
  type: "inference",
  attributes: [
    [
      {
        _comment: "provider type, name, deployment",
        attribute: "type",
        accessor: () => "teams.openai"
      },
      {
        attribute: "provider_name",
        accessor: () => "Microsoft Teams AI"
      },
      {
        attribute: "deployment",
        accessor: ({ args }) => {
          // Access PromptManager options (index 2)
          return (
            extractTeamsAiInfo(args[2], "_options.promptsFolder", "unknown")
              .split("/")
              .filter(Boolean)
              .pop() || "unknown"
          );
        }
      }
    ],
    [
      {
        _comment: "LLM Model",
        attribute: "name",
        accessor: ({ args }) => {
          // Attempt to extract model name from various possible locations
          return extractTeamsAiInfo(
            args[2],
            "_options.default_model",
            extractTeamsAiInfo(args[2], "_options.promptsFolder", "unknown")
              .split("/")
              .filter(Boolean)
              .pop()
          );
        }
      },
      {
        attribute: "is_streaming",
        accessor: ({ args }) => {
          // Access PromptManager options (index 2)
          return extractTeamsAiInfo(args[2], "_options.stream", false);
        }
      }
    ]
  ],
  events: [
    {
      name: "data.input",
      _comment: "input to Teams AI",
      attributes: [
        {
          _comment: "this is instruction to LLM",
          attribute: "input",
          accessor: ({ args }) => {
            // Access TurnContext (index 0)
            return extractTeamsAiInfo(
              args[0],
              "_activity.text",
              "No input found"
            );
          }
        }
      ]
    },

    {
      name: "data.output",
      _comment: "output from Teams AI",
      attributes: [
        {
          attribute: "response",
          accessor: ({ args }) => {
            // Log the arguments to help debug
            console.log("Arguments for response extraction:", args);

            // Placeholder response
            return "No response available"; // YET TO BE CHECKED
          }
        }
      ]
    },
    {
      name: "metadata",
      attributes: [
        {
          _comment: "metadata from Teams AI response",
          accessor: ({ args }) => {
            // Calculate latency based on available information
            const startTime = extractTeamsAiInfo(
              args[1],
              "_loadingPromise",
              Date.now()
            );
            const endTime = Date.now();

            // Estimate latency based on prompt manager options
            const promptTokens = extractTeamsAiInfo(
              args[2],
              "_options.max_conversation_history_tokens",
              0
            );

            const completionTokens = extractTeamsAiInfo(
              args[4],
              "config.completion.max_tokens",
              0
            );

            return {
              prompt_tokens: promptTokens,
              completion_tokens: completionTokens,
              total_tokens: promptTokens + completionTokens,
              latency_ms: endTime - startTime
            };
          }
        }
      ]
    }
  ]
};
