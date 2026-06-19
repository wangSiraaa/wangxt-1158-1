import { Router, type Request, type Response } from 'express'
import { readStore, writeStore, genId } from '../database.js'
import type { Measurement, VelocityPoint, WaterLevel, AuditTrail } from '../../shared/types.js'

const router = Router()

router.get('/', async (_req: Request, res: Response): Promise<void> => {
  try {
    const store = readStore()
    const pending = store.measurements.filter((m: Measurement) => m.status === 'submitted')
    const enriched = pending.map((m: Measurement) => {
      const vps = store.velocityPoints.filter((vp: VelocityPoint) => vp.measurementId === m.id)
      const wl = store.waterLevels.find((w: WaterLevel) => w.measurementId === m.id)
      const section = store.sections.find(s => s.id === m.sectionId)
      return { ...m, velocityPoints: vps, waterLevel: wl, sectionName: section?.name ?? '' }
    })
    enriched.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    res.json({ success: true, data: enriched })
  } catch (error) {
    res.status(500).json({ success: false, error: '获取待审核列表失败' })
  }
})

router.post('/:id/approve', async (req: Request, res: Response): Promise<void> => {
  try {
    const store = readStore()
    const idx = store.measurements.findIndex((m: Measurement) => m.id === req.params.id)
    if (idx === -1) {
      res.status(404).json({ success: false, error: '测量记录不存在' })
      return
    }
    const measurement = store.measurements[idx]
    if (measurement.status !== 'submitted') {
      res.status(400).json({ success: false, error: '仅已提交的记录可以审核通过' })
      return
    }

    const wl = store.waterLevels.find((w: WaterLevel) => w.measurementId === measurement.id)
    const changeRateAbs = wl ? Math.abs(wl.changeRate) : 0
    if (measurement.needRemeasure || changeRateAbs > 0.5) {
      const reason = measurement.needRemeasure
        ? '该测次已标记为需要复测'
        : `水位变化率 ${wl?.changeRate}m/h 超过 0.5m/h 阈值`
      res.status(400).json({
        success: false,
        error: `${reason}，不得直接审核通过，请走复测流程`,
      })
      return
    }

    const now = new Date().toISOString()
    const { operator = '审核员', operatorRole = 'reviewer', comment } = req.body
    measurement.status = 'approved'
    measurement.updatedAt = now
    store.measurements[idx] = measurement
    const audit: AuditTrail = {
      id: genId(),
      measurementId: measurement.id,
      action: 'approve',
      operator,
      operatorRole,
      comment: comment || null,
      createdAt: now,
    }
    store.auditTrails.push(audit)
    writeStore(store)
    res.json({ success: true, data: measurement })
  } catch (error) {
    res.status(500).json({ success: false, error: '审核通过操作失败' })
  }
})

router.post('/:id/reject', async (req: Request, res: Response): Promise<void> => {
  try {
    const store = readStore()
    const idx = store.measurements.findIndex((m: Measurement) => m.id === req.params.id)
    if (idx === -1) {
      res.status(404).json({ success: false, error: '测量记录不存在' })
      return
    }
    const measurement = store.measurements[idx]
    if (measurement.status !== 'submitted') {
      res.status(400).json({ success: false, error: '仅已提交的记录可以驳回' })
      return
    }
    const now = new Date().toISOString()
    const { operator = '审核员', operatorRole = 'reviewer', comment } = req.body
    measurement.status = 'rejected'
    measurement.updatedAt = now
    store.measurements[idx] = measurement
    const audit: AuditTrail = {
      id: genId(),
      measurementId: measurement.id,
      action: 'reject',
      operator,
      operatorRole,
      comment: comment || null,
      createdAt: now,
    }
    store.auditTrails.push(audit)
    writeStore(store)
    res.json({ success: true, data: measurement })
  } catch (error) {
    res.status(500).json({ success: false, error: '驳回操作失败' })
  }
})

router.post('/:id/remeasure', async (req: Request, res: Response): Promise<void> => {
  try {
    const store = readStore()
    const idx = store.measurements.findIndex((m: Measurement) => m.id === req.params.id)
    if (idx === -1) {
      res.status(404).json({ success: false, error: '测量记录不存在' })
      return
    }
    const measurement = store.measurements[idx]
    if (measurement.status !== 'submitted') {
      res.status(400).json({ success: false, error: '仅已提交的记录可以要求复测' })
      return
    }
    const now = new Date().toISOString()
    const { operator = '审核员', operatorRole = 'reviewer', comment, remeasureReason } = req.body

    measurement.status = 'remeasure'
    measurement.updatedAt = now
    store.measurements[idx] = measurement

    const newId = genId()
    const newMeasurement: Measurement = {
      id: newId,
      sectionId: measurement.sectionId,
      measureDate: measurement.measureDate,
      weather: measurement.weather,
      method: measurement.method,
      status: 'draft',
      needRemeasure: false,
      remeasureFromId: measurement.id,
      remeasureReason: remeasureReason || comment || null,
      createdAt: now,
      updatedAt: now,
    }
    store.measurements.push(newMeasurement)

    const originalVps = store.velocityPoints.filter((vp: VelocityPoint) => vp.measurementId === measurement.id)
    for (const vp of originalVps) {
      store.velocityPoints.push({
        id: genId(),
        measurementId: newId,
        pointNo: vp.pointNo,
        startDistance: vp.startDistance,
        waterDepth: vp.waterDepth,
        velocity: null,
        isMissing: true,
      })
    }

    const originalWl = store.waterLevels.find((w: WaterLevel) => w.measurementId === measurement.id)
    if (originalWl) {
      store.waterLevels.push({
        id: genId(),
        measurementId: newId,
        startLevel: originalWl.startLevel,
        endLevel: originalWl.endLevel,
        avgLevel: originalWl.avgLevel,
        changeRate: originalWl.changeRate,
      })
    }

    const audit: AuditTrail = {
      id: genId(),
      measurementId: measurement.id,
      action: 'remeasure',
      operator,
      operatorRole,
      comment: remeasureReason || comment || null,
      createdAt: now,
    }
    store.auditTrails.push(audit)

    writeStore(store)
    res.json({ success: true, data: { original: measurement, newMeasurement } })
  } catch (error) {
    res.status(500).json({ success: false, error: '要求复测操作失败' })
  }
})

export default router
