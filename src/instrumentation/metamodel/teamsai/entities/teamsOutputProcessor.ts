export const TEAMSAI_OUTPUT_PROCESSOR = {
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
        accessor: ({ args }) =>
          args.instance?._options?.default_model || "unknown"
      }
    ],
    [
      {
        _comment: "LLM Model",
        attribute: "name",
        accessor: ({ args }) =>
          args.instance?._options?.default_model || "unknown"
      },
      {
        attribute: "is_streaming",
        accessor: ({ args }) => args.instance?._options?.stream || false
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
            console.log("args", args, "THIS IS THE ARGS BY MONOCLE");
            return args;
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
            if (args.result?.message?.content !== undefined) {
              return args.result.message.content;
            }
            return String(args.result || "");
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
            const usage = args.result?.usage || {};
            return {
              prompt_tokens: usage.prompt_tokens || 0,
              completion_tokens: usage.completion_tokens || 0,
              total_tokens: usage.total_tokens || 0,
              latency_ms: args.latency_ms || 0
            };
          }
        }
      ]
    }
  ]
};
