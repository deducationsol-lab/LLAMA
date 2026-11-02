import React, { useEffect, useReducer, useState } from "react";
import {
  ArrowUpRight,
  Bell,
  Check,
  CheckCircle2,
  Clock,
  Plane,
  Receipt,
  RotateCcw,
  Users,
  Sparkles,
  ShieldCheck,
  ArrowLeft,
  Play,
} from "lucide-react";
import {
  DEMO_STORAGE_KEY,
  MEMBERS,
  initialDemo,
  validDemo,
  demoReducer,
  unreadCount,
} from "./demoHousehold";
import "./household-demo.css";
function loadDemo() {
  try {
    const value = JSON.parse(sessionStorage.getItem(DEMO_STORAGE_KEY));
    if (validDemo(value)) return value;
  } catch {}
  return initialDemo();
}
const icons = { bill: Receipt, flight: Plane, pickup: Clock, reminder: Bell };
const tones = {
  bill: "coral",
  flight: "violet",
  pickup: "green",
  reminder: "yellow",
};
export default function HouseholdDemo() {
  const [state, dispatch] = useReducer(demoReducer, undefined, loadDemo);
  const [actor, setActor] = useState("adam"),
    [pickupTime, setPickupTime] = useState(state.pickupTime),
    [toast, setToast] = useState(null),
    [showScript, setShowScript] = useState(false),
    [storageWarning, setStorageWarning] = useState(false);
  useEffect(() => {
    try {
      sessionStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(state));
    } catch {
      setStorageWarning(true);
    }
  }, [state]);
  const act = (type) => {
    const id = crypto.randomUUID();
    dispatch({ type, actor, pickupTime, id, time: new Date().toISOString() });
    setToast({ kind: type, actor });
  };
  const reset = () => {
    dispatch({ type: "reset" });
    setActor("adam");
    setPickupTime("15:30");
    setToast(null);
  };
  const done = [state.billPaid, state.flightBooked, state.reminderSent].filter(
    Boolean,
  ).length;
  return (
    <div className="demo-app">
      <header className="demo-header">
        <a
          href="#demo"
          className="demo-brand"
          aria-label="LLAMA household demo"
        >
          <img src="/llama-logo.png" width="43" height="43" alt="" />
          <span>
            llama<span className="demo-purple">.</span>
          </span>
        </a>
        <span className="demo-mode">
          <Play size={12} fill="currentColor" /> INTERACTIVE DEMO
        </span>
        <a className="demo-back" href="#">
          <ArrowLeft size={14} /> Back to app
        </a>
      </header>
      <main className="demo-main">
        <div className="demo-intro">
          <div>
            <p className="demo-eyebrow">LESS LIFE ADMIN. MORE LIFE TOGETHER.</p>
            <h1>
              One household.
              <br />
              Everyone in the loop<span>.</span>
            </h1>
            <p className="demo-subtitle">
              A bill handled. A trip planned. A pickup remembered.
              <br />
              The little things, shared with the people who matter.
            </p>
          </div>
          <div className="demo-orbit" aria-hidden="true">
            <span className="demo-orbit-ring" />
            <img src="/llama-logo.png" alt="" />
            <span className="demo-orbit-pill">
              <Users size={15} /> Better, together.
            </span>
            <Sparkles className="demo-orbit-star" size={32} />
          </div>
        </div>
        <div className="demo-disclosure">
          <ShieldCheck size={20} />
          <p>
            <strong>Simulated household demo.</strong> Both member views run in
            this browser tab. Notifications below are in-app previews—not phone
            pushes. No real payments, bookings, scheduled deliveries or AI calls
            are made.
          </p>
        </div>
        {storageWarning && (
          <p className="demo-storage-warning" role="status">
            Browser storage is unavailable. This demo still works, but
            refreshing will reset it.
          </p>
        )}
        <section className="demo-controls" aria-label="Recording controls">
          <div className="demo-progress">
            <span>{done}/3</span>
            <div>
              <strong>Your three-minute story</strong>
              <p>Pay a bill → book a trip → remember the pickup</p>
            </div>
          </div>
          <div className="demo-control-actions">
            <button
              className="demo-button secondary"
              onClick={() => setShowScript((s) => !s)}
              aria-expanded={showScript}
            >
              <Play size={14} />
              {showScript ? "Hide video guide" : "3-minute video guide"}
            </button>
            <button className="demo-button secondary" onClick={reset}>
              <RotateCcw size={14} />
              Reset demo
            </button>
          </div>
        </section>
        {showScript && (
          <section
            className="demo-script"
            aria-label="Three-minute recording guide"
          >
            <h2>Your recording, made simple.</h2>
            <ol>
              <li>
                <strong>0:00–0:30 · The idea.</strong> “LLAMA is my
                everyday-life project for Build for Your World. This labeled
                simulation shows how a family could stay coordinated.”
              </li>
              <li>
                <strong>0:30–1:15 · Bills.</strong> As Adam, mark electricity
                paid. Show both notification previews, then open Aisha’s view
                and read the same update.
              </li>
              <li>
                <strong>1:15–2:00 · Travel.</strong> As Aisha, mark the Penang
                flight booked. Adam sees who updated it. Explain that booking is
                manually marked, not a real purchase.
              </li>
              <li>
                <strong>2:00–2:40 · Pickup.</strong> Schedule school pickup,
                then click “Preview reminder now.” Both inboxes receive the
                simulated reminder.
              </li>
              <li>
                <strong>2:40–3:00 · Be clear.</strong> “The demo runs locally in
                one tab. The separate shared-household implementation uses
                Supabase and Web Push; live two-phone delivery still needs
                validation. Meta Muse is a separate provider connection, not the
                source of these scripted notifications.”
              </li>
            </ol>
          </section>
        )}
        <section
          className="demo-workspace"
          aria-label="Simulated household workspace"
        >
          <div className="demo-section-heading">
            <div>
              <p className="demo-eyebrow">
                THE RAHMAN FAMILY · SAMPLE HOUSEHOLD
              </p>
              <h2>Small updates. Shared peace of mind.</h2>
            </div>
            <span className="demo-local-label">
              <span /> Same-tab simulation
            </span>
          </div>
          <div className="demo-actor-bar">
            <div>
              <span className="demo-field-label">
                Who’s making this update?
              </span>
              <div
                className="demo-member-toggle"
                role="group"
                aria-label="Active household member"
              >
                {Object.entries(MEMBERS).map(([id, m]) => (
                  <button
                    key={id}
                    aria-pressed={actor === id}
                    className={actor === id ? "selected" : ""}
                    onClick={() => {
                      setActor(id);
                      setToast(null);
                    }}
                  >
                    <span className={`demo-avatar ${id}`}>{m.initials}</span>
                    <span>
                      {m.name}
                      <small>{m.role}</small>
                    </span>
                    {actor === id && <Check size={16} />}
                  </button>
                ))}
              </div>
            </div>
            <p>
              Switch perspectives to see the same records.
              <br />
              <strong>Acting as {MEMBERS[actor].name}.</strong>
            </p>
          </div>
          <div className="demo-task-grid">
            <article className="demo-task">
              <div className="demo-task-art coral">
                <Receipt size={27} />
                <span>01 / LIFE ADMIN</span>
                <span
                  className={`demo-task-state ${state.billPaid ? "completed" : ""}`}
                >
                  {state.billPaid ? "Marked paid" : "Pending"}
                </span>
              </div>
              <div className="demo-task-body">
                <h3>One less bill on your mind.</h3>
                <p>Electricity · Tenaga Nasional</p>
                <strong className="demo-amount">RM 185.50</strong>
                <div className="demo-task-note">
                  {state.billPaid
                    ? `${MEMBERS[state.events.find((e) => e.kind === "bill")?.actor || "adam"].name} marked this sample bill paid. Both views updated.`
                    : "Manually mark this sample electricity bill paid and let your household know."}
                </div>
                <button
                  className="demo-button primary"
                  disabled={state.billPaid}
                  onClick={() => act("bill")}
                >
                  {state.billPaid ? (
                    <>
                      <CheckCircle2 size={16} />
                      Paid · demo
                    </>
                  ) : (
                    <>
                      <Receipt size={16} />
                      Mark electricity paid
                    </>
                  )}
                </button>
              </div>
            </article>
            <article className="demo-task">
              <div className="demo-task-art violet">
                <Plane size={27} />
                <span>02 / FAMILY TRAVEL</span>
                <span
                  className={`demo-task-state ${state.flightBooked ? "completed" : ""}`}
                >
                  {state.flightBooked ? "Marked booked" : "Planning"}
                </span>
              </div>
              <div className="demo-task-body">
                <h3>Next stop: more together.</h3>
                <p>
                  Kuala Lumpur <span aria-hidden="true">→</span> Penang
                </p>
                <strong className="demo-amount">
                  4 tickets<span> / sample trip</span>
                </strong>
                <div className="demo-task-note">
                  {state.flightBooked
                    ? "A sample flight is marked booked. No tickets were purchased or verified."
                    : "When someone handles the tickets, everyone can see the plan. Sample itinerary only."}
                </div>
                <button
                  className="demo-button primary"
                  disabled={state.flightBooked}
                  onClick={() => act("flight")}
                >
                  {state.flightBooked ? (
                    <>
                      <CheckCircle2 size={16} />
                      Booked · demo
                    </>
                  ) : (
                    <>
                      <Plane size={16} />
                      Mark flight booked
                    </>
                  )}
                </button>
              </div>
            </article>
            <article className="demo-task">
              <div className="demo-task-art green">
                <Clock size={27} />
                <span>03 / THE EVERYDAY</span>
                <span
                  className={`demo-task-state ${state.pickupScheduled ? "completed" : ""}`}
                >
                  {state.reminderSent
                    ? "Reminder previewed"
                    : state.pickupScheduled
                      ? "Scheduled · demo"
                      : "To arrange"}
                </span>
              </div>
              <div className="demo-task-body">
                <h3>Never miss the little moments.</h3>
                <p>School pickup · Aisha driving</p>
                <label className="demo-pickup-label" htmlFor="demo-pickup-time">
                  Pickup time
                  <select
                    id="demo-pickup-time"
                    value={pickupTime}
                    disabled={state.pickupScheduled}
                    onChange={(e) => setPickupTime(e.target.value)}
                  >
                    {Array.from(
                      { length: 96 },
                      (_, i) =>
                        `${String(Math.floor(i / 4)).padStart(2, "0")}:${String((i % 4) * 15).padStart(2, "0")}`,
                    ).map((time) => (
                      <option key={time} value={time}>
                        {time}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="demo-task-note">
                  {state.reminderSent
                    ? "Both views received a reminder preview. No background reminder is scheduled."
                    : state.pickupScheduled
                      ? `Pickup set for ${state.pickupTime}. Trigger the in-app reminder whenever you’re ready to record.`
                      : "Choose a sample pickup time. All times in this demo are local and illustrative."}
                </div>
                {!state.pickupScheduled ? (
                  <button
                    className="demo-button primary"
                    disabled={!pickupTime}
                    onClick={() => act("pickup")}
                  >
                    <Clock size={16} />
                    Schedule school pickup
                  </button>
                ) : (
                  <button
                    className="demo-button primary"
                    disabled={state.reminderSent}
                    onClick={() => act("reminder")}
                  >
                    {state.reminderSent ? (
                      <>
                        <CheckCircle2 size={16} />
                        Reminder previewed
                      </>
                    ) : (
                      <>
                        <Bell size={16} />
                        Preview reminder now
                      </>
                    )}
                  </button>
                )}
              </div>
            </article>
          </div>
        </section>
        {toast && (
          <div className="demo-toast" role="status">
            <span className={`demo-toast-icon ${tones[toast.kind]}`}>
              <Bell size={20} />
            </span>
            <div>
              <strong>Both simulated inboxes updated.</strong>
              <p>
                {MEMBERS[toast.actor].name}{" "}
                {toast.kind === "bill"
                  ? "marked electricity paid"
                  : toast.kind === "flight"
                    ? "marked the Penang flight booked"
                    : toast.kind === "pickup"
                      ? "scheduled school pickup"
                      : "triggered the pickup reminder preview"}
                . No phone push was sent.
              </p>
            </div>
            <button
              aria-label="Dismiss demo confirmation"
              onClick={() => setToast(null)}
            >
              ×
            </button>
          </div>
        )}
        <section className="demo-phones-section">
          <div className="demo-section-heading">
            <div>
              <p className="demo-eyebrow">
                TWO PERSPECTIVES. ONE SHARED EVERYDAY.
              </p>
              <h2>“I’ve got it.” Now everyone knows.</h2>
            </div>
            <span className="demo-preview-pill">
              In-app notification previews
            </span>
          </div>
          <div className="demo-phone-grid">
            {Object.entries(MEMBERS).map(([id, member]) => (
              <article
                key={id}
                className={`demo-phone ${actor === id ? "active" : ""}`}
                aria-label={`${member.name} simulated phone`}
              >
                <div className="demo-phone-speaker" />
                <div className="demo-phone-header">
                  <span className={`demo-avatar ${id}`}>{member.initials}</span>
                  <div>
                    <h3>{member.name}’s view</h3>
                    <p>Simulated phone · same browser</p>
                  </div>
                  <span
                    className="demo-unread"
                    aria-label={`${member.name} unread notifications`}
                  >
                    {unreadCount(state, id)}
                  </span>
                </div>
                <div className="demo-phone-summary">
                  <span>
                    <Receipt size={14} />
                    {state.billPaid
                      ? "Electricity paid"
                      : "Electricity pending"}
                  </span>
                  <span>
                    <Plane size={14} />
                    {state.flightBooked ? "Flight booked" : "Flight planned"}
                  </span>
                  <span>
                    <Clock size={14} />
                    {state.pickupScheduled
                      ? `Pickup ${state.pickupTime}`
                      : "Pickup not set"}
                  </span>
                </div>
                <div className="demo-phone-feed" aria-live="polite">
                  {!state.events.length ? (
                    <div className="demo-empty">
                      <Bell size={29} />
                      <strong>A little quiet, for now.</strong>
                      <p>
                        Make an update above.
                        <br />
                        Both inboxes will show it here.
                      </p>
                    </div>
                  ) : (
                    state.events.map((event) => {
                      const Icon = icons[event.kind],
                        read = state.read[id].includes(event.id);
                      return (
                        <div
                          className={`demo-notification ${read ? "read" : ""}`}
                          key={event.id}
                        >
                          <div
                            className={`demo-notification-icon ${tones[event.kind]}`}
                          >
                            <Icon size={17} />
                          </div>
                          <div>
                            <span className="demo-notification-kicker">
                              LLAMA · SIMULATED{" "}
                              {event.kind === "reminder"
                                ? "REMINDER"
                                : "UPDATE"}
                            </span>
                            <h4>{event.title}</h4>
                            <p>
                              <strong>
                                {event.actor === id
                                  ? "You"
                                  : MEMBERS[event.actor].name}
                              </strong>{" "}
                              · {event.detail}
                            </p>
                            <time dateTime={event.time}>
                              {new Date(event.time).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}{" "}
                              · {read ? "Read" : "New"}
                            </time>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
                <button
                  className="demo-phone-read"
                  disabled={!unreadCount(state, id)}
                  onClick={() => dispatch({ type: "read", actor: id })}
                >
                  <Check size={15} />
                  Mark {member.name}’s previews read
                </button>
                <button
                  className="demo-phone-switch"
                  onClick={() => {
                    setActor(id);
                    setToast(null);
                  }}
                >
                  Make next update as {member.name}
                  <ArrowUpRight size={15} />
                </button>
              </article>
            ))}
          </div>
        </section>
        <section className="demo-activity">
          <div className="demo-section-heading">
            <div>
              <p className="demo-eyebrow">THE HOUSEHOLD STORY</p>
              <h2>Who handled what. In one place.</h2>
            </div>
            <span>{state.events.length} demo updates</span>
          </div>
          {!state.events.length ? (
            <p className="demo-activity-empty">
              Your recording starts with the first update. Nothing has happened
              yet.
            </p>
          ) : (
            <ol>
              {state.events
                .slice()
                .reverse()
                .map((e) => {
                  const Icon = icons[e.kind];
                  return (
                    <li key={e.id}>
                      <span className={`demo-event-icon ${tones[e.kind]}`}>
                        <Icon size={18} />
                      </span>
                      <div>
                        <strong>{MEMBERS[e.actor].name}</strong>{" "}
                        <span>{e.title.toLowerCase()}</span>
                        <p>{e.detail}</p>
                      </div>
                      <CheckCircle2 size={17} />
                    </li>
                  );
                })}
            </ol>
          )}
        </section>
        <footer className="demo-footer">
          <strong>
            LLAMA<span>.</span> A little help. A lot more life.
          </strong>
          <p>Independent project · Build for Your World · Meta hackathon</p>
          <p>
            Scripted scenario, real interactive UI. Stored only in this browser
            tab’s session. Reset anytime.
            <br />
            No Supabase, notifications permission, API key or Meta Muse call is
            needed for this demo.
          </p>
        </footer>
      </main>
    </div>
  );
}
