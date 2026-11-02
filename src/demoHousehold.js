export const DEMO_STORAGE_KEY = "llama-household-video-v1";
export const MEMBERS = {
  adam: { name: "Adam", role: "You", initials: "AD" },
  aisha: { name: "Aisha", role: "Your wife", initials: "AI" },
};
export function initialDemo() {
  return {
    version: 1,
    billPaid: false,
    flightBooked: false,
    pickupScheduled: false,
    reminderSent: false,
    pickupTime: "15:30",
    events: [],
    read: { adam: [], aisha: [] },
  };
}
export function validDemo(value) {
  return (
    value?.version === 1 &&
    ["billPaid", "flightBooked", "pickupScheduled", "reminderSent"].every(
      (k) => typeof value[k] === "boolean",
    ) &&
    /^([01]\d|2[0-3]):[0-5]\d$/.test(value.pickupTime) &&
    Array.isArray(value.events) &&
    value.events.length <= 40 &&
    value.events.every(
      (e) =>
        typeof e.id === "string" &&
        Object.hasOwn(MEMBERS, e.actor) &&
        ["bill", "flight", "pickup", "reminder"].includes(e.kind) &&
        typeof e.title === "string" &&
        typeof e.detail === "string" &&
        typeof e.time === "string",
    ) &&
    ["adam", "aisha"].every((k) => Array.isArray(value.read?.[k]))
  );
}
export function demoReducer(state, action) {
  if (action.type === "reset") return initialDemo();
  if (!Object.hasOwn(MEMBERS, action.actor)) return state;
  if (action.type === "read")
    return {
      ...state,
      read: { ...state.read, [action.actor]: state.events.map((e) => e.id) },
    };
  const labels = {
    bill: [
      "Electricity bill marked paid",
      "TNB electricity · RM 185.50 · manually marked paid in this demo.",
    ],
    flight: [
      "Penang flight marked booked",
      "Kuala Lumpur → Penang · Family of four · sample booking, not a real ticket.",
    ],
    pickup: [
      "School pickup scheduled",
      `School pickup at ${action.pickupTime || state.pickupTime} · Aisha is the designated driver in this scenario.`,
    ],
    reminder: [
      "School pickup reminder",
      `Pickup is at ${state.pickupTime}. This reminder was triggered manually for the recording.`,
    ],
  };
  if (!Object.hasOwn(labels, action.type)) return state;
  if (
    (action.type === "bill" && state.billPaid) ||
    (action.type === "flight" && state.flightBooked) ||
    (action.type === "pickup" && state.pickupScheduled) ||
    (action.type === "reminder" &&
      (!state.pickupScheduled || state.reminderSent))
  )
    return state;
  if (
    action.type === "pickup" &&
    !/^([01]\d|2[0-3]):[0-5]\d$/.test(action.pickupTime)
  )
    return state;
  const [title, detail] = labels[action.type];
  const event = {
    id: action.id,
    actor: action.actor,
    kind: action.type,
    title,
    detail,
    time: action.time,
  };
  return {
    ...state,
    billPaid: state.billPaid || action.type === "bill",
    flightBooked: state.flightBooked || action.type === "flight",
    pickupScheduled: state.pickupScheduled || action.type === "pickup",
    reminderSent: state.reminderSent || action.type === "reminder",
    pickupTime: action.type === "pickup" ? action.pickupTime : state.pickupTime,
    events: [event, ...state.events].slice(0, 40),
  };
}
export function unreadCount(state, member) {
  return state.events.filter((e) => !state.read[member].includes(e.id)).length;
}
