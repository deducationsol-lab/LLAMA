import { username } from "better-auth/plugins";
import { APIError } from "better-auth/api";

export function familyAuthOptions(pool, readiness = { usernameReady: true, householdReady: true }) {
  return {
    plugins: readiness.usernameReady ? [username({ minUsernameLength: 3, maxUsernameLength: 30 })] : [],
    user: {
      deleteUser: {
        enabled: true,
        beforeDelete: async (user) => {
          // Recheck live metadata before deletion: a migration can finish after cold start.
          const tables = await pool.query("SELECT to_regclass('family_households') IS NOT NULL AS present");
          if (!tables.rows[0]?.present) return;
          const owned = await pool.query(
            "SELECT id FROM family_households WHERE owner_id=$1 LIMIT 1",
            [user.id],
          );
          if (owned.rows.length)
            throw new APIError("BAD_REQUEST", {
              message:
                "Transfer the family anchor role or delete your household before deleting your account.",
            });
        },
      },
    },
  };
}
