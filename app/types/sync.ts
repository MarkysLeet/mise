export interface SyncItem {
  id: string;
  url: string;
  method: string;
  headers: Record<string, string>;
  body: string;
  actionName?: string;
  payload?: unknown;
}
