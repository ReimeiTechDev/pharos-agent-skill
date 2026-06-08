import { formatEther, formatUnits, isAddress, parseEther, parseUnits } from "viem";
import { publicClient, walletClient, txLink, explorerUrl } from "./chain.js";
import { ERC20_ABI, resolveToken } from "./tokens.js";

/**
 * pharos-agent-skill — the reusable Skill.
 *
 * Each exported function is a single, composable capability that an AI agent can
 * call to act on the Pharos on-chain economy: read balances, move value (agent
 * payments), inspect transactions, and call arbitrary contracts. The functions
 * are deliberately framework-agnostic (plain async functions over typed args) so
 * the same Skill backs both the MCP server and the OpenAI function-calling demo,
 * and can be reused by any Phase-2 Agent.
 */

function assertAddress(addr: string, label = "address"): `0x${string}` {
  if (!isAddress(addr)) throw new Error(`Invalid ${label}: "${addr}"`);
  return addr as `0x${string}`;
}

/**
 * Validate a human-entered token amount before it is parsed and SENT on-chain.
 * Rejects non-numeric, zero, negative, and (optionally) over-limit amounts so a
 * bad LLM/tool argument can't trigger an unintended or failing transfer.
 */
function assertAmount(amount: string, label = "amount"): string {
  const n = Number(amount);
  if (typeof amount !== "string" || amount.trim() === "" || !Number.isFinite(n)) {
    throw new Error(`Invalid ${label}: "${amount}" (must be a positive decimal string)`);
  }
  if (n <= 0) throw new Error(`Invalid ${label}: "${amount}" (must be > 0)`);
  const max = Number(process.env.PHAROS_MAX_AMOUNT || "");
  if (Number.isFinite(max) && max > 0 && n > max) {
    throw new Error(`${label} ${n} exceeds PHAROS_MAX_AMOUNT (${max})`);
  }
  return amount;
}

/** Network + chain metadata the agent is connected to. */
export async function getNetworkInfo() {
  const c = publicClient();
  const [chainId, blockNumber, gasPrice] = await Promise.all([
    c.getChainId(),
    c.getBlockNumber(),
    c.getGasPrice(),
  ]);
  return {
    chainId,
    blockNumber: blockNumber.toString(),
    gasPriceWei: gasPrice.toString(),
    gasPriceGwei: formatUnits(gasPrice, 9),
    explorer: explorerUrl,
  };
}

/** Native PHRS balance of any address. Read-only — no key required. */
export async function getNativeBalance(address: string) {
  const addr = assertAddress(address);
  const wei = await publicClient().getBalance({ address: addr });
  return { address: addr, wei: wei.toString(), formatted: formatEther(wei), symbol: "PHRS" };
}

/** ERC-20 balance for a token symbol (from the registry) or a raw 0x token address. */
export async function getTokenBalance(token: string, address: string) {
  const addr = assertAddress(address);
  const info = resolveToken(token);
  const tokenAddr = info.address as `0x${string}`;
  const c = publicClient();
  const [raw, decimals, symbol] = await Promise.all([
    c.readContract({ address: tokenAddr, abi: ERC20_ABI, functionName: "balanceOf", args: [addr] }),
    c.readContract({ address: tokenAddr, abi: ERC20_ABI, functionName: "decimals" }).catch(() => info.decimals),
    c.readContract({ address: tokenAddr, abi: ERC20_ABI, functionName: "symbol" }).catch(() => info.symbol),
  ]);
  const dec = Number(decimals);
  return {
    token: tokenAddr,
    symbol: String(symbol),
    address: addr,
    raw: (raw as bigint).toString(),
    formatted: formatUnits(raw as bigint, dec),
    decimals: dec,
  };
}

/**
 * Send native PHRS — the core "agent payment" primitive for the Pharos on-chain
 * economy. Requires a funded PHAROS_PRIVATE_KEY. Returns the tx hash + explorer link.
 */
export async function sendNative(to: string, amount: string) {
  const dest = assertAddress(to, "recipient");
  assertAmount(amount);
  const { client, address } = walletClient();
  const hash = await client.sendTransaction({
    account: client.account!,
    chain: undefined,
    to: dest,
    value: parseEther(amount),
  });
  return { from: address, to: dest, amount, symbol: "PHRS", hash, explorer: txLink(hash) };
}

/** Transfer an ERC-20 token. Requires a funded key. */
export async function transferToken(token: string, to: string, amount: string) {
  const dest = assertAddress(to, "recipient");
  assertAmount(amount);
  const info = resolveToken(token);
  const tokenAddr = info.address as `0x${string}`;
  const { client, address } = walletClient();
  const decimals = await publicClient()
    .readContract({ address: tokenAddr, abi: ERC20_ABI, functionName: "decimals" })
    .then((d) => Number(d))
    .catch(() => info.decimals);
  const hash = await client.writeContract({
    account: client.account!,
    chain: undefined,
    address: tokenAddr,
    abi: ERC20_ABI,
    functionName: "transfer",
    args: [dest, parseUnits(amount, decimals)],
  });
  return { token: tokenAddr, from: address, to: dest, amount, hash, explorer: txLink(hash) };
}

/** Fetch a transaction + receipt status by hash. Read-only. */
export async function getTransaction(hash: string) {
  if (!/^0x[0-9a-fA-F]{64}$/.test(hash)) throw new Error(`Invalid tx hash: "${hash}"`);
  const c = publicClient();
  const h = hash as `0x${string}`;
  const tx = await c.getTransaction({ hash: h }).catch(() => null);
  const receipt = await c.getTransactionReceipt({ hash: h }).catch(() => null);
  return {
    hash: h,
    found: Boolean(tx),
    status: receipt ? receipt.status : "pending-or-unknown",
    blockNumber: receipt?.blockNumber?.toString() ?? null,
    from: tx?.from ?? null,
    to: tx?.to ?? null,
    valuePhrs: tx ? formatEther(tx.value) : null,
    explorer: txLink(hash),
  };
}

/**
 * Read any view/pure function on any contract — the generic "compose with the
 * rest of the ecosystem" primitive. abi is a JSON ABI fragment array.
 */
export async function readContract(params: {
  address: string;
  abi: unknown[];
  functionName: string;
  args?: unknown[];
}) {
  const addr = assertAddress(params.address, "contract");
  const result = await publicClient().readContract({
    address: addr,
    abi: params.abi as never,
    functionName: params.functionName,
    args: (params.args ?? []) as never,
  });
  return { address: addr, functionName: params.functionName, result: serialize(result) };
}

/** JSON-safe serialization (bigint → string). */
function serialize(v: unknown): unknown {
  if (typeof v === "bigint") return v.toString();
  if (Array.isArray(v)) return v.map(serialize);
  if (v && typeof v === "object") {
    return Object.fromEntries(Object.entries(v).map(([k, val]) => [k, serialize(val)]));
  }
  return v;
}
