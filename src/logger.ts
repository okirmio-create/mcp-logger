import fs from 'node:fs';
import chalk from 'chalk';
import type { LogEntry, ParsedMessage, ProxyOptions, FilterMode } from './types.js';
import { summarizeParams } from './parser.js';

const FILTER_PREFIXES: Record<FilterMode, string[]> = {
  all: [],
  tools: ['tools/'],
  resources: ['resources/'],
  prompts: ['prompts/'],
};

export class Logger {
  private opts: ProxyOptions;
  private fileStream?: fs.WriteStream;

  constructor(opts: ProxyOptions) {
    this.opts = opts;
    if (opts.output) {
      this.fileStream = fs.createWriteStream(opts.output, { flags: 'a' });
    }
  }

  shouldLog(msg: ParsedMessage): boolean {
    const { filter } = this.opts;
    if (filter === 'all') return true;
    const prefixes = FILTER_PREFIXES[filter];
    if (!prefixes.length) return true;
    const method = msg.method ?? '';
    return prefixes.some((p) => method.startsWith(p));
  }

  log(msg: ParsedMessage, latencyMs?: number): void {
    if (!this.shouldLog(msg)) return;

    const level = msg.error ? 'error' : 'info';

    const entry: LogEntry = {
      timestamp: msg.timestamp.toISOString(),
      direction: msg.direction,
      type: msg.type,
      method: msg.method,
      id: msg.id,
      level,
    };

    if (this.opts.verbose) {
      if (msg.params !== undefined) entry.params = msg.params;
      if (msg.result !== undefined) entry.result = msg.result;
    }
    if (msg.error !== undefined) entry.error = msg.error;
    if (latencyMs !== undefined) entry.latencyMs = latencyMs;

    if (this.opts.json) {
      this.writeJson(entry);
    } else {
      this.writePretty(entry, latencyMs);
    }
  }

  private writeJson(entry: LogEntry): void {
    this.emit(JSON.stringify(entry));
  }

  private writePretty(entry: LogEntry, latencyMs?: number): void {
    const { pretty, timing } = this.opts;

    const ts = chalk.gray(entry.timestamp);

    const dir =
      entry.direction === 'client→server'
        ? pretty
          ? chalk.green('→')
          : '→'
        : pretty
          ? chalk.blue('←')
          : '←';

    const typeTag = formatType(entry.type, pretty);

    const method = entry.method
      ? pretty
        ? chalk.cyan(entry.method)
        : entry.method
      : '';

    const idPart =
      entry.id !== undefined && entry.id !== null
        ? chalk.gray(`#${entry.id}`)
        : '';

    const paramsSummary =
      entry.params !== undefined
        ? chalk.gray(`(${summarizeParams(entry.params)})`)
        : '';

    const latencyPart =
      timing && latencyMs !== undefined
        ? pretty
          ? chalk.yellow(` [${latencyMs}ms]`)
          : ` [${latencyMs}ms]`
        : '';

    const errorPart = entry.error
      ? pretty
        ? chalk.red(` ERR ${entry.error.code}: ${entry.error.message}`)
        : ` ERR ${entry.error.code}: ${entry.error.message}`
      : '';

    const line =
      [ts, dir, typeTag, method, idPart, paramsSummary, latencyPart, errorPart]
        .filter(Boolean)
        .join(' ');

    this.emit(line);
  }

  close(): void {
    this.fileStream?.end();
  }

  private emit(line: string): void {
    process.stderr.write(line + '\n');
    this.fileStream?.write(line + '\n');
  }
}

function formatType(type: string, pretty: boolean): string {
  const map: Record<string, string> = {
    request: pretty ? chalk.green('[REQ]') : '[REQ]',
    response: pretty ? chalk.blue('[RES]') : '[RES]',
    notification: pretty ? chalk.magenta('[NOT]') : '[NOT]',
    unknown: pretty ? chalk.gray('[UNK]') : '[UNK]',
  };
  return map[type] ?? `[${type.toUpperCase()}]`;
}
