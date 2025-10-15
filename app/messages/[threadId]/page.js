'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '../../../lib/supabaseClient';
import MessageBubble from '../../components/messages/MessageBubble';
import ChatComposer from '../../components/messages/ChatComposer';
import AuthBadge from '../../components/AuthBadge';
import BackButton from '../../components/BackButton';
import ImageLightbox from '../../components/messages/ImageLightbox';
import TrackingChip from '../../components/tracking/TrackingChip';
import DestinationPill from '../../components/tracking/DestinationPill';

const BUCKET = 'message-uploads';
const PAGE_SIZE = 30;
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const dedupeAndSort = (arr) => {
  const map = new Map();
  for (const m of arr) map.set(m.id, m);
  return [...map.values()].sort((a, b) =>
    String(a.created_at || '').localeCompare(String(b.created_at || ''))
  );
};

async function signAttachments(supa, attachments) {
  if (!Array.isArray(attachments) || attachments.length === 0) return [];
  const out = [];
  for (const att of attachments) {
    try {
      const { data, error } = await supa.storage.from(BUCKET).createSignedUrl(att.path, 60 * 60);
      if (error) out.push({ ...att });
      else out.push({ ...att, signedUrl: data?.signedUrl });
    } catch {
      out.push({ ...att });
    }
  }
  return out;
}

