// Focused regression check: no credentials or external model calls required.
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { createServer } from "node:http";
import {
  configuration,
  runAgent,
  validateInput,
  selectTask,
} from "../server/llama.js";
import { createHandler } from "../api/agent.js";

const env = {
  LLAMA_API_KEY: randomBytes(24).toString("hex"),
  LLAMA_ACCESS_CODE: randomBytes(24).toString("hex"),
  LLAMA_MODEL: "example-model",
  LLAMA_PROVIDER: "llama",
};
const input = validateInput({
  task: "general",
  prompt: "Plan meals",
  context: {
    preferences: { dietary: "Halal", ignored: "omit" },
    groceries: [{ name: "Rice", inPantry: true, estPrice: 10 }],
    unexpected: "omit",
  },
});
assert.equal(input.context.preferences.ignored, undefined);
assert.equal(input.context.unexpected, undefined);
assert.equal(configuration({}).configured, false);
assert.equal(configuration(env).configured, true);
assert.equal(
  configuration({ ...env, LLAMA_BASE_URL: "http://unsafe.invalid" }).configured,
  false,
);
assert.equal(selectTask("general", "review bills"), "bills");
assert.equal(selectTask("schedule", "review bills"), "schedule");
assert.throws(() => validateInput({ prompt: "x".repeat(2001) }), /2000/);
assert.throws(
  () => validateInput({ task: "bank-transfer", prompt: "pay" }),
  /supported/,
);
assert.throws(
  () => validateInput({ prompt: "x", context: { bills: Array(51).fill({}) } }),
  /50/,
);
assert.throws(
  () => validateInput({ prompt: "x", context: { groceries: [null] } }),
  /50/,
);

let calls = 0;
const fakeFetch = async (url, options) => {
  calls++;
  assert.equal(String(url), "https://api.llama.com/v1/chat/completions");
  const body = JSON.parse(options.body);
  assert.equal(body.model, env.LLAMA_MODEL);
  assert.equal(body.max_completion_tokens, 1200);
  assert.match(body.messages[0].content, /No tools are connected/);
  assert.match(body.messages[1].content, /Halal/);
  assert.ok(!JSON.stringify(body).includes(env.LLAMA_API_KEY));
  return Response.json({
    completion_message: {
      content: { type: "text", text: "Use rice from the pantry." },
    },
  });
};
const native = await runAgent(input, { env, fetchImpl: fakeFetch });
assert.equal(native.agent, "HOME-03");
assert.equal(native.answer, "Use rice from the pantry.");
assert.equal(calls, 1);
const compatible = await runAgent(input, {
  env: {
    ...env,
    LLAMA_PROVIDER: "openai-compatible",
    LLAMA_BASE_URL: "https://example.invalid/v1/",
  },
  fetchImpl: async (url, options) => {
    assert.equal(url, "https://example.invalid/v1/chat/completions");
    assert.equal(JSON.parse(options.body).max_tokens, 1200);
    assert.equal(options.redirect, "error");
    return Response.json({
      choices: [{ message: { content: "A meal proposal." } }],
    });
  },
});
assert.equal(compatible.answer, "A meal proposal.");
for (const [status, code] of [
  [401, "provider_auth"],
  [403, "provider_auth"],
  [429, "provider_limit"],
  [500, "provider_error"],
]) {
  await assert.rejects(
    runAgent(input, {
      env,
      fetchImpl: async () =>
        new Response("private provider diagnostic", { status }),
    }),
    (error) =>
      error.code === code &&
      !error.message.includes("private provider diagnostic"),
  );
}
await assert.rejects(
  runAgent(input, { env, fetchImpl: async () => Response.json({}) }),
  (error) => error.code === "invalid_response",
);
await assert.rejects(
  runAgent(input, {
    env,
    fetchImpl: async () => {
      throw new DOMException("timeout", "TimeoutError");
    },
  }),
  (error) => error.status === 504,
);
await assert.rejects(
  runAgent(input, { env: {}, fetchImpl: fakeFetch }),
  (error) => error.status === 503,
);

// Exercise the real HTTP handler with mocked provider output (not a network stub of the handler).
let providerCalls = 0;
let currentTime = 0;
const handler = createHandler({
  env,
  limits: new Map(),
  running: new Set(),
  now: () => currentTime,
  run: async (validated) => {
    providerCalls++;
    return { agent: "HOME-03", answer: "Proposal only", task: validated.task };
  },
});
const server = createServer(handler);
await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const url = `http://127.0.0.1:${server.address().port}/api/agent`;
const request = (body, headers = {}) =>
  fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Llama-Access-Code": env.LLAMA_ACCESS_CODE,
      ...headers,
    },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
try {
  const status = await fetch(url);
  const statusText = await status.text();
  assert.equal(status.status, 200);
  assert.equal(status.headers.get("cache-control"), "no-store");
  assert.ok(!statusText.includes(env.LLAMA_API_KEY));
  assert.ok(!statusText.includes(env.LLAMA_ACCESS_CODE));
  assert.equal(
    (await request({ prompt: "hi" }, { "X-Llama-Access-Code": "" })).status,
    401,
  );
  assert.equal(providerCalls, 0);
  assert.equal((await request("{invalid")).status, 400);
  assert.equal(
    (await request({ prompt: "hi" }, { "Content-Type": "text/plain" })).status,
    415,
  );
  assert.equal((await request({ prompt: "x".repeat(50000) })).status, 413);
  const result = await request({ prompt: "Plan meals" });
  assert.equal(result.status, 200);
  assert.equal((await result.json()).answer, "Proposal only");
  assert.equal(providerCalls, 1);
  await request({ prompt: "a" });
  await request({ prompt: "b" });
  assert.equal((await request({ prompt: "c" })).status, 429);
  currentTime = 61000;
  assert.equal((await request({ prompt: "reset" })).status, 200);
  assert.equal((await fetch(url, { method: "DELETE" })).status, 405);
} finally {
  await new Promise((resolve) => server.close(resolve));
}
console.log(
  "Agent regression checks passed: native and compatible protocols, validation, auth, redacted failures, limits, and real HTTP routing. No external calls made.",
);
