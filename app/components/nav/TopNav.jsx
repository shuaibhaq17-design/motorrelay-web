"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabaseClient";
import { hasAdminAccess } from "../auth/RequireAdmin";

const tabs = [
  { href: "/", label: "Home" },
  { href: "/jobs", label: "Jobs" },
  { href: "/messages", label: "Messages" },
  { href: "/planner", label: "Planner" },
  { href: "/membership", label: "Membership" },
  { href: "/profile", label: "Profile" },
];

const defaultPlan = "Bronze";
const formatPlanName = (value) => {
  if (!value) return defaultPlan;
  const trimmed = value.trim();
  if (!trimmed) return defaultPlan;
  return trimmed.replace(/^./, (m) => m.toUpperCase());
};

export default function TopNav() {
  const pathname = usePathname() || "/";
  const [email, setEmail] = useState(null);
  const [plan, setPlan] = useState(defaultPlan);
  const [isAdmin, setIsAdmin] = useState(false);
  const [role, setRole] = useState(null);
  const [adminMenuOpen, setAdminMenuOpen] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const applyUser = (user) => {
      if (!isMounted) return;
      setEmail(user?.email || null);
      setIsAdmin(hasAdminAccess(user));
      setRole(user?.user_metadata?.role || null);
    };

    (async () => {
      const { data } = await supabase.auth.getUser();
      applyUser(data?.user || null);
    })();

    const { data: authSub } = supabase.auth.onAuthStateChange((_, session) => {
      applyUser(session?.user || null);
    });

    let detachPlanListeners = () => {};
    if (typeof window !== "undefined") {
      const applyPlan = (value) => {
        if (isMounted) setPlan(formatPlanName(value));
      };

      applyPlan(window.localStorage.getItem("mr_plan"));
      // apply role override if present
      const ov = window.localStorage.getItem('mr_role_override');
      if (ov) setRole(ov);

      const handlePlanSelected = (event) => {
        const next = event.detail?.plan;
        if (next) applyPlan(next);
      };

      const handleStorage = (event) => {
        if (event.key === "mr_plan") applyPlan(event.newValue);
        if (event.key === 'mr_role_override') setRole(event.newValue || null);
      };

      const handleRoleOverride = (event) => {
        const next = event.detail?.role || null;
        setRole(next);
      };

      window.addEventListener("mr-plan-selected", handlePlanSelected);
      window.addEventListener("storage", handleStorage);
      window.addEventListener('mr-role-override', handleRoleOverride);

      detachPlanListeners = () => {
        window.removeEventListener("mr-plan-selected", handlePlanSelected);
        window.removeEventListener("storage", handleStorage);
        window.removeEventListener('mr-role-override', handleRoleOverride);
      };
    }

    return () => {
      isMounted = false;
      authSub?.subscription?.unsubscribe();
      detachPlanListeners();
    };
  }, []);

  async function signOut() {
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  return (
    <header className="sticky top-0 z-40 border-b border-gray-200 bg-white/95 text-gray-900 shadow-sm backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <Link href="/" className="flex items-center gap-2">
          <div className="grid h-9 w-9 place-items-center rounded-2xl bg-emerald-500 text-white" title="MotorRelay">
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="#fff" strokeWidth="2">
              <path d="M3 13l1-3.5A2 2 0 0 1 6 8h9a2 2 0 0 1 1.9 1.37L18 13M6 13h12v2a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2v-2" />
            </svg>
          </div>
          <div>
            <div className="text-xl font-bold leading-5 text-gray-900">MotorRelay</div>
            <div className="-mt-0.5 text-xs text-gray-500">move smarter</div>
          </div>
        </Link>

        <nav className="hidden flex-1 items-center justify-center gap-1 sm:flex">
          {tabs
            .filter((t) => {
              if (t.href !== '/planner') return true;
              const isDriver = role === 'driver';
              const planKey = (plan || '').toString().toLowerCase();
              const isGold = planKey === 'gold';
              // Admins always see Planner; drivers need Gold
              return isAdmin || (isDriver && isGold);
            })
            .map((t) => (
              <Link
                key={t.href}
                href={t.href}
                className={`rounded-2xl px-4 py-2 text-sm font-semibold transition hover:bg-emerald-50 hover:text-emerald-700 ${
                pathname === t.href
                  ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
                  : "text-gray-600"
              }`}
            >
              {t.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2 text-sm font-semibold relative">
          {isAdmin ? (
            <div className="relative">
              <button
                onClick={() => setAdminMenuOpen(v => !v)}
                className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-emerald-700 hover:bg-emerald-100"
              >
                Admin ▾
              </button>
              {adminMenuOpen ? (
                <div className="absolute right-0 mt-1 w-56 rounded-xl border bg-white p-1 shadow-lg z-50">
                  <Link href="/admin" onClick={()=>setAdminMenuOpen(false)} className="block rounded-lg px-3 py-2 text-sm hover:bg-gray-50">Open Admin</Link>
                  <div className="my-1 h-px bg-gray-100" />
                  <button onClick={()=>{
                    try{window.localStorage.setItem('mr_role_override','driver');window.dispatchEvent(new CustomEvent('mr-role-override',{detail:{role:'driver'}}));}catch{}
                    setAdminMenuOpen(false);
                  }} className="block w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-gray-50">View as Driver</button>
                  <button onClick={()=>{
                    try{window.localStorage.setItem('mr_role_override','dealer');window.dispatchEvent(new CustomEvent('mr-role-override',{detail:{role:'dealer'}}));}catch{}
                    setAdminMenuOpen(false);
                  }} className="block w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-gray-50">View as Dealership</button>
                  <button onClick={()=>{
                    try{window.localStorage.removeItem('mr_role_override');window.dispatchEvent(new CustomEvent('mr-role-override',{detail:{role:null}}));}catch{}
                    setAdminMenuOpen(false);
                  }} className="block w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-gray-50">Reset view</button>
                </div>
              ) : null}
            </div>
          ) : null}
          <span className="rounded-2xl border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-emerald-700">
            {plan}
          </span>
          {email ? (
            <button
              onClick={signOut}
              className="rounded-xl bg-emerald-500 px-3 py-1.5 text-white shadow-sm hover:bg-emerald-600"
              title={email}
            >
              Sign out
            </button>
          ) : (
            <Link
              href="/login"
              className="rounded-xl border border-gray-200 px-3 py-1.5 text-gray-700 hover:bg-gray-50"
            >
              Sign in
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
