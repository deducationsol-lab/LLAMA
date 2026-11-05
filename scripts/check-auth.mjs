// Focused offline reproduction: no users are created and no emails are sent.
import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";
import { googleSignInOptions, emailConfirmationOptions, authErrorMessage } from "../src/lib/auth.js";

const requests = [];
const client = createClient("https://auth.example.test", "test-publishable-key", {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  global: {
    fetch: async (input, init) => {
      requests.push({ url: String(input), body: JSON.parse(init.body) });
      return new Response(JSON.stringify({ user: { id: "test-user", identities: [] }, session: null }), {
        status: 200, headers: { "Content-Type": "application/json" },
      });
    },
  },
});
const origin = "https://llama.example.test";
const google = googleSignInOptions(origin);
const { data, error } = await client.auth.signInWithOAuth({
  ...google, options: { ...google.options, skipBrowserRedirect: true },
});
assert.equal(error, null);
const url = new URL(data.url);
assert.equal(url.pathname, "/auth/v1/authorize");
assert.equal(url.searchParams.get("provider"), "google");
assert.equal(url.searchParams.get("redirect_to"), origin + "/");
assert.equal(url.searchParams.get("scopes"), "openid email profile");
assert.equal(url.searchParams.get("prompt"), "select_account");
assert.equal(requests.length, 0);

const signup = await client.auth.signUp({
  email: "test@example.test", password: "test-only-password",
  options: { data: { display_name: "Test" }, ...emailConfirmationOptions(origin) },
});
assert.equal(signup.error, null);
assert.equal(signup.data.session, null);
assert.equal(new URL(requests[0].url).searchParams.get("redirect_to"), origin + "/");
assert.equal(requests[0].body.data.display_name, "Test");

const resend = await client.auth.resend({
  type: "signup", email: "test@example.test", options: emailConfirmationOptions(origin),
});
assert.equal(resend.error, null);
assert.equal(new URL(requests[1].url).pathname, "/auth/v1/resend");
assert.equal(new URL(requests[1].url).searchParams.get("redirect_to"), origin + "/");
assert.equal(requests[1].body.type, "signup");
assert.match(authErrorMessage({ code: "over_email_send_rate_limit" }), /wait/i);
assert.match(authErrorMessage({ code: "email_address_not_authorized" }), /isn't configured/);
assert.match(authErrorMessage({ message: "Unsupported provider: provider is not enabled" }), /enable Google/);
assert.equal(authErrorMessage({ message: "Email not confirmed" }), "Email not confirmed");
console.log("Auth checks passed: Google options, signup/resend redirects, confirmation-required session, error feedback. No live authentication performed.");
