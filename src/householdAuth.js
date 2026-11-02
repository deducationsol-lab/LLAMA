export const householdAuthOptions = {
  flowType: "pkce",
  detectSessionInUrl: true,
  persistSession: true,
};
export function googleSignInOptions(origin) {
  const url = new URL(origin);
  if (
    url.protocol !== "https:" &&
    !(
      url.protocol === "http:" &&
      ["localhost", "127.0.0.1"].includes(url.hostname)
    )
  )
    throw new Error("Google sign-in requires HTTPS.");
  return {
    provider: "google",
    options: {
      redirectTo: url.origin + "/?household=1",
      scopes: "openid email profile",
      queryParams: { prompt: "select_account" },
    },
  };
}
