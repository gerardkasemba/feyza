import { CheckCircle, XCircle, Clock, ChevronDown, ChevronUp, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui';
import { formatCurrency } from '@/lib/utils';
import { TransferStatus } from '../hooks';
import { Loan } from '@/types';

interface TransferBannerProps {
  transferStatus: TransferStatus;
  loan: Loan;
  isBorrower: boolean;
  isDwollaEnabled: boolean;
  minimizedNotifications: Set<string>;
  toggleNotification: (type: string) => void;
  fetchTransferStatus: () => void;
}

export function TransferBanner({
  transferStatus,
  loan,
  isBorrower,
  isDwollaEnabled,
  minimizedNotifications,
  toggleNotification,
  fetchTransferStatus,
}: TransferBannerProps) {
  if (!transferStatus || transferStatus.status === 'not_started') return null;

  const base =
    transferStatus.status === 'completed'
      ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
      : transferStatus.status === 'failed'
      ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
      : 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800';

  const title =
    transferStatus.status === 'completed'
      ? isBorrower
        ? 'Funds received'
        : 'Funds sent'
      : transferStatus.status === 'failed'
      ? 'Transfer failed'
      : isDwollaEnabled
      ? 'Transfer in progress'
      : 'Payment pending';

  const Icon =
    transferStatus.status === 'completed'
      ? CheckCircle
      : transferStatus.status === 'failed'
      ? XCircle
      : Clock;

  const minimizedKey = 'funds-status';
  const minimized = minimizedNotifications.has(minimizedKey);

  return (
    <div className={`rounded-2xl border ${base} mb-6`}>
      {minimized ? (
        <button
          onClick={() => toggleNotification(minimizedKey)}
          className="w-full p-3 flex items-center justify-between hover:bg-black/5 dark:hover:bg-white/5 rounded-2xl transition"
        >
          <div className="flex items-center gap-2">
            <Icon className="w-5 h-5" />
            <span className="font-medium text-sm">{title}</span>
            <span className="text-sm opacity-80">• {formatCurrency(loan.amount, loan.currency)}</span>
          </div>
          <ChevronDown className="w-4 h-4 opacity-70" />
        </button>
      ) : (
        <div className="p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-xl bg-white/60 dark:bg-white/10">
                <Icon className="w-6 h-6" />
              </div>
              <div>
                <p className="font-semibold text-neutral-900 dark:text-white">{title}</p>
                <p className="text-sm text-neutral-600 dark:text-neutral-300">{transferStatus.statusMessage}</p>

                {transferStatus.timeline && transferStatus.status === 'processing' && (
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-2">
                    Expected arrival: {transferStatus.timeline.estimatedDate} (
                    {transferStatus.timeline.minDays}-{transferStatus.timeline.maxDays} days)
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={fetchTransferStatus}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh
              </Button>
              <button
                onClick={() => toggleNotification(minimizedKey)}
                className="p-2 rounded-xl hover:bg-black/5 dark:hover:bg-white/5"
                title="Minimize"
              >
                <ChevronUp className="w-4 h-4 opacity-70" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
