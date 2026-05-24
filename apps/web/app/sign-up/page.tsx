import type { Metadata } from "next";

import { AuthShell } from "~/components/auth/auth-shell";
import { fetchAuthProviders, getGoogleProvider } from "~/lib/fetch-auth-providers";

export const metadata: Metadata = {
  title: "Sign Up — ChaiForm",
};

export default async function SignUpPage() {
  const providers = await fetchAuthProviders();
  const googleEnabled = Boolean(getGoogleProvider(providers));

  return <AuthShell mode="sign-up" googleEnabled={googleEnabled} />;
}
