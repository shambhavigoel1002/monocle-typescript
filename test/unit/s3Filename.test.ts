import { describe, it, expect, vi, beforeEach } from "vitest";
import { S3 } from "@aws-sdk/client-s3";
import { ExportResultCode } from "@opentelemetry/core";
import { AWSS3SpanExporter } from "../../src/exporters/aws/AWSS3SpanExporter";
import {
  getUrlFriendlyTime,
  makeid,
  exportInfo
} from "../../src/exporters/utils";

vi.mock("../../src/exporters/utils", () => ({
  getUrlFriendlyTime: vi.fn(),
  makeid: vi.fn(),
  exportInfo: vi.fn()
}));
import { Span } from "@opentelemetry/api";

vi.mock("@aws-sdk/client-s3");
vi.mock("../utils");
vi.mock("../../common/logging");

describe("AWSS3SpanExporter", () => {
  let exporter: AWSS3SpanExporter;
  const bucketName = "test-bucket";
  const keyPrefix = "test-prefix";
  const region = "us-east-1";

  beforeEach(() => {
    vi.clearAllMocks();
    exporter = new AWSS3SpanExporter({ bucketName, keyPrefix, region });
    S3.prototype.putObject = vi.fn().mockResolvedValue({});
  });

  it("should initialize with provided config", () => {
    expect(exporter["bucketName"]).toBe(bucketName);
    expect(exporter["keyPrefix"]).toBe(keyPrefix);
    expect(S3).toHaveBeenCalledWith({
      region,
      credentials: undefined
    });
  });

  it("should initialize with environment variables if config is not provided", () => {
    process.env.MONOCLE_S3_BUCKET_NAME = "env-bucket";
    process.env.MONOCLE_S3_KEY_PREFIX = "env-prefix";
    process.env.AWS_S3_REGION = "env-region";

    exporter = new AWSS3SpanExporter({});
    expect(exporter["bucketName"]).toBe("env-bucket");
    expect(exporter["keyPrefix"]).toBe("env-prefix");
    expect(S3).toHaveBeenCalledWith({
      region: "env-region",
      credentials: undefined
    });
  });

  it("should use explicit credentials if provided in environment variables", () => {
    process.env.MONOCLE_AWS_ACCESS_KEY_ID = "test-access-key";
    process.env.MONOCLE_AWS_SECRET_ACCESS_KEY = "test-secret-key";

    exporter = new AWSS3SpanExporter({ bucketName, keyPrefix, region });
    expect(S3).toHaveBeenCalledWith({
      region,
      credentials: {
        accessKeyId: "test-access-key",
        secretAccessKey: "test-secret-key"
      }
    });
  });

  it("should export spans and call resultCallback with success", async () => {
    const spans = [{}, {}] as Span[];
    const resultCallback = vi.fn();
    const mockPutObject = vi.fn().mockResolvedValue({});
    S3.prototype.putObject = mockPutObject;
    getUrlFriendlyTime.mockReturnValue("2023-01-01T00:00:00Z");
    makeid.mockReturnValue("abcde");
    exportInfo.mockReturnValue({});

    await exporter.export(spans, resultCallback);

    expect(mockPutObject).toHaveBeenCalled();
    expect(resultCallback).toHaveBeenCalledWith({
      code: ExportResultCode.SUCCESS
    });
  });

  it("should call resultCallback with failure if upload fails", async () => {
    const spans = [{}, {}] as Span[];
    const resultCallback = vi.fn();
    const mockPutObject = vi.fn().mockRejectedValue(new Error("Upload failed"));
    S3.prototype.putObject = mockPutObject;
    getUrlFriendlyTime.mockReturnValue("2023-01-01T00:00:00Z");
    makeid.mockReturnValue("abcde");
    exportInfo.mockReturnValue({});

    await exporter.export(spans, resultCallback);

    expect(mockPutObject).toHaveBeenCalled();
    expect(resultCallback).toHaveBeenCalledWith({
      code: ExportResultCode.FAILED,
      error: new Error("Upload failed")
    });
  });

  it("should resolve forceFlush", async () => {
    await expect(exporter.forceFlush()).resolves.toBeUndefined();
  });

  it("should resolve shutdown", async () => {
    await expect(exporter.shutdown()).resolves.toBeUndefined();
  });
});
