import { Router, type Request, type Response } from 'express'
import { readStore, writeStore, genId } from '../database.js'
import type { Measurement, VelocityPoint, WaterLevel, AuditTrail, PublishRecord } from '../../shared/types.js'

const router = Router()

router.get('/', async (_req: Request, res: Response): Promise<void> => {
  try {
    const store = readStore()
    const approved = store.measurements.filter((m: Measurement) => m.status === 'approved' || m.status === 'published')
    const enriched = approved.map((m: Measurement) => {
      const vps = store.velocityPoints.filter((vp: VelocityPoint) => vp.measurementId === m.id)
      const wl = store.waterLevels.find((w: WaterLevel) => w.measurementId === m.id)
      const section = store.sections.find(s => s.id === m.sectionId)
      const publishRecord = store.publishRecords.find((pr: PublishRecord) => pr.measurementId === m.id)
      return { ...m, velocityPoints: vps, waterLevel: wl, sectionName: section?.name ?? '', publishRecord: publishRecord || null }
    })
    enriched.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    res.json({ success: true, data: enriched })
  } catch (error) {
    res.status(500).json({ success: false, error: '获取待发布列表失败' })
  }
})

router.post('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const store = readStore()
    const idx = store.measurements.findIndex((m: Measurement) => m.id === req.params.id)
    if (idx === -1) {
      res.status(404).json({ success: false, error: '测量记录不存在' })
      return
    }
    const measurement = store.measurements[idx]
    if (measurement.status !== 'approved') {
      res.status(400).json({ success: false, error: '仅审核通过的记录可以发布' })
      return
    }

    const now = new Date().toISOString()
    const { operator = '值班员', operatorRole = 'duty' } = req.body

    const vps = store.velocityPoints.filter((vp: VelocityPoint) => vp.measurementId === measurement.id)
    const wl = store.waterLevels.find((w: WaterLevel) => w.measurementId === measurement.id)
    const snapshot = JSON.stringify({ measurement, velocityPoints: vps, waterLevel: wl || null })

    measurement.status = 'published'
    measurement.updatedAt = now
    store.measurements[idx] = measurement

    const publishRecord: PublishRecord = {
      id: genId(),
      measurementId: measurement.id,
      publishedBy: operator,
      publishedAt: now,
      dataSnapshot: snapshot,
    }
    store.publishRecords.push(publishRecord)

    const audit: AuditTrail = {
      id: genId(),
      measurementId: measurement.id,
      action: 'publish',
      operator,
      operatorRole,
      comment: null,
      createdAt: now,
    }
    store.auditTrails.push(audit)

    writeStore(store)
    res.json({ success: true, data: { measurement, publishRecord } })
  } catch (error) {
    res.status(500).json({ success: false, error: '发布操作失败' })
  }
})

export default router
