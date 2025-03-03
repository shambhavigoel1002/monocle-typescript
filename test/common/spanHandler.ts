import { Span } from "@opentelemetry/sdk-trace-base";
import { context, trace } from "@opentelemetry/api";
import axios from "axios";

// Constants
const QUERY = "user.question";

const SERVICE_NAME_MAP: Record<string, string> = {
  aws_lambda: "AWS_LAMBDA_FUNCTION_NAME",
  gcp_cloud_function: "FUNCTION_NAME",
  azure_function: "WEBSITE_SITE_NAME"
};

const SERVICE_TYPE_MAP: Record<string, string> = {
  AWS_LAMBDA_FUNCTION_NAME: "aws_lambda",
  FUNCTION_NAME: "gcp_cloud_function",
  WEBSITE_SITE_NAME: "azure_function"
};

const WORKFLOW_TYPE_MAP: Record<string, string> = {
  llama_index: "workflow.llamaindex",
  langchain: "workflow.langchain",
  haystack: "workflow.haystack"
};

// Logger implementation
const logger = {
  debug: (message: string) => console.debug(message),
  warning: (message: string) => console.warn(message),
  exception: (message: string) => console.error(message)
};

// Utility function to set attribute
function setAttribute(key: string, value: any): void {
  const span = trace.getActiveSpan();
  if (span && value !== undefined && value !== null) {
    span.setAttribute(key, value);
  }
}

export class SpanHandler {
  hydrateSpan({
    toWrap,
    wrapped,
    span,
    instance,
    args,
    kwargs,
    result
  }: {
    toWrap: any;
    wrapped: any;
    span: any;
    instance: any;
    args: any[];
    kwargs: any;
    result: any;
  }) {
    const processor = toWrap.output_processor;
    if (!processor) {
      return result;
    }

    // Set entity count
    span.setAttribute("entity.count", 1);
    if (Object.keys(processor).length === 0) {
      // This is an empty output processor - log warning
      logger.warning(
        "type of span not found or incorrect written in entity json"
      );
      return result;
    }
    // Set span type if available
    if (processor.type) {
      span.setAttribute("span.type", processor.type);
    } else if (Object.keys(processor).length > 0) {
      // Log warning if processor exists but type is missing
      logger.warning(
        "type of span not found or incorrect written in entity json"
      );
    }

    // Process attributes if available
    if (processor.attributes && Array.isArray(processor.attributes)) {
      processor.attributes.forEach((attrGroup: any[]) => {
        if (Array.isArray(attrGroup)) {
          attrGroup.forEach((attrDef) => {
            try {
              const value = attrDef.accessor({ instance, args, kwargs });
              if (value !== undefined && value !== null) {
                span.setAttribute(`entity.1.${attrDef.attribute}`, value);
              }
            } catch (error) {
              logger.warning(
                `Error processing attribute ${attrDef.attribute}: ${error}`
              );
            }
          });
        }
      });
    }

    // Process events if available
    if (processor.events && Array.isArray(processor.events)) {
      processor.events.forEach((eventDef: any) => {
        const eventAttrs: Record<string, any> = {};

        if (Array.isArray(eventDef.attributes)) {
          eventDef.attributes.forEach((attrDef: any) => {
            try {
              const value = attrDef.accessor({ instance, args, kwargs });
              if (value !== undefined && value !== null) {
                eventAttrs[attrDef.attribute] = value;
              }
            } catch (error) {
              logger.warning(
                `Error processing event attribute ${attrDef.attribute}: ${error}`
              );
            }
          });
        }

        span.addEvent(eventDef.name, eventAttrs);
      });
    }

    return result;
  }
}
