#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { TOOLS, getTool, zodToJsonSchema } from "./tools.js";

/**
 * Pharos Agent Skill — MCP server (stdio transport).
 *
 * Drop into any MCP-capable agent host (Claude Desktop, Cursor, an OpenAI agent
 * with an MCP bridge, or a Phase-2 Pharos Agent) and the agent instantly gains
 * the ability to read balances, make payments, and inspect/​call contracts on
 * Pharos. This is the "Skill" deliverable for Phase 1.
 */
const server = new Server(
  { name: "pharos-agent-skill", version: "1.0.0" },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: TOOLS.map((t) => ({
    name: t.name,
    description: t.description + (t.write ? " [requires funded key]" : " [read-only]"),
    inputSchema: zodToJsonSchema(t.schema),
  })),
}));

server.setRequestHandler(CallToolRequestSchema, async (req) => {
  const tool = getTool(req.params.name);
  try {
    const args = tool.schema.parse(req.params.arguments ?? {});
    const result = await tool.handler(args);
    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { isError: true, content: [{ type: "text", text: `Error in ${tool.name}: ${message}` }] };
  }
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("pharos-agent-skill MCP server running on stdio");
}

main().catch((e) => {
  console.error("Fatal:", e);
  process.exit(1);
});
