import { LLM, type BaseLLMParams } from "@langchain/core/language_models/llms";
import type { CallbackManagerForLLMRun } from "@langchain/core/callbacks/manager";

interface FakeListLLMParams extends BaseLLMParams {
  /**
   * List of responses to return in order.
   */
  responses: string[];

  /**
   * Sleep time in seconds between responses.
   *
   * Ignored by FakeListLLM, but used by sub-classes.
   */
  sleep?: number;

  /**
   * API base URL.
   */
  apiBase?: string;
}

/**
 * Fake LLM for testing purposes.
 */
export class FakeListLLM extends LLM {
  /**
   * List of responses to return in order.
   */
  responses: string[];

  /**
   * Sleep time in seconds between responses.
   *
   * Ignored by FakeListLLM, but used by sub-classes.
   */
  sleep?: number;

  /**
   * Internally incremented after every model invocation.
   *
   * Useful primarily for testing purposes.
   */
  i: number = 0;

  /**
   * API base URL.
   */
  apiBase: string = "";

  constructor(params: FakeListLLMParams) {
    super(params);
    this.responses = params.responses;
    this.sleep = params.sleep;
    this.apiBase = params.apiBase || "";
  }

  _llmType(): string {
    /**
     * Return type of llm.
     */
    return "fake-list";
  }

  async _call(
    prompt: string,
    options: this["ParsedCallOptions"],
    runManager?: CallbackManagerForLLMRun
  ): Promise<string> {
    /**
     * Return next response
     */
    const response = this.responses[this.i];
    if (this.i < this.responses.length - 1) {
      this.i += 1;
    } else {
      this.i = 0;
    }
    return response;
  }

  /**
   * Get the identifying parameters for this LLM.
   */
  _identifyingParams(): Record<string, any> {
    return { responses: this.responses };
  }
}
