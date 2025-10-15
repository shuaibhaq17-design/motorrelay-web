"use client";

import RequireAuth from "../components/auth/RequireAuth";

export default function TrackingLayout({ children }) {
  return <RequireAuth>{children}</RequireAuth>;
}
