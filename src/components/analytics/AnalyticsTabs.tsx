'use client'

import * as React from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs'

export default function AnalyticsTabs({
  overview,
  performance,
  customers,
  insights,
}: {
  overview: React.ReactNode
  performance: React.ReactNode
  customers: React.ReactNode
  insights: React.ReactNode
}) {
  return (
    <Tabs defaultValue="overview" className="w-full">
      {/* Simple, app-like tab bar */}
      <div className="sticky top-[72px] md:top-[84px] z-10 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 pb-3 bg-neutral-50/95 dark:bg-neutral-900/95 backdrop-blur border-b border-neutral-200/70 dark:border-neutral-800/70">
        <TabsList className="w-full grid grid-cols-4 rounded-2xl">
          <TabsTrigger value="overview" className="rounded-xl">Overview</TabsTrigger>
          <TabsTrigger value="performance" className="rounded-xl">Performance</TabsTrigger>
          <TabsTrigger value="customers" className="rounded-xl">Customers</TabsTrigger>
          <TabsTrigger value="insights" className="rounded-xl">Insights</TabsTrigger>
        </TabsList>
      </div>

      <TabsContent value="overview" className="mt-6">{overview}</TabsContent>
      <TabsContent value="performance" className="mt-6">{performance}</TabsContent>
      <TabsContent value="customers" className="mt-6">{customers}</TabsContent>
      <TabsContent value="insights" className="mt-6">{insights}</TabsContent>
    </Tabs>
  )
}
