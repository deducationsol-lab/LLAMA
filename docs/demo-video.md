# LLAMA: three-minute household demo

## Open and reset

Open the deployed app with `/#demo` at the end of its URL, or choose **Household demo** from the main dashboard. No sign-in, database, notification permission, API key or external model is needed. Select **Reset demo** before each take. The reset clears the demo records, both inboxes, read markers and progress; member returns to Adam and pickup time to 15:30. `sessionStorage` preserves the demo within this browser tab across refreshes; it is not a shared database or synchronization between real phones. If browser storage is unavailable, the UI works in memory and warns that refresh resets it.

**Keep “INTERACTIVE DEMO” and the simulation disclosure visible in your recording.** All notification previews and scenario text are deterministic client code, not responses from Meta Muse. The existing Meta Muse endpoint remains separate and untouched; do not call the demo notification flow “live AI” or claim phones actually received a push.

## Suggested recording

| Time      | Action                                                                                  | Narration idea                                                                                                                                                                                              |
| --------- | --------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0:00–0:30 | Open `/#demo`. Explain the family scenario.                                             | “LLAMA is my independent everyday-life project for the Build for Your World track. This simulated household shows how small updates can keep a family coordinated.”                                         |
| 0:30–1:15 | As Adam, click **Mark electricity paid**. Scroll to the two phone previews.             | “Adam manually marks the RM 185.50 electricity bill paid. Both views immediately show the same update and who handled it. No actual payment is made.”                                                       |
| 1:15–2:00 | Click **Make next update as Aisha**, scroll to the cards, click **Mark flight booked**. | “Aisha marks their sample Penang flight booked. Adam sees her update too. This illustrates a household notification, not a purchased ticket or a delivered phone push.”                                     |
| 2:00–2:40 | Choose a pickup time, click **Schedule school pickup**, then **Preview reminder now**.  | “The pickup time is shared. For the recording, this button triggers a reminder immediately in both simulated inboxes; no background scheduler is running.”                                                  |
| 2:40–3:00 | Show the activity list and per-person unread/read state.                                | “Each member can see who did what. These two perspectives run in one browser tab. The separate real shared-household implementation uses Supabase and Web Push but still needs live two-device validation.” |

The app includes this guide behind **3-minute video guide**. The scenario supports acting as either member, distinct per-member read state and duplicate prevention. Reading one inbox does not clear the other. It is deliberately repeatable, not an autonomous AI demo.

## Scope

This feature is isolated on a production-based branch; it does not merge draft PR #2's Supabase/Web Push migrations, auth, service worker or cron configuration. Production and its secrets are not changed by opening the demo PR. Existing dashboard views and Meta Muse calls continue to work as before. Demo data never enters the Muse endpoint, Supabase or a push service.

Run `npm run check:demo`, `npm run check:agent` and `npm run build` for focused local checks. The demo check exercises deterministic state updates, member attribution, per-member inboxes/read state, pickup time validation, duplicate guards, reminder ordering, reset and persisted-state validation. Browser verification should cover both member perspectives, every step, a refresh, a reset, navigation back to the original dashboard and mobile layout.
