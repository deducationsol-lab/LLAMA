# LLAMA

<p align="center">
  <img src="public/llama-logo.png" alt="LLAMA mascot: a blue llama with orange ears and a lightning-bolt medallion" width="220" height="220" />
</p>

**A little help. A lot more life.** A React + Vite household dashboard with a server-side Llama planning endpoint. Four specialist roles cover travel, bills, pantry/meal planning, and daily routines; a coordinator routes general requests. These are role prompts using one configured model, not four autonomous services or connected external networks.

## What works now

- Household forms and sample records work without an API. Changes are session-only and reset on refresh.
- Quick actions and the prompt form call `/api/agent` for real model suggestions when configured and unlocked.
- Household preferences and bounded lists are sent to the configured model provider only when the user submits a request. Do not enter sensitive real household data into a shared hackathon demo.
- Model output is displayed as plain text and never executed, injected as HTML, or applied automatically to bills, groceries, travel or routines.
- Missing setup, invalid access, provider authentication/quota failures, timeouts and empty responses are shown as errors. There is no simulated-success fallback or background model polling.
- The activity feed records actual requests/results and explicit manual bill edits, not fabricated external tool calls. Agent cards describe roles, not invented CPU usage or processing statistics.

## Connect the API later

Do **not** paste credentials into chat, the browser, a commit, or a `VITE_` variable.

| Server variable     | Purpose                                                                                                                                                                                                                   |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `LLAMA_PROVIDER`    | `llama` for the official Llama API protocol (default), or `openai-compatible` for a provider explicitly documenting that protocol.                                                                                        |
| `LLAMA_API_KEY`     | Your provider-issued API key. Store as a Secret.                                                                                                                                                                          |
| `LLAMA_MODEL`       | The exact model ID available to your account. No assumed model default.                                                                                                                                                   |
| `LLAMA_BASE_URL`    | Optional for `llama` (official SDK default is `https://api.llama.com/v1`). Required for `openai-compatible`; use the provider's full API base including `/v1` where needed. HTTPS only, no embedded credentials or query. |
| `LLAMA_ACCESS_CODE` | A separate private demo password, 16–256 characters. Store as a Secret. Never use your API key here.                                                                                                                      |

Meta Model API, Llama API, and Llama Stack are distinct services. Before adding your hackathon key, verify the **endpoint, model ID and request/response protocol** against its documentation. This adapter supports the official [Llama API SDK](https://github.com/meta-llama/llama-api-typescript) and OpenAI-compatible chat completions; it does not assume a different Meta Model API is interchangeable.

### On Vercel

The existing Vite project serves its frontend and the Node handler in `api/agent.js` on the same origin. No Render deployment, browser API key, or public backend URL is needed.

1. Open your project, then **Environment Variables** in the sidebar. Add the variables above for the intended Preview branch/environment first. Use the **Secret** type for the API key and demo access code. See [Vercel environment-variable documentation](https://vercel.com/docs/environment-variables/managing-environment-variables) and [Secret types](https://vercel.com/docs/environment-variables/sensitive-environment-variables).
2. Create a new deployment/redeploy after saving; existing deployments don't acquire new values.
3. Click **Recheck API**. “API configured” means the settings are present, **not** that credentials or model access have been verified.
4. Enter only the separate household demo access code in the app. Submit a small request such as “Suggest a dinner using our pantry.” A successful response shows the agent role, configured model and provider protocol.
5. Keep the preview/access code private and set provider-side quota/spend controls before sharing with judges. If secrets differ between Preview and Production, use each environment's own values.

All Vercel configuration changes and deployments require the project's normal approval flow. This repository does not set credentials or promote production automatically.

### Locally

Use Node 26 (the linked project's runtime). From the repository root:

```bash
npm install
cp .env.example .env.local
# Fill .env.local privately with the provider settings and a separate demo access code.
npm run dev:api
```

In a second terminal:

```bash
npm run dev
```

Vite runs at `http://localhost:3000` and proxies `/api` to `127.0.0.1:8080`. The API uses the same handler as Vercel. Restart `dev:api` after changing environment variables. `npm start` starts only the standalone API, not the frontend. An optional Render blueprint is included for API-only hosting; the default frontend intentionally uses same-origin requests and does not automatically connect to Render.

## Checks

```bash
npm run check:agent
npm run build
```

The focused regression script exercises both provider protocols with fake provider responses and the real HTTP handler: configuration, input bounds, role selection, authentication, sanitized failures, quota and timeout handling, and burst limits. It never needs a real key or makes external model calls. A live credentialed response must still be verified after setup.

## Demo security and limitations

- The API fails closed unless the provider configuration and private access code are present. The access code is held in browser memory only and is never the provider API key.
- Requests require JSON, a bounded context and an access-code header; provider calls have a 25-second timeout, no automatic retries, a 1200-token output cap, and no redirects. The browser blocks duplicate submissions.
- A best-effort **per-instance** guard allows at most six authenticated attempts/minute and one in flight. It is not a durable/global rate limit and can reset on cold start or scale-out. The shared demo password is not household user authentication. Add real authentication, durable quotas and storage before public/multi-household production use.
- There are no live bank, grocery, flight, calendar, weather or home-device integrations. Plans and prices are suggestions/estimates, not verified availability or executed actions. No vector database is connected and no time-saved claims are generated.
- No records are stored on the server; the earlier invalid file “database” (actually misplaced JavaScript) and broken backend were replaced. Household data remains session-only, except for data sent to the configured provider under its policies.

## Project branding

The app and README use the supplied mascot in `public/llama-logo.png`. Browser and Apple touch icons are alongside it. For GitHub link previews, manually upload `public/github-social-preview.png` (1280 × 640) under **Settings → Social preview → Edit → Upload an image**.
