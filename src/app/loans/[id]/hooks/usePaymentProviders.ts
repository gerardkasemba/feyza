'use client';
import { clientLogger } from '@/lib/client-logger';
const log = clientLogger('usePaymentProviders');

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export function usePaymentProviders() {
  const supabase = createClient();
  const [isDwollaEnabled, setIsDwollaEnabled] = useState(false);

  useEffect(() => {
    const checkPaymentProviders = async () => {
      try {
        const response = await fetch('/api/payment-methods?country=US&type=repayment');
        if (response.ok) {
          const data = await response.json();
          const dwollaEnabled = (data.providers || []).some(
            (p: any) => p.slug === 'dwolla' && p.isAutomated
          );
          setIsDwollaEnabled(dwollaEnabled);
        } else {
          setIsDwollaEnabled(false);
        }
      } catch (err) {
        log.error('[usePaymentProviders] Failed to check payment providers:', err);
        setIsDwollaEnabled(false);
      }
    };

    checkPaymentProviders();

    const channel = supabase
      .channel('payment_providers_watch')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'payment_providers' }, () => {
        checkPaymentProviders();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [supabase]);

  return { isDwollaEnabled };
}
