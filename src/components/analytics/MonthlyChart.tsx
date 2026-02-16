'use client'

import React, { useMemo } from 'react'

type Row = {
  month: string
  monthName: string
  loans: number
  amount: number
  interest: number
  active: number
  completed: number
  defaulted: number
}

export default function MonthlyChart({ data }: { data: Row[] }) {
  const maxAmount = useMemo(() => {
    const max = Math.max(0, ...data.map((d) => Number(d.amount || 0)))
    return max
  }, [data])

  return (
    <div className="w-full h-full flex flex-col">
      {/* Chart area */}
      <div className="flex-1">
        <div className="h-full flex items-end gap-1">
          {data.map((d) => {
            const amount = Number(d.amount || 0)
            const heightPct = maxAmount > 0 ? (amount / maxAmount) * 100 : 0

            return (
              <div key={d.month} className="flex-1 min-w-0 flex flex-col items-center gap-1">
                {/* small count label */}
                <div className="text-[11px] text-neutral-500 dark:text-neutral-400">
                  {d.loans || 0}
                </div>

                {/* bar */}
                <div
                  className="w-full rounded-t-lg bg-blue-500 hover:bg-blue-600 transition-colors relative group cursor-pointer"
                  style={{ height: `${heightPct}%`, minHeight: '2px' }}
                  title={`${d.monthName} • ${d.loans || 0} loans • $${amount.toLocaleString()}`}
                >
                  {/* tooltip */}
                  <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                    <div className="rounded-xl bg-neutral-900 text-white text-xs px-3 py-2 whitespace-nowrap shadow-lg">
                      <div className="font-semibold">{d.monthName}</div>
                      <div>${amount.toLocaleString()}</div>
                      <div>{d.loans || 0} loans</div>
                      <div className="opacity-80">
                        Completed: {d.completed || 0} • Defaulted: {d.defaulted || 0}
                      </div>
                    </div>
                  </div>
                </div>

                {/* month label */}
                <div className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-1">
                  {d.monthName.split(' ')[0]}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Footer legend (optional) */}
      <div className="mt-3 text-xs text-neutral-500 dark:text-neutral-400 flex justify-between">
        <span>Loans per month (bars scaled by amount)</span>
        <span>Last 12 months</span>
      </div>
    </div>
  )
}
