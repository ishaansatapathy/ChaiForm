import type { Metadata } from "next";

import { AuthShell } from "~/components/auth/auth-shell";
import { fetchAuthProviders, getGoogleProvider } from "~/lib/fetch-auth-providers";

export const metadata: Metadata = {
  title: "Sign In — ChaiForm",
};

export default async function SignInPage() {
  const providers = await fetchAuthProviders();
  const googleEnabled = Boolean(getGoogleProvider(providers));
  const demoLoginEnabled = process.env.DEMO_LOGIN_ENABLED === "true";

  return (
    <AuthShell mode="sign-in" googleEnabled={googleEnabled} demoLoginEnabled={demoLoginEnabled} />
  );
}
