import type { Metadata } from "next";

import { AuthShell } from "~/components/auth/auth-shell";

export const metadata: Metadata = {
  title: "Sign Up — ChaiForm",
};

export default function SignUpPage() {
  return <AuthShell mode="sign-up" />;
}
