"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { hasAdminAccess } from "./components/auth/RequireAdmin";

const defaultUpdates = [
  "\uD83D\uDD27 Improved job matching accuracy",
  "\uD83D\uDCB8 This week: 10% off delivery fees (Fri-Sun)",
  "\uD83D\uDDFA\uFE0F Live tracking accuracy upgrades",
  "\uD83D\uDDD3\uFE0F Tip: Use job # to search",
  "\uD83D\uDEE1\uFE0F New fraud checks for payouts",
];

const demoJobs = [
  { id: "demo-1", price: 72, pickup_label: "Camden", dropoff_label: "Croydon" },
  { id: "demo-2", price: 60, pickup_label: "Reading", dropoff_label: "Guildford" },
  { id: "demo-3", price: 120, pickup_label: "Leeds", dropoff_label: "Bradford" },
];

const quickLinks = [
  { href: "/jobs", label: "Jobs" },
  { href: "/messages", label: "Messages" },
  { href: "/planner", label: "Planner" },
  { href: "/invoices", label: "Invoice" },
  { href: "/profile", label: "Profile" },
];

export default function HomePage() {
  const [jobs, setJobs] = useState([]);
  const [me, setMe] = useState(null);
  const [role, setRole] = useState(null);
  const [plan, setPlan] = useState("");

  useEffect(() => {
    let isMounted = true;

    (async () => {
      try {
        const { data: userData } = await supabase.auth.getUser();
        if (isMounted) {
          const user = userData?.user || null;
          setMe(user);
          let baseRole = user?.user_metadata?.role || null;
          try {
            const ov = typeof window !== 'undefined' ? window.localStorage.getItem('mr_role_override') : null;
            if (ov) baseRole = ov;
          } catch {}
          setRole(baseRole);
          if (typeof window !== "undefined") {
            const stored = window.localStorage.getItem("mr_plan") || "";
            setPlan(stored);
          }
        }

        const { data } = await supabase
          .from("jobs")
          .select("id, price, pickup_label, dropoff_label")
          .order("created_at", { ascending: false })
          .limit(6);

        if (isMounted) setJobs(data || []);
      } catch {
        if (isMounted) setJobs([]);
      }
    })();

    return () => {
      isMounted = false;
    };
  }, []);

  const priceFormatter = useMemo(
    () =>
      new Intl.NumberFormat("en-GB", {
        style: "currency",
        currency: "GBP",
        maximumFractionDigits: 0,
      }),
    []
  );

  const jobsToDisplay = useMemo(() => {
    const source = Array.isArray(jobs) && jobs.length ? jobs : demoJobs;
    return source.slice(0, 3);
  }, [jobs]);

  return (
    <div className="space-y-6">
      <section className="grid gap-6 rounded-2xl border bg-white p-6 shadow md:grid-cols-3">
        <div className="md:col-span-2">
          <h1 className="text-3xl font-extrabold text-gray-900">Welcome to MotorRelay</h1>
          <p className="mt-2 text-gray-600">
            Connect dealerships with trusted delivery drivers. Post jobs, accept runs, and get paid fast.
          </p>

          <div className="mt-4 flex flex-wrap gap-3">
            <Link
              href="/jobs"
              className="tile inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2 text-white shadow-sm hover:bg-emerald-600"
            >
              Find Jobs
            </Link>
            {role === 'dealer' && (
              <Link
                href="/create-job"
                className="tile inline-flex items-center gap-2 rounded-xl border bg-white px-4 py-2 text-emerald-700 shadow-sm hover:bg-gray-50"
              >
                Create Job
              </Link>
            )}
            <Link
              href="/membership"
              className="tile inline-flex items-center gap-2 rounded-xl border bg-white px-4 py-2 text-emerald-700 shadow-sm hover:bg-gray-50"
            >
              Membership
            </Link>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-3">
            <div className="tile rounded-2xl bg-emerald-50 p-4">
              <div className="font-semibold text-emerald-900">Post or accept runs</div>
              <div className="text-sm text-emerald-700">Dealers post, drivers deliver.</div>
            </div>
            <div className="tile rounded-2xl bg-emerald-50 p-4">
              <div className="font-semibold text-emerald-900">Built-in messaging</div>
              <div className="text-sm text-emerald-700">Keep chats tidy.</div>
            </div>
            <div className="tile rounded-2xl bg-emerald-50 p-4">
              <div className="font-semibold text-emerald-900">Instant invoices</div>
              <div className="text-sm text-emerald-700">One click to print.</div>
            </div>
          </div>
        </div>

        <aside className="tile flex flex-col rounded-2xl border bg-white p-4">
          <div className="mb-2 flex items-center justify-between">
            <div className="font-bold text-gray-900">Start earning today</div>
            <span className="rounded-lg bg-emerald-100 px-2 py-1 text-xs text-emerald-700">Drivers & Dealers</span>
          </div>
          <p className="text-sm text-gray-600">See jobs near you and sign up in minutes.</p>

          <div className="my-3 max-h-48 space-y-2 overflow-y-auto pr-1">
            {jobsToDisplay.map((job, index) => {
              const key = job?.id ?? `demo-${index}`;
              const href = job?.id ? `/jobs/${encodeURIComponent(job.id)}` : "/jobs";
              const price = Number(job?.price || 0);

              return (
                <div key={key} className="flex items-center justify-between rounded-xl border bg-white/80 p-3">
                  <div>
                    <div className="font-semibold text-gray-900">{priceFormatter.format(Number.isFinite(price) ? price : 0)}</div>
                    <div className="text-xs text-gray-500">
                      {job?.pickup_label || "Pickup"}
                      <span aria-hidden="true" className="px-1 text-gray-300">
                        {"\u2192"}
                      </span>
                      {job?.dropoff_label || "Drop-off"}
                    </div>
                  </div>
                  <Link
                    href={href}
                    className="rounded-lg bg-emerald-500 px-3 py-1 text-xs font-semibold text-white hover:bg-emerald-600"
                  >
                    View
                  </Link>
                </div>
              );
            })}
          </div>

          {!me && (
            <div className="mt-auto pt-3">
              <Link
                href="/signup?redirect=/onboarding"
                className="block w-full rounded-xl bg-emerald-500 px-3 py-2 text-center text-sm font-semibold text-white hover:bg-emerald-600"
              >
                Sign up
              </Link>
              <Link
                href="/login"
                className="mt-2 block w-full rounded-xl border px-3 py-2 text-center text-sm font-semibold text-gray-700 hover:bg-gray-50"
              >
                Login
              </Link>
            </div>
          )}

          <div className="mt-4 rounded-2xl border p-3">
            <div className="mb-1 font-semibold text-gray-900">Updates</div>
            <ul className="space-y-1 text-sm text-gray-600">
              {defaultUpdates.map((item, idx) => (
                <li key={idx}>{item}</li>
              ))}
            </ul>
          </div>
        </aside>
      </section>

      <section className="grid gap-3 md:grid-cols-4">
        {quickLinks
          .filter((link) => {
            if (link.href !== "/planner") return true;
            const isGold = (plan || "").toLowerCase() === "gold";
            const isAdmin = hasAdminAccess(me);
            return isAdmin || (role === "driver" && isGold);
          })
          .map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="tile rounded-2xl border bg-white px-4 py-3 text-left font-semibold text-gray-900 shadow-sm hover:bg-gray-50"
          >
            {link.label}
          </Link>
        ))}
      </section>
    </div>
  );
}
