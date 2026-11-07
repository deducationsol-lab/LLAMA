import assert from "node:assert/strict";
import React from "react";
import { renderToString } from "react-dom/server";
import { createServer } from "vite";

const server = await createServer({ server: { middlewareMode: true } });
try {
  const { default: App } = await server.ssrLoadModule("/src/App.jsx");
  const { default: Settings } = await server.ssrLoadModule("/src/Settings.jsx");
  const { default: InfoPage } = await server.ssrLoadModule("/src/InfoPage.jsx");
  const render = (component, props = {}) => renderToString(React.createElement(component, props));
  const app = render(App);
  for (const text of ["Email", "FAQ", "Privacy policy"]) assert.ok(app.includes(text));
  const family = { household: null, members: [], invites: [], reminders: [] };
  const guest = render(Settings, { user: { id: "guest" }, family });
  assert.match(guest, /guest session/);
  assert.match(guest, /aria-checked="false" disabled/);
  assert.doesNotMatch(guest, /Permanently delete my account/);
  const user = { id: "anchor", name: "Anchor", username: "anchor_test" };
  const setup = render(Settings, { user, family });
  for (const text of ["Create a household", "Join your family", "Delete my account"]) assert.ok(setup.includes(text));
  family.household = { id: "hh", name: "Test household", ownerId: "anchor" };
  family.members = [user, { id: "member", name: "Member" }];
  const ownerSettings = render(Settings, { user, family });
  for (const text of ["Create invitation", "Make anchor", "Schedule reminder", "Delete shared household"]) assert.ok(ownerSettings.includes(text));
  const memberSettings = render(Settings, { user: family.members[1], family });
  assert.match(memberSettings, /Leave household/);
  assert.doesNotMatch(memberSettings, /Create invitation|Delete shared household|Make anchor/);
  assert.match(render(InfoPage, { page: "privacy" }), /Retention and deletion/);
  assert.match(render(InfoPage, { page: "faq" }), /How do I join my family/);
  console.log("Settings render checks pass: signed-out auth/help, guest restrictions, anchor/member controls, FAQ and privacy. No hosted session or notifications used.");
} finally {
  await server.close();
}
