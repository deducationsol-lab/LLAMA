// Return only to this app's root, never an untrusted query-string redirect.
export const googleSignInOptions = (origin) => ({
  provider: "google",
  options: {
    redirectTo: new URL("/", origin).href,
    scopes: "openid email profile",
    queryParams: { prompt: "select_account" },
  },
});

export const emailConfirmationOptions = (origin) => ({
  emailRedirectTo: new URL("/", origin).href,
});

export function authErrorMessage(error) {
  if (error.code === "over_email_send_rate_limit" || error.status === 429) {
    return "Too many authentication requests. Please wait before retrying, or continue with Google if email is unavailable.";
  }
  if (error.code === "email_address_not_authorized") {
    return "Email delivery isn't configured for this address. Continue with Google or contact support.";
  }
  if (/provider.*not enabled|unsupported provider/i.test(error.message || "")) {
    return "Google sign-in is not enabled yet. The app owner needs to enable Google in Supabase Auth.";
  }
  return error.message || "Authentication failed. Please try again.";
}
