'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

/** Mounts children to document.body so they aren’t clipped by parents. */
export default function Portal({ children }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;
  return createPortal(children, document.body);
}
