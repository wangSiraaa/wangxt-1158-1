import { Router, type Request, type Response } from 'express'
import { readStore, writeStore, genId } from '../database.js'
import type { Measurement, VelocityPoint, WaterLevel, AuditTrail, CorrectionNote } from '../../shared/types.js'

const router = Router()

router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const store = readStore()
    const { sectionId, status } = req.query
    let result = store.measurements
    if (sectionId) result = result.filter((m: Measurement) => m.sectionId === sectionId)
    if (status) result = result.filter((m: Measurement) => m.status === status)
    result.sort((a: Measurement, b: Measurement) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    res.json({ success: true, data: result })
  } catch (error) {
    res.status(500).json({ success: false, error: '获取测量记录失败' })
  }
})

router.get('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const store = readStore()
    const measurement = store.measurements.find((m: Measurement) => m.id === req.params.id)
    if (!measurement) {
      res.status(404).json({ success: false, error: '测量记录不存在' })
      return
    }
    const velocityPoints = store.velocityPoints.filter((vp: VelocityPoint) => vp.measurementId === measurement.id)
    const waterLevel = store.waterLevels.find((wl: WaterLevel) => wl.measurementId === measurement.id)
    const auditTrails = store.auditTrails.filter((at: AuditTrail) => at.measurementId === measurement.id)
    const correctionNotes = store.correctionNotes.filter((cn: CorrectionNote) => cn.measurementId === measurement.id)

    const chain: { id: string; status: string; measureDate: string; isRemeasure: boolean }[] = []
    let current: Measurement | undefined = measurement
    while (current) {
      chain.unshift({
        id: current.id,
        status: current.status,
        measureDate: current.measureDate,
        isRemeasure: !!current.remeasureFromId,
      })
      current = current.remeasureFromId
        ? store.measurements.find((m: Measurement) => m.id === current!.remeasureFromId)
        : undefined
    }
    const remeasureChildren = store.measurements
      .filter((m: Measurement) => m.remeasureFromId === measurement.id)
      .map((m: Measurement) => ({ id: m.id, status: m.status, measureDate: m.measureDate, isRemeasure: true }))
    chain.push(...remeasureChildren)

    res.json({ success: true, data: { ...measurement, velocityPoints, waterLevel, auditTrails, correctionNotes, chain } })
  } catch (error) {
    res.status(500).json({ success: false, error: '获取测量记录详情失败' })
  }
})

router.post('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const { sectionId, measureDate, weather, method, velocityPoints, waterLevel, remeasureFromId, remeasureReason } = req.body
    if (!sectionId || !measureDate || !method) {
      res.status(400).json({ success: false, error: '缺少必填字段' })
      return
    }
    const store = readStore()
    const now = new Date().toISOString()
    const measurementId = genId()
    const measurement: Measurement = {
      id: measurementId,
      sectionId,
      measureDate,
      weather: weather || '',
      method,
      status: 'draft',
      needRemeasure: false,
      pendingVerification: false,
      remeasureFromId: remeasureFromId || null,
      remeasureReason: remeasureReason || null,
      createdAt: now,
      updatedAt: now,
    }
    store.measurements.push(measurement)

    if (Array.isArray(velocityPoints)) {
      for (const vp of velocityPoints) {
        const point: VelocityPoint = {
          id: genId(),
          measurementId,
          pointNo: vp.pointNo,
          startDistance: vp.startDistance,
          waterDepth: vp.waterDepth,
          velocity: vp.velocity ?? null,
          isMissing: vp.isMissing ?? false,
        }
        store.velocityPoints.push(point)
      }
    }

    if (waterLevel) {
      const wl: WaterLevel = {
        id: genId(),
        measurementId,
        startLevel: waterLevel.startLevel,
        endLevel: waterLevel.endLevel,
        avgLevel: waterLevel.avgLevel,
        changeRate: waterLevel.changeRate,
      }
      store.waterLevels.push(wl)
    }

    writeStore(store)
    res.status(201).json({ success: true, data: measurement })
  } catch (error) {
    res.status(500).json({ success: false, error: '创建测量记录失败' })
  }
})

router.put('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const store = readStore()
    const idx = store.measurements.findIndex((m: Measurement) => m.id === req.params.id)
    if (idx === -1) {
      res.status(404).json({ success: false, error: '测量记录不存在' })
      return
    }
    const measurement = store.measurements[idx]
    if (measurement.status === 'published') {
      res.status(403).json({ success: false, error: '已发布的记录不可修改，原始读数已锁定' })
      return
    }
    if (!['draft', 'rejected'].includes(measurement.status)) {
      res.status(403).json({ success: false, error: '仅草稿或已驳回状态的记录可以编辑' })
      return
    }
    const { sectionId, measureDate, weather, method, velocityPoints, waterLevel } = req.body
    const now = new Date().toISOString()
    if (sectionId !== undefined) measurement.sectionId = sectionId
    if (measureDate !== undefined) measurement.measureDate = measureDate
    if (weather !== undefined) measurement.weather = weather
    if (method !== undefined) measurement.method = method
    measurement.updatedAt = now
    store.measurements[idx] = measurement

    if (Array.isArray(velocityPoints)) {
      store.velocityPoints = store.velocityPoints.filter((vp: VelocityPoint) => vp.measurementId !== measurement.id)
      for (const vp of velocityPoints) {
        store.velocityPoints.push({
          id: genId(),
          measurementId: measurement.id,
          pointNo: vp.pointNo,
          startDistance: vp.startDistance,
          waterDepth: vp.waterDepth,
          velocity: vp.velocity ?? null,
          isMissing: vp.isMissing ?? false,
        })
      }
    }

    if (waterLevel) {
      store.waterLevels = store.waterLevels.filter((wl: WaterLevel) => wl.measurementId !== measurement.id)
      store.waterLevels.push({
        id: genId(),
        measurementId: measurement.id,
        startLevel: waterLevel.startLevel,
        endLevel: waterLevel.endLevel,
        avgLevel: waterLevel.avgLevel,
        changeRate: waterLevel.changeRate,
      })
    }

    writeStore(store)
    res.json({ success: true, data: measurement })
  } catch (error) {
    res.status(500).json({ success: false, error: '更新测量记录失败' })
  }
})

