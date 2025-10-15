'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { supabase } from '../../lib/supabaseClient';
import RequireAuth from '../components/auth/RequireAuth';
import RequireOnboarded from '../components/auth/RequireOnboarded';

export default function InvoiceBuilderPage() {
  const [me, setMe] = useState(null);
  const [inv, setInv] = useState(null);      // current draft invoice row
  const [lines, setLines] = useState([]);    // lines for the draft
  const [list, setList] = useState([]);      // previous invoices

  const subtotal = useMemo(() => lines.reduce((s, l) => s + (Number(l.qty||0) * Number(l.rate||0)), 0), [lines]);
  const vat = useMemo(() => subtotal * 0.2, [subtotal]);
  const total = useMemo(() => subtotal + vat, [subtotal, vat]);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { window.location.href = '/login'; return; }
      setMe(user);

      // show recent invoices
      const { data } = await supabase.from('invoices').select('id,issued_on,to_name,total,job_id').eq('user_id', user.id).order('issued_on', { ascending: false }).limit(40);
      setList(data || []);
    })();
  }, []);

  function addLine(desc = 'Vehicle delivery', qty = 1, rate = 50) {
    setLines(cur => [...cur, { id: crypto.randomUUID(), description: desc, qty, rate }]);
  }

  async function saveNew() {
    if (!me) return;

    // create a loose invoice not tied to a job
    const { data: row, error } = await supabase
      .from('invoices')
      .insert({ user_id: me.id, from_name: 'Driver', to_name: 'Customer', subtotal, vat, total })
      .select()
      .single();
    if (error) return alert(error.message);

    // push lines
    const payload = lines.map(l => ({
      invoice_id: row.id,
      description: l.description || 'Item',
      qty: Number(l.qty || 0),
      rate: Number(l.rate || 0),
      line_total: Number(l.qty || 0) * Number(l.rate || 0),
    }));
    if (payload.length) await supabase.from('invoice_lines').insert(payload);

    window.location.href = `/invoices/${row.id}`;
  }

  return (
    <RequireAuth>
      <RequireOnboarded>
    <div>
      <h1 className="text-2xl font-bold mb-3">Invoice</h1>

      <div className="bg-white p-4 rounded-2xl border mb-4">
        <div className="font-semibold mb-2">Create / Edit Invoice</div>

        {/* Very small editor */}
        <div className="mt-2">
          <button onClick={() => addLine()} className="px-3 py-2 rounded-xl border">+ Add line</button>
        </div>

        <div className="mt-3 overflow-x-auto">
          <table className="min-w-[640px] w-full border-collapse">
            <thead>
              <tr className="bg-gray-50 text-sm">
                <th className="text-left p-2">Description</th>
                <th className="text-right p-2">Qty</th>
                <th className="text-right p-2">Rate (£)</th>
                <th className="text-right p-2">Total (£)</th>
                <th className="p-2"></th>
              </tr>
            </thead>
            <tbody>
              {lines.map(l => (
                <tr key={l.id}>
                  <td className="p-2"><input className="w-full border rounded-lg px-2 py-1" value={l.description} onChange={e => setLines(cur => cur.map(x => x.id === l.id ? { ...x, description: e.target.value } : x))} /></td>
                  <td className="p-2 text-right"><input type="number" className="w-20 border rounded-lg px-2 py-1 text-right" value={l.qty} onChange={e => setLines(cur => cur.map(x => x.id === l.id ? { ...x, qty: e.target.value } : x))} /></td>
                  <td className="p-2 text-right"><input type="number" step="0.01" className="w-28 border rounded-lg px-2 py-1 text-right" value={l.rate} onChange={e => setLines(cur => cur.map(x => x.id === l.id ? { ...x, rate: e.target.value } : x))} /></td>
                  <td className="p-2 text-right">{(Number(l.qty||0) * Number(l.rate||0)).toFixed(2)}</td>
                  <td className="p-2 text-right"><button className="px-2 py-1 rounded-lg border" onClick={() => setLines(cur => cur.filter(x => x.id !== l.id))}>✕</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="text-right grid gap-1 mt-2">
          <div>Subtotal: £{subtotal.toFixed(2)}</div>
          <div>VAT (20%): £{vat.toFixed(2)}</div>
          <div className="text-lg font-bold">Grand Total: £{total.toFixed(2)}</div>
        </div>

        <div className="mt-3">
          <button onClick={saveNew} className="px-3 py-2 rounded-xl bg-emerald-600 text-white">Save & Open</button>
        </div>
      </div>

      <div className="flex items-center justify-between mb-2">
        <div className="font-semibold">Previous Job Invoices</div>
        <button onClick={async ()=>{
          const { data } = await supabase.from('invoices').select('id,issued_on,to_name,total,job_id').eq('user_id', me.id).order('issued_on', { ascending: false }).limit(40);
          setList(data || []);
        }} className="px-3 py-2 rounded-xl border">Refresh</button>
      </div>

      <div className="overflow-x-auto">
        <div className="grid auto-cols-[13rem] grid-flow-col gap-3">
          {list.map(r => (
            <Link key={r.id} href={`/invoices/${encodeURIComponent(r.id)}`} className="tile bg-white border rounded-2xl p-3 w-52 text-left">
              <div className="text-xs text-gray-500">{r.issued_on}</div>
              <div className="font-semibold">{r.to_name || 'Customer'}</div>
              <div className="text-xs text-gray-500 mt-1">£{Number(r.total||0).toFixed(2)}</div>
            </Link>
          ))}
        </div>
      </div>
    </div>
      </RequireOnboarded>
    </RequireAuth>
  );
}
