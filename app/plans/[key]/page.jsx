'use client';

import { use } from 'react';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '../../../lib/supabaseClient';

export default function PlanInfoPage({ params }) {
  const { key } = use(params);

  const [plan, setPlan] = useState(null);
  const [agree, setAgree] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('membership_plans').select('*').eq('key', key).maybeSingle();
      setPlan(data || null);
    })();
  }, [key]);

  if (!plan) return <div className="rounded-2xl border bg-white p-4">Loading…</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Link href="/plans" className="px-3 py-2 rounded-xl border">← Back</Link>
          <h1 className="text-2xl font-bold">{plan.name} plan</h1>
        </div>
      </div>

      <div className="bg-white p-5 rounded-2xl border">
        <div className="text-sm text-gray-700">
          <p className="mb-2">{plan.name} gives you:</p>
          <ul className="list-disc pl-5">{(plan.perks||[]).map((x, i) => <li key={i}>{x}</li>)}</ul>
        </div>

        <div className="mt-4 flex items-center gap-2">
          <a className="underline text-emerald-700" href="#" target="_blank">Terms & Conditions (PDF)</a>
          <label className="text-sm inline-flex items-center gap-2 ml-auto">
            <input type="checkbox" checked={agree} onChange={e => setAgree(e.target.checked)} /> I agree to the Terms
          </label>
        </div>

        <div className="mt-3 text-right">
          <button
            disabled={!agree}
            onClick={async () => {
              await supabase.rpc('fn_set_membership', { p_plan_key: key });
              if (key === 'starter') window.location.href = '/profile';
              else window.location.href = '/billing/bank';
            }}
            className="px-4 py-2 rounded-xl bg-emerald-600 text-white disabled:opacity-50"
          >
            Proceed
          </button>
        </div>
      </div>
    </div>
  );
}
