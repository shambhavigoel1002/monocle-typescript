import {
  setupMonocle,
  addSpanProcessors
} from "../instrumentation/common/instrumentation";
import { AWS_CONSTANTS } from "../instrumentation/common/constants";
import { PatchedBatchSpanProcessor } from "../instrumentation/common/opentelemetryUtils";

jest.mock("../exporters/aws/AWSS3SpanExporter", () => ({
  AWSS3SpanExporter: jest.fn().mockReturnValue({})
}));

jest.mock("@opentelemetry/sdk-trace-node", () => ({
  ConsoleSpanExporter: jest.fn().mockReturnValue({})
}));

jest.mock("../exporters", () => ({
  getMonocleExporter: jest.fn().mockReturnValue({})
}));

describe("MonocleInstrumentation setup and span processors", () => {
  beforeEach(() => {
    delete process.env[AWS_CONSTANTS.AWS_LAMBDA_FUNCTION_NAME];
  });

  it("should add AWS S3 and Console Span Exporters if AWS_LAMBDA_FUNCTION_NAME is set", () => {
    process.env[AWS_CONSTANTS.AWS_LAMBDA_FUNCTION_NAME] =
      "mockLambdaFunctionName";

    const okahuProcessors = [];
    addSpanProcessors(okahuProcessors);

    expect(okahuProcessors.length).toBe(2);
    expect(okahuProcessors[0]).toBeInstanceOf(PatchedBatchSpanProcessor);
    expect(okahuProcessors[1]).toBeInstanceOf(PatchedBatchSpanProcessor);
  });

  it("should add only Monocle Exporter if AWS_LAMBDA_FUNCTION_NAME is not set", () => {
    const okahuProcessors = [];
    addSpanProcessors(okahuProcessors);

    expect(okahuProcessors.length).toBe(1);
    expect(okahuProcessors[0]).toBeInstanceOf(PatchedBatchSpanProcessor);
  });

  it("should correctly set up Monocle with a workflow name", () => {
    const workflowName = "testWorkflow";
    const spanProcessors = [];
    const wrapperMethods = [];

    setupMonocle(workflowName, spanProcessors, wrapperMethods);

    expect(process.env.SERVICE_NAME).toBe(workflowName);
  });
});
