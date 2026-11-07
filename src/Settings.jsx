import React, { useEffect, useState } from "react";
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
      {(error || localError) && (
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
          Separate logins, one shared household. Up to 20 members. The family
          anchor assigns usernames; passwords stay private.
        </p>
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
            <form
              onSubmit={(e) => {
                e.preventDefault();
                act(async () => {
                  const { error } = await authClient.updateUser({ username });
                  if (error) throw new Error(error.message);
                  setUsername("");
                  await refresh();
                }, "Username saved. Use it the next time you sign in.");
              }}
            >
              <label htmlFor="settings-username">Your login username</label>
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
                <button className="button" disabled={disabled}>
                  Save username
                </button>
              </div>
            </form>
            {!h ? (
              <div className="settings-columns">
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
                  <h3>Create a household</h3>
                  <label htmlFor="settings-household">Household name</label>
                  <input
                    id="settings-household"
                    value={name}
                    maxLength={80}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                  <button className="button primary" disabled={disabled}>
                    Create household
                  </button>
                </form>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    act(async () => {
                      await invoke(
                        { action: "join", code },
                        "You joined the household.",
                      );
                      setCode("");
                    });
                  }}
                >
                  <h3>Join your family</h3>
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
                  <button className="button primary" disabled={disabled}>
                    Join household
                  </button>
                </form>
              </div>
            ) : (
              <>
                <h3>{h.name}</h3>
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
                        Assign a member username
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
        {!pushConfig?.pushConfigured && (
          <p className="muted">
            Push service setup is pending. The app owner must configure push
            keys and the scheduled worker.
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
