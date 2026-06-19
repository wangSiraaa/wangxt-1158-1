export interface Section {
  id: string
  name: string
  code: string
  createdAt: string
}

export interface Measurement {
  id: string
  sectionId: string
  measureDate: string
  weather: string
  method: 'point_integration' | 'depth_integration'
  status: 'draft' | 'submitted' | 'approved' | 'rejected' | 'remeasure' | 'published'
  needRemeasure: boolean
  pendingVerification: boolean
  remeasureFromId: string | null
  remeasureReason: string | null
  createdAt: string
  updatedAt: string
}

export interface VelocityPoint {
  id: string
  measurementId: string
  pointNo: number
  startDistance: number
  waterDepth: number
  velocity: number | null
  isMissing: boolean
}

export interface WaterLevel {
  id: string
  measurementId: string
  startLevel: number
  endLevel: number
  avgLevel: number
  changeRate: number
}

export interface AuditTrail {
  id: string
  measurementId: string
  action: 'submit' | 'approve' | 'reject' | 'remeasure' | 'publish' | 'add_correction' | 'mark_pending_verification'
  operator: string
  operatorRole: 'station' | 'reviewer' | 'duty'
  comment: string | null
  createdAt: string
}

export interface CorrectionNote {
  id: string
  measurementId: string
  content: string
  operator: string
  operatorRole: 'station' | 'reviewer' | 'duty'
  createdAt: string
}

export interface PublishRecord {
  id: string
  measurementId: string
  publishedBy: string
  publishedAt: string
  dataSnapshot: string
}

export interface StoreData {
  sections: Section[]
  measurements: Measurement[]
  velocityPoints: VelocityPoint[]
  waterLevels: WaterLevel[]
  auditTrails: AuditTrail[]
  publishRecords: PublishRecord[]
  correctionNotes: CorrectionNote[]
}
