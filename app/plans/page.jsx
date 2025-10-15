'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '../../lib/supabaseClient';

export default function PlansPage() {
  const [plans, setPlans] = useState([]);
  const [mine, setMine] = useState(null);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { window.location.href = '/login'; return; }

      const { data: planRows } = await supabase.from('membership_plans').select('*').order('price');
      setPlans(planRows || []);

      const { data: sub } = await supabase.from('user_membership').select('*').eq('user_id', user.id).maybeSingle();
      setMine(sub || null);
    })();
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-3">Membership</h1>
      <div className="grid md:grid-cols-3 gap-4">
        {plans.map(p => {
          const active = mine?.plan_key === p.key;
          return (
            <div key={p.key} className={`tile bg-white border rounded-2xl p-5 flex flex-col ${active ? 'ring-2 ring-emerald-500' : ''}`}>
              <div className="flex items-baseline justify-between">
                <div className="text-xl font-bold">{p.name}</div>
                <div className="text-sm text-gray-600">£{Number(p.price).toFixed(2)}/mo</div>
              </div>
              <ul className="mt-3 space-y-1 text-sm flex-1">
                {(p.perks || []).map((x, i) => <li key={i}>✔ {x}</li>)}
              </ul>
              <div className="mt-3 flex gap-2">
                <Link href={`/plans/${encodeURIComponent(p.key)}`} className="px-3 py-2 rounded-xl border">Learn more</Link>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
