export const config = {
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
        accessor: ({ args }) => {
          // Accessing PromptManager's options
          console.log("args in action planner:", args);
          const promptManager = args[2];
          return promptManager?._options?.max_repair_attempts ?? 3;
        }
      }
    ],
    [
      {
        _comment: "model configuration",
        attribute: "model",
        accessor: ({ args }) => {
          // Accessing PromptManager's options
          const promptManager = args[2];
          return promptManager?._options?.model?.constructor?.name ?? "unknown";
        }
      },
      {
        attribute: "tokenizer",
        accessor: ({ args }) => {
          // Using GPTTokenizer from args (index 3)
          const tokenizer = args[3];
          return tokenizer?.constructor?.name ?? "GPTTokenizer";
        }
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
            // Access config object (index 4)
            const config = args[4];
            return config?.name ?? "unknown";
          }
        },
        {
          attribute: "validator",
          accessor: () => {
            // Placeholder as we don't see validator in the provided args
            return "DefaultResponseValidator";
          }
        },
        {
          attribute: "memory_type",
          accessor: ({ args }) => {
            // Accessing TurnState's scopes
            const turnState = args[1];
            const memoryTypes = turnState?._scopes
              ? Object.keys(turnState._scopes).join(", ")
              : "unknown";
            return memoryTypes;
          }
        }
      ]
    },
    {
      name: "data.output",
      _comment: "output from ActionPlanner",
      attributes: [
        {
          attribute: "status",
          accessor: () => {
            // Placeholder as we don't see a status in the provided args
            return "unknown";
          }
        },
        {
          attribute: "response",
          accessor: () => {
            // Placeholder as we don't see a result in the provided args
            return "No response available";
          }
        }
      ]
    },
    {
      name: "metadata",
      attributes: [
        {
          _comment: "execution metadata",
          accessor: () => ({
            // Placeholders as we don't see these in the provided args
            latency_ms: 0,
            feedback_enabled: false
          })
        }
      ]
    }
  ]
};
