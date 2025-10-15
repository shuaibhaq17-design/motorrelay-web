"use client";

import RequireAuth from "../components/auth/RequireAuth";
import RequireOnboarded from "../components/auth/RequireOnboarded";

export default function MessagesLayout({ children }) {
  // Any page under /messages now requires auth and completed onboarding
  return (
    <RequireAuth>
      <RequireOnboarded>{children}</RequireOnboarded>
    </RequireAuth>
  );
}
