import { createHash, randomBytes, randomUUID } from "node:crypto";

export class FamilyError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}
const fail = (status, message) => {
  throw new FamilyError(status, message);
};
const text = (value, max = 80) => {
  if (typeof value !== "string" || !value.trim() || value.trim().length > max)
    fail(400, "Check the entered text.");
  return value.trim();
};
const tokenHash = (value) => createHash("sha256").update(value).digest("hex");
export function validPushEndpoint(endpoint) {
  try {
    const u = new URL(endpoint);
    return (
      u.protocol === "https:" &&
      !u.username &&
      !u.password &&
      !u.port &&
      ([
        "fcm.googleapis.com",
        "updates.push.services.mozilla.com",
        "web.push.apple.com",
      ].includes(u.hostname) ||
        u.hostname.endsWith(".notify.windows.com"))
    );
  } catch {
    return false;
  }
}
export function validateSharedData(data) {
  if (
    !data ||
    typeof data !== "object" ||
    Array.isArray(data) ||
    JSON.stringify(data).length > 100000
  )
    fail(400, "Household data is too large or invalid.");
  for (const key of ["travel", "bills", "groceries", "schedule"]) {
    if (
      !Array.isArray(data[key]) ||
      data[key].length > 100 ||
      data[key].some((x) => !x || typeof x !== "object" || Array.isArray(x))
    )
      fail(400, "Each household list must contain at most 100 records.");
  }
  if (
    !data.prefs ||
    typeof data.prefs !== "object" ||
    Array.isArray(data.prefs)
  )
    fail(400, "Preferences are required.");
  const shapes = {
    travel: { strings: ["day", "title", "status", "notes"], numbers: ["cost"] },
    bills: {
      strings: ["id", "name", "dueDate", "status", "category", "agentNote"],
      numbers: ["amount"],
    },
    groceries: {
      strings: ["id", "name", "category", "recipeNeeded"],
      numbers: ["estPrice"],
      booleans: ["inPantry"],
    },
    schedule: { strings: ["time", "task", "category", "focus"], numbers: [] },
  };
  const result = {};
  for (const [key, shape] of Object.entries(shapes))
    result[key] = data[key].map((row) => {
      const clean = {};
      for (const field of shape.strings) {
        const value = row[field] ?? "";
        if (typeof value !== "string" || value.length > 2000)
          fail(400, "List text must be at most 2000 characters.");
        clean[field] = value;
      }
      for (const field of shape.numbers) {
        if (
          typeof row[field] !== "number" ||
          !Number.isFinite(row[field]) ||
          row[field] < 0 ||
          row[field] > 1e9
        )
          fail(400, "Check list amounts.");
        clean[field] = row[field];
      }
      for (const field of shape.booleans || []) {
        if (typeof row[field] !== "boolean") fail(400, "Check pantry status.");
        clean[field] = row[field];
      }
      if (key === "bills" && !["PAID", "PENDING"].includes(clean.status))
        fail(400, "Invalid bill status.");
      return clean;
    });
  result.prefs = {};
  for (const key of ["familySize", "monthlyBudgetCap", "travelBudgetLimit"]) {
    if (
      typeof data.prefs[key] !== "number" ||
      !Number.isFinite(data.prefs[key]) ||
      data.prefs[key] < (key === "familySize" ? 1 : 0) ||
      data.prefs[key] > 1e9
    )
      fail(400, "Check numeric preferences.");
    result.prefs[key] = data.prefs[key];
  }
  for (const key of ["dietary", "homeLocation", "targetSleepDuration"])
    result.prefs[key] = text(data.prefs[key], 500);
  return result;
}
export async function transaction(pool, action) {
  const db = await pool.connect();
  try {
    await db.query("BEGIN");
    const result = await action(db);
    await db.query("COMMIT");
    return result;
  } catch (error) {
    await db.query("ROLLBACK");
    throw error;
  } finally {
    db.release();
  }
}
async function membership(db, userId) {
  // All household operations serialize with membership/ownership changes.
  const { rows } = await db.query(
    `SELECT h.*, m.user_id FROM family_households h JOIN family_members m ON m.household_id=h.id WHERE m.user_id=$1 FOR UPDATE OF h`,
    [userId],
  );
  return rows[0];
}
const anchor = (h, userId) => {
  if (h.owner_id !== userId) fail(403, "Only the family anchor can do this.");
};
async function snapshot(db, userId, h) {
  if (!h) return { household: null, members: [], reminders: [], invites: [] };
  const members = await db.query(
    `SELECT u.id,u.name,u.username FROM family_members m JOIN "user" u ON u.id=m.user_id WHERE m.household_id=$1 ORDER BY m.joined_at`,
    [h.id],
  );
  const reminders = await db.query(
    `SELECT id,kind,label,due_at FROM family_reminders WHERE household_id=$1 AND kind<>'update' AND due_at>now()-interval '1 day' ORDER BY due_at LIMIT 100`,
    [h.id],
  );
  const invites =
    h.owner_id === userId
      ? await db.query(
          `SELECT id,username,expires_at FROM family_invites WHERE household_id=$1 AND expires_at>now()`,
          [h.id],
        )
      : { rows: [] };
  const devices = await db.query(
    "SELECT endpoint FROM family_devices WHERE user_id=$1",
    [userId],
  );
  return {
    deviceEndpoints: devices.rows.map((d) => d.endpoint),
    household: {
      id: h.id,
      name: h.name,
      ownerId: h.owner_id,
      data: h.data,
      revision: h.revision,
    },
    members: members.rows,
    reminders: reminders.rows,
    invites: invites.rows,
  };
}
export async function familyAction(pool, user, input) {
  return transaction(pool, async (db) => {
    let h = await membership(db, user.id);
    const action = input.action || "get";
    if (action === "create") {
      if (h) fail(409, "Leave your current household first.");
      const id = randomUUID();
      await db.query(
        "INSERT INTO family_households(id,name,owner_id) VALUES($1,$2,$3)",
        [id, text(input.name), user.id],
      );
      await db.query(
        "INSERT INTO family_members(user_id,household_id) VALUES($1,$2)",
        [user.id, id],
      );
      h = await membership(db, user.id);
    } else if (action === "join") {
      if (h) fail(409, "Leave your current household first.");
      const hash = tokenHash(text(input.code, 100));
      const invitation = await db.query(
        "SELECT household_id FROM family_invites WHERE token_hash=$1 AND expires_at>now()",
        [hash],
      );
      if (!invitation.rows[0]) fail(400, "Invitation is invalid or expired.");
      // Lock household before invitation, matching the anchor's lock order.
      await db.query(
        "SELECT id FROM family_households WHERE id=$1 FOR UPDATE",
        [invitation.rows[0].household_id],
      );
      const { rows } = await db.query(
        "SELECT * FROM family_invites WHERE token_hash=$1 AND expires_at>now() FOR UPDATE",
        [hash],
      );
      if (!rows[0] || rows[0].username !== user.username?.toLowerCase())
        fail(403, "Sign in with the username assigned to this invitation.");
      const count = await db.query(
        "SELECT count(*)::int AS n FROM family_members WHERE household_id=$1",
        [rows[0].household_id],
      );
      if (count.rows[0].n >= 20)
        fail(400, "Households support up to 20 members.");
      await db.query(
        "INSERT INTO family_members(user_id,household_id) VALUES($1,$2)",
        [user.id, rows[0].household_id],
      );
      await db.query("DELETE FROM family_invites WHERE id=$1", [rows[0].id]);
      h = await membership(db, user.id);
    } else if (action === "subscribe") {
      if (!h) fail(400, "Join a household before enabling push.");
      const s = input.subscription;
      if (
        !s ||
        !validPushEndpoint(s.endpoint) ||
        s.endpoint.length > 2048 ||
        !/^[A-Za-z0-9_-]{80,100}$/.test(s.keys?.p256dh || "") ||
        !/^[A-Za-z0-9_-]{20,30}$/.test(s.keys?.auth || "")
      )
        fail(400, "Unsupported push subscription.");
      const count = await db.query(
        "SELECT count(*)::int AS n FROM family_devices WHERE user_id=$1 AND endpoint<>$2",
        [user.id, s.endpoint],
      );
      if (count.rows[0].n >= 10)
        fail(400, "Remove a device first (10 device limit).");
      const result = await db.query(
        `INSERT INTO family_devices(id,user_id,endpoint,subscription) VALUES($1,$2,$3,$4) ON CONFLICT(endpoint) DO UPDATE SET subscription=EXCLUDED.subscription WHERE family_devices.user_id=EXCLUDED.user_id RETURNING id`,
        [
          randomUUID(),
          user.id,
          s.endpoint,
          JSON.stringify({ endpoint: s.endpoint, keys: s.keys }),
        ],
      );
      if (!result.rows[0])
        fail(
          409,
          "This device is linked to another account. Turn notifications off there first.",
        );
    } else if (action === "unsubscribe") {
      await db.query(
        "DELETE FROM family_devices WHERE user_id=$1 AND endpoint=$2",
        [user.id, text(input.endpoint, 2048)],
      );
    } else if (action !== "get") {
      if (!h) fail(400, "Create or join a household first.");
      if (action === "invite") {
        anchor(h, user.id);
        const username = text(input.username, 30).toLowerCase();
        if (!/^[a-z0-9_.]{3,30}$/.test(username))
          fail(400, "Use 3–30 letters, numbers, underscores or dots.");
        const count = await db.query(
          "SELECT count(*)::int AS n FROM family_invites WHERE household_id=$1 AND expires_at>now()",
          [h.id],
        );
        if (count.rows[0].n >= 20)
          fail(400, "Revoke an invitation first (20 invitation limit).");
        const code = randomBytes(24).toString("base64url");
        await db.query(
          `INSERT INTO family_invites(id,household_id,username,token_hash) VALUES($1,$2,$3,$4) ON CONFLICT(household_id,username) DO UPDATE SET token_hash=EXCLUDED.token_hash,expires_at=now()+interval '24 hours'`,
          [randomUUID(), h.id, username, tokenHash(code)],
        );
        return { ...(await snapshot(db, user.id, h)), invitationCode: code };
      } else if (action === "revoke-invite") {
        anchor(h, user.id);
        await db.query(
          "DELETE FROM family_invites WHERE id=$1 AND household_id=$2",
          [text(input.id), h.id],
        );
      } else if (action === "save") {
        const data = validateSharedData(input.data);
        if (!Number.isInteger(input.revision) || input.revision !== h.revision)
          fail(
            409,
            "Someone else saved changes. Refresh shared data before saving again; unsaved edits will be replaced.",
          );
        // Bound update notifications to one per minute per household.
        await db.query(
          "DELETE FROM family_reminders WHERE kind='update' AND household_id=$1 AND due_at<now()-interval '1 day'",
          [h.id],
        );
        const recent = await db.query(
          "SELECT id FROM family_reminders WHERE household_id=$1 AND kind='update' AND due_at>now()-interval '1 minute' LIMIT 1",
          [h.id],
        );
        await db.query(
          "UPDATE family_households SET data=$1,revision=revision+1,updated_at=now() WHERE id=$2",
          [JSON.stringify(data), h.id],
        );
        if (!recent.rows.length)
          await db.query(
            "INSERT INTO family_reminders(id,household_id,created_by,kind,label,due_at) VALUES($1,$2,$3,'update','Household updated',now())",
            [randomUUID(), h.id, user.id],
          );
      } else if (action === "remind") {
        if (!["bill", "activity"].includes(input.kind))
          fail(400, "Choose bill or activity.");
        const date = new Date(input.dueAt);
        if (
          !Number.isFinite(date.getTime()) ||
          date.getTime() <= Date.now() ||
          date.getTime() > Date.now() + 366 * 86400000
        )
          fail(400, "Choose a future time within one year.");
        const count = await db.query(
          "SELECT count(*)::int AS n FROM family_reminders WHERE household_id=$1 AND due_at>now()",
          [h.id],
        );
        if (count.rows[0].n >= 100)
          fail(400, "This household has 100 upcoming reminders.");
        await db.query(
          "INSERT INTO family_reminders(id,household_id,created_by,kind,label,due_at) VALUES($1,$2,$3,$4,$5,$6)",
          [
            randomUUID(),
            h.id,
            user.id,
            input.kind,
            text(input.label, 100),
            date.toISOString(),
          ],
        );
      } else if (action === "cancel-reminder") {
        await db.query(
          "DELETE FROM family_reminders WHERE id=$1 AND household_id=$2",
          [text(input.id), h.id],
        );
      } else if (action === "transfer") {
        anchor(h, user.id);
        const member = await db.query(
          "SELECT user_id FROM family_members WHERE household_id=$1 AND user_id=$2",
          [h.id, text(input.userId)],
        );
        if (!member.rows[0]) fail(400, "Choose an existing member.");
        await db.query("UPDATE family_households SET owner_id=$1 WHERE id=$2", [
          input.userId,
          h.id,
        ]);
      } else if (action === "leave" || action === "remove-member") {
        const target = action === "leave" ? user.id : text(input.userId);
        if (target !== user.id) anchor(h, user.id);
        if (target === h.owner_id)
          fail(
            400,
            "Transfer the family anchor role or delete the household before leaving.",
          );
        await db.query(
          "DELETE FROM family_devices WHERE user_id=$1 AND EXISTS(SELECT 1 FROM family_members WHERE user_id=$1 AND household_id=$2)",
          [target, h.id],
        );
        await db.query(
          "DELETE FROM family_members WHERE user_id=$1 AND household_id=$2",
          [target, h.id],
        );
      } else if (action === "delete-household") {
        anchor(h, user.id);
        if (input.confirmation !== h.name)
          fail(400, "Type the household name to confirm deletion.");
        await db.query(
          "DELETE FROM family_devices WHERE user_id IN(SELECT user_id FROM family_members WHERE household_id=$1)",
          [h.id],
        );
        await db.query("DELETE FROM family_households WHERE id=$1", [h.id]);
      } else fail(400, "Unknown action.");
      h = await membership(db, user.id);
    }
    return snapshot(db, user.id, h);
  });
}
