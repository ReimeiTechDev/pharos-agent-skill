import { z } from "zod";
import * as skill from "./skill.js";

/**
 * The Skill's tool surface, declared ONCE and reused by both transports
 * (MCP server + OpenAI function-calling). Each tool is a small, composable
 * capability — the reusability/composability the hackathon judges for.
 */
export type Tool = {
  name: string;
  description: string;
  schema: z.ZodTypeAny;
  /** true = mutates chain state / needs a funded key. */
  write: boolean;
  handler: (args: any) => Promise<unknown>;
};

export const TOOLS: Tool[] = [
  {
    name: "pharos_network_info",
    description: "Get Pharos chain id, latest block number, and current gas price. Use to confirm connectivity.",
    schema: z.object({}),
    write: false,
    handler: () => skill.getNetworkInfo(),
  },
  {
    name: "pharos_get_native_balance",
    description: "Get the native PHRS balance of an address. Read-only.",
    schema: z.object({ address: z.string().describe("0x EVM address to query") }),
    write: false,
    handler: (a) => skill.getNativeBalance(a.address),
  },
  {
    name: "pharos_get_token_balance",
    description:
      "Get an ERC-20 token balance for an address. `token` is a registry symbol (WPHRS/USDC/USDT/WBTC/WETH) or a raw 0x token address.",
    schema: z.object({
      token: z.string().describe("token symbol or 0x address"),
      address: z.string().describe("holder 0x address"),
    }),
    write: false,
    handler: (a) => skill.getTokenBalance(a.token, a.address),
  },
  {
    name: "pharos_send_payment",
    description:
      "Send native PHRS from the agent wallet to a recipient — the core agent-payment primitive. Requires a funded key. Returns tx hash + explorer link.",
    schema: z.object({
      to: z.string().describe("recipient 0x address"),
      amount: z.string().describe('amount in PHRS as a decimal string, e.g. "0.1"'),
    }),
    write: true,
    handler: (a) => skill.sendNative(a.to, a.amount),
  },
  {
    name: "pharos_transfer_token",
    description: "Transfer an ERC-20 token from the agent wallet. Requires a funded key.",
    schema: z.object({
      token: z.string().describe("token symbol or 0x address"),
      to: z.string().describe("recipient 0x address"),
      amount: z.string().describe("amount as a decimal string in token units"),
    }),
    write: true,
    handler: (a) => skill.transferToken(a.token, a.to, a.amount),
  },
  {
    name: "pharos_get_transaction",
    description: "Look up a transaction and its receipt status (success/reverted/pending) by hash. Read-only.",
    schema: z.object({ hash: z.string().describe("0x transaction hash") }),
    write: false,
    handler: (a) => skill.getTransaction(a.hash),
  },
  {
    name: "pharos_read_contract",
    description:
      "Call a view/pure function on any contract. Provide the contract address, a JSON ABI fragment array, the function name, and args. Read-only.",
    schema: z.object({
      address: z.string(),
      abi: z.array(z.any()).describe("JSON ABI fragment array containing the function"),
      functionName: z.string(),
      args: z.array(z.any()).optional(),
    }),
    write: false,
    handler: (a) => skill.readContract(a),
  },
];

export function getTool(name: string): Tool {
  const t = TOOLS.find((x) => x.name === name);
  if (!t) throw new Error(`Unknown tool: ${name}`);
  return t;
}

/** Minimal zod → JSON Schema for OpenAI / MCP inputSchema. */
export function zodToJsonSchema(schema: z.ZodTypeAny): Record<string, unknown> {
  if (schema instanceof z.ZodObject) {
    const shape = schema.shape as Record<string, z.ZodTypeAny>;
    const properties: Record<string, unknown> = {};
    const required: string[] = [];
    for (const [key, value] of Object.entries(shape)) {
      properties[key] = leaf(value);
      if (!(value instanceof z.ZodOptional)) required.push(key);
    }
    return { type: "object", properties, required, additionalProperties: false };
  }
  return { type: "object", properties: {} };
}

function leaf(v: z.ZodTypeAny): Record<string, unknown> {
  const desc = v.description ? { description: v.description } : {};
  const inner = v instanceof z.ZodOptional ? v.unwrap() : v;
  if (inner instanceof z.ZodString) return { type: "string", ...desc };
  if (inner instanceof z.ZodNumber) return { type: "number", ...desc };
  if (inner instanceof z.ZodBoolean) return { type: "boolean", ...desc };
  if (inner instanceof z.ZodArray) return { type: "array", items: {}, ...desc };
  return { type: "string", ...desc };
}
