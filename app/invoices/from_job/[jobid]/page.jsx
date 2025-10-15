'use client';

import { use } from 'react';
import { useEffect } from 'react';
import { supabase } from '../../../../lib/supabaseClient';

export default function FromJob({ params }) {
  const { jobId } = use(params);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase.rpc('fn_invoice_seed_from_job', { p_job_id: jobId });
      if (error) { alert(error.message); return; }
      window.location.replace(`/invoices/${data.id}`);
    })();
  }, [jobId]);

  return <div className="rounded-2xl border bg-white p-4">Preparing invoice…</div>;
}
