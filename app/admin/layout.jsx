"use client";

import RequireAdmin from "../components/auth/RequireAdmin";

export default function AdminLayout({ children }) {
  return <RequireAdmin>{children}</RequireAdmin>;
}
