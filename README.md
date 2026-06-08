# Pharos Agent Skill 🛠️🤖

A **reusable on-chain Skill for AI agents on [Pharos Network](https://pharos.xyz)** — the same Skill is exposed two ways:

1. as a **Model Context Protocol (MCP) server** (drop it into Claude Desktop, Cursor, or any Phase-2 Pharos Agent), and
2. as an **OpenAI function-calling toolset** (see the runnable demo agent).

> Built for the **Skill-to-Agent Dual Cascade Hackathon (Phase 1 — Skill Hackathon)** by Pharos × Anvita Flow.
> Phase 1 asks for *standardized, reusable Skill modules that AI agents can call to complete on-chain tasks*. This is exactly that.

## Why this fits Phase 1

| Judging criterion | How this Skill addresses it |
|---|---|
| Reusability & composability | One framework-agnostic Skill (`src/skill.ts`) backs **both** MCP and OpenAI transports. Each tool is a single composable capability. |
| Practical use case for agents | Read balances, **make agent payments (native PHRS)**, transfer tokens, inspect txs, and call any contract — the primitives every on-chain agent needs. |
| Deployment / integration on Pharos | Targets Pharos Atlantic testnet out of the box (EVM-equivalent; chainId `688689`). |
| Technical quality & completeness | Typed (TypeScript + viem + zod), unit-tested, with a no-key smoke test and clean error messages. |
| UX & documentation | This README, `.env.example`, a one-command smoke test, and a filmable demo agent. |

## The Skill surface (tools)

| Tool | Type | What it does |
|---|---|---|
| `pharos_network_info` | read | chain id, latest block, gas price |
| `pharos_get_native_balance` | read | native PHRS balance of an address |
| `pharos_get_token_balance` | read | ERC-20 balance (symbol or 0x address) |
| `pharos_send_payment` | write | send native PHRS — the agent-payment primitive |
| `pharos_transfer_token` | write | transfer an ERC-20 |
| `pharos_get_transaction` | read | tx + receipt status by hash |
| `pharos_read_contract` | read | call any view/pure function on any contract |

Read tools need no key. Write tools need a funded `PHAROS_PRIVATE_KEY`.

## Quickstart

```bash
npm install
cp .env.example .env        # RPC + chainId are pre-filled for Pharos Atlantic testnet

# 1) Prove connectivity to Pharos (no key, no OpenAI needed):
npm run smoke

# 2) Run the unit tests:
npm test

# 3) Run the Skill as an MCP server (stdio):
npm run mcp

# 4) Run the OpenAI agent demo (needs OPENAI_API_KEY in .env):
npm run demo -- "What chain am I on, and what's the gas price right now?"
```

### Use as an MCP server in Claude Desktop / Cursor

```jsonc
{
  "mcpServers": {
    "pharos-agent-skill": {
      "command": "npx",
      "args": ["tsx", "/absolute/path/to/src/mcp-server.ts"],
      "env": { "PHAROS_PRIVATE_KEY": "0x..." }
    }
  }
}
```

## Network

Verified from `docs.pharos.xyz`:

- **EVM-equivalent L1** — standard viem / ethers / Hardhat toolchain works unchanged.
- Testnet RPC: `https://atlantic.dplabs-internal.com`
- Chain ID: `688689`
- Explorer: `https://atlantic.pharosscan.xyz`

## Filling in token addresses (optional)

`pharos_get_token_balance` / `pharos_transfer_token` accept a raw `0x` token address directly, so they work immediately. To use friendly symbols (USDC/USDT/WBTC/WETH/WPHRS), paste each address into `TOKEN_REGISTRY` in `src/tokens.ts` from the [explorer](https://atlantic.pharosscan.xyz) tokens page.

## Project layout

```
src/
  chain.ts              Pharos chain definition + viem clients (env-driven)
  tokens.ts             ERC-20 registry + resolver + ABI
  skill.ts              the reusable Skill (pure async capabilities)
  tools.ts              tool declarations shared by both transports
  mcp-server.ts         MCP (stdio) transport
  openai-agent-demo.ts  OpenAI function-calling demo agent
  smoke.ts              no-key connectivity check
test/skill.test.ts      unit tests
```

## Phase 2 ready

The Skill is the building block; a Phase-2 **Agent Arena** entry composes these tools (plus others) into an autonomous agent that transacts on Pharos. Because the surface is declared once in `tools.ts`, a Phase-2 agent imports the same module — no rewrite.

## License

MIT © 2026 ReimeiTechDev
