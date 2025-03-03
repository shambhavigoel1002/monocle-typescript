/**
 * Azure environment constants
 */
export const AZURE_ML_ENDPOINT_ENV_NAME = "AZUREML_ENTRY_SCRIPT";
export const AZURE_FUNCTION_WORKER_ENV_NAME = "FUNCTIONS_WORKER_RUNTIME";
export const AZURE_APP_SERVICE_ENV_NAME = "WEBSITE_SITE_NAME";
export const AWS_LAMBDA_ENV_NAME = "AWS_LAMBDA_RUNTIME_API";
export const GITHUB_CODESPACE_ENV_NAME = "CODESPACES";

export const AWS_LAMBDA_FUNCTION_IDENTIFIER_ENV_NAME =
  "AWS_LAMBDA_FUNCTION_NAME";
export const AZURE_FUNCTION_IDENTIFIER_ENV_NAME = "WEBSITE_SITE_NAME";
export const AZURE_APP_SERVICE_IDENTIFIER_ENV_NAME = "WEBSITE_DEPLOYMENT_ID";
export const GITHUB_CODESPACE_IDENTIFIER_ENV_NAME = "GITHUB_REPOSITORY";

/**
 * Azure naming reference can be found here
 * https://learn.microsoft.com/en-us/azure/cloud-adoption-framework/ready/azure-best-practices/resource-abbreviations
 */
export const AZURE_FUNCTION_NAME = "azure.func";
export const AZURE_APP_SERVICE_NAME = "azure.asp";
export const AZURE_ML_SERVICE_NAME = "azure.mlw";
export const AWS_LAMBDA_SERVICE_NAME = "aws.lambda";
export const GITHUB_CODESPACE_SERVICE_NAME = "github_codespace";

/**
 * Env variables to identify infra service type
 */
export const serviceTypeMap: Record<string, string> = {
  [AZURE_ML_ENDPOINT_ENV_NAME]: AZURE_ML_SERVICE_NAME,
  [AZURE_APP_SERVICE_ENV_NAME]: AZURE_APP_SERVICE_NAME,
  [AZURE_FUNCTION_WORKER_ENV_NAME]: AZURE_FUNCTION_NAME,
  [AWS_LAMBDA_ENV_NAME]: AWS_LAMBDA_SERVICE_NAME,
  [GITHUB_CODESPACE_ENV_NAME]: GITHUB_CODESPACE_SERVICE_NAME
};

/**
 * Env variables to identify infra service name
 */
export const serviceNameMap: Record<string, string> = {
  [AZURE_APP_SERVICE_NAME]: AZURE_APP_SERVICE_IDENTIFIER_ENV_NAME,
  [AZURE_FUNCTION_NAME]: AZURE_FUNCTION_IDENTIFIER_ENV_NAME,
  [AZURE_ML_SERVICE_NAME]: AZURE_ML_ENDPOINT_ENV_NAME,
  [AWS_LAMBDA_SERVICE_NAME]: AWS_LAMBDA_FUNCTION_IDENTIFIER_ENV_NAME,
  [GITHUB_CODESPACE_SERVICE_NAME]: GITHUB_CODESPACE_IDENTIFIER_ENV_NAME
};

export const WORKFLOW_TYPE_KEY = "workflow_type";
export const DATA_INPUT_KEY = "data.input";
export const DATA_OUTPUT_KEY = "data.output";
export const PROMPT_INPUT_KEY = "data.input";
export const PROMPT_OUTPUT_KEY = "data.output";
export const QUERY = "input";
export const RESPONSE = "response";
export const SESSION_PROPERTIES_KEY = "session";
export const INFRA_SERVICE_KEY = "infra_service_name";
export const META_DATA = "metadata";
