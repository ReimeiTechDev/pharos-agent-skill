import { test } from "node:test";
import assert from "node:assert/strict";
import { TOOLS, getTool, zodToJsonSchema } from "../src/tools.ts";
import { resolveToken } from "../src/tokens.ts";

test("every tool has a unique name, description and schema", () => {
  const names = new Set<string>();
  for (const t of TOOLS) {
    assert.ok(t.name.startsWith("pharos_"), `bad name: ${t.name}`);
    assert.ok(t.description.length > 10, `desc too short: ${t.name}`);
    assert.ok(!names.has(t.name), `duplicate: ${t.name}`);
    names.add(t.name);
  }
  assert.ok(TOOLS.length >= 6);
});

test("getTool throws on unknown", () => {
  assert.throws(() => getTool("nope"));
  assert.ok(getTool("pharos_network_info"));
});

test("zodToJsonSchema emits object schema with required fields", () => {
  const js = zodToJsonSchema(getTool("pharos_get_native_balance").schema) as any;
  assert.equal(js.type, "object");
  assert.deepEqual(js.required, ["address"]);
  assert.equal(js.properties.address.type, "string");
});

test("resolveToken accepts raw 0x addresses", () => {
  const a = "0x1111111111111111111111111111111111111111";
  assert.equal(resolveToken(a).address, a);
});

test("resolveToken rejects unconfigured symbols with guidance", () => {
  assert.throws(() => resolveToken("USDC"), /no address configured/);
  assert.throws(() => resolveToken("FOO"), /Unknown token/);
});
