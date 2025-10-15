"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "../../lib/supabaseClient";

function OnboardingFallback() {
  return (
    <div className="mx-auto flex min-h-[80vh] max-w-md items-center justify-center px-4">
      <div className="w-full rounded-2xl border bg-white p-6 text-center shadow-sm">
        <p className="text-sm text-gray-600">Loading onboarding…</p>
      </div>
    </div>
  );
}

function OnboardingContent() {
  const router = useRouter();
  const qs = useSearchParams();
  const nextHref = qs?.get("next") || "/profile";

  const [me, setMe] = useState(null);
  const [name, setName] = useState("");
  const [role, setRole] = useState("driver"); // 'driver' | 'dealer'
  const [company, setCompany] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    let on = true;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!on) return;
      if (!user) { window.location.href = `/login?redirect=${encodeURIComponent("/onboarding")}`; return; }
      setMe(user);
      const defaultName = user?.user_metadata?.name || user?.email?.split("@")[0] || "";
      setName(defaultName);
      const defaultRole = user?.user_metadata?.role;
      if (defaultRole === "dealer" || defaultRole === "driver") setRole(defaultRole);
    })();
    return () => { on = false; };
  }, []);

  async function save() {
    if (!me) return;
    setBusy(true);
    setErr("");
    try {
      // 1) Store in auth user metadata
      const { error: authErr } = await supabase.auth.updateUser({
        data: { name: name.trim(), role, company_name: role === "dealer" ? company.trim() : null },
      });
      if (authErr) throw authErr;

      // 2) Best-effort upsert into profiles (if table/columns exist)
      try {
        const payload = {
          id: me.id,
          full_name: name.trim() || null,
          email: me.email || null,
          role,
          company_name: role === "dealer" ? (company.trim() || null) : null,
        };
        const { error: pErr } = await supabase.from("profiles").upsert(payload, { onConflict: "id" });
        if (pErr) {
          const msg = (pErr.message || "").toLowerCase();
          const ignorable = msg.includes("relation \"profiles\" does not exist") || msg.includes("column") || msg.includes("does not exist");
          if (!ignorable) console.warn("profiles upsert warning:", pErr);
        }
      } catch (e) {
        // Ignore schema errors quietly to avoid blocking onboarding
        console.warn("profiles upsert skipped:", e?.message || e);
      }

      window.dispatchEvent(
        new CustomEvent("mr-toast", { detail: { title: "Welcome to MotorRelay", message: "Profile saved." } })
      );
      router.replace(nextHref);
    } catch (e) {
      setErr(e?.message || "Could not save your details");
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-md px-4 py-8">
      <div className="rounded-2xl border bg-white p-6 shadow-sm">
        <h1 className="text-xl font-semibold">Let’s get you set up</h1>
        <p className="mt-1 text-sm text-gray-600">Tell us a bit about you.</p>

        <div className="mt-5 space-y-4">
          <label className="block text-xs font-medium text-gray-600">
            Full name
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500"
              placeholder="e.g. Alex Carter"
            />
          </label>

          <div>
            <div className="mb-1 text-xs font-medium text-gray-600">I am a…</div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setRole("driver")}
                className={`rounded-xl border px-3 py-2 text-sm ${role === "driver" ? "bg-emerald-600 text-white border-emerald-700" : "bg-white text-gray-800 border-gray-200 hover:bg-gray-50"}`}
                aria-pressed={role === "driver"}
              >
                Driver
              </button>
              <button
                type="button"
                onClick={() => setRole("dealer")}
                className={`rounded-xl border px-3 py-2 text-sm ${role === "dealer" ? "bg-emerald-600 text-white border-emerald-700" : "bg-white text-gray-800 border-gray-200 hover:bg-gray-50"}`}
                aria-pressed={role === "dealer"}
              >
                Dealership
              </button>
            </div>
          </div>

          {role === "dealer" && (
            <label className="block text-xs font-medium text-gray-600">
              Company name
              <input
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                placeholder="e.g. City Motors"
              />
            </label>
          )}

          {err ? <p className="text-sm text-rose-600">{err}</p> : null}

          <button
            type="button"
            onClick={save}
            disabled={busy}
            className="w-full rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            {busy ? "Saving…" : "Save and continue"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function OnboardingPage() {
  return (
    <Suspense fallback={<OnboardingFallback />}>
      <OnboardingContent />
    </Suspense>
  );
}

