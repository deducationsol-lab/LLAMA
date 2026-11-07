// Read schema metadata only. Never migrate a database during an auth request.
export async function familyReadiness(pool) {
  const { rows } = await pool.query(`SELECT
    EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema=current_schema() AND table_name='user' AND column_name='username')
    AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema=current_schema() AND table_name='user' AND column_name='displayUsername') AS username_ready,
    to_regclass('family_households') IS NOT NULL
    AND to_regclass('family_members') IS NOT NULL
    AND to_regclass('family_invites') IS NOT NULL
    AND to_regclass('family_devices') IS NOT NULL
    AND to_regclass('family_reminders') IS NOT NULL
    AND to_regclass('family_deliveries') IS NOT NULL AS household_ready`);
  return { usernameReady: !!rows[0]?.username_ready, householdReady: !!rows[0]?.household_ready };
}
