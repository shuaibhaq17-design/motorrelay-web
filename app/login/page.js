"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "../../lib/supabaseClient";

function LoginFallback() {
  return (
    <div className="mx-auto flex min-h-[80vh] max-w-md items-center justify-center px-4">
      <div className="w-full rounded-2xl border bg-white p-6 text-center shadow-sm">
        <p className="text-sm text-gray-600">Loading sign-in form...</p>
      </div>
    </div>
  );
}

function LoginContent() {
  const router = useRouter();
  const qs = useSearchParams();
  const redirectTo = qs?.get("redirect") || "/";

  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    let alive = true;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!alive) return;
      if (user) router.replace(redirectTo);
    })();
    return () => { alive = false; };
  }, [router, redirectTo]);

  async function handleSignIn(e) {
    e.preventDefault();
    setErr("");
    setBusy(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password: pw });
      if (error) throw error;
      router.replace(redirectTo);
    } catch (e) {
      setErr(e?.message || "Sign-in failed");
    } finally {
      setBusy(false);
    }
  }

  async function handleSignUp() {
    setErr("");
    setBusy(true);
    try {
      const { error } = await supabase.auth.signUp({ email: email.trim(), password: pw });
      if (error) throw error;
      alert("Account created. Please check your email if confirmation is required, then sign in.");
    } catch (e) {
      setErr(e?.message || "Sign-up failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-[80vh] max-w-md items-center px-4">
      <div className="w-full rounded-2xl border bg-white p-6 shadow-sm">
        <h1 className="mb-6 text-center text-xl font-semibold">Sign in</h1>

        <form onSubmit={handleSignIn} className="space-y-4">
          <div>
            <label className="mb-1 block text-xs text-gray-600">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-500"
              placeholder="you@example.com"
              required
            />
          </div>

          <div>
            <label className="mb-1 block text-xs text-gray-600">Password</label>
            <input
              type="password"
              value={pw}
              onChange={(e) => setPw(e.target.value)}
              className="w-full rounded-lg border px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-500"
              placeholder="********"
              required
            />
          </div>

          {err && <p className="text-sm text-rose-600">{err}</p>}

          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-lg bg-emerald-600 px-4 py-2.5 text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            {busy ? "Signing in..." : "Sign in"}
          </button>
        </form>

        <div className="mt-4 text-center">
          <button
            onClick={handleSignUp}
            disabled={busy}
            className="text-xs text-gray-600 underline hover:text-gray-800 disabled:opacity-50"
          >
            Create an account
          </button>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginFallback />}>
      <LoginContent />
    </Suspense>
  );
}