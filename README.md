# mcp-logger

> Structured logging proxy for MCP (Model Context Protocol) servers.

Sits transparently between your MCP client and server, intercepting all JSON-RPC traffic and logging it with timestamps, direction, method names, request IDs, and optional response latency — without breaking the protocol.

---

## Install

```bash
npm install -g mcp-logger
# or use directly with npx
npx mcp-logger --command "node my-server.js"
```

---

## Usage

```bash
# Basic: wrap any MCP server with logging (logs go to stderr)
npx mcp-logger --command "node my-server.js"

# JSON output — one object per line, pipe to jq
npx mcp-logger --command "node server.js" --json | jq .

# Write logs to a file as well
npx mcp-logger --command "node server.js" -o mcp.log

# Filter: only log tool calls (tools/call, tools/list)
npx mcp-logger --command "node server.js" --filter tools

# Filter: only resources or prompts traffic
npx mcp-logger --command "node server.js" --filter resources
npx mcp-logger --command "node server.js" --filter prompts

# Show request→response latency
npx mcp-logger --command "node server.js" --timing

# Colorized pretty output
npx mcp-logger --command "node server.js" --pretty

# Verbose: include full params and results
npx mcp-logger --command "node server.js" --verbose

# Combine options
npx mcp-logger --command "node server.js" --pretty --timing --filter tools
```

---

## Options

| Flag | Description |
|------|-------------|
| `-c, --command <cmd>` | **(required)** MCP server command to wrap |
| `--json` | Output logs as newline-delimited JSON |
| `-o, --output <file>` | Also write logs to a file (appends) |
| `--filter <mode>` | Filter: `all` \| `tools` \| `resources` \| `prompts` (default: `all`) |
| `--timing` | Show request→response latency in milliseconds |
| `--pretty` | Colorized human-readable output via chalk |
| `-v, --verbose` | Include full params and results in log output |

---

## How it works

```
MCP Client  ──stdin──►  mcp-logger  ──stdin──►  MCP Server
            ◄─stdout──              ◄─stdout──
```

- All JSON-RPC messages are intercepted, parsed, and logged to **stderr** (so stdout remains clean for the MCP protocol).
- Requests are tracked by ID; when a matching response arrives, latency is computed.
- The underlying MCP server sees no difference — messages are forwarded verbatim.

---

## Use with Claude Desktop / claude.json

```json
{
  "mcpServers": {
    "my-server": {
      "command": "npx",
      "args": ["mcp-logger", "--command", "node /path/to/server.js", "--pretty", "--timing"]
    }
  }
}
```

---

## JSON log format

Each log entry when using `--json`:

```json
{
  "timestamp": "2024-01-15T10:30:00.123Z",
  "direction": "client→server",
  "type": "request",
  "method": "tools/call",
  "id": 1,
  "latencyMs": 42,
  "level": "info"
}
```

---

## Tech stack

- **TypeScript** — strict, ESNext, NodeNext modules
- **tsup** — zero-config bundler
- **commander** — CLI argument parsing
- **chalk** — terminal colorization
- ESM only, Node.js ≥ 18

---

## License

MIT © [okirmio-create](https://github.com/okirmio-create)
