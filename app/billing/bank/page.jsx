'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function BankPage() {
  const [busy, setBusy] = useState(false);

  async function activate() {
    setBusy(true);
    // In real life you’d call your payments provider here.
    setTimeout(() => { window.location.href = '/profile'; }, 900);
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Link href="/plans" className="px-3 py-2 rounded-xl border">← Back</Link>
          <h1 className="text-2xl font-bold">Direct Debit</h1>
        </div>
      </div>

      <div className="bg-white p-5 rounded-2xl border grid md:grid-cols-2 gap-3">
        <input className="border rounded-xl px-3 py-2" placeholder="Account holder name" />
        <input className="border rounded-xl px-3 py-2" placeholder="Sort code (00-00-00)" />
        <input className="border rounded-xl px-3 py-2" placeholder="Account number" />
        <div className="text-sm text-gray-600 md:col-span-2">Direct Debit Guarantee applies.</div>
        <div className="md:col-span-2 text-right">
          <button disabled={busy} onClick={activate} className="px-4 py-2 rounded-xl bg-emerald-600 text-white disabled:opacity-50">
            {busy ? 'Please wait…' : 'Activate'}
          </button>
        </div>
      </div>
    </div>
  );
}
