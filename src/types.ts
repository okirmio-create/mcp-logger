export type Direction = 'client→server' | 'server→client';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface JsonRpcRequest {
  jsonrpc: '2.0';
  id?: string | number | null;
  method: string;
  params?: unknown;
}

export interface JsonRpcResponse {
  jsonrpc: '2.0';
  id: string | number | null;
  result?: unknown;
  error?: JsonRpcError;
}

export interface JsonRpcNotification {
  jsonrpc: '2.0';
  method: string;
  params?: unknown;
}

export interface JsonRpcError {
  code: number;
  message: string;
  data?: unknown;
}

export type JsonRpcMessage = JsonRpcRequest | JsonRpcResponse | JsonRpcNotification;

export type MessageType = 'request' | 'response' | 'notification' | 'unknown';

export interface ParsedMessage {
  raw: string;
  type: MessageType;
  id?: string | number | null;
  method?: string;
  params?: unknown;
  result?: unknown;
  error?: JsonRpcError;
  direction: Direction;
  timestamp: Date;
}

export interface TimingEntry {
  method: string;
  requestTime: number; // Date.now()
  params?: unknown;
}

export interface LogEntry {
  timestamp: string;
  direction: Direction;
  type: MessageType;
  method?: string;
  id?: string | number | null;
  params?: unknown;
  result?: unknown;
  error?: JsonRpcError;
  latencyMs?: number;
  level: LogLevel;
}

export type FilterMode = 'all' | 'tools' | 'resources' | 'prompts';

export interface ProxyOptions {
  command: string;
  json: boolean;
  output?: string;
  filter: FilterMode;
  timing: boolean;
  pretty: boolean;
  verbose: boolean;
}
