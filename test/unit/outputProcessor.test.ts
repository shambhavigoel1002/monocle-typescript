import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { SpanHandler } from "../common/spanHandler"; // Assuming the file is named span-handler.ts

describe("SpanHandler", () => {
  let mockSpan: any;
  let mockInstance: any;
  let mockArgs: any[];
  let mockKwargs: any;
  let returnValue: string;
  let handler: SpanHandler;
  let wrapped: any;
  let consoleWarnSpy: any;

  beforeEach(() => {
    // Set up mocks for each test
    mockSpan = {
      setAttribute: vi.fn(),
      addEvent: vi.fn()
    };
    mockInstance = {};
    mockArgs = [];
    mockKwargs = {};
    returnValue = "";
    handler = new SpanHandler();
    wrapped = vi.fn();

    // Mock console.warn for testing log warnings
    consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should process valid output processor with type and attributes", () => {
    const toWrap = {
      output_processor: {
        type: "inference",
        attributes: [
          [
            {
              attribute: "provider_name",
              accessor: () => "example.com"
            },
            {
              attribute: "inference_endpoint",
              accessor: () => "https://example.com/"
            }
          ]
        ]
      }
    };

    handler.hydrateSpan({
      toWrap,
      wrapped,
      span: mockSpan,
      instance: mockInstance,
      args: mockArgs,
      kwargs: mockKwargs,
      result: returnValue
    });

    expect(mockSpan.setAttribute).toHaveBeenCalledWith(
      "span.type",
      "inference"
    );
    expect(mockSpan.setAttribute).toHaveBeenCalledWith("entity.count", 1);
    expect(mockSpan.setAttribute).toHaveBeenCalledWith(
      "entity.1.provider_name",
      "example.com"
    );
    expect(mockSpan.setAttribute).toHaveBeenCalledWith(
      "entity.1.inference_endpoint",
      "https://example.com/"
    );
  });

  it("should handle output processor missing span type", () => {
    const toWrap = {
      output_processor: {
        attributes: [
          [
            {
              attribute: "provider_name",
              accessor: () => "example.com"
            },
            {
              attribute: "inference_endpoint",
              accessor: () => "https://example.com/"
            }
          ]
        ]
      }
    };

    handler.hydrateSpan({
      toWrap,
      wrapped,
      span: mockSpan,
      instance: mockInstance,
      args: mockArgs,
      kwargs: mockKwargs,
      result: returnValue
    });

    expect(mockSpan.setAttribute).toHaveBeenCalledWith("entity.count", 1);
    expect(mockSpan.setAttribute).toHaveBeenCalledWith(
      "entity.1.provider_name",
      "example.com"
    );
    expect(mockSpan.setAttribute).toHaveBeenCalledWith(
      "entity.1.inference_endpoint",
      "https://example.com/"
    );
    expect(console.warn).toHaveBeenCalledWith(
      expect.stringContaining(
        "type of span not found or incorrect written in entity json"
      )
    );
  });

  it("should handle output processor missing attributes", () => {
    const toWrap = {
      output_processor: {
        type: "inference",
        attributes: []
      }
    };

    handler.hydrateSpan({
      toWrap,
      wrapped,
      span: mockSpan,
      instance: mockInstance,
      args: mockArgs,
      kwargs: mockKwargs,
      result: returnValue
    });

    expect(mockSpan.setAttribute).toHaveBeenCalledWith(
      "span.type",
      "inference"
    );
    expect(mockSpan.setAttribute).toHaveBeenCalledWith("entity.count", 1);
  });

  it("should log warning for empty output processor", () => {
    const toWrap = {
      output_processor: {}
    };

    handler.hydrateSpan({
      toWrap,
      wrapped,
      span: mockSpan,
      instance: mockInstance,
      args: mockArgs,
      kwargs: mockKwargs,
      result: returnValue
    });

    expect(console.warn).toHaveBeenCalledWith(
      expect.stringContaining(
        "type of span not found or incorrect written in entity json"
      )
    );
  });

  it("should handle events in output processor", () => {
    const toWrap = {
      output_processor: {
        type: "inference",
        attributes: [],
        events: [
          {
            name: "test_event",
            attributes: [
              {
                attribute: "event_attribute",
                accessor: () => "event_value"
              }
            ]
          }
        ]
      }
    };

    handler.hydrateSpan({
      toWrap,
      wrapped,
      span: mockSpan,
      instance: mockInstance,
      args: mockArgs,
      kwargs: mockKwargs,
      result: returnValue
    });

    expect(mockSpan.addEvent).toHaveBeenCalledWith("test_event", {
      event_attribute: "event_value"
    });
  });
});
