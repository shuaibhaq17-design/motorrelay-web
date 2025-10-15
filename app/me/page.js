'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import Link from 'next/link';

export default function MePage() {
  const [user, setUser] = useState(null);
  const [copyNote, setCopyNote] = useState('');

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user || null);
    })();
  }, []);

  async function copy(text) {
    try {
      await navigator.clipboard.writeText(text);
      setCopyNote('Copied!');
      setTimeout(() => setCopyNote(''), 1500);
    } catch {
      setCopyNote('Copy failed');
      setTimeout(() => setCopyNote(''), 1500);
    }
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-xl p-6">
        <h1 className="text-lg font-semibold">Who am I?</h1>
        <p className="mt-2 text-sm text-gray-600">You’re not signed in.</p>
        <p className="mt-2 text-sm">
          Go to <Link className="text-emerald-600 underline" href="/messages">/messages</Link> and sign in.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl p-6 space-y-4">
      <h1 className="text-lg font-semibold">Who am I?</h1>

      <div className="rounded-2xl border p-4">
        <p className="text-sm text-gray-500">Email</p>
        <p className="font-medium">{user.email || '(no email on this provider)'}</p>
      </div>

      <div className="rounded-2xl border p-4">
        <p className="text-sm text-gray-500">User ID (UUID)</p>
        <div className="mt-1 flex items-center gap-2">
          <code className="rounded-lg bg-gray-100 px-2 py-1 text-xs">{user.id}</code>
          <button
            onClick={() => copy(user.id)}
            className="rounded-lg border px-2 py-1 text-xs text-gray-700 hover:bg-gray-50"
          >
            Copy
          </button>
          {copyNote && <span className="text-xs text-emerald-700">{copyNote}</span>}
        </div>
      </div>

      <p className="text-xs text-gray-500">
        Tip: open this page as each user to quickly copy their ID for the “Recipient” field on a thread.
      </p>
    </div>
  );
}
