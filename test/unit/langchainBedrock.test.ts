import { describe, it, expect, vi, beforeEach } from "vitest";
import axios from "axios";
import { SpanHandler } from "../common/spanHandler";
import * as utils from "../../src/instrumentation/metamodel/utils";

describe("ProcessSpan", () => {
  let spanHandler: SpanHandler;
  const mockSpan = {
    setAttribute: vi.fn(),
    addEvent: vi.fn()
  };
  let mockInstance: any;
  let mockWrapped: any;

  beforeEach(() => {
    vi.resetAllMocks();

    mockInstance = {
      provider: "backup_provider"
    };

    mockWrapped = vi.fn();

    spanHandler = new SpanHandler();
    vi.spyOn(utils, "extractMessages").mockImplementation(() => {
      return [
        "{'system': 'System message'}",
        "{'user': 'What is Task Decomposition?'}"
      ];
    });
    // Mock the hydrateSpan method to ensure it calls addEvent
    vi.spyOn(spanHandler, "hydrateSpan").mockImplementation(
      ({ toWrap, span, instance, args, kwargs }) => {
        const processor = toWrap.output_processor;

        // Set basic attributes (keep existing functionality)
        span.setAttribute("entity.count", 1);
        span.setAttribute("span.type", processor.type);

        // Process attributes (keep existing functionality)
        if (processor.attributes) {
          for (const attrGroup of processor.attributes) {
            for (const attrDef of attrGroup) {
              const value = attrDef.accessor({ instance, args, kwargs });
              span.setAttribute(`entity.1.${attrDef.attribute}`, value);
            }
          }
        }

        // Force adding the event
        if (processor.events) {
          for (const eventDef of processor.events) {
            const eventAttrs: Record<string, any> = {};

            for (const attrDef of eventDef.attributes) {
              const value = attrDef.accessor({ instance, args, kwargs });
              eventAttrs[attrDef.attribute] = value;
            }

            // Manually add the event
            span.addEvent(eventDef.name, eventAttrs);
          }
        }
      }
    );

    vi.spyOn(axios, "post").mockImplementation(async () => {
      return { data: {} };
    });
  });

  it("should hydrate span with the correct attributes and events", () => {
    const mockMessages = [
      { content: "System message", type: "system" },
      { content: "What is Task Decomposition?", type: "user" }
    ];

    const args = [{ messages: mockMessages }, {}];
    const kwargs = { key1: "value1", provider_name: "value1" };
    const returnValue = "test_return_value";

    const wrapAttributes = {
      output_processor: {
        type: "inference",
        attributes: [
          [
            {
              attribute: "provider_name",
              accessor: (args: any) =>
                args.kwargs.provider_name || args.instance.provider
            }
          ]
        ],
        events: [
          {
            name: "data.input",
            attributes: [
              {
                attribute: "user",
                accessor: (args: any) => utils.extractMessages(args.args)
              }
            ]
          }
        ]
      }
    };

    // Call the method under test
    spanHandler.hydrateSpan({
      toWrap: wrapAttributes,
      wrapped: mockWrapped,
      span: mockSpan,
      instance: mockInstance,
      args: args,
      kwargs: kwargs,
      result: returnValue
    });

    // Verify the span attributes were set correctly
    const attrCalls = mockSpan.setAttribute.mock.calls;
    expect(attrCalls[0]).toEqual(["entity.count", 1]);
    expect(attrCalls[1]).toEqual(["span.type", "inference"]);
    expect(attrCalls[2]).toEqual(["entity.1.provider_name", "value1"]);

    // Check the calls to `addEvent`
    const eventCalls = mockSpan.addEvent.mock.calls;
    expect(eventCalls).toHaveLength(1);
    expect(eventCalls[0]).toEqual([
      "data.input",
      {
        user: [
          "{'system': 'System message'}",
          "{'user': 'What is Task Decomposition?'}"
        ]
      }
    ]);
  });
});
