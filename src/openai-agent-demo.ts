import OpenAI from "openai";
import { TOOLS, getTool, zodToJsonSchema } from "./tools.js";

/**
 * Demo: an OpenAI function-calling agent that uses the Pharos Skill.
 *
 * This is the "Skill → Agent" bridge in miniature and the easiest thing to film
 * for the required demo video: ask the agent a natural-language question, watch
 * it call the on-chain Skill tools and answer. Run: `npm run demo -- "<prompt>"`.
 *
 * It reuses the EXACT same TOOLS surface as the MCP server — one Skill, two
 * transports — which is the composability the hackathon rewards.
 */
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";

const openaiTools = TOOLS.map((t) => ({
  type: "function" as const,
  function: { name: t.name, description: t.description, parameters: zodToJsonSchema(t.schema) },
}));

async function run(userPrompt: string) {
  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    {
      role: "system",
      content:
        "You are a Pharos on-chain agent. Use the pharos_* tools to answer questions and act on the Pharos network. Always cite tx hashes / explorer links you receive.",
    },
    { role: "user", content: userPrompt },
  ];

  for (let step = 0; step < 6; step++) {
    const res = await openai.chat.completions.create({ model: MODEL, messages, tools: openaiTools });
    const msg = res.choices[0].message;
    messages.push(msg);
    if (!msg.tool_calls?.length) {
      console.log("\n🧠 Agent:", msg.content);
      return;
    }
    for (const call of msg.tool_calls) {
      const tool = getTool(call.function.name);
      let out: unknown;
      try {
        const args = tool.schema.parse(JSON.parse(call.function.arguments || "{}"));
        out = await tool.handler(args);
        console.log(`🔧 ${call.function.name}(${call.function.arguments}) →`, JSON.stringify(out));
      } catch (e) {
        out = { error: e instanceof Error ? e.message : String(e) };
        console.log(`🔧 ${call.function.name} errored →`, out);
      }
      messages.push({ role: "tool", tool_call_id: call.id, content: JSON.stringify(out) });
    }
  }
}

const prompt =
  process.argv.slice(2).join(" ") ||
  "What chain am I connected to, and what is the native balance of 0x0000000000000000000000000000000000000000?";
run(prompt).catch((e) => {
  console.error(e);
  process.exit(1);
});
