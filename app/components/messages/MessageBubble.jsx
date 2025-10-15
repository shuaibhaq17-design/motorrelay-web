"use client";

import { useMemo, useRef, useState, useEffect } from "react";
import Portal from "../Portal";
import { TickSingle, TickDouble } from "../icons/Ticks";

/**
 * Props:
 * - message: DB row with { id, body, attachments, attachments_signed, author_id, created_at, edited_at, deleted_at, local_status }
 * - meId: string | null
 * - readAt: ISO string | null  (other side's last read timestamp; used for ticks on my messages)
 * - onEdit(id, newBody)
 * - onDelete(id)
 * - onRetry(message)  (for local_status === 'failed')
 * - onImageClick(images, startIndex)  (for lightbox)
 */
export default function MessageBubble({
  message,
  meId,
  readAt,
  onEdit,
  onDelete,
  onRetry,
  onImageClick,
}) {
  const isOwn = message?.author_id && meId && message.author_id === meId;
  const isDeleted = !!message?.deleted_at;
  const isFailed = message?.local_status === "failed";
  const isSending = message?.local_status === "sending";

  const createdAt = useMemo(() => new Date(message?.created_at || Date.now()), [message?.created_at]);

  const isEditableWindow = useMemo(() => {
    if (!isOwn || isDeleted || isFailed || isSending) return false;
    const diffMs = Date.now() - createdAt.getTime();
    return diffMs < 10 * 60 * 1000; // 10 minutes
  }, [isOwn, isDeleted, isFailed, isSending, createdAt]);

  const isRead = useMemo(() => {
    if (!isOwn || !readAt) return false;
    try {
      return new Date(readAt).getTime() >= createdAt.getTime();
    } catch {
      return false;
    }
  }, [isOwn, readAt, createdAt]);

  // ---- menu handling (portal + close on scroll/resize/click-away) ----
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0 });
  const menuBtnRef = useRef(null);

  function openMenu() {
    const el = menuBtnRef.current;
    if (!el) { setMenuOpen(true); return; }
    const r = el.getBoundingClientRect();
    const width = 180;
    const gap = 8;

    // Right-align menu to button, keep inside viewport
    let left = Math.min(window.innerWidth - width - 8, Math.max(8, r.right - width));
    let top = r.bottom + gap;

    // If near bottom, place above
    const expectedHeight = 120;
    const spaceBelow = window.innerHeight - r.bottom;
    if (spaceBelow < expectedHeight) {
      top = Math.max(8, r.top - gap - expectedHeight);
    }

    setMenuPos({ top, left });
    setMenuOpen(true);
  }

  useEffect(() => {
    if (!menuOpen) return;

    const close = () => setMenuOpen(false);
    const onKey = (e) => { if (e.key === "Escape") setMenuOpen(false); };

    // Close on any scroll (window or containers), and on resize
    window.addEventListener("scroll", close, { passive: true, capture: true });
    document.addEventListener("scroll", close, { passive: true, capture: true });
    window.addEventListener("resize", close, { passive: true });
    window.addEventListener("orientationchange", close, { passive: true });
    document.addEventListener("keydown", onKey);

    return () => {
      window.removeEventListener("scroll", close, { capture: true });
      document.removeEventListener("scroll", close, { capture: true });
      window.removeEventListener("resize", close);
      window.removeEventListener("orientationchange", close);
      document.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  // ---- UI helpers ----
  const images = useMemo(() => {
    const atts = message?.attachments_signed || message?.attachments || [];
    return atts
      .filter((a) => String(a?.type || "").toLowerCase().startsWith("image/"))
      .map((a) => ({
        url: a.signedUrl || a.url || a.path,
        name: a.name || "image",
        type: a.type || "image/*",
      }))
      .filter((x) => !!x.url);
  }, [message?.attachments_signed, message?.attachments]);

  function handleImgLoad() {
    try {
      const ev = new CustomEvent("mr-image-loaded");
      window.dispatchEvent(ev);
    } catch {}
  }

  function BubbleMenu() {
    return (
      <Portal>
        {/* click-away layer */}
        <div className="fixed inset-0 z-[1000]" onClick={() => setMenuOpen(false)} />
        {/* menu */}
        <div
          className="fixed z-[1001] w-44 rounded-xl border bg-white p-2 text-sm shadow-lg"
          style={{ top: menuPos.top, left: menuPos.left }}
        >
          {isEditableWindow && (
            <button
              className="block w-full rounded-lg px-2 py-2 text-left hover:bg-gray-50"
              onClick={() => {
                setMenuOpen(false);
                const current = (message?.body || "").trim();
                const next = window.prompt("Edit message:", current);
                if (next != null && next.trim() !== "" && next.trim() !== current) {
                  onEdit?.(message.id, next.trim());
                }
              }}
            >
              Edit
            </button>
          )}
          {isOwn && !isDeleted && (
            <button
              className="block w-full rounded-lg px-2 py-2 text-left text-rose-700 hover:bg-rose-50"
              onClick={() => {
                setMenuOpen(false);
                if (window.confirm("Delete this message for everyone?")) {
                  onDelete?.(message.id);
                }
              }}
            >
              Delete
            </button>
          )}
          {isFailed && (
            <button
              className="mt-1 block w-full rounded-lg px-2 py-2 text-left text-amber-700 hover:bg-amber-50"
              onClick={() => {
                setMenuOpen(false);
                onRetry?.(message);
              }}
            >
              Retry send
            </button>
          )}
        </div>
      </Portal>
    );
  }

  // ---- render ----
  return (
    <div className={`flex ${isOwn ? "justify-end" : "justify-start"}`}>
      <div className={`relative max-w-[78%]`}>
        {/* bubble */}
        <div
          className={[
            "rounded-2xl px-3 py-2 shadow-sm",
            isOwn ? "bg-emerald-600 text-white" : "bg-white text-gray-900 border",
            isDeleted ? "opacity-70" : "",
          ].join(" ")}
        >
          {/* attachments first (images) */}
          {images.length > 0 && (
            <div className="mb-2">
              {images.map((img, idx) => (
                <button
                  key={idx}
                  type="button"
                  className="block overflow-hidden rounded-2xl"
                  onClick={() => onImageClick?.(images.map(i => i.url), idx)}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={img.url}
                    alt={img.name || "image"}
                    className="max-h-72 w-full object-cover"
                    onLoad={handleImgLoad}
                  />
                </button>
              ))}
            </div>
          )}

          {/* text */}
          <div className={`whitespace-pre-wrap break-words text-[15px] leading-6 ${isDeleted ? "italic" : ""}`}>
            {isDeleted ? "Message deleted" : (message?.body || "")}
          </div>

          {/* footer: ticks / status */}
          <div className="mt-1 flex items-center justify-end gap-1 text-[11px] opacity-90">
            {isOwn && !isDeleted && (
              <span className="inline-flex items-center gap-0.5">
                {isRead ? <TickDouble className="h-3 w-3" /> : <TickSingle className="h-3 w-3" />}
              </span>
            )}
            {isSending && <span className="opacity-80">sending…</span>}
            {isFailed && <span className="text-amber-200">failed</span>}
          </div>
        </div>

        {/* menu button */}
        {!isDeleted && (
          <button
            ref={menuBtnRef}
            onClick={openMenu}
            className={[
              "absolute -right-2 -top-2 rounded-full border bg-gray-100 p-1 text-gray-700 hover:bg-gray-200",
              isOwn ? "border-emerald-700/20" : "border-gray-300/50",
            ].join(" ")}
            title="More"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden>
              <circle cx="5" cy="12" r="2" />
              <circle cx="12" cy="12" r="2" />
              <circle cx="19" cy="12" r="2" />
            </svg>
          </button>
        )}

        {menuOpen && <BubbleMenu />}
      </div>
    </div>
  );
}
