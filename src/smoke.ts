import { getNetworkInfo, getNativeBalance } from "./skill.js";

/**
 * No-key, no-OpenAI connectivity check. Proves the Skill talks to Pharos.
 * Run: `npm run smoke`. Great as the opening shot of the demo video.
 */
async function main() {
  console.log("→ Connecting to Pharos…");
  const net = await getNetworkInfo();
  console.log("  chainId:", net.chainId);
  console.log("  block:  ", net.blockNumber);
  console.log("  gas:    ", net.gasPriceGwei, "gwei");

  const probe = "0x000000000000000000000000000000000000dead";
  const bal = await getNativeBalance(probe);
  console.log(`  balance(${probe}):`, bal.formatted, bal.symbol);
  console.log("✓ Pharos Skill is live.");
}

main().catch((e) => {
  console.error("✗ Smoke test failed:", e instanceof Error ? e.message : e);
  process.exit(1);
});
