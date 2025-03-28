export const ACTIONPLANNER_OUTPUT_PROCESSOR = {
  type: "inference",
  attributes: [
    [
      {
        _comment: "planner type and configuration",
        attribute: "type",
        accessor: () => "teams.planner"
      },
      {
        attribute: "planner_type",
        accessor: () => "ActionPlanner"
      },
      {
        attribute: "max_repair_attempts",
        accessor: ({ args }) => args.instance?.max_repair_attempts ?? 3
      }
    ],
    [
      {
        _comment: "model configuration",
        attribute: "model",
        accessor: ({ args }) => args.instance?.constructor?.name ?? "unknown"
      },
      {
        attribute: "tokenizer",
        accessor: ({ args }) =>
          args.instance?.tokenizer?.constructor?.name ?? "GPTTokenizer"
      }
    ]
  ],
  events: [
    {
      name: "data.input",
      _comment: "input configuration to ActionPlanner",
      attributes: [
        {
          attribute: "prompt_name",
          accessor: ({ args }) => {
            // Implement prompt info capture logic
            // This might need a custom helper function similar to Python
            return args.kwargs?.prompt_name ?? "unknown";
          }
        },
        {
          attribute: "validator",
          accessor: ({ args }) =>
            args.kwargs?.validator?.constructor?.name ??
            "DefaultResponseValidator"
        },
        {
          attribute: "memory_type",
          accessor: ({ args }) =>
            args.kwargs?.memory?.constructor?.name ?? "unknown"
        }
      ]
    },
    {
      name: "data.output",
      _comment: "output from ActionPlanner",
      attributes: [
        {
          attribute: "status",
          accessor: ({ args }) => args.result?.status ?? "unknown"
        },
        {
          attribute: "error",
          accessor: ({ args }) => args.result?.error ?? null
        },
        {
          attribute: "response",
          accessor: ({ args }) => {
            if (args.result?.message?.content) {
              return args.result.message.content;
            }
            return String(args.result ?? "");
          }
        }
      ]
    },
    {
      name: "metadata",
      attributes: [
        {
          _comment: "execution metadata",
          accessor: ({ args }) => ({
            latency_ms: args.latency_ms,
            feedback_enabled: args.instance?._enable_feedback_loop ?? false
          })
        }
      ]
    }
  ]
};
