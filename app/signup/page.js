"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "../../lib/supabaseClient";

function SignupFallback() {
  return (
    <div className="mx-auto flex min-h-[80vh] max-w-md items-center justify-center px-4">
      <div className="w-full rounded-2xl border bg-white p-6 text-center shadow-sm">
        <p className="text-sm text-gray-600">Loading sign-up form...</p>
      </div>
    </div>
  );
}

function SignupContent() {
  const router = useRouter();
  const qs = useSearchParams();
  const redirectTo = qs?.get("redirect") || "/";

  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");

  useEffect(() => {
    let alive = true;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!alive) return;
      if (user) router.replace(redirectTo);
    })();
    return () => { alive = false; };
  }, [router, redirectTo]);

  async function handleSignUp(e) {
    e.preventDefault();
    setErr("");
    setOk("");
    setBusy(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password: pw,
      });
      if (error) throw error;

      if (data?.user && !data?.session) {
        setOk("Account created. Check your email to confirm, then sign in.");
      } else {
        router.replace(redirectTo);
      }
    } catch (e) {
      setErr(e?.message || "Sign-up failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-[80vh] max-w-md items-center px-4">
      <div className="w-full rounded-2xl border bg-white p-6 shadow-sm">
        <h1 className="mb-6 text-center text-xl font-semibold">Create an account</h1>

        <form onSubmit={handleSignUp} className="space-y-4">
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
              minLength={6}
            />
          </div>

          {err && <p className="text-sm text-rose-600">{err}</p>}
          {ok && <p className="text-sm text-emerald-700">{ok}</p>}

          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-lg bg-emerald-600 px-4 py-2.5 text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            {busy ? "Creating account..." : "Sign up"}
          </button>
        </form>

        <div className="mt-4 text-center text-sm">
          <a href={`/login?redirect=${encodeURIComponent(redirectTo)}`} className="text-gray-600 underline hover:text-gray-800">
            Already have an account? Sign in
          </a>
        </div>
      </div>
    </div>
  );
}

export default function SignupPage() {
  return (
    <Suspense fallback={<SignupFallback />}>
      <SignupContent />
    </Suspense>
  );
}

