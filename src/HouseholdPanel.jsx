import React, { useEffect, useRef, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { householdAuthOptions, googleSignInOptions } from "./householdAuth";
const statuses = {
  bill: ["pending", "paid"],
  booking: ["planned", "booked"],
  pickup: ["scheduled", "done"],
};
const localTime = (value) =>
  value ? new Date(value).toLocaleString() : "No time set";
const blank = {
  id: null,
  revision: 0,
  kind: "bill",
  title: "",
  status: "pending",
  due_at: "",
  remind_at: "",
};
const inputTime = (value) => {
  if (!value) return "";
  const d = new Date(value);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);
};
const publicKeyBytes = (key) =>
  Uint8Array.from(atob(key.replace(/-/g, "+").replace(/_/g, "/")), (c) =>
    c.charCodeAt(0),
  );
export default function HouseholdPanel() {
  const [displayName, setDisplayName] = useState("");
  const [client, setClient] = useState(null),
    [setup, setSetup] = useState(null),
    [session, setSession] = useState(null),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false);
  const [email, setEmail] = useState(""),
    [password, setPassword] = useState(""),
    [household, setHousehold] = useState(null),
    [name, setName] = useState(""),
    [invite, setInvite] = useState(""),
    [joinCode, setJoinCode] = useState(""),
    [records, setRecords] = useState([]),
    [activity, setActivity] = useState([]),
    [members, setMembers] = useState([]),
    [draft, setDraft] = useState(blank),
    [push, setPush] = useState(false);
  const alive = useRef(true),
    generation = useRef(0),
    lock = useRef(false);
  useEffect(() => {
    alive.current = true;
    let auth;
    fetch("/api/household")
      .then((r) => {
        if (!r.ok) throw Error("Household setup is unavailable.");
        return r.json();
      })
      .then((data) => {
        if (!alive.current) return;
        setSetup(data);
        if (!data.configured) return;
        const db = createClient(data.url, data.publishableKey, {
          auth: householdAuthOptions,
        });
        setClient(db);
        db.auth.getSession().then(({ data, error }) => {
          if (!alive.current) return;
          if (error)
            setError(
              "Google sign-in could not finish. Please try again from this browser.",
            );
          setSession(data.session);
          if (
            !data.session &&
            new URLSearchParams(location.hash.slice(1)).has("error")
          )
            setError(
              "Google authorization was cancelled or rejected. Try Continue with Google again.",
            );
          if (new URLSearchParams(location.search).has("code"))
            history.replaceState(
              null,
              "",
              location.pathname + "?household=1#household",
            );
        });
        auth = db.auth.onAuthStateChange((_event, s) => {
          generation.current++;
          setSession(s);
          setHousehold(null);
          setRecords([]);
          setActivity([]);
          setMembers([]);
          setInvite("");
          setDraft(blank);
        }).data.subscription;
      })
      .catch((e) => {
        if (alive.current) setError(e.message);
      });
    return () => {
      alive.current = false;
      generation.current++;
      auth?.unsubscribe();
    };
  }, []);
  const load = async () => {
    if (!client || !session) return;
    const gen = generation.current;
    const { data: membership, error: e } = await client
      .from("household_members")
      .select("household_id")
      .eq("user_id", session.user.id)
      .limit(1);
    if (e)
      throw Error(
        "Household tables are not ready. Apply the database migration first.",
      );
    if (gen !== generation.current || !alive.current) return;
    if (!membership.length) {
      setHousehold(null);
      return;
    }
    const hid = membership[0].household_id;
    const results = await Promise.all([
      client.from("households").select("*").eq("id", hid).single(),
      client
        .from("household_records")
        .select("*")
        .eq("household_id", hid)
        .order("updated_at", { ascending: false }),
      client
        .from("household_activity")
        .select("*")
        .eq("household_id", hid)
        .order("created_at", { ascending: false })
        .limit(40),
      client
        .from("household_members")
        .select("user_id,member_name")
        .eq("household_id", hid),
    ]);
    if (results.some((r) => r.error))
      throw Error("Could not refresh your shared household.");
    if (gen !== generation.current || !alive.current) return;
    setHousehold(results[0].data);
    setRecords(results[1].data);
    setActivity(results[2].data);
    setMembers(results[3].data);
  };
  useEffect(() => {
    if (!session || !client) return;
    let cancelled = false;
    const refresh = () =>
      load().catch((e) => {
        if (!cancelled) setError(e.message);
      });
    refresh();
    const timer = setInterval(refresh, 10000);
    window.addEventListener("focus", refresh);
    return () => {
      cancelled = true;
      clearInterval(timer);
      window.removeEventListener("focus", refresh);
    };
  }, [session?.user.id, client]);
  useEffect(() => {
    if ("serviceWorker" in navigator)
      navigator.serviceWorker
        .getRegistration("/")
        .then((r) => r?.pushManager.getSubscription())
        .then((s) => setPush(Boolean(s)))
        .catch(() => {});
  }, [session?.user.id]);
  const perform = async (fn) => {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await fn();
    } catch (e) {
      setError(e.message || "Request failed.");
    } finally {
      lock.current = false;
      setBusy(false);
    }
  };
  const rpc = async (fn, args) => {
    const { data, error } = await client.rpc(fn, args);
    if (error) throw Error(error.message);
    return data;
  };
  const api = async (body) => {
    const { data } = await client.auth.getSession();
    const r = await fetch("/api/household", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${data.session?.access_token || ""}`,
      },
      body: JSON.stringify(body),
    });
    const result = await r.json();
    if (!r.ok) throw Error(result.error);
    return result;
  };
  const disablePush = async () => {
    const registration = await navigator.serviceWorker?.getRegistration("/");
    const sub = await registration?.pushManager.getSubscription();
    if (sub) {
      await api({ action: "unsubscribe", endpoint: sub.endpoint });
      await sub.unsubscribe();
    }
    setPush(false);
  };
  // Registration occurs before permission is requested; permission follows an explicit click only.
  const enablePush = async () => {
    if (
      !("serviceWorker" in navigator) ||
      !("PushManager" in window) ||
      !("Notification" in window)
    )
      throw Error(
        "This browser does not support Web Push. On iPhone, add LLAMA to the Home Screen and open it there.",
      );
    if (!setup.pushPublicKey)
      throw Error(
        "Push keys are not configured yet. Your shared activity still works.",
      );
    const permission = await Notification.requestPermission();
    if (permission !== "granted")
      throw Error(
        "Notification permission was not granted. You can still use shared activity.",
      );
    const registration = await navigator.serviceWorker.register("/sw.js");
    await navigator.serviceWorker.ready;
    let sub = await registration.pushManager.getSubscription();
    let created = false;
    try {
      if (!sub) {
        sub = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: publicKeyBytes(setup.pushPublicKey),
        });
        created = true;
      }
      await api({ action: "subscribe", subscription: sub.toJSON() });
      setPush(true);
      setNotice(
        "This device is subscribed. Delivery still depends on browser permission, the notification worker and network availability.",
      );
    } catch (e) {
      if (created) await sub?.unsubscribe();
      throw e;
    }
  };
  const save = async (e) => {
    e.preventDefault();
    await perform(async () => {
      await rpc("save_household_record", {
        hid: household.id,
        rid: draft.id,
        expected_revision: draft.revision,
        record_kind: draft.kind,
        record_title: draft.title.trim(),
        record_status: draft.status,
        event_time: draft.due_at ? new Date(draft.due_at).toISOString() : null,
        reminder_time: draft.remind_at
          ? new Date(draft.remind_at).toISOString()
          : null,
      });
      setDraft(blank);
      setNotice(
        "Saved for your household. Notifications are queued, not guaranteed delivered.",
      );
      await load();
    });
  };
  return (
    <section className="panel household-panel">
      <div className="panel-heading">
        <div>
          <h2>Your shared household</h2>
          <p>
            Private accounts, shared updates and opt-in notifications. Sample
            dashboard records are separate.
          </p>
        </div>
        {session && (
          <button
            className="button loop-button"
            disabled={busy}
            onClick={() =>
              perform(async () => {
                if (push) await disablePush();
                await client.auth.signOut();
                setSession(null);
                setHousehold(null);
                setRecords([]);
                setActivity([]);
                setMembers([]);
              })
            }
          >
            Sign out
          </button>
        )}
      </div>
      <div className="household-content">
        {error && (
          <p className="agent-error" role="alert">
            {error}
          </p>
        )}
        {notice && (
          <p className="agent-working" role="status">
            {notice}
          </p>
        )}
        {!setup && !error && <p>Checking household setup…</p>}
        {setup && !setup.configured && (
          <p>
            Household service is not configured in this environment yet. No
            family data is being shared.
          </p>
        )}
        {client && !session && (
          <div className="google-auth">
            <button
              className="button primary"
              disabled={busy}
              onClick={() =>
                perform(async () => {
                  const { error } = await client.auth.signInWithOAuth(
                    googleSignInOptions(location.origin),
                  );
                  if (error)
                    throw Error(
                      "Google sign-in is unavailable. Enable Google in Supabase Auth and check the OAuth redirect settings.",
                    );
                })
              }
            >
              Continue with Google
            </button>
            <p>
              Use your own Google account. Your spouse signs in separately, then
              joins with your private family invite. This requests identity
              only—not Gmail inbox or Calendar access.
            </p>
            <a
              href="https://supabase.com/docs/guides/auth/social-sign-in/auth-google"
              target="_blank"
              rel="noreferrer"
            >
              Google authorization setup instructions
            </a>
          </div>
        )}
        {client && !session && (
          <form
            className="household-form"
            onSubmit={(e) => {
              e.preventDefault();
              perform(async () => {
                const { error } = await client.auth.signInWithPassword({
                  email,
                  password,
                });
                if (error) throw error;
                setPassword("");
              });
            }}
          >
            <h3>Or use email and password</h3>
            <label>
              Email
              <input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </label>
            <label>
              Password
              <input
                type="password"
                minLength={8}
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </label>
            <div className="household-actions">
              <button className="button primary" disabled={busy}>
                Sign in
              </button>
              <button
                type="button"
                className="button loop-button"
                disabled={busy || !email || password.length < 8}
                onClick={() =>
                  perform(async () => {
                    const { data, error } = await client.auth.signUp({
                      email,
                      password,
                    });
                    if (error) throw error;
                    setPassword("");
                    setNotice(
                      data.session
                        ? "Account ready."
                        : "Check your email to confirm your account, then sign in here.",
                    );
                  })
                }
              >
                Create account
              </button>
            </div>
            <p>
              Each person uses a separate account. Never share your Meta key or
              household API access code to sign in.
            </p>
          </form>
        )}
        {session && (
          <p className="member-identity">
            Signed in as {session.user.email} · Your activity label: Member{" "}
            {session.user.id.slice(0, 8)}
          </p>
        )}
        {session && !household && (
          <label className="member-name">
            Your name in this household
            <input
              maxLength={60}
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="e.g. Aisha"
            />
          </label>
        )}
        {session && !household && (
          <div className="household-columns">
            <form
              className="household-form"
              onSubmit={(e) => {
                e.preventDefault();
                perform(async () => {
                  await rpc("create_household", {
                    household_name: name,
                    display_name: displayName.trim() || "Household member",
                  });
                  await load();
                });
              }}
            >
              <h3>Create your household</h3>
              <label>
                Household name
                <input
                  required
                  maxLength={80}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </label>
              <button className="button primary" disabled={busy}>
                Create household
              </button>
            </form>
            <form
              className="household-form"
              onSubmit={(e) => {
                e.preventDefault();
                perform(async () => {
                  await rpc("join_household", {
                    code: joinCode.trim(),
                    display_name: displayName.trim() || "Household member",
                  });
                  setJoinCode("");
                  await load();
                });
              }}
            >
              <h3>Join your family</h3>
              <label>
                Private invite code
                <input
                  required
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value)}
                  autoComplete="off"
                />
              </label>
              <button className="button primary" disabled={busy}>
                Join household
              </button>
              <p>
                Ask a household member for a one-use code. It expires after 24
                hours.
              </p>
            </form>
          </div>
        )}
        {household && (
          <>
            <h3>{household.name}</h3>
            <ul className="family-members" aria-label="Family members">
              {members.map((member) => (
                <li key={member.user_id}>
                  {member.member_name}
                  {member.user_id === session.user.id ? " (you)" : ""}
                </li>
              ))}
            </ul>
            <p>
              {members.length} members · Changes refresh within about 10 seconds
              while this page is open.
            </p>
            <div className="household-actions">
              <button
                className="button loop-button"
                disabled={busy}
                onClick={() =>
                  perform(async () => {
                    setInvite(
                      await rpc("create_household_invite", {
                        hid: household.id,
                      }),
                    );
                  })
                }
              >
                Create family invite
              </button>
              <button
                className="button primary"
                disabled={busy}
                onClick={() => perform(push ? disablePush : enablePush)}
              >
                {push
                  ? "Disable this device’s push"
                  : "Enable notifications on this device"}
              </button>
              <button
                className="button loop-button"
                disabled={busy}
                onClick={() => perform(load)}
              >
                Refresh updates
              </button>
              <button
                className="button loop-button"
                disabled={busy}
                onClick={() => {
                  if (
                    confirm(
                      "Leave this household? You will lose access to its shared records.",
                    )
                  )
                    perform(async () => {
                      if (push) await disablePush();
                      await rpc("leave_household", { hid: household.id });
                      setHousehold(null);
                      setRecords([]);
                      setActivity([]);
                      setMembers([]);
                    });
                }}
              >
                Leave household
              </button>
            </div>
            {invite && (
              <div className="invite-code">
                <strong>Private, one-use invite (24 hours)</strong>
                <code>{invite}</code>
                <p>
                  Send privately to your spouse. Creating another invite
                  invalidates this code.
                </p>
              </div>
            )}
            <p className="view-note">
              Push is off until enabled on each device. On iPhone/iPad use iOS
              16.4+ and add LLAMA to the Home Screen first. Lock-screen messages
              are generic; open the app for private details. New edits and
              reminders are delivered by the scheduled worker, not instantly.
            </p>
            <form className="household-form" onSubmit={save}>
              <h3>
                {draft.id
                  ? "Edit shared record"
                  : "Add a shared bill, booking or pickup"}
              </h3>
              <div className="household-columns">
                <label>
                  Type
                  <select
                    value={draft.kind}
                    disabled={Boolean(draft.id)}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        kind: e.target.value,
                        status: statuses[e.target.value][0],
                      })
                    }
                  >
                    <option value="bill">Bill</option>
                    <option value="booking">Travel booking</option>
                    <option value="pickup">School pickup</option>
                  </select>
                </label>
                <label>
                  Status
                  <select
                    value={draft.status}
                    onChange={(e) =>
                      setDraft({ ...draft, status: e.target.value })
                    }
                  >
                    {statuses[draft.kind].map((s) => (
                      <option key={s}>{s}</option>
                    ))}
                  </select>
                </label>
              </div>
              <label>
                Title
                <input
                  required
                  maxLength={160}
                  value={draft.title}
                  onChange={(e) =>
                    setDraft({ ...draft, title: e.target.value })
                  }
                  placeholder="Electricity bill / flight ticket / school pickup"
                />
              </label>
              <div className="household-columns">
                <label>
                  Event / due time (your local time)
                  <input
                    type="datetime-local"
                    value={draft.due_at}
                    onChange={(e) =>
                      setDraft({ ...draft, due_at: e.target.value })
                    }
                  />
                </label>
                <label>
                  Optional reminder (your local time)
                  <input
                    type="datetime-local"
                    value={draft.remind_at}
                    onChange={(e) =>
                      setDraft({ ...draft, remind_at: e.target.value })
                    }
                  />
                </label>
              </div>
              <p>
                Paid/booked means manually confirmed by a household member.
                LLAMA does not execute or verify payments or bookings. Times are
                stored in UTC and shown in each phone’s local timezone.
              </p>
              <div className="household-actions">
                <button className="button primary" disabled={busy}>
                  Save & queue household notification
                </button>
                {draft.id && (
                  <button
                    type="button"
                    className="button loop-button"
                    onClick={() => setDraft(blank)}
                  >
                    Cancel edit
                  </button>
                )}
              </div>
            </form>
            <div className="household-columns">
              <section>
                <h3>Shared records</h3>
                {!records.length && (
                  <p>No shared records yet. Add your first above.</p>
                )}
                {records.map((r) => (
                  <article className="shared-record" key={r.id}>
                    <strong>{r.title}</strong>
                    <p>
                      {r.kind} · {r.status}
                      {["paid", "booked"].includes(r.status)
                        ? " (manually marked)"
                        : ""}
                    </p>
                    <p>{localTime(r.due_at)}</p>
                    {r.remind_at && <p>Reminder: {localTime(r.remind_at)}</p>}
                    <button
                      className="button loop-button"
                      onClick={() =>
                        setDraft({
                          ...r,
                          due_at: inputTime(r.due_at),
                          remind_at: inputTime(r.remind_at),
                        })
                      }
                    >
                      Edit status or time
                    </button>
                  </article>
                ))}
              </section>
              <section>
                <h3>Household activity</h3>
                {!activity.length && <p>No updates yet.</p>}
                {activity.map((a) => (
                  <article className="shared-record" key={a.id}>
                    <strong>
                      {a.actor_id === session.user.id ? "You" : a.actor_name}
                    </strong>
                    <p>{a.message}</p>
                    <time>{localTime(a.created_at)}</time>
                  </article>
                ))}
              </section>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
