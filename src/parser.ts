import type { JsonRpcMessage, MessageType, ParsedMessage, Direction } from './types.js';

export function parseJsonRpcMessage(raw: string, direction: Direction): ParsedMessage | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  let msg: JsonRpcMessage;
  try {
    msg = JSON.parse(trimmed) as JsonRpcMessage;
  } catch {
    return null;
  }

  if (typeof msg !== 'object' || msg === null || (msg as Record<string, unknown>).jsonrpc !== '2.0') {
    return null;
  }

  const type = detectType(msg);

  const parsed: ParsedMessage = {
    raw: trimmed,
    type,
    direction,
    timestamp: new Date(),
  };

  if ('id' in msg && msg.id !== undefined) {
    parsed.id = msg.id;
  }
  if ('method' in msg && msg.method !== undefined) {
    parsed.method = msg.method;
  }
  if ('params' in msg && msg.params !== undefined) {
    parsed.params = msg.params;
  }
  if ('result' in msg && msg.result !== undefined) {
    parsed.result = msg.result;
  }
  if ('error' in msg && msg.error !== undefined) {
    parsed.error = msg.error;
  }

  return parsed;
}

function detectType(msg: JsonRpcMessage): MessageType {
  if ('method' in msg) {
    if ('id' in msg && msg.id !== undefined && msg.id !== null) {
      return 'request';
    }
    return 'notification';
  }
  if ('result' in msg || 'error' in msg) {
    return 'response';
  }
  return 'unknown';
}

export function summarizeParams(params: unknown): string {
  if (params === undefined || params === null) return '';
  if (typeof params !== 'object') return String(params);

  const p = params as Record<string, unknown>;

  // MCP tool call: params.name is the tool name
  if (typeof p.name === 'string') {
    return `name="${p.name}"`;
  }

  const keys = Object.keys(p);
  if (keys.length === 0) return '{}';
  if (keys.length <= 3) return keys.map(k => `${k}=…`).join(', ');
  return `{${keys.slice(0, 3).join(', ')}, …}`;
}
