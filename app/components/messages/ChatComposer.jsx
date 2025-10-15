"use client";

import { useEffect, useMemo, useRef, useState } from "react";

/**
 * ChatComposer
 * - Props:
 *    onSend:    ({ text, files }) => Promise<boolean>
 *    onTyping:  () => void
 *
 * Enhancements:
 *  - Drag & drop files into the input area
 *  - Paste images/files from clipboard (Ctrl/Cmd+V)
 *  - Preview queued images, show file "pills" for non-images
 *  - Remove any queued item before sending
 *  - Enter = send (if no files and no Shift)
 *  - Shift+Enter = newline
 */
export default function ChatComposer({ onSend, onTyping }) {
  const [text, setText] = useState("");
  const [files, setFiles] = useState([]); // array<File>
  const [dragOver, setDragOver] = useState(false);
  const [sending, setSending] = useState(false);
  const textRef = useRef(null);
  const fileInputRef = useRef(null);

  // Throttle typing notifications a bit
  const lastNotifyRef = useRef(0);
  function notifyTyping() {
    const now = Date.now();
    if (now - lastNotifyRef.current > 800) {
      lastNotifyRef.current = now;
      onTyping?.();
    }
  }

  // Derived: previews for images
  const imagePreviews = useMemo(
    () =>
      files
        .filter((f) => f.type?.startsWith("image/"))
        .map((file) => ({ file, url: URL.createObjectURL(file), name: file.name })),
    [files]
  );

  // Clean up blob URLs
  useEffect(() => {
    return () => {
      imagePreviews.forEach((p) => URL.revokeObjectURL(p.url));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function addFiles(newList) {
    // Basic de-dup by name+size+lastModified
    const key = (f) => `${f.name}|${f.size}|${f.lastModified}`;
    const existing = new Set(files.map(key));
    const filtered = [];
    for (const f of newList) {
      if (!f) continue;
      // simple size guard: 25 MB per file (adjust if you like)
      if (typeof f.size === "number" && f.size > 25 * 1024 * 1024) {
        alert(`"${f.name}" is larger than 25MB and was skipped.`);
        continue;
      }
      const k = key(f);
      if (!existing.has(k)) filtered.push(f);
    }
    if (filtered.length > 0) setFiles((cur) => [...cur, ...filtered]);
  }

  function onFileInputChange(e) {
    const list = Array.from(e.target.files || []);
    addFiles(list);
    // reset input so same file can be picked again later
    e.target.value = "";
  }

  function onDrop(e) {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
    const list = Array.from(e.dataTransfer?.files || []);
    if (list.length > 0) addFiles(list);
  }

  function onDragEnter(e) {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(true);
  }
  function onDragOver(e) {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(true);
  }
  function onDragLeave(e) {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
  }

  function onPaste(e) {
    // Accept images and files from clipboard
    const items = Array.from(e.clipboardData?.items || []);
    const filesFromPaste = [];
    for (const it of items) {
      if (it.kind === "file") {
        const f = it.getAsFile();
        if (f) {
          // ensure we have a name
          const ext = guessExtFromType(f.type);
          const name = f.name || `pasted-${Date.now()}.${ext}`;
          const file = new File([f], name, { type: f.type, lastModified: Date.now() });
          filesFromPaste.push(file);
        }
      }
    }
    if (filesFromPaste.length > 0) {
      e.preventDefault(); // don’t insert image binary text in the textarea
      addFiles(filesFromPaste);
    }
  }

  function guessExtFromType(type) {
    if (!type) return "bin";
    if (type.startsWith("image/")) return type.split("/")[1] || "png";
    if (type === "application/pdf") return "pdf";
    if (type.includes("zip")) return "zip";
    return "bin";
  }

  function removeFile(idx) {
    setFiles((cur) => cur.filter((_, i) => i !== idx));
  }

  async function handleSend() {
    if (sending) return;
    const trimmed = (text || "").trim();
    if (!trimmed && files.length === 0) return;

    setSending(true);
    try {
      const ok = await onSend?.({ text: trimmed, files });
      if (ok) {
        setText("");
        setFiles([]);
        if (textRef.current) textRef.current.style.height = "auto";
      }
    } finally {
      setSending(false);
    }
  }

  function onKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  // Auto-grow the textarea
  function autoGrow(el) {
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 200) + "px"; // cap height
  }

  useEffect(() => {
    autoGrow(textRef.current);
  }, [text]);

  return (
    <div
      className="rounded-2xl border bg-white p-2 shadow-sm"
      onDrop={onDrop}
      onDragEnter={onDragEnter}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
    >
      {/* Drag overlay */}
      {dragOver && (
        <div className="absolute inset-0 z-10 flex items-center justify-center rounded-2xl bg-emerald-50/80 text-emerald-700">
          Drop files to attach
        </div>
      )}

      {/* Previews (images) */}
      {imagePreviews.length > 0 && (
        <div className="mb-2 grid grid-cols-3 gap-2">
          {imagePreviews.map((p, idx) => (
            <div key={idx} className="relative group rounded-md overflow-hidden border">
              <img
                src={p.url}
                alt={p.name || "image"}
                className="block h-24 w-full object-cover"
                draggable={false}
              />
              <button
                onClick={() => removeFile(files.findIndex((f) => f === p.file))}
                className="absolute right-1 top-1 hidden rounded bg-black/60 px-1.5 py-0.5 text-xs text-white group-hover:block"
                title="Remove"
                type="button"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      {/* File pills (non-images) */}
      {files.some((f) => !f.type?.startsWith("image/")) && (
        <div className="mb-2 flex flex-wrap gap-2">
          {files.map((f, idx) => {
            if (f.type?.startsWith("image/")) return null;
            return (
              <span
                key={idx}
                className="inline-flex items-center gap-2 rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-800"
                title={f.name}
              >
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-gray-600" />
                <span className="max-w-[160px] truncate">{f.name}</span>
                <button
                  onClick={() => removeFile(idx)}
                  className="rounded-full bg-gray-200 px-1 text-[10px] leading-none"
                  title="Remove"
                  type="button"
                >
                  ✕
                </button>
              </span>
            );
          })}
        </div>
      )}

      {/* Text + actions row */}
      <div className="flex items-end gap-2">
        <textarea
          ref={textRef}
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            notifyTyping();
          }}
          onKeyDown={onKeyDown}
          onPaste={onPaste}
          placeholder="Write a message…"
          className="min-h-[42px] max-h-[200px] flex-1 resize-none rounded-xl border border-gray-200 px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-500"
        />
        <input
          ref={fileInputRef}
          type="file"
          multiple
          onChange={onFileInputChange}
          className="hidden"
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="rounded-xl border px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
          title="Attach files"
        >
          Attach
        </button>
        <button
          type="button"
          onClick={handleSend}
          disabled={sending || (!text.trim() && files.length === 0)}
          className="rounded-xl bg-brand-600 bg-emerald-600 px-4 py-2 text-sm text-white hover:bg-emerald-700 disabled:opacity-50"
          title="Send"
        >
          {sending ? "Sending…" : "Send"}
        </button>
      </div>
    </div>
  );
}
