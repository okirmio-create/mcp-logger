#!/usr/bin/env node
import { program } from 'commander';
import { runProxy } from './proxy.js';
import type { FilterMode, ProxyOptions } from './types.js';

program
  .name('mcp-logger')
  .description('Structured logging proxy for MCP servers — sits between MCP client and server, logs all JSON-RPC traffic')
  .version('1.0.0')
  .requiredOption('-c, --command <cmd>', 'MCP server command to wrap (e.g. "node my-server.js")')
  .option('--json', 'Output logs as newline-delimited JSON (pipe to jq)', false)
  .option('-o, --output <file>', 'Also write logs to a file')
  .option(
    '--filter <mode>',
    'Filter messages: all | tools | resources | prompts (default: all)',
    (v: string) => {
      const valid: FilterMode[] = ['all', 'tools', 'resources', 'prompts'];
      if (!valid.includes(v as FilterMode)) {
        console.error(`Invalid filter "${v}". Valid values: ${valid.join(', ')}`);
        process.exit(1);
      }
      return v as FilterMode;
    },
    'all' as FilterMode,
  )
  .option('--timing', 'Show request→response latency for each tool call', false)
  .option('--pretty', 'Colorized human-readable output', false)
  .option('-v, --verbose', 'Include full params and results in output', false);

program.parse();

const opts = program.opts<{
  command: string;
  json: boolean;
  output?: string;
  filter: FilterMode;
  timing: boolean;
  pretty: boolean;
  verbose: boolean;
}>();

const proxyOpts: ProxyOptions = {
  command: opts.command,
  json: opts.json,
  output: opts.output,
  filter: opts.filter,
  timing: opts.timing,
  pretty: opts.pretty,
  verbose: opts.verbose,
};

runProxy(proxyOpts).catch((err) => {
  process.stderr.write(`[mcp-logger] Fatal: ${err.message}\n`);
  process.exit(1);
});
