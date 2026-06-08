import {
  createPublicClient,
  createWalletClient,
  defineChain,
  http,
  type PublicClient,
  type WalletClient,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";

/**
 * Pharos Atlantic testnet, defined from values verified at docs.pharos.xyz.
 * Pharos is a "fully EVM-equivalent Layer 1" whose JSON-RPC is Ethereum-compatible,
 * so the standard viem/ethers/Hardhat toolchain works unchanged.
 */
function envInt(name: string, fallback: number): number {
  const v = process.env[name];
  if (!v) return fallback;
  const n = Number(v);
  // chain ids must be positive safe integers; ignore junk and fall back.
  return Number.isSafeInteger(n) && n > 0 ? n : fallback;
}

const RPC_URL = process.env.PHAROS_RPC_URL || "https://atlantic.dplabs-internal.com";
const CHAIN_ID = envInt("PHAROS_CHAIN_ID", 688689);
const EXPLORER = process.env.PHAROS_EXPLORER_URL || "https://atlantic.pharosscan.xyz";
const SYMBOL = process.env.PHAROS_NATIVE_SYMBOL || "PHRS";

export const pharos = defineChain({
  id: CHAIN_ID,
  name: "Pharos Atlantic Testnet",
  nativeCurrency: { name: SYMBOL, symbol: SYMBOL, decimals: 18 },
  rpcUrls: { default: { http: [RPC_URL] } },
  blockExplorers: { default: { name: "PharosScan", url: EXPLORER } },
  testnet: true,
});

export const explorerUrl = EXPLORER;

export function publicClient(): PublicClient {
  return createPublicClient({ chain: pharos, transport: http(RPC_URL) });
}

/**
 * Returns a wallet client + account derived from PHAROS_PRIVATE_KEY.
 * Throws a clear error if no key is configured — read-only tools never call this.
 */
export function walletClient(): { client: WalletClient; address: `0x${string}` } {
  const pk = process.env.PHAROS_PRIVATE_KEY;
  if (!pk || !/^0x[0-9a-fA-F]{64}$/.test(pk)) {
    throw new Error(
      "PHAROS_PRIVATE_KEY is missing or malformed. Set a funded testnet key in .env to use write/payment tools."
    );
  }
  const account = privateKeyToAccount(pk as `0x${string}`);
  const client = createWalletClient({ account, chain: pharos, transport: http(RPC_URL) });
  return { client, address: account.address };
}

export function txLink(hash: string): string {
  return `${EXPLORER}/tx/${hash}`;
}
