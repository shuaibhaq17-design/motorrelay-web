'use client';

import { use } from 'react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabaseClient';

export default function InvoiceDetailPage({ params }) {
  const { id } = use(params);
  const [inv, setInv] = useState(null);
  const [lines, setLines] = useState([]);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('invoices').select('*').eq('id', id).maybeSingle();
      setInv(data || null);
      const { data: ls } = await supabase.from('invoice_lines').select('*').eq('invoice_id', id).order('created_at', { ascending: true });
      setLines(ls || []);
    })();
  }, [id]);

  if (!inv) return <div className="rounded-2xl border bg-white p-4">Loading…</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Link href="/invoices" className="px-3 py-2 rounded-xl border">← Back</Link>
          <h1 className="text-2xl font-bold">Invoice • {inv.to_name || 'Customer'}</h1>
        </div>
        <button onClick={() => window.print()} className="px-3 py-2 rounded-xl bg-emerald-600 text-white">Download / Print</button>
      </div>

      <div className="bg-white rounded-2xl border shadow p-6">
        <div className="flex items-start justify-between border-b pb-4">
          <div>
            <div className="font-bold text-xl">MotorRelay</div>
            <div className="text-sm text-gray-500 -mt-1">Invoice</div>
          </div>
          <div className="text-right text-sm text-gray-500">
            <div>Date</div>
            <div className="text-[13px] text-gray-700">{inv.issued_on}</div>
          </div>
        </div>

        <div className="mt-4">
          <div className="grid md:grid-cols-2 gap-6">
            <div><div className="text-sm text-gray-500 mb-1">Bill From</div><div className="text-sm">{inv.from_name || 'Driver'}</div></div>
            <div><div className="text-sm text-gray-500 mb-1">Bill To</div><div className="text-sm">{inv.to_name || 'Customer'}</div></div>
          </div>
        </div>

        <div className="mt-4">
          <table className="w-full text-sm">
            <thead className="text-left border-b">
              <tr><th className="py-2">Description</th><th className="py-2 text-right">Qty</th><th className="py-2 text-right">Rate</th><th className="py-2 text-right">Total</th></tr>
            </thead>
            <tbody>
              {lines.map(l => (
                <tr key={l.id} className="border-b">
                  <td className="py-2">{l.description}</td>
                  <td className="py-2 text-right">{Number(l.qty).toFixed(2)}</td>
                  <td className="py-2 text-right">£{Number(l.rate).toFixed(2)}</td>
                  <td className="py-2 text-right">£{Number(l.line_total).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="text-right grid gap-1 mt-3">
            <div>Subtotal: £{Number(inv.subtotal||0).toFixed(2)}</div>
            <div>VAT (20%): £{Number(inv.vat||0).toFixed(2)}</div>
            <div className="text-lg font-bold">Grand Total: £{Number(inv.total||0).toFixed(2)}</div>
          </div>
        </div>

        <div className="text-xs text-gray-600 border-t mt-4 pt-3">Legal: You agree to MotorRelay platform terms. Payments subject to verification and fraud checks.</div>
      </div>
    </div>
  );
}