router.delete('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const store = readStore()
    const idx = store.measurements.findIndex((m: Measurement) => m.id === req.params.id)
    if (idx === -1) {
      res.status(404).json({ success: false, error: '测量记录不存在' })
      return
    }
    const measurement = store.measurements[idx]
    if (measurement.status === 'published') {
      res.status(403).json({ success: false, error: '已发布的记录不可删除，原始读数已锁定' })
      return
    }
    if (!['draft', 'rejected'].includes(measurement.status)) {
      res.status(403).json({ success: false, error: '仅草稿或已驳回状态的记录可以删除' })
      return
    }
    store.measurements.splice(idx, 1)
    store.velocityPoints = store.velocityPoints.filter((vp: VelocityPoint) => vp.measurementId !== req.params.id)
    store.waterLevels = store.waterLevels.filter((wl: WaterLevel) => wl.measurementId !== req.params.id)
    store.auditTrails = store.auditTrails.filter((at: AuditTrail) => at.measurementId !== req.params.id)
    writeStore(store)
    res.json({ success: true, data: null })
  } catch (error) {
    res.status(500).json({ success: false, error: '删除测量记录失败' })
  }
})

router.post('/:id/submit', async (req: Request, res: Response): Promise<void> => {
  try {
    const store = readStore()
    const idx = store.measurements.findIndex((m: Measurement) => m.id === req.params.id)
    if (idx === -1) {
      res.status(404).json({ success: false, error: '测量记录不存在' })
      return
    }
    const measurement = store.measurements[idx]
    if (!['draft', 'rejected'].includes(measurement.status)) {
      res.status(400).json({ success: false, error: '仅草稿或已驳回状态的记录可以提交' })
      return
    }

    const vps = store.velocityPoints.filter((vp: VelocityPoint) => vp.measurementId === measurement.id)
    const missingPoints = vps.filter((vp: VelocityPoint) => vp.isMissing)
    if (missingPoints.length > 0) {
      res.status(400).json({ success: false, error: '流速点位存在缺测，无法提交' })
      return
    }

    const wl = store.waterLevels.find((w: WaterLevel) => w.measurementId === measurement.id)
    let needRemeasure = false
    let pendingVerification = false
    let warning: string | null = null
    const changeRateAbs = wl ? Math.abs(wl.changeRate) : 0
    if (wl && changeRateAbs > 0.5) {
      needRemeasure = true
      pendingVerification = true
      warning = `水位变化率 ${wl.changeRate}m/h（绝对值 ${changeRateAbs}m/h）超过 0.5m/h 阈值，已标记需要复测，本次读数标记为待核`
    }

    const now = new Date().toISOString()
    const { operator = '未知', operatorRole = 'station', comment } = req.body
    measurement.status = 'submitted'
    measurement.needRemeasure = needRemeasure
    measurement.pendingVerification = pendingVerification
    measurement.updatedAt = now
    store.measurements[idx] = measurement

    const audit: AuditTrail = {
      id: genId(),
      measurementId: measurement.id,
      action: 'submit',
      operator,
      operatorRole,
      comment: comment || null,
      createdAt: now,
    }
    store.auditTrails.push(audit)

    if (pendingVerification) {
      const pvAudit: AuditTrail = {
        id: genId(),
        measurementId: measurement.id,
        action: 'mark_pending_verification',
        operator,
        operatorRole,
        comment: `水位变化率 ${wl?.changeRate}m/h 超过阈值，本次读数标记为待核`,
        createdAt: now,
      }
      store.auditTrails.push(pvAudit)
    }

    writeStore(store)
    res.json({ success: true, data: measurement, warning })
  } catch (error) {
    res.status(500).json({ success: false, error: '提交测量记录失败' })
  }
})

router.post('/:id/corrections', async (req: Request, res: Response): Promise<void> => {
  try {
    const store = readStore()
    const idx = store.measurements.findIndex((m: Measurement) => m.id === req.params.id)
    if (idx === -1) {
      res.status(404).json({ success: false, error: '测量记录不存在' })
      return
    }
    const measurement = store.measurements[idx]
    if (measurement.status !== 'published') {
      res.status(400).json({ success: false, error: '仅已发布的记录可以追加更正说明' })
      return
    }
    const { content, operator = '值班员', operatorRole = 'duty' } = req.body
    if (!content || !content.trim()) {
      res.status(400).json({ success: false, error: '更正说明内容不能为空' })
      return
    }

    const now = new Date().toISOString()
    const note: CorrectionNote = {
      id: genId(),
      measurementId: measurement.id,
      content: content.trim(),
      operator,
      operatorRole,
      createdAt: now,
    }
    store.correctionNotes.push(note)

    const audit: AuditTrail = {
      id: genId(),
      measurementId: measurement.id,
      action: 'add_correction',
      operator,
      operatorRole,
      comment: content.trim(),
      createdAt: now,
    }
    store.auditTrails.push(audit)

    writeStore(store)
    res.status(201).json({ success: true, data: note })
  } catch (error) {
    res.status(500).json({ success: false, error: '追加更正说明失败' })
  }
})

export default router
