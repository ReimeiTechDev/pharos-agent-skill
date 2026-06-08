/**
 * Known Pharos Atlantic testnet ERC-20s. The Pharos docs list USDC, USDT, WBTC,
 * WETH and WPHRS as available testnet assets. Addresses are loaded from an
 * editable registry so the agent can resolve symbols → addresses.
 *
 * HOW TO COMPLETE: paste each token's address from the explorer
 * (https://atlantic.pharosscan.xyz tokens page) or the Pharos dev docs.
 * Tools also accept a raw 0x address directly, so they work even before this
 * registry is filled in.
 */
export type TokenInfo = { symbol: string; address: `0x${string}` | null; decimals: number };

export const TOKEN_REGISTRY: Record<string, TokenInfo> = {
  WPHRS: { symbol: "WPHRS", address: null, decimals: 18 },
  USDC: { symbol: "USDC", address: null, decimals: 6 },
  USDT: { symbol: "USDT", address: null, decimals: 6 },
  WBTC: { symbol: "WBTC", address: null, decimals: 8 },
  WETH: { symbol: "WETH", address: null, decimals: 18 },
};

/** Resolve a user-supplied token (symbol from the registry, or a raw 0x address). */
export function resolveToken(tokenOrSymbol: string): TokenInfo {
  if (/^0x[0-9a-fA-F]{40}$/.test(tokenOrSymbol)) {
    return { symbol: tokenOrSymbol, address: tokenOrSymbol as `0x${string}`, decimals: 18 };
  }
  const info = TOKEN_REGISTRY[tokenOrSymbol.toUpperCase()];
  if (!info) {
    throw new Error(
      `Unknown token "${tokenOrSymbol}". Pass a 0x address, or add it to TOKEN_REGISTRY in src/tokens.ts.`
    );
  }
  if (!info.address) {
    throw new Error(
      `Token ${info.symbol} has no address configured yet. Add its Pharos testnet address to TOKEN_REGISTRY in src/tokens.ts, or pass the 0x address directly.`
    );
  }
  return info;
}

export const ERC20_ABI = [
  {
    type: "function",
    name: "balanceOf",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "decimals",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint8" }],
  },
  {
    type: "function",
    name: "symbol",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "string" }],
  },
  {
    type: "function",
    name: "transfer",
    stateMutability: "nonpayable",
    inputs: [
      { name: "to", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
] as const;
