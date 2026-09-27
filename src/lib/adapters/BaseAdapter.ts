import { AdapterExecutionPayload, AdapterExecutionResult } from "../types";

export abstract class BaseAdapter {
  abstract execute(
    payload: AdapterExecutionPayload,
    modelName?: string
  ): Promise<AdapterExecutionResult>;
}
