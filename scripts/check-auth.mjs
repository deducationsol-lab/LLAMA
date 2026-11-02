import assert from "node:assert/strict";
import {
  householdAuthOptions,
  googleSignInOptions,
} from "../src/householdAuth.js";
assert.equal(householdAuthOptions.flowType, "pkce");
assert.equal(householdAuthOptions.detectSessionInUrl, true);
const options = googleSignInOptions("https://llama-everyday.vercel.app");
assert.equal(options.provider, "google");
assert.equal(
  options.options.redirectTo,
  "https://llama-everyday.vercel.app/?household=1",
);
assert.equal(options.options.scopes, "openid email profile");
assert.equal(options.options.queryParams.prompt, "select_account");
assert.ok(!JSON.stringify(options).includes("gmail.read"));
assert.equal(
  googleSignInOptions("http://localhost:3000").options.redirectTo,
  "http://localhost:3000/?household=1",
);
assert.throws(() => googleSignInOptions("http://unsafe.invalid"));
console.log(
  "OAuth options checks pass: PKCE, same-origin return, account selection, identity-only scopes and HTTPS. Real Google authorization requires provider setup.",
);
