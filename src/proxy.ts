import { spawn } from 'node:child_process';
import { createInterface } from 'node:readline';
import type { ProxyOptions, TimingEntry, ParsedMessage } from './types.js';
import { parseJsonRpcMessage } from './parser.js';
import { Logger } from './logger.js';

export async function runProxy(opts: ProxyOptions): Promise<void> {
  const logger = new Logger(opts);

  // Pending requests: id → timing info
  const pendingRequests = new Map<string | number, TimingEntry>();

  // Spawn the child MCP server
  const [cmd, ...args] = parseCommand(opts.command);
  const child = spawn(cmd, args, {
    stdio: ['pipe', 'pipe', 'inherit'],
  });

  child.on('error', (err) => {
    process.stderr.write(`[mcp-logger] Failed to start process: ${err.message}\n`);
    process.exit(1);
  });

  child.on('exit', (code, signal) => {
    logger.close();
    process.exit(code ?? 1);
  });

  // --- client → server (stdin → child.stdin) ---
  const clientReader = createInterface({
    input: process.stdin,
    crlfDelay: Infinity,
    terminal: false,
  });

  clientReader.on('line', (line) => {
    const msg = parseJsonRpcMessage(line, 'client→server');
    if (msg) {
      // Track request for latency measurement
      if (msg.type === 'request' && msg.id !== undefined && msg.id !== null) {
        pendingRequests.set(msg.id, {
          method: msg.method ?? '?',
          requestTime: Date.now(),
          params: msg.params,
        });
      }
      logger.log(msg);
    }
    // Forward to child (add newline)
    child.stdin!.write(line + '\n');
  });

  clientReader.on('close', () => {
    child.stdin!.end();
  });

  // --- server → client (child.stdout → stdout) ---
  const serverReader = createInterface({
    input: child.stdout!,
    crlfDelay: Infinity,
    terminal: false,
  });

  serverReader.on('line', (line) => {
    const msg = parseJsonRpcMessage(line, 'server→client');
    if (msg) {
      let latencyMs: number | undefined;
      // Match response to request
      if (msg.type === 'response' && msg.id !== undefined && msg.id !== null) {
        const pending = pendingRequests.get(msg.id);
        if (pending) {
          latencyMs = Date.now() - pending.requestTime;
          pendingRequests.delete(msg.id);
        }
      }
      logger.log(msg, latencyMs);
    }
    // Forward to upstream client
    process.stdout.write(line + '\n');
  });

  // Keep process alive
  await new Promise<void>((resolve) => {
    child.on('exit', () => resolve());
  });
}

function parseCommand(command: string): string[] {
  // Simple shell-like split: handle quoted args
  const result: string[] = [];
  let current = '';
  let inSingle = false;
  let inDouble = false;

  for (let i = 0; i < command.length; i++) {
    const ch = command[i];
    if (ch === "'" && !inDouble) {
      inSingle = !inSingle;
    } else if (ch === '"' && !inSingle) {
      inDouble = !inDouble;
    } else if (ch === ' ' && !inSingle && !inDouble) {
      if (current) {
        result.push(current);
        current = '';
      }
    } else {
      current += ch;
    }
  }
  if (current) result.push(current);
  return result;
}
