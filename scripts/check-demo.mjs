import assert from "node:assert/strict";
import {
  demoReducer,
  initialDemo,
  validDemo,
  unreadCount,
} from "../src/demoHousehold.js";
let state = initialDemo();
const apply = (type, actor = "adam", extra = {}) => {
  state = demoReducer(state, {
    type,
    actor,
    id: `event-${state.events.length}`,
    time: "2026-11-02T08:00:00.000Z",
    ...extra,
  });
};
assert.equal(validDemo(state), true);
assert.equal(unreadCount(state, "aisha"), 0);
apply("reminder");
assert.equal(state.events.length, 0);
apply("bill");
assert.equal(state.billPaid, true);
assert.equal(state.events[0].actor, "adam");
assert.equal(unreadCount(state, "adam"), 1);
assert.equal(unreadCount(state, "aisha"), 1);
const paid = state;
apply("bill");
assert.equal(state, paid);
apply("read", "aisha");
assert.equal(unreadCount(state, "aisha"), 0);
assert.equal(unreadCount(state, "adam"), 1);
assert.equal(state.billPaid, true);
apply("flight", "aisha");
assert.equal(state.flightBooked, true);
assert.equal(state.events[0].actor, "aisha");
assert.equal(unreadCount(state, "adam"), 2);
assert.equal(unreadCount(state, "aisha"), 1);
apply("pickup", "adam", { pickupTime: "99:99" });
assert.equal(state.pickupScheduled, false);
apply("pickup", "aisha", { pickupTime: "15:45" });
assert.equal(state.pickupScheduled, true);
assert.equal(state.pickupTime, "15:45");
assert.match(state.events[0].detail, /15:45/);
apply("reminder", "adam");
assert.equal(state.reminderSent, true);
assert.match(state.events[0].detail, /15:45/);
assert.equal(state.events.length, 4);
const complete = state;
apply("reminder");
assert.equal(state, complete);
assert.equal(validDemo(state), true);
assert.equal(validDemo(JSON.parse(JSON.stringify(state))), true);
assert.equal(validDemo({ ...state, pickupTime: "bad" }), false);
assert.equal(validDemo({ ...state, events: [{ actor: "outsider" }] }), false);
apply("reset");
assert.deepEqual(state, initialDemo());
assert.equal(unreadCount(state, "adam"), 0);
assert.equal(unreadCount(state, "aisha"), 0);
console.log(
  "Demo checks passed: bill/flight/pickup updates, both inboxes, attribution, per-member read state, time validation, deterministic reminders, duplicate prevention, reset and persistence validation. No API or push calls.",
);
