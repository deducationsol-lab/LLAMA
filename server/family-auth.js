import { username } from "better-auth/plugins";
import { APIError } from "better-auth/api";

export function familyAuthOptions(pool) {
  return {
    plugins: [username({ minUsernameLength: 3, maxUsernameLength: 30 })],
    user: {
      deleteUser: {
        enabled: true,
        beforeDelete: async (user) => {
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
