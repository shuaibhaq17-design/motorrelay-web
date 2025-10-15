'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { supabase } from '../../lib/supabaseClient';
import { hasAdminAccess } from '../components/auth/RequireAdmin';

const TRANSPORT_TYPES = ['drive_away', 'trailer'];

export default function CreateJobPage() {
  const [me, setMe] = useState(null);
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    let on = true;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!on) return;
      if (!user) { window.location.href = '/login?redirect=/create-job'; return; }
      setMe(user);
      const isAdmin = hasAdminAccess(user);
      const role = user?.user_metadata?.role || '';
      const ok = isAdmin || role === 'dealer';
      if (!ok) {
        window.dispatchEvent(new CustomEvent('mr-toast', { detail: { title: 'Access restricted', message: 'Only dealership accounts can create jobs.' } }));
        window.location.href = '/jobs';
        return;
      }
      setAllowed(true);
    })();
    return () => { on = false; };
  }, []);
  const [form, setForm] = useState({
    title: '',
    pickup_postcode: '',
    dropoff_postcode: '',
    vehicle_make: '',
    price: '',
    transport_type: 'drive_away',
  });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);

  const canSubmit = useMemo(() => {
    const ok =
      form.title.trim() &&
      form.pickup_postcode.trim() &&
      form.dropoff_postcode.trim() &&
      form.vehicle_make.trim() &&
      String(form.price).trim() &&
      !Number.isNaN(Number(form.price)) &&
      Number(form.price) > 0 &&
      TRANSPORT_TYPES.includes(form.transport_type) &&
      !submitting;
    return !!ok;
  }, [form, submitting]);

  const setField = (k, v) => setForm(p => ({ ...p, [k]: v }));

  function validate() {
    const e = {};
    if (!form.title.trim()) e.title = 'Title is required.';
    if (!form.pickup_postcode.trim()) e.pickup_postcode = 'Pickup postcode is required.';
    if (!form.dropoff_postcode.trim()) e.dropoff_postcode = 'Drop-off postcode is required.';
    if (!form.vehicle_make.trim()) e.vehicle_make = 'Vehicle make/model is required.';
    const priceNum = Number(form.price);
    if (Number.isNaN(priceNum) || priceNum <= 0) e.price = 'Enter a valid positive number.';
    if (!TRANSPORT_TYPES.includes(form.transport_type)) e.transport_type = 'Select a valid transport type.';
    return e;
  }

  async function onSubmit(e) {
    e.preventDefault();
    setResult(null);

    const eMap = validate();
    setErrors(eMap);
    if (Object.keys(eMap).length) return;

    setSubmitting(true);
    try {
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      if (!url || !key) throw new Error('Missing Supabase env vars in .env.local');

      // Create client
      const supabase = createClient(url, key);

      // ✅ get current session (if signed in) and attach user_id (else null)
      const { data: sess } = await supabase.auth.getSession();
      const userId = sess?.session?.user?.id || null;

      const payload = {
        title: form.title.trim(),
        pickup_postcode: form.pickup_postcode.trim(),
        dropoff_postcode: form.dropoff_postcode.trim(),
        vehicle_make: form.vehicle_make.trim(),
        price: Number(form.price),
        transport_type: form.transport_type,
        user_id: userId, // <-- attach here
      };

      const { data, error } = await supabase.from('jobs').insert(payload).select().single();
      if (error) {
        console.error('Supabase insert error:', error);
        setResult({ ok: false, message: error.message });
      } else {
        setResult({ ok: true, message: 'Job created', id: data.id });
        // clear a few fields
        setForm(f => ({ ...f, title: '', vehicle_make: '', price: '' }));
      }
    } catch (err) {
      console.error('Submit exception:', err);
      setResult({ ok: false, message: String(err?.message || err) });
    } finally {
      setSubmitting(false);
    }
  }

  const ToggleButton = ({ value, label }) => {
    const active = form.transport_type === value;
    return (
      <button
        type="button"
        onClick={() => setField('transport_type', value)}
        className={[
          'px-4 py-2 rounded-xl border transition',
          active ? 'bg-emerald-600 text-white border-emerald-700'
                 : 'bg-white text-gray-800 border-gray-200 hover:bg-gray-50'
        ].join(' ')}
        aria-pressed={active}
      >
        {label}
      </button>
    );
  };

  if (!allowed) {
    return (
      <main className="min-h-dvh bg-gray-50 text-gray-900">
        <header className="bg-white border-b">
          <div className="max-w-xl mx-auto p-4 flex items-center justify-between">
            <Link href="/" className="text-sm text-emerald-700 hover:underline">← Home</Link>
            <span className="text-sm text-gray-500">/create-job</span>
          </div>
        </header>
        <div className="mx-auto max-w-xl p-6">
          <div className="rounded-2xl border bg-white p-6 text-sm text-gray-700">Checking access…</div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-dvh bg-gray-50 text-gray-900">
      <header className="bg-white border-b">
        <div className="max-w-xl mx-auto p-4 flex items-center justify-between">
          <Link href="/" className="text-sm text-emerald-700 hover:underline">← Home</Link>
          <span className="text-sm text-gray-500">/create-job</span>
        </div>
      </header>

      <div className="mx-auto max-w-xl p-6">
        <h1 className="text-2xl font-semibold mb-2">Create Job</h1>
        <p className="text-sm text-gray-600 mb-6">
          Include pick-up, drop-off, vehicle details, price, and transport type.
        </p>

        <form onSubmit={onSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium mb-1">Title</label>
            <input
              value={form.title}
              onChange={e => setField('title', e.target.value)}
              className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-500"
              placeholder="e.g. Deliver Audi A3 to Manchester"
            />
            {errors.title && <p className="text-sm text-red-600 mt-1">{errors.title}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Pickup postcode</label>
            <input
              value={form.pickup_postcode}
              onChange={e => setField('pickup_postcode', e.target.value)}
              className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-500"
              placeholder="e.g. M1 2AB"
              autoCapitalize="characters"
            />
            {errors.pickup_postcode && <p className="text-sm text-red-600 mt-1">{errors.pickup_postcode}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Drop-off postcode</label>
            <input
              value={form.dropoff_postcode}
              onChange={e => setField('dropoff_postcode', e.target.value)}
              className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-500"
              placeholder="e.g. LS1 4XY"
              autoCapitalize="characters"
            />
            {errors.dropoff_postcode && <p className="text-sm text-red-600 mt-1">{errors.dropoff_postcode}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Vehicle make/model</label>
            <input
              value={form.vehicle_make}
              onChange={e => setField('vehicle_make', e.target.value)}
              className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-500"
              placeholder="e.g. BMW 3 Series"
            />
            {errors.vehicle_make && <p className="text-sm text-red-600 mt-1">{errors.vehicle_make}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Price (£)</label>
            <input
              inputMode="decimal"
              value={form.price}
              onChange={e => setField('price', e.target.value)}
              className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-500"
              placeholder="e.g. 120"
            />
            {errors.price && <p className="text-sm text-red-600 mt-1">{errors.price}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Transport type</label>
            <div className="flex gap-3">
              <ToggleButton value="drive_away" label="Drive-away" />
              <ToggleButton value="trailer" label="Trailer" />
            </div>
            {errors.transport_type && <p className="text-sm text-red-600 mt-1">{errors.transport_type}</p>}
            <p className="text-xs text-gray-500 mt-2">
              <strong>Drive-away</strong>: driver delivers by driving the car.{' '}
              <strong>Trailer</strong>: transported on a trailer/transporter.
            </p>
          </div>

          <button
            type="submit"
            disabled={!canSubmit}
            className={[
              'w-full rounded-xl py-3 font-medium transition',
              canSubmit ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                        : 'bg-gray-200 text-gray-500 cursor-not-allowed'
            ].join(' ')}
          >
            {submitting ? 'Creating…' : 'Create job'}
          </button>

          {result && (
            <div
              className={[
                'rounded-xl px-4 py-3 border mt-4',
                result.ok
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  : 'bg-red-50 border-red-200 text-red-800',
              ].join(' ')}
            >
              {result.ok ? <>✅ {result.message} (ID: {result.id})</> : <>⚠️ {result.message}</>}
            </div>
          )}
        </form>

        {/* tiny debug helper */}
        <p className="text-xs text-gray-500 mt-4">
          transport_type: <strong>{form.transport_type}</strong>
        </p>
      </div>
    </main>
  );
}
