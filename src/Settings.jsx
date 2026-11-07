import React, { useEffect, useState } from "react";
import {
  getNotificationSound,
  previewLlamaSound,
  setNotificationSound,
  testDeviceNotification,
} from "./lib/notification-sound";
import { authClient } from "../lib/auth-client";
import {
  clearAccountStorage,
  devicePushEnabled,
  disableDevicePush,
  enableDevicePush,
} from "./lib/family-client";

export default function Settings({
  user,
  family,
  error,
  busy,
  run,
  refresh,
  onLogout,
  onDeleted,
  onHelp,
}) {
  const [mode, setMode] = useState("create");
  const [soundOn, setSoundOn] = useState(true);
  const [joinUsername, setJoinUsername] = useState("");
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [username, setUsername] = useState("");
  const [assigned, setAssigned] = useState("");
  const [newCode, setNewCode] = useState("");
  const [notice, setNotice] = useState("");
  const [localError, setLocalError] = useState("");
  const [working, setWorking] = useState(false);
  const [pushConfig, setPushConfig] = useState(null);
  const [pushOn, setPushOn] = useState(false);
  const [reminder, setReminder] = useState({
    kind: "bill",
    label: "",
    due: "",
  });
  const [deleteText, setDeleteText] = useState("");
  const [deletePassword, setDeletePassword] = useState("");
  const [householdConfirm, setHouseholdConfirm] = useState("");
  const guest = !user || user.id === "guest";
  const h = family?.household;
  const isAnchor = h?.ownerId === user?.id;
  const disabled = busy || working;
  useEffect(() => {
    let live = true;
    getNotificationSound()
      .then((value) => {
        if (live) setSoundOn(value);
      })
      .catch(() => {});
    fetch("/api/family?config=1", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data) => {
        if (live) setPushConfig(data);
      })
      .catch(() => {
        if (live) setPushConfig({ pushConfigured: false });
      });
    devicePushEnabled()
      .then((enabled) => {
        if (live)
          setPushOn(
            !!enabled && !guest && !!family?.deviceEndpoints?.includes(enabled),
          );
      })
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [user?.id, family?.deviceEndpoints]);
  async function act(operation, message) {
    setWorking(true);
    setLocalError("");
    setNotice("");
    try {
      const result = await operation();
      if (message) setNotice(message);
      return result;
    } catch (e) {
      setLocalError(e.message || "The action could not be completed.");
    } finally {
      setWorking(false);
    }
  }
  async function invoke(input, message) {
    const result = await run(input);
    if (!result)
      throw new Error(
        "The change was not confirmed. See the service message below.",
      );
    if (message) setNotice(message);
    return result;
  }
  async function finishDeletion() {
    try {
      if ("serviceWorker" in navigator) {
        const registration = await navigator.serviceWorker.getRegistration("/");
        await (
          await registration?.pushManager?.getSubscription()
        )?.unsubscribe();
      }
      clearAccountStorage(user.id);
    } finally {
      onDeleted();
    }
  }
  return (
    <section className="settings-grid">
      {(localError || (error && pushConfig?.householdReady !== false)) && (
        <div className="settings-status">
          <p className="auth-error" role="alert">
            {localError || error}
          </p>
          {!guest && (
            <button
              className="button"
              disabled={disabled}
              onClick={() => act(refresh)}
            >
              Retry household connection
            </button>
          )}
        </div>
      )}
      {notice && (
        <p className="settings-status" role="status">
          {notice}
        </p>
      )}
      <div className="panel settings-panel">
        <h2>Household settings</h2>
        <p>
          One place for your family’s lists and reminders. Everyone keeps their
          own account and password.
        </p>
        <ol className="setup-steps" aria-label="Household setup steps">
          <li>Create or join</li>
          <li>Invite your family</li>
          <li>Enable alerts on each phone</li>
        </ol>
        {guest ? (
          <p>
            You're using a guest session.{" "}
            <button className="button ghost" onClick={onLogout}>
              Sign in or create an account
            </button>
          </p>
        ) : (
          <>
            <p>
              Signed in as <strong>{user.name}</strong>
              {user.username && <> · @{user.username}</>}
            </p>
            {!pushConfig ? (
              <p role="status">Checking your household connection…</p>
            ) : (
              !pushConfig.householdReady && (
                <div className="setup-pending" role="status">
                  <h3>Family sharing is not activated yet</h3>
                  <p>
                    Your account still works. The app owner needs to finish the
                    Neon database setup before anyone can create or join a
                    household. Nothing you enter here will fix that—there is no
                    need to keep retrying.
                  </p>
                  <button
                    className="button ghost"
                    disabled={disabled}
                    onClick={() => act(refresh)}
                  >
                    Check again
                  </button>
                </div>
              )
            )}
            {!h ? (
              <div className="settings-columns">
                <div
                  className="settings-row"
                  role="group"
                  aria-label="Choose household setup"
                >
                  <button
                    className={`button ${mode === "create" ? "primary" : "ghost"}`}
                    aria-pressed={mode === "create"}
                    onClick={() => setMode("create")}
                  >
                    Start a new household
                  </button>
                  <button
                    className={`button ${mode === "join" ? "primary" : "ghost"}`}
                    aria-pressed={mode === "join"}
                    onClick={() => setMode("join")}
                  >
                    I have an invitation
                  </button>
                </div>
                {mode === "create" ? (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      act(() =>
                        invoke(
                          { action: "create", name },
                          "Household created. You are the family anchor.",
                        ),
                      );
                    }}
                  >
                    <h3>1. Name your household</h3>
                    <p>
                      You become the family anchor. Next, you can invite family
                      members. You do not need a new username to create a
                      household.
                    </p>
                    <label htmlFor="settings-household">Household name</label>
                    <input
                      id="settings-household"
                      value={name}
                      maxLength={80}
                      onChange={(e) => setName(e.target.value)}
                      required
                    />
                    <button
                      className="button primary"
                      disabled={disabled || !pushConfig?.householdReady}
                    >
                      Create household
                    </button>
                  </form>
                ) : (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      act(async () => {
                        if (
                          joinUsername.trim().toLowerCase() !==
                          user.username?.toLowerCase()
                        ) {
                          const { error } = await authClient.updateUser({
                            username: joinUsername.trim(),
                          });
                          if (error) throw new Error(error.message);
                          await refresh();
                        }
                        await invoke(
                          { action: "join", code },
                          "You joined the household.",
                        );
                        setCode("");
                      });
                    }}
                  >
                    <h3>1. Use your family invitation</h3>
                    <p>
                      Ask the family anchor for both items below. We’ll save
                      your assigned username and join the household in one step.
                    </p>
                    <label htmlFor="join-username">
                      Username from your invitation
                    </label>
                    <input
                      id="join-username"
                      value={joinUsername}
                      onChange={(e) => setJoinUsername(e.target.value)}
                      pattern="[A-Za-z0-9_.]{3,30}"
                      minLength={3}
                      maxLength={30}
                      required
                      placeholder="e.g. farah_family"
                    />
                    <label htmlFor="settings-invite">
                      One-use invitation code
                    </label>
                    <input
                      id="settings-invite"
                      value={code}
                      maxLength={100}
                      onChange={(e) => setCode(e.target.value)}
                      required
                      autoComplete="off"
                    />
                    <button
                      className="button primary"
                      disabled={
                        disabled ||
                        !pushConfig?.householdReady ||
                        !pushConfig?.usernameReady
                      }
                    >
                      Join household
                    </button>
                  </form>
                )}
              </div>
            ) : (
              <>
                <h3>{h.name}</h3>
                <p className="household-success">
                  ✓ Your household is connected. Save list changes from the
                  dashboard to share them with everyone.
                </p>
                <p>
                  Your role:{" "}
                  <strong>{isAnchor ? "Family anchor" : "Member"}</strong>
                </p>
                <ul className="settings-members">
                  {family.members.map((member) => (
                    <li key={member.id}>
                      <span>
                        <strong>{member.name}</strong>
                        {member.username && <> · @{member.username}</>}
                        {member.id === h.ownerId && " · Anchor"}
                      </span>
                      {isAnchor && member.id !== user.id && (
                        <span className="settings-row">
                          <button
                            className="button ghost"
                            disabled={disabled}
                            onClick={() => {
                              if (
                                window.confirm(
                                  `Make ${member.name} the family anchor? You will lose anchor controls.`,
                                )
                              )
                                act(() =>
                                  invoke(
                                    { action: "transfer", userId: member.id },
                                    "Anchor role transferred.",
                                  ),
                                );
                            }}
                          >
                            Make anchor
                          </button>
                          <button
                            className="button ghost danger"
                            disabled={disabled}
                            onClick={() => {
                              if (
                                window.confirm(
                                  `Remove ${member.name} from this household?`,
                                )
                              )
                                act(() =>
                                  invoke(
                                    {
                                      action: "remove-member",
                                      userId: member.id,
                                    },
                                    "Member removed.",
                                  ),
                                );
                            }}
                          >
                            Remove
                          </button>
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
                {isAnchor ? (
                  <>
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        act(async () => {
                          const result = await invoke({
                            action: "invite",
                            username: assigned,
                          });
                          setNewCode(result.invitationCode);
                          setAssigned("");
                        }, "Invitation created. Share the code privately; it expires in 24 hours.");
                      }}
                    >
                      <label htmlFor="assign-username">
                        2. Choose a username for your family member
                      </label>
                      <div className="settings-row">
                        <input
                          id="assign-username"
                          value={assigned}
                          onChange={(e) => setAssigned(e.target.value)}
                          pattern="[A-Za-z0-9_.]{3,30}"
                          required
                          placeholder="e.g. farah_family"
                        />
                        <button className="button" disabled={disabled}>
                          Create invitation
                        </button>
                      </div>
                    </form>
                    {newCode && (
                      <div className="invite-result" role="status">
                        <strong>
                          Shown only now. Copy and share privately:
                        </strong>
                        <code>{newCode}</code>
                        <p>
                          The member creates their own account with the assigned
                          username, then enters this code. Never send passwords.
                        </p>
                        <button
                          className="button ghost"
                          onClick={() => setNewCode("")}
                        >
                          Hide code
                        </button>
                      </div>
                    )}
                    <ul>
                      {family.invites.map((invite) => (
                        <li key={invite.id}>
                          @{invite.username} · expires{" "}
                          {new Date(invite.expires_at).toLocaleString()}{" "}
                          <button
                            className="button ghost danger"
                            disabled={disabled}
                            onClick={() =>
                              act(() =>
                                invoke(
                                  { action: "revoke-invite", id: invite.id },
                                  "Invitation revoked.",
                                ),
                              )
                            }
                          >
                            Revoke
                          </button>
                        </li>
                      ))}
                    </ul>
                  </>
                ) : (
                  <button
                    className="button ghost danger"
                    disabled={disabled}
                    onClick={() => {
                      if (
                        window.confirm(
                          "Leave this household? You will lose access to its shared data.",
                        )
                      )
                        act(async () => {
                          await disableDevicePush();
                          await invoke(
                            { action: "leave" },
                            "You left the household.",
                          );
                          setPushOn(false);
                        });
                    }}
                  >
                    Leave household
                  </button>
                )}
              </>
            )}
            {h && (
              <details className="advanced-settings">
                <summary>Advanced: change my login username</summary>{" "}
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    act(async () => {
                      const { error } = await authClient.updateUser({
                        username,
                      });
                      if (error) throw new Error(error.message);
                      setUsername("");
                      await refresh();
                    }, "Username saved. Use it the next time you sign in.");
                  }}
                >
                  <label htmlFor="settings-username">Your login username</label>
                  {!pushConfig?.usernameReady && (
                    <p className="muted">
                      Username login is pending database setup. Continue using
                      your email to sign in.
                    </p>
                  )}
                  <p className="muted">
                    Use the username assigned by your anchor before redeeming an
                    invitation. Usernames are unique across LLAMA.
                  </p>
                  <div className="settings-row">
                    <input
                      id="settings-username"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      pattern="[A-Za-z0-9_.]{3,30}"
                      minLength={3}
                      maxLength={30}
                      placeholder={user.username || "e.g. aisha_family"}
                      required
                      autoComplete="username"
                    />
                    <button
                      className="button"
                      disabled={disabled || !pushConfig?.usernameReady}
                    >
                      Save username
                    </button>
                  </div>
                </form>
              </details>
            )}
          </>
        )}
      </div>

      <div className="panel settings-panel">
        <h2>Push notifications</h2>
        <p>
          Household updates, bill reminders and activity reminders. Opt in
          separately on each device. Notifications contain generic text, not
          household details.
        </p>
        <button
          className="button"
          role="switch"
          aria-checked={pushOn}
          disabled={
            disabled ||
            guest ||
            (!pushOn && (!h || !pushConfig?.pushConfigured))
          }
          onClick={() =>
            act(
              async () => {
                if (pushOn) await disableDevicePush();
                else await enableDevicePush(pushConfig.publicKey);
                setPushOn(!pushOn);
              },
              pushOn
                ? "Notifications off on this device."
                : "Notifications on for this device.",
            )
          }
        >
          Notifications {pushOn ? "On — turn off" : "Off — turn on"}
        </button>
        <div className="sound-settings">
          <button className="button ghost" onClick={() => act(previewLlamaSound, "LLAMA sound enabled for this open page. Background alerts use your device’s system sound.")}>Play & enable LLAMA sound</button>
          <p className="muted">Your supplied goat sound plays for incoming alerts while LLAMA is visible, after you enable it here. Each new page may require a click. Background/locked-screen notifications use the system sound and cannot use this MP3.</p>
          <label>
            <input
              type="checkbox"
              checked={soundOn}
              disabled={working || guest}
              onChange={(e) => {
                const next = e.target.checked;
                act(
                  async () => {
                    await setNotificationSound(next);
                    setSoundOn(next);
                  },
                  next
                    ? "Sound enabled on this device."
                    : "Notifications will be silent on this device.",
                );
              }}
            />{" "}
            Play notification sound on this device
          </label>
          <p className="muted">
            Every opted-in household member receives alerts. Each phone controls
            its own sound; mute, Do Not Disturb and browser settings still
            apply. A website cannot force a sound or choose a custom ringtone.
          </p>
          <button
            className="button ghost"
            disabled={disabled || !pushOn}
            onClick={() =>
              act(
                testDeviceNotification,
                "Test notification sent to this device. Check your notification centre.",
              )
            }
          >
            Test this device’s alert
          </button>
        </div>
        {!pushConfig?.pushConfigured && (
          <p className="muted">
            {!h
              ? "First create or join a household. Then enable notifications separately on every family member’s phone."
              : "Alerts are not activated yet. The app owner must finish notification-service setup; you don’t need to change your account."}
          </p>
        )}
        <p className="muted">
          Browser permission is separate. On iPhone/iPad, open the installed
          Home Screen app. Delivery is best-effort, not guaranteed; do not use
          for emergencies.
        </p>
        {h && (
          <>
            <h3>Schedule a household reminder</h3>
            <p>
              Reminders are explicit; dates in your lists do not schedule alerts
              automatically.
            </p>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                act(async () => {
                  await invoke(
                    {
                      action: "remind",
                      kind: reminder.kind,
                      label: reminder.label,
                      dueAt: new Date(reminder.due).toISOString(),
                    },
                    "Reminder scheduled. Delivery requires configured push and an opted-in device.",
                  );
                  setReminder({ kind: "bill", label: "", due: "" });
                });
              }}
            >
              <label htmlFor="reminder-kind">Type</label>
              <select
                id="reminder-kind"
                value={reminder.kind}
                onChange={(e) =>
                  setReminder({ ...reminder, kind: e.target.value })
                }
              >
                <option value="bill">Bill reminder</option>
                <option value="activity">Scheduled activity</option>
              </select>
              <label htmlFor="reminder-label">
                Reminder label (visible to household members)
              </label>
              <input
                id="reminder-label"
                value={reminder.label}
                maxLength={100}
                onChange={(e) =>
                  setReminder({ ...reminder, label: e.target.value })
                }
                required
              />
              <label htmlFor="reminder-time">
                Date and time · your device's local time
              </label>
              <input
                id="reminder-time"
                type="datetime-local"
                value={reminder.due}
                onChange={(e) =>
                  setReminder({ ...reminder, due: e.target.value })
                }
                required
              />
              <button className="button" disabled={disabled}>
                Schedule reminder
              </button>
            </form>
            <ul>
              {family.reminders.map((item) => (
                <li key={item.id}>
                  {item.label} · {new Date(item.due_at).toLocaleString()}{" "}
                  <button
                    className="button ghost danger"
                    disabled={disabled}
                    onClick={() =>
                      act(() =>
                        invoke(
                          { action: "cancel-reminder", id: item.id },
                          "Reminder cancelled.",
                        ),
                      )
                    }
                  >
                    Cancel
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>

      <div className="panel settings-panel">
        <h2>Help & privacy</h2>
        <p>Understand family sharing, reminders and how your data is used.</p>
        <div className="settings-row">
          <button className="button" onClick={() => onHelp("faq")}>
            FAQ
          </button>
          <button className="button" onClick={() => onHelp("privacy")}>
            Privacy policy
          </button>
        </div>
      </div>

      <div className="panel settings-panel">
        <h2>Account & data</h2>
        <button
          className="button"
          disabled={disabled}
          onClick={() => act(onLogout)}
        >
          Log out
        </button>
        {!guest && (
          <>
            {isAnchor && (
              <details className="danger-zone">
                <summary>Delete shared household</summary>
                <p>
                  This deletes all shared lists, memberships, invitations and
                  reminders. Members' personal accounts remain. To keep the
                  household, transfer the anchor role instead.
                </p>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    act(() =>
                      invoke(
                        {
                          action: "delete-household",
                          confirmation: householdConfirm,
                        },
                        "Shared household deleted.",
                      ),
                    );
                  }}
                >
                  <label htmlFor="confirm-household">
                    Type {h.name} to confirm
                  </label>
                  <input
                    id="confirm-household"
                    value={householdConfirm}
                    onChange={(e) => setHouseholdConfirm(e.target.value)}
                    required
                  />
                  <button
                    className="button danger"
                    disabled={disabled || householdConfirm !== h.name}
                  >
                    Permanently delete household
                  </button>
                </form>
              </details>
            )}
            <details className="danger-zone">
              <summary>Delete my account</summary>
              <p>
                This is permanent. Your account, sessions, household membership
                and server push subscriptions are removed. Shared content stays
                for other members. Remove personal content from shared lists and
                save first if needed. Anchors must transfer their role or delete
                the household first.
              </p>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  act(async () => {
                    const { error } = await authClient.deleteUser({
                      password: deletePassword,
                    });
                    if (error) throw new Error(error.message);
                    await finishDeletion();
                  });
                }}
              >
                <label htmlFor="delete-confirm">Type DELETE to confirm</label>
                <input
                  id="delete-confirm"
                  value={deleteText}
                  onChange={(e) => setDeleteText(e.target.value)}
                  required
                  autoComplete="off"
                />
                <label htmlFor="delete-password">Current password</label>
                <input
                  id="delete-password"
                  type="password"
                  value={deletePassword}
                  onChange={(e) => setDeletePassword(e.target.value)}
                  required
                  autoComplete="current-password"
                />
                <button
                  className="button danger"
                  disabled={disabled || deleteText !== "DELETE" || isAnchor}
                >
                  Permanently delete my account
                </button>
              </form>
              <p className="muted">
                Google-only accounts: sign in again to create a fresh session,
                then use the fresh-session option below.
              </p>
              <button
                className="button ghost danger"
                disabled={disabled || deleteText !== "DELETE" || isAnchor}
                onClick={() =>
                  act(async () => {
                    const { error } = await authClient.deleteUser();
                    if (error) throw new Error(error.message);
                    await finishDeletion();
                  })
                }
              >
                Delete with recent sign-in instead
              </button>
            </details>
          </>
        )}
      </div>
    </section>
  );
}
