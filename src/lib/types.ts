export type ParameterType =
  | "Text"
  | "Number"
  | "Boolean"
  | "Image"
  | "File"
  | "JSON";

export interface InputParameter {
  name: string;
  type: ParameterType | string;
  required: boolean;
  description?: string;
  defaultValue?: any;
}

export interface AdapterExecutionPayload {
  systemPrompt: string;
  inputParameters: InputParameter[];
  outputSchema: Record<string, any> | string;
  userValues: Record<string, any>;
  modelName: string;
}

export interface AdapterExecutionResult {
  data: any;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  rawResponse?: any;
}

export interface CostCalculationParams {
  model: string;
  promptTokens: number;
  completionTokens: number;
}
