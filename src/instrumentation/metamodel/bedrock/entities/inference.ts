export const config = {
  type: "inference",
  attributes: [
    [
      {
        attribute: "name",
        accessor: function ({ args }) {
          if (args && args[0] && args[0].input) {
            return args[0].input.modelId;
          }
          return null;
        }
      },
      {
        attribute: "type",
        accessor: function ({ args }) {
          if (args && args[0] && args[0].input && args[0].input.modelId) {
            return "model.llm." + args[0].input.modelId;
          }
          return null;
        }
      }
    ]
  ],

  events: [
    {
      name: "data.input",
      attributes: [
        {
          _comment: "this is input to LLM",
          attribute: "input",
          accessor: function ({ args }) {
            if (args && args[0] && args[0].input && args[0].input.body) {
              try {
                const bodyContent = JSON.parse(args[0].input.body);
                if (bodyContent.prompt) {
                  const match = bodyContent.prompt.match(
                    /Human: (.*?)\n\nAssistant:/s
                  );
                  if (match && match[1]) {
                    return [match[1]];
                  }
                  return [bodyContent.prompt]; // Return full prompt if can't extract
                }

                if (bodyContent.inputText) {
                  return [bodyContent.inputText];
                }

                return [JSON.stringify(bodyContent)];
              } catch (e) {
                console.error("Error parsing input body:", e);
                return [];
              }
            }
            return [];
          }
        }
      ]
    },
    {
      name: "data.output",
      attributes: [
        {
          _comment: "this is response from LLM",
          attribute: "response",
          accessor: function (data) {
            if (data && data.response && data.response.body) {
              try {
                const buffer = Buffer.from(data.response.body);
                const decodedResponse = buffer.toString();
                const parsedResponse = JSON.parse(decodedResponse);

                if (parsedResponse.completion) {
                  return [parsedResponse.completion.trim()];
                }

                return [JSON.stringify(parsedResponse)];
              } catch (e) {
                console.error("Error parsing response:", e);
                return ["Error parsing response"];
              }
            }
            return ["No response data"];
          }
        }
      ]
    }
  ]
};
