export const config = {
  type: "inference",
  attributes: [
    [
      {
        attribute: "name",
        accessor: function ({ args }) {
          if (args && args[0] && args[0].input && args[0].input.EndpointName) {
            return args[0].input.EndpointName;
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
            if (args && args[0] && args[0].input && args[0].input.Body) {
              try {
                const bodyContent = JSON.parse(args[0].input.Body);
                return [bodyContent.question || ""].filter(
                  (item) => item !== ""
                );
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
            let decodedResponse;
            const buffer = Buffer.from(data.response.Body);
            decodedResponse = buffer.toString();
            decodedResponse = JSON.parse(decodedResponse);
            return [decodedResponse.answer || JSON.stringify(decodedResponse)];
          }
        }
      ]
    }
  ]
};
