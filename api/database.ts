import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { v4 as uuidv4 } from 'uuid'
import type { StoreData, Section, Measurement, VelocityPoint, WaterLevel, AuditTrail, PublishRecord, CorrectionNote } from '../shared/types.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const DATA_DIR = path.join(__dirname, 'data')
const STORE_PATH = path.join(DATA_DIR, 'store.json')

function getDefaultStore(): StoreData {
  const now = new Date().toISOString()
  const sections: Section[] = [
    { id: uuidv4(), name: '望江楼断面', code: 'WJL-001', createdAt: now },
    { id: uuidv4(), name: '镇江关断面', code: 'ZJG-002', createdAt: now },
    { id: uuidv4(), name: '青神断面', code: 'QS-003', createdAt: now },
  ]

  const sectionId1 = sections[0].id
  const sectionId2 = sections[1].id

  const m1Id = uuidv4()
  const m2Id = uuidv4()
  const m3Id = uuidv4()
  const m4Id = uuidv4()

  const measurements: Measurement[] = [
    {
      id: m1Id,
      sectionId: sectionId1,
      measureDate: '2026-06-17',
      weather: '晴',
      method: 'point_integration',
      status: 'published',
      needRemeasure: false,
      pendingVerification: false,
      remeasureFromId: null,
      remeasureReason: null,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: m2Id,
      sectionId: sectionId2,
      measureDate: '2026-06-18',
      weather: '多云',
      method: 'depth_integration',
      status: 'submitted',
      needRemeasure: false,
      pendingVerification: false,
      remeasureFromId: null,
      remeasureReason: null,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: m3Id,
      sectionId: sectionId1,
      measureDate: '2026-06-18',
      weather: '阴',
      method: 'point_integration',
      status: 'approved',
      needRemeasure: false,
      pendingVerification: false,
      remeasureFromId: null,
      remeasureReason: null,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: m4Id,
      sectionId: sectionId1,
      measureDate: '2026-06-19',
      weather: '晴',
      method: 'point_integration',
      status: 'draft',
      needRemeasure: false,
      pendingVerification: false,
      remeasureFromId: null,
      remeasureReason: null,
      createdAt: now,
      updatedAt: now,
    },
  ]

  const velocityPoints: VelocityPoint[] = [
    { id: uuidv4(), measurementId: m1Id, pointNo: 1, startDistance: 10, waterDepth: 2.5, velocity: 1.23, isMissing: false },
    { id: uuidv4(), measurementId: m1Id, pointNo: 2, startDistance: 20, waterDepth: 3.0, velocity: 1.45, isMissing: false },
    { id: uuidv4(), measurementId: m1Id, pointNo: 3, startDistance: 30, waterDepth: 2.8, velocity: 1.32, isMissing: false },
    { id: uuidv4(), measurementId: m2Id, pointNo: 1, startDistance: 5, waterDepth: 1.8, velocity: 0.95, isMissing: false },
    { id: uuidv4(), measurementId: m2Id, pointNo: 2, startDistance: 15, waterDepth: 2.2, velocity: 1.10, isMissing: false },
    { id: uuidv4(), measurementId: m2Id, pointNo: 3, startDistance: 25, waterDepth: 2.0, velocity: null, isMissing: true },
    { id: uuidv4(), measurementId: m3Id, pointNo: 1, startDistance: 10, waterDepth: 2.3, velocity: 1.15, isMissing: false },
    { id: uuidv4(), measurementId: m3Id, pointNo: 2, startDistance: 20, waterDepth: 2.7, velocity: 1.38, isMissing: false },
    { id: uuidv4(), measurementId: m4Id, pointNo: 1, startDistance: 10, waterDepth: 2.5, velocity: 1.20, isMissing: false },
    { id: uuidv4(), measurementId: m4Id, pointNo: 2, startDistance: 20, waterDepth: 3.0, velocity: null, isMissing: true },
  ]

  const waterLevels: WaterLevel[] = [
    { id: uuidv4(), measurementId: m1Id, startLevel: 45.20, endLevel: 45.18, avgLevel: 45.19, changeRate: 0.02 },
    { id: uuidv4(), measurementId: m2Id, startLevel: 38.50, endLevel: 38.10, avgLevel: 38.30, changeRate: 0.40 },
    { id: uuidv4(), measurementId: m3Id, startLevel: 45.30, endLevel: 45.25, avgLevel: 45.275, changeRate: 0.05 },
    { id: uuidv4(), measurementId: m4Id, startLevel: 45.10, endLevel: 44.50, avgLevel: 44.80, changeRate: 0.60 },
  ]

  const auditTrails: AuditTrail[] = [
    { id: uuidv4(), measurementId: m1Id, action: 'submit', operator: '张三', operatorRole: 'station', comment: null, createdAt: now },
    { id: uuidv4(), measurementId: m1Id, action: 'approve', operator: '李四', operatorRole: 'reviewer', comment: '数据合格', createdAt: now },
    { id: uuidv4(), measurementId: m1Id, action: 'publish', operator: '王五', operatorRole: 'duty', comment: null, createdAt: now },
    { id: uuidv4(), measurementId: m2Id, action: 'submit', operator: '张三', operatorRole: 'station', comment: null, createdAt: now },
    { id: uuidv4(), measurementId: m3Id, action: 'submit', operator: '赵六', operatorRole: 'station', comment: null, createdAt: now },
    { id: uuidv4(), measurementId: m3Id, action: 'approve', operator: '李四', operatorRole: 'reviewer', comment: '审核通过', createdAt: now },
  ]

  const publishRecords: PublishRecord[] = [
    {
      id: uuidv4(),
      measurementId: m1Id,
      publishedBy: '王五',
      publishedAt: now,
      dataSnapshot: JSON.stringify({ measurement: measurements[0], velocityPoints: velocityPoints.filter(vp => vp.measurementId === m1Id), waterLevel: waterLevels.find(wl => wl.measurementId === m1Id) }),
    },
  ]

  const correctionNotes: CorrectionNote[] = []

  return { sections, measurements, velocityPoints, waterLevels, auditTrails, publishRecords, correctionNotes }
}

let storeCache: StoreData | null = null

export function readStore(): StoreData {
  if (storeCache) return storeCache
  if (!fs.existsSync(STORE_PATH)) {
    fs.mkdirSync(DATA_DIR, { recursive: true })
    const defaultStore = getDefaultStore()
    fs.writeFileSync(STORE_PATH, JSON.stringify(defaultStore, null, 2), 'utf-8')
    storeCache = defaultStore
    return defaultStore
  }
  const raw = fs.readFileSync(STORE_PATH, 'utf-8')
  storeCache = JSON.parse(raw)
  return storeCache!
}

export function writeStore(data: StoreData): void {
  storeCache = data
  fs.mkdirSync(DATA_DIR, { recursive: true })
  fs.writeFileSync(STORE_PATH, JSON.stringify(data, null, 2), 'utf-8')
}

export function genId(): string {
  return uuidv4()
}
