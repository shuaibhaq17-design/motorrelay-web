'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';

export default function MessagesPage() {
  const [threads, setThreads] = useState([
    { id: 't1', title: 'Audi A3 → Manchester', last: 'Can you deliver tomorrow?', updatedAt: new Date() },
    { id: 't2', title: 'BMW 3 Series → Leeds', last: 'Price confirmed 👍', updatedAt: new Date(Date.now() - 86400000) },
  ]);
  const [activeId, setActiveId] = useState('t1');
  const [msgs, setMsgs] = useState([
    { id: 1, from: 'them', text: 'Hi! Can you deliver tomorrow morning?' },
    { id: 2, from: 'me', text: 'Yes, 9–11am works.' },
  ]);
  const [text, setText] = useState('');
  const endRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [msgs]);

  function send() {
    const v = text.trim();
    if (!v) return;
    setMsgs(m => [...m, { id: Date.now(), from: 'me', text: v }]);
    setText('');
  }

  return (
    <main className="min-h-dvh bg-gray-50 text-gray-900">
      <header className="bg-white border-b">
        <div className="mx-auto max-w-5xl w-full p-5 flex items-center justify-between">
          <Link href="/" className="text-sm text-emerald-700 hover:underline">← Home</Link>
          <span className="text-sm text-gray-500">Messages</span>
        </div>
      </header>

      <div className="mx-auto max-w-5xl w-full p-5 grid grid-cols-12 gap-5">
        {/* Threads */}
        <aside className="col-span-12 md:col-span-4 rounded-2xl bg-white border shadow p-3">
          <div className="flex items-center justify-between mb-2">
            <h2 className="font-semibold">Conversations</h2>
            <button
              onClick={() => {
                const id = 't' + (threads.length + 1);
                setThreads([{ id, title: 'New inquiry', last: 'New message…', updatedAt: new Date() }, ...threads]);
                setActiveId(id);
                setMsgs([]);
              }}
              className="text-sm rounded-lg border px-2 py-1 hover:bg-gray-50"
            >
              + New
            </button>
          </div>
          <ul className="space-y-1">
            {threads.map(t => (
              <li key={t.id}>
                <button
                  onClick={() => { setActiveId(t.id); setMsgs([]); }}
                  className={[
                    'w-full text-left rounded-xl px-3 py-2 border',
                    activeId === t.id ? 'bg-emerald-50 border-emerald-200' : 'bg-white hover:bg-gray-50 border-gray-200'
                  ].join(' ')}
                >
                  <p className="font-medium truncate">{t.title}</p>
                  <p className="text-xs text-gray-500 truncate">{t.last}</p>
                </button>
              </li>
            ))}
          </ul>
        </aside>

        {/* Chat */}
        <section className="col-span-12 md:col-span-8 rounded-2xl bg-white border shadow flex flex-col">
          <div className="p-4 border-b">
            <h2 className="font-semibold">Chat with customer</h2>
            <p className="text-xs text-gray-500">This is a front-end mock. Hook to real-time later.</p>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {msgs.length === 0 && (
              <p className="text-sm text-gray-500">No messages yet. Say hi 👋</p>
            )}
            {msgs.map(m => (
              <div key={m.id} className={m.from === 'me' ? 'text-right' : 'text-left'}>
                <span className={[
                  'inline-block px-3 py-2 rounded-xl border max-w-[80%]',
                  m.from === 'me'
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                    : 'bg-gray-50 border-gray-200 text-gray-900'
                ].join(' ')}>
                  {m.text}
                </span>
              </div>
            ))}
            <div ref={endRef} />
          </div>
          <div className="p-3 border-t flex gap-2">
            <input
              value={text}
              onChange={e => setText(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && send()}
              placeholder="Type a message…"
              className="flex-1 rounded-xl border border-gray-300 px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-500"
            />
            <button
              onClick={send}
              className="rounded-xl bg-emerald-600 text-white px-4 py-2 font-medium hover:bg-emerald-700"
            >
              Send
            </button>
          </div>
        </section>
      </div>
    </main>
  );
}
