import { Router, type Request, type Response } from 'express'
import { readStore } from '../database.js'
import type { Measurement } from '../../shared/types.js'

const router = Router()

router.get('/dashboard', async (_req: Request, res: Response): Promise<void> => {
  try {
    const store = readStore()
    const measurements = store.measurements
    const today = new Date().toISOString().slice(0, 10)
    const todayCount = measurements.filter((m: Measurement) => m.measureDate === today).length
    const pendingReviewCount = measurements.filter((m: Measurement) => m.status === 'submitted').length
    const pendingPublishCount = measurements.filter((m: Measurement) => m.status === 'approved').length
    const publishedCount = measurements.filter((m: Measurement) => m.status === 'published').length

    const recentDays: { date: string; count: number }[] = []
    for (let i = 6; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      const dateStr = d.toISOString().slice(0, 10)
      const count = measurements.filter((m: Measurement) => m.measureDate === dateStr).length
      recentDays.push({ date: dateStr, count })
    }

    res.json({
      success: true,
      data: {
        todayCount,
        pendingReviewCount,
        pendingPublishCount,
        publishedCount,
        recentTrend: recentDays,
      },
    })
  } catch (error) {
    res.status(500).json({ success: false, error: '获取统计数据失败' })
  }
})

export default router
