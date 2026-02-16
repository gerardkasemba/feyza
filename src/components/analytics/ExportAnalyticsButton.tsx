'use client'

import React, { useState } from 'react'
import { Button } from '@/components/ui'
import { Download } from 'lucide-react'

export default function ExportAnalyticsButton() {
  const [loading, setLoading] = useState(false)

  const onExport = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/business/analytics/pdf', { method: 'GET' })
      if (!res.ok) throw new Error('Failed to export')

      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)

      const a = document.createElement('a')
      a.href = url
      a.download = `analytics-report.pdf`
      document.body.appendChild(a)
      a.click()
      a.remove()

      window.URL.revokeObjectURL(url)
    } catch (e) {
      console.error(e)
      alert('Export failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button variant="outline" className="rounded-2xl" onClick={onExport} disabled={loading}>
      <Download className="w-4 h-4 mr-2" />
      {loading ? 'Exporting…' : 'Export Report'}
    </Button>
  )
}
