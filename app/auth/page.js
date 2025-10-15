"use client";

import { useState } from "react";
import { supabase } from "../../lib/supabaseClient";

export default function AuthPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  async function signIn(e) {
    e.preventDefault();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) alert(error.message);
    else window.location.href = "/messages"; // go back to messages after login
  }

  async function signUp(e) {
    e.preventDefault();
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) return alert(error.message);
    // If your project requires email confirmation, confirm the email OR
    // in Supabase Auth settings (Authentication → Providers → Email),
    // disable "Confirm email" for development.
    if (!data.session) alert("Check your email to confirm, then come back and sign in.");
  }

  return (
    <main className="mx-auto max-w-sm p-6">
      <h1 className="mb-4 text-2xl font-bold">Sign in</h1>
      <form className="space-y-3" onSubmit={signIn}>
        <input
          type="email" required placeholder="email@example.com"
          className="w-full rounded-xl border px-3 py-2"
          value={email} onChange={(e) => setEmail(e.target.value)}
        />
        <input
          type="password" required placeholder="Your password"
          className="w-full rounded-xl border px-3 py-2"
          value={password} onChange={(e) => setPassword(e.target.value)}
        />
        <button className="w-full rounded-xl bg-emerald-600 py-2 text-white">Sign in</button>
      </form>

      <div className="mt-6">
        <h2 className="mb-2 font-semibold">New here?</h2>
        <button
          onClick={signUp}
          className="w-full rounded-xl border px-3 py-2"
        >
          Create account
        </button>
      </div>
    </main>
  );
}
