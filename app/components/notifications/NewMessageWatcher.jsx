'use client';

import { useEffect, useRef } from 'react';
import { supabase } from '../../../lib/supabaseClient';

// Listens to INSERTs on `messages` for the signed-in user.
// When a message arrives from someone else, shows a toast with a link to the thread.
export default function NewMessageWatcher() {
  const meRef = useRef(null);
  const channelRef = useRef(null);

  useEffect(() => {
    let mounted = true;

    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!mounted || !user) return;
      meRef.current = user;

      // Clean any old channel
      if (channelRef.current) {
        try { supabase.removeChannel(channelRef.current); } catch {}
        channelRef.current = null;
      }

      const ch = supabase
        .channel('global-new-messages')
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'messages', filter: `user_id=eq.${user.id}` },
          async (payload) => {
            const row = payload?.new;
            if (!row) return;
            // ignore our own outbound messages
            if (row.author_id === user.id) return;

            // fetch thread meta for title/counterpart (kept lightweight)
            const { data: tRow } = await supabase
              .from('message_threads')
              .select('id, title, counterpart')
              .eq('id', row.thread_id)
              .eq('user_id', user.id)
              .maybeSingle();

            const title =
              tRow?.title || tRow?.counterpart || 'New message';
            const snippet = (row.body || '').slice(0, 60);

            try {
              window.dispatchEvent(
                new CustomEvent('mr-toast', {
                  detail: {
                    title,
                    message: snippet,
                    href: `/messages/${encodeURIComponent(row.thread_id)}`,
                  },
                })
              );
            } catch {}
          }
        );

      ch.subscribe();
      channelRef.current = ch;
    })();

    return () => {
      mounted = false;
      if (channelRef.current) {
        try { supabase.removeChannel(channelRef.current); } catch {}
        channelRef.current = null;
      }
    };
  }, []);

  return null;
}