// Simple postcode geocoder (Nominatim) â€” returns { lat, lng } or null
async function geocodePostcode(pc) {
  if (!pc) return null;
  const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&addressdetails=0&countrycodes=gb&q=${encodeURIComponent(pc)}`;
  const res = await fetch(url, {
    headers: { Accept: 'application/json', 'User-Agent': 'motorrelay-dev' },
    cache: 'no-store',
  });
  const json = await res.json();
  const hit = Array.isArray(json) && json[0];
  if (!hit) return null;
  const lat = Number(hit.lat);
  const lng = Number(hit.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return { lat, lng };
}

export default function ThreadPage() {
  const routeParams = useParams();
  const router = useRouter();
  const routeId = decodeURIComponent(String(routeParams?.threadId || ''));
  const [effectiveThreadId, setEffectiveThreadId] = useState(null);

  const [me, setMe] = useState(null);
  const [thread, setThread] = useState(null);
  const isUuidRoute = routeId ? UUID_REGEX.test(routeId) : false;
  const [threadUnavailable, setThreadUnavailable] = useState(!isUuidRoute);
  const [messages, setMessages] = useState([]);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const oldestCursorRef = useRef(null);

  const [isOtherTyping, setIsOtherTyping] = useState(false);
  const typingTimerRef = useRef(null);
  const presenceRef = useRef(null);

  const bottomRef = useRef(null);
  const didInitScrollRef = useRef(false);
  const suppressAutoScrollRef = useRef(false);
  const allowImageAutoScrollRef = useRef(true);

  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxImages, setLightboxImages] = useState([]);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  function scrollToBottom(behavior = 'auto') {
    const node = bottomRef.current;
    if (!node) return;
    requestAnimationFrame(() => {
      node.scrollIntoView({ behavior, block: 'end' });
      setTimeout(() => node.scrollIntoView({ behavior: 'auto', block: 'end' }), 60);
    });
  }

  useEffect(() => {
    function onImgLoaded() {
      if (!didInitScrollRef.current) return;
      if (!allowImageAutoScrollRef.current) return;
      scrollToBottom('auto');
    }
    window.addEventListener('mr-image-loaded', onImgLoaded);
    return () => window.removeEventListener('mr-image-loaded', onImgLoaded);
  }, []);

  useEffect(() => {
    if (!routeId) return;
    if (!isUuidRoute) {
      setThreadUnavailable(true);
      try { router.replace('/messages'); } catch {}
      return;
    }

    let cancelled = false;
    didInitScrollRef.current = false;
    suppressAutoScrollRef.current = false;
    allowImageAutoScrollRef.current = true;

    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { alert('Please sign in.'); return; }
      if (cancelled) return;
      setMe(user);

      const res = await supabase
        .from('message_threads')
        .select('id, job_id, title, counterpart, counterpart_user_id, counterpart_last_read_at, last_read_at, origin_label, origin_lat, origin_lng, dest_label, dest_lat, dest_lng')
        .eq('id', routeId)
        .eq('user_id', user.id)
        .maybeSingle();
      const tRow = res.data; const tErr = res.error;

      if (tErr || !tRow) { alert('Could not load this conversation.'); setThreadUnavailable(true); return; }
      if (cancelled) return;
      setThread(tRow);
      setEffectiveThreadId(tRow.id);
      setThreadUnavailable(false);

      const { data: rows, error: mErr } = await supabase
        .from('messages')
        .select('*')
        .eq('thread_id', tRow.id)
        .order('created_at', { ascending: true })
        .limit(PAGE_SIZE);

      if (mErr) {
        alert('Could not load messages.');
        return;
      }

      const signed = await Promise.all(
        (rows || []).map(async (msg) => {
          const attachments = await signAttachments(supabase, msg.attachments || []);
          return { ...msg, attachments };
        })
      );

      if (cancelled) return;

      setMessages(dedupeAndSort(signed));
      setHasMore((rows || []).length === PAGE_SIZE);
      if (rows?.length) {
        oldestCursorRef.current = rows[0].created_at;
      }
      didInitScrollRef.current = true;
      scrollToBottom('auto');
    })();

    // Defer realtime subscription until we know the UUID
    return () => { cancelled = true; };
  }, [routeId]);

  // Realtime subscription once the thread UUID is known
  useEffect(() => {
    if (!effectiveThreadId) return;
    const channel = supabase
      .channel(`thread-${effectiveThreadId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `thread_id=eq.${effectiveThreadId}` },
        async (payload) => {
          const msg = payload.new;
          if (msg?.attachments?.length) {
            msg.attachments = await signAttachments(supabase, msg.attachments);
          }
          setMessages((prev) => dedupeAndSort([...(prev || []), msg]));
          suppressAutoScrollRef.current = false;
          scrollToBottom('smooth');
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'messages', filter: `thread_id=eq.${effectiveThreadId}` },
        async (payload) => {
          const msg = payload.new;
          if (msg?.attachments?.length) {
            msg.attachments = await signAttachments(supabase, msg.attachments);
          }
          setMessages((prev) =>
            dedupeAndSort((prev || []).map((m) => (m.id === msg.id ? msg : m)))
          );
        }
      )
      .on('broadcast', { event: 'typing' }, (payload) => {
        try {
          const fromId = payload?.payload?.user_id;
          if (fromId && fromId !== me?.id) {
            setIsOtherTyping(true);
            clearTimeout(typingTimerRef.current);
            typingTimerRef.current = setTimeout(() => setIsOtherTyping(false), 2000);
          }
        } catch {}
      })
      .subscribe();

    presenceRef.current = channel;
    return () => { supabase.removeChannel(channel); };
  }, [effectiveThreadId, me?.id]);

  async function handleLoadEarlier() {
    if (!effectiveThreadId || !oldestCursorRef.current) return;
    setLoadingMore(true);
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('thread_id', effectiveThreadId)
        .lt('created_at', oldestCursorRef.current)
        .order('created_at', { ascending: false })
        .limit(PAGE_SIZE);

      if (error) throw error;

      const signed = await Promise.all(
        (data || []).map(async (msg) => {
          if (msg?.attachments?.length) {
            msg.attachments = await signAttachments(supabase, msg.attachments);
          }
          return msg;
        })
      );

      setMessages((prev) => dedupeAndSort([...(signed || []), ...(prev || [])]));
      if (data?.length) {
        oldestCursorRef.current = data[data.length - 1].created_at;
      }
      setHasMore(data?.length === PAGE_SIZE);
    } catch (err) {
      console.error(err);
      alert('Could not load more messages.');
    } finally {
      setLoadingMore(false);
    }
  }

  async function handleSend({ text, files }) {
    if (threadUnavailable) {
      alert('Conversation could not be loaded. Please reopen from the messages list.');
      return false;
    }
    const targetId = effectiveThreadId;
    if (!targetId) {
      alert('Conversation is not ready yet. Try again.');
      return false;
    }
    try {
      suppressAutoScrollRef.current = true;

      if (files && files.length) {
        alert('File attachments are not yet supported. Sending text only.');
      }

      // Validate UUID before sending to avoid server cast errors
      if (!UUID_REGEX.test(String(targetId))) {
        alert('Conversation ID is invalid. Please reopen the chat from the list.');
        return false;
      }
      const { data, error } = await supabase.rpc('send_message_and_fanout', {
        p_thread_id: targetId,
        p_kind: 'text',
        p_body: text,
        p_metadata: null,
        p_attachments: [],
      });

      if (error) throw error;

      if (data?.inserted_ids?.length) {
        const inserted = data.inserted_ids.map((id) => ({
          id,
          thread_id: targetId,
          kind: 'text',
          body: text,
          metadata: null,
          attachments: [],
          author_id: me?.id || null,
          created_at: new Date().toISOString(),
        }));
        setMessages((prev) => dedupeAndSort([...(prev || []), ...inserted]));
        return true;
      }

      return false;
    } catch (err) {
      console.error('send_message_and_fanout error', err?.message, err);
      alert(err?.message || 'Could not send message.');
      return false;
    } finally {
      suppressAutoScrollRef.current = false;
      scrollToBottom('smooth');
    }
  }

  async function handleEdit(msg) {
    try {
      const { error } = await supabase.rpc('fn_message_edit', {
        p_message_id: msg.id,
        p_body: msg.body,
        p_metadata: msg.metadata || null,
      });
      if (error) throw error;
    } catch (err) {
      console.error(err);
      alert(err.message || 'Could not edit message.');
    }
  }

  async function handleDelete(msg) {
    try {
      const { error } = await supabase.rpc('fn_message_soft_delete', { p_message_id: msg.id });
      if (error) throw error;
    } catch (err) {
      console.error(err);
      alert(err.message || 'Could not delete message.');
    }
  }

  async function handleRetry(msg) {
    try {
      const retryId = effectiveThreadId;
      if (!retryId || !UUID_REGEX.test(String(retryId))) throw new Error('Conversation not ready');
      const { data, error } = await supabase.rpc('send_message_and_fanout', {
        p_thread_id: retryId,
        p_kind: msg.kind || 'text',
        p_body: msg.body,
        p_metadata: msg.metadata || null,
        p_attachments: msg.attachments || [],
      });
      if (error) throw error;

      if (data?.inserted_ids?.length) {
        setMessages((prev) =>
          dedupeAndSort([...(prev || []).filter((m) => m.id !== msg.id), { ...msg, id: data.inserted_ids[0] }])
        );
      }
    } catch (err) {
      console.error('send_message_and_fanout retry error', err?.message, err);
      alert(err?.message || 'Could not resend message.');
    }
  }

  function openLightbox(images, startIndex = 0) {
    setLightboxImages(images || []);
    setLightboxIndex(startIndex);
    setLightboxOpen(true);
  }

  const title = threadUnavailable
    ? 'Conversation unavailable'
    : `${thread?.counterpart || 'Company'}${thread?.job_id ? ' - ' + thread.job_id : ''}`;

  return (
    <div className="flex h-screen flex-col bg-white">
      {/* Sticky header */}
      <div className="sticky top-0 z-30 border-b bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-screen-lg items-center justify-between gap-3 px-4 py-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <BackButton forceHref="/messages" />
              <h1 className="truncate text-lg font-semibold">{title}</h1>
              {isOtherTyping && (
                <span className="rounded-md bg-emerald-50 px-2 py-0.5 text-[11px] text-emerald-700">
                  Typing...
                </span>
              )}
            </div>
            {thread?.job_id && (
              <div className="mt-1 text-xs text-gray-500">Job #{thread.job_id}</div>
            )}
          </div>
          <AuthBadge />
        </div>

        {!threadUnavailable && thread && (
          <div className="mx-auto flex max-w-screen-lg flex-wrap items=center gap-2 px-4 pb-3">
            <DestinationPill
              thread={thread}
              onChanged={async () => {
                if (!effectiveThreadId) return;
                const { data: tRow } = await supabase
                  .from('message_threads')
                  .select(
                    'id, job_id, title, counterpart, counterpart_last_read_at, last_read_at, origin_label, origin_lat, origin_lng, dest_label, dest_lat, dest_lng'
                  )
                  .eq('id', effectiveThreadId)
                  .eq('user_id', me?.id || '')
                  .maybeSingle();
                if (tRow) setThread(tRow);
              }}
              />
            <TrackingChip
              threadId={thread.id}
              jobId={thread.job_id || null}
              onChange={() => {
                setTimeout(async () => {
                  if (!effectiveThreadId) return;
                  const { data: tRow } = await supabase
                    .from('message_threads')
                    .select(
                      'id, job_id, last_message, last_message_at, last_read_at, counterpart_last_read_at'
                    )
                    .eq('id', effectiveThreadId)
                    .eq('user_id', me?.id || '')
                    .maybeSingle();
                  if (tRow) setThread((prev) => (prev ? { ...prev, ...tRow } : tRow));
                }, 250);
              }}
              />
            <Link
              href={`/tracking/nav?threadId=${encodeURIComponent(thread.id)}${
                thread.job_id ? `&jobId=${encodeURIComponent(thread.job_id)}` : ''
              }`}
              className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700 hover:bg-emerald-100"
            >
              Tracking
            </Link>
          </div>
        )}
      </div>

      {/* Scrollable messages */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        <div className="mx-auto w-full max-w-screen-lg px-4">
          <div className="space-y-3 pb-56 pt-4 md:pb-44">
            {hasMore && (
              <div className="mb-2 flex justify-center">
                <button
                  onClick={handleLoadEarlier}
                  disabled={loadingMore}
                  className="rounded-full border px-3 py-1 text-xs text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                  {loadingMore ? 'Loading...' : 'Load earlier messages'}
                </button>
              </div>
            )}

            {threadUnavailable ? (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                This conversation could not be loaded. Return to the messages list and reopen the chat.
              </div>
            ) : (
              messages.map((m) => {
                const readAtForThisBubble =
                  m.author_id === me?.id ? thread?.counterpart_last_read_at : thread?.last_read_at;
                return (
                  <MessageBubble
                    key={m.id}
                    message={m}
                    meId={me?.id || null}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                    onRetry={handleRetry}
                    onImageClick={openLightbox}
                    readAt={readAtForThisBubble}
                  />
                );
              })
            )}

            <div ref={bottomRef} aria-hidden="true" className="h-0 scroll-mb-36" />
            </div>
        </div>
      </div>

      {/* Composer */}
      {!threadUnavailable && (
        <div className="fixed left-0 right-0 bottom-[74px] z-40 border-t bg-white/95 backdrop-blur md:bottom-0">
          <div className="mx-auto w-full max-w-screen-lg px-4 py-3">
            <ChatComposer
              onSend={handleSend}
              onTyping={() => {
                const ch = presenceRef.current;
                const now = Date.now();
                if (ch && me && (!typingTimerRef.current || now - typingTimerRef.current > 1000)) {
                  typingTimerRef.current = now;
                  ch.send({ type: 'broadcast', event: 'typing', payload: { user_id: me.id } });
                }
              }}
            />
          </div>
        </div>
      )}

      {lightboxOpen && (
        <ImageLightbox
          images={lightboxImages}
          index={lightboxIndex}
          onClose={() => setLightboxOpen(false)}
          onPrev={() => setLightboxIndex((i) => (i - 1 + lightboxImages.length) % lightboxImages.length)}
          onNext={() => setLightboxIndex((i) => (i + 1) % lightboxImages.length)}
        />
      )}
    </div>
  );
}


