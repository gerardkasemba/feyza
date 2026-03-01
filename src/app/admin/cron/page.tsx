'use client';
import { clientLogger } from '@/lib/client-logger';
const log = clientLogger('admin_page');

import React, { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { format, formatDistanceToNow } from 'date-fns';
import {
  Clock,
  Play,
  RefreshCw,
  CheckCircle,
  XCircle,
  AlertCircle,
  Calendar,
  Zap,
  Bell,
  Users,
  CreditCard,
  Unlock,
  Timer,
  Activity,
} from 'lucide-react';

interface CronJob {
  id: string;
  name: string;
  description: string;
  schedule: string;
  scheduleHuman: string;
  icon: React.ElementType;
  color: string;
}

interface JobRun {
  id: string;
  job_name: string;
  started_at: string;
  completed_at: string;
  duration_ms: number;
  status: 'running' | 'success' | 'error';
  items_processed: number;
  result: Record<string, unknown>;
  error_message: string | null;
  triggered_by: string | null;
}

const cronJobs: CronJob[] = [
  {
    id: 'auto-pay',
    name: 'Auto-Pay Processing',
    description: 'Process automatic payments for due loans via Dwolla/PayPal',
    schedule: '0 8 * * *',
    scheduleHuman: 'Daily at 8:00 AM',
    icon: CreditCard,
    color: 'emerald',
  },
  {
    id: 'payment-retry',
    name: 'Payment Retry',
    description: 'Retry failed payments and block borrowers after max attempts',
    schedule: '0 6 * * *',
    scheduleHuman: 'Daily at 6:00 AM',
    icon: RefreshCw,
    color: 'blue',
  },
  {
    id: 'lift-restrictions',
    name: 'Lift Restrictions',
    description: 'Unblock borrowers whose 90-day restriction period has ended',
    schedule: '0 7 * * *',
    scheduleHuman: 'Daily at 7:00 AM',
    icon: Unlock,
    color: 'purple',
  },
  {
    id: 'payment-reminders',
    name: 'Payment Reminders',
    description: 'Send reminder emails for payments due in 3 days',
    schedule: '0 9 * * *',
    scheduleHuman: 'Daily at 9:00 AM',
    icon: Bell,
    color: 'amber',
  },
  {
    id: 'notify-lenders-pending',
    name: 'Notify Lenders',
    description: 'Alert lenders about pending loans matching their preferences',
    schedule: '0 10 * * *',
    scheduleHuman: 'Daily at 10:00 AM',
    icon: Users,
    color: 'cyan',
  },
  {
    id: 'match-expiry',
    name: 'Match Expiry',
    description: 'Expire and rematch loans not accepted within 48 hours',
    schedule: '0 */4 * * *',
    scheduleHuman: 'Every 4 hours',
    icon: Timer,
    color: 'rose',
  },
];

export default function CronJobsPage() {
  const [jobRuns, setJobRuns] = useState<JobRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [runningJob, setRunningJob] = useState<string | null>(null);
  const [lastResults, setLastResults] = useState<Record<string, any>>({});
  const supabase = createClient();

  const fetchJobRuns = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('cron_job_runs')
        .select('*')
        .order('started_at', { ascending: false })
        .limit(50);

      if (!error) {
        setJobRuns(data || []);
      }
    } catch (err) {
      log.error('Error fetching job runs:', err);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchJobRuns();
  }, []);

  const runJob = async (job: CronJob) => {
    if (runningJob) return;
    
    setRunningJob(job.id);
    setLastResults(prev => ({ ...prev, [job.id]: null }));

    try {
      const res = await fetch('/api/admin/trigger-cron', { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ job: job.id }),
      });
      
      const data = await res.json();
      
      setLastResults(prev => ({ ...prev, [job.id]: data }));
      
      // Refresh job runs
      await fetchJobRuns();
    } catch (err: unknown) {
      log.error('Error running job:', err);
      setLastResults(prev => ({ 
        ...prev, 
        [job.id]: { error: (err as Error).message, success: false } 
      }));
    }

    setRunningJob(null);
  };

  const getLastRun = (jobId: string): JobRun | undefined => {
    return jobRuns.find(r => r.job_name === jobId);
  };

  const getColorClasses = (color: string) => {
    const colors: Record<string, { bg: string; text: string; border: string }> = {
      emerald: { bg: 'bg-emerald-100 dark:bg-emerald-500/20', text: 'text-emerald-600 dark:text-emerald-400', border: 'border-emerald-200 dark:border-emerald-500/30' },
      blue: { bg: 'bg-blue-100 dark:bg-blue-500/20', text: 'text-blue-600 dark:text-blue-400', border: 'border-blue-200 dark:border-blue-500/30' },
      purple: { bg: 'bg-purple-100 dark:bg-purple-500/20', text: 'text-purple-600 dark:text-purple-400', border: 'border-purple-200 dark:border-purple-500/30' },
      amber: { bg: 'bg-amber-100 dark:bg-amber-500/20', text: 'text-amber-600 dark:text-amber-400', border: 'border-amber-200 dark:border-amber-500/30' },
      cyan: { bg: 'bg-cyan-100 dark:bg-cyan-500/20', text: 'text-cyan-600 dark:text-cyan-400', border: 'border-cyan-200 dark:border-cyan-500/30' },
      rose: { bg: 'bg-rose-100 dark:bg-rose-500/20', text: 'text-rose-600 dark:text-rose-400', border: 'border-rose-200 dark:border-rose-500/30' },
    };
    return colors[color] || colors.emerald;
  };

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-white flex items-center gap-3">
            <Clock className="w-7 h-7 text-emerald-500" />
            Cron Jobs
          </h1>
          <p className="text-neutral-500 dark:text-neutral-400 mt-1">
            Monitor and manually trigger scheduled background tasks
          </p>
        </div>
        <button
          onClick={fetchJobRuns}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-colors text-sm font-medium text-neutral-700 dark:text-neutral-200"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Jobs Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {cronJobs.map((job) => {
          const Icon = job.icon;
          const colors = getColorClasses(job.color);
          const lastRun = getLastRun(job.id);
          const lastResult = lastResults[job.id];
          const isRunning = runningJob === job.id;

          return (
            <div
              key={job.id}
              className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 overflow-hidden"
            >
              <div className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className={`p-2.5 rounded-xl ${colors.bg}`}>
                    <Icon className={`w-5 h-5 ${colors.text}`} />
                  </div>
                  <button
                    onClick={() => runJob(job)}
                    disabled={isRunning || !!runningJob}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                      isRunning
                        ? 'bg-neutral-100 dark:bg-neutral-700 text-neutral-400 cursor-wait'
                        : 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-200 dark:hover:bg-emerald-500/30'
                    }`}
                  >
                    {isRunning ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        Running...
                      </>
                    ) : (
                      <>
                        <Play className="w-4 h-4" />
                        Run Now
                      </>
                    )}
                  </button>
                </div>

                <h3 className="font-semibold text-neutral-900 dark:text-white">{job.name}</h3>
                <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1 line-clamp-2">
                  {job.description}
                </p>

                <div className="flex items-center gap-2 mt-3 text-xs text-neutral-500 dark:text-neutral-400">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>{job.scheduleHuman}</span>
                </div>

                {/* Last Run Status */}
                {lastRun && (
                  <div className="mt-4 pt-4 border-t border-neutral-200 dark:border-neutral-700">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-neutral-500 dark:text-neutral-400">Last run:</span>
                      <div className="flex items-center gap-2">
                        {lastRun.status === 'success' ? (
                          <CheckCircle className="w-4 h-4 text-emerald-500" />
                        ) : lastRun.status === 'error' ? (
                          <XCircle className="w-4 h-4 text-red-500" />
                        ) : (
                          <RefreshCw className="w-4 h-4 text-blue-500 animate-spin" />
                        )}
                        <span className="text-neutral-900 dark:text-white">
                          {formatDistanceToNow(new Date(lastRun.started_at), { addSuffix: true })}
                        </span>
                      </div>
                    </div>
                    {lastRun.items_processed > 0 && (
                      <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                        Processed: {lastRun.items_processed} items in {lastRun.duration_ms}ms
                      </p>
                    )}
                  </div>
                )}

                {/* Latest Result */}
                {lastResult && (
                  <div className={`mt-3 p-3 rounded-lg text-sm ${
                    lastResult.success 
                      ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                      : 'bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-300'
                  }`}>
                    {lastResult.success ? (
                      <div>
                        <div className="flex items-center gap-2 font-medium">
                          <CheckCircle className="w-4 h-4" />
                          Success
                        </div>
                        {lastResult.items_processed > 0 && (
                          <p className="mt-1 text-xs opacity-80">
                            Processed {lastResult.items_processed} items in {lastResult.duration_ms}ms
                          </p>
                        )}
                        {lastResult.result?.message && (
                          <p className="mt-1 text-xs opacity-80">{lastResult.result.message}</p>
                        )}
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <XCircle className="w-4 h-4" />
                        <span>{lastResult.error || lastResult.result?.error || 'Unknown error'}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Recent Job Runs */}
      <div className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 overflow-hidden">
        <div className="p-4 border-b border-neutral-200 dark:border-neutral-700">
          <h2 className="text-lg font-semibold text-neutral-900 dark:text-white flex items-center gap-2">
            <Activity className="w-5 h-5" />
            Recent Job Runs
          </h2>
        </div>
        
        {loading ? (
          <div className="p-8 text-center">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto text-neutral-400" />
          </div>
        ) : jobRuns.length === 0 ? (
          <div className="p-8 text-center text-neutral-500 dark:text-neutral-400">
            <Clock className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No job runs recorded yet</p>
            <p className="text-sm mt-1">Run a job above to see it here</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800/50">
                  <th className="text-left py-3 px-4 text-sm font-medium text-neutral-500 dark:text-neutral-400">Job</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-neutral-500 dark:text-neutral-400">Status</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-neutral-500 dark:text-neutral-400">Items</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-neutral-500 dark:text-neutral-400">Duration</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-neutral-500 dark:text-neutral-400">Triggered</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-neutral-500 dark:text-neutral-400">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200 dark:divide-neutral-700">
                {jobRuns.slice(0, 20).map((run) => {
                  const jobInfo = cronJobs.find(j => j.id === run.job_name);
                  return (
                    <tr key={run.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-700/30">
                      <td className="py-3 px-4">
                        <span className="font-medium text-neutral-900 dark:text-white">
                          {jobInfo?.name || run.job_name}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        {run.status === 'success' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-xs rounded-full">
                            <CheckCircle className="w-3 h-3" />
                            Success
                          </span>
                        ) : run.status === 'error' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-300 text-xs rounded-full">
                            <XCircle className="w-3 h-3" />
                            Error
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300 text-xs rounded-full">
                            <RefreshCw className="w-3 h-3 animate-spin" />
                            Running
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-sm text-neutral-900 dark:text-white">
                        {run.items_processed || 0}
                      </td>
                      <td className="py-3 px-4 text-sm text-neutral-500 dark:text-neutral-400">
                        {run.duration_ms ? `${run.duration_ms}ms` : '-'}
                      </td>
                      <td className="py-3 px-4 text-sm text-neutral-500 dark:text-neutral-400">
                        {run.triggered_by ? 'Manual' : 'Auto'}
                      </td>
                      <td className="py-3 px-4 text-sm text-neutral-500 dark:text-neutral-400">
                        {format(new Date(run.started_at), 'MMM d, h:mm a')}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Vercel Cron Setup Info */}
      <div className="bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/30 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm text-blue-800 dark:text-blue-300 font-medium">Automatic Scheduling</p>
            <p className="text-sm text-blue-700 dark:text-blue-400 mt-1">
              For production, configure cron jobs in <code className="bg-blue-100 dark:bg-blue-500/20 px-1 rounded">vercel.json</code> to run automatically.
              Manual triggers here are useful for testing and one-time runs.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
