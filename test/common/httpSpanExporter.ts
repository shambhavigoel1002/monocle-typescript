// Copyright (C) Http Inc 2023-2024. All rights reserved

import axios, { AxiosInstance, AxiosResponse } from "axios";
import {
  ReadableSpan,
  SpanExporter,
  SpanExportResult
} from "@opentelemetry/sdk-trace-base";

const REQUESTS_SUCCESS_STATUS_CODES = [200, 202, 201];

const logger = console;

class HttpSpanExporter implements SpanExporter {
  private endpoint: string;
  private session: AxiosInstance;
  private _closed: boolean;
  private timeout: number;

  constructor(endpoint?: string, timeout?: number, session?: AxiosInstance) {
    const http_endpoint: string = process.env.HTTP_INGESTION_ENDPOINT || "";
    this.endpoint = endpoint || http_endpoint;
    const api_key: string = process.env.HTTP_API_KEY || "";

    this.session = session || axios.create();
    this.session.defaults.headers.common["Content-Type"] = "application/json";
    this.session.defaults.headers.common["x-api-key"] = api_key;
    this._closed = false;
    this.timeout = timeout || 10;
  }

  async export(spans: ReadableSpan[]): Promise<SpanExportResult> {
    if (this._closed) {
      logger.warn("Exporter already shutdown, ignoring batch");
      return SpanExportResult.FAILURE;
    }
    if (spans.length === 0) {
      return SpanExportResult.SUCCESS;
    }

    const spanList = spans.map((span) => ({
      // Convert the span to the required format
      // This is a placeholder, you need to implement the actual conversion
      traceId: span.spanContext().traceId,
      spanId: span.spanContext().spanId,
      name: span.name,
      startTime: span.startTime,
      endTime: span.endTime,
      attributes: span.attributes
      // Add other necessary fields
    }));

    try {
      const response: AxiosResponse = await this.session.post(
        this.endpoint,
        spanList,
        {
          timeout: this.timeout * 1000
        }
      );

      if (REQUESTS_SUCCESS_STATUS_CODES.includes(response.status)) {
        return SpanExportResult.SUCCESS;
      } else {
        logger.error(`Failed to export spans, status code: ${response.status}`);
        return SpanExportResult.FAILURE;
      }
    } catch (error) {
      logger.error(`Failed to export spans: ${error.message}`);
      return SpanExportResult.FAILURE;
    }
  }

  shutdown(): Promise<void> {
    this._closed = true;
    return Promise.resolve();
  }
}

export { HttpSpanExporter };
