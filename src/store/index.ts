import { create } from 'zustand'
import type {
  Section,
  Measurement,
  VelocityPoint,
  WaterLevel,
  AuditTrail,
  PublishRecord,
  CorrectionNote,
} from '../../shared/types'

type Role = 'station' | 'reviewer' | 'duty'

interface DashboardStats {
  todayCount: number
  pendingReviewCount: number
  pendingPublishCount: number
  publishedCount: number
  recentTrend: { date: string; count: number }[]
}

interface ChainLink {
  id: string
  status: string
  measureDate: string
  isRemeasure: boolean
}

export interface MeasurementDetail extends Measurement {
  velocityPoints: VelocityPoint[]
  waterLevel: WaterLevel | null
  auditTrails: AuditTrail[]
  correctionNotes: CorrectionNote[]
  chain: ChainLink[]
}

export interface PublishItem extends Measurement {
  velocityPoints: VelocityPoint[]
  waterLevel: WaterLevel | null
  sectionName: string
  publishRecord: PublishRecord | null
  correctionNotes: CorrectionNote[]
}

export interface ReviewItem extends Measurement {
  velocityPoints: VelocityPoint[]
  waterLevel: WaterLevel | null
  sectionName: string
}

async function apiFetch<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  const json = await res.json()
  if (!json.success) throw new Error(json.error || '请求失败')
  return json.data
}

interface AppState {
  role: Role
  setRole: (role: Role) => void

  sections: Section[]
  measurements: Measurement[]
  dashboardStats: DashboardStats | null
  currentMeasurement: MeasurementDetail | null
  reviewList: ReviewItem[]
  publishList: PublishItem[]
  loading: boolean
  error: string | null

  fetchSections: () => Promise<void>
  fetchMeasurements: (params?: { sectionId?: string; status?: string }) => Promise<void>
  fetchMeasurementDetail: (id: string) => Promise<void>
  createMeasurement: (data: Record<string, unknown>) => Promise<Measurement>
  updateMeasurement: (id: string, data: Record<string, unknown>) => Promise<Measurement>
  deleteMeasurement: (id: string) => Promise<void>
  submitMeasurement: (id: string) => Promise<void>
  fetchDashboardStats: () => Promise<void>
  fetchReviewList: () => Promise<void>
  approveMeasurement: (id: string, comment?: string) => Promise<void>
  rejectMeasurement: (id: string, comment?: string) => Promise<void>
  remeasureMeasurement: (id: string, reason?: string) => Promise<void>
  fetchPublishList: () => Promise<void>
  publishMeasurement: (id: string) => Promise<void>
  addCorrectionNote: (id: string, content: string) => Promise<void>
  clearError: () => void
  clearCurrentMeasurement: () => void
})}

export const useStore = create<AppState>((set, get) => ({
  role: 'station',
  setRole: (role) => set({ role }),

  sections: [],
  measurements: [],
  dashboardStats: null,
  currentMeasurement: null,
  reviewList: [],
  publishList: [],
  loading: false,
  error: null,

  fetchSections: async () => {
    try {
      const data = await apiFetch<Section[]>('/api/sections')
      set({ sections: data })
    } catch (e) {
      set({ error: (e as Error).message })
    }
  },

  fetchMeasurements: async (params) => {
    set({ loading: true, error: null })
    try {
      const query = new URLSearchParams()
      if (params?.sectionId) query.set('sectionId', params.sectionId)
      if (params?.status) query.set('status', params.status)
      const qs = query.toString()
      const url = `/api/measurements${qs ? `?${qs}` : ''}`
      const data = await apiFetch<Measurement[]>(url)
      set({ measurements: data, loading: false })
    } catch (e) {
      set({ error: (e as Error).message, loading: false })
    }
  },

  fetchMeasurementDetail: async (id) => {
    set({ loading: true, error: null })
    try {
      const data = await apiFetch<MeasurementDetail>(`/api/measurements/${id}`)
      set({ currentMeasurement: data, loading: false })
    } catch (e) {
      set({ error: (e as Error).message, loading: false })
    }
  },

  createMeasurement: async (data) => {
    set({ loading: true, error: null })
    try {
      const result = await apiFetch<Measurement>('/api/measurements', {
        method: 'POST',
        body: JSON.stringify(data),
      })
      set({ loading: false })
      return result
    } catch (e) {
      set({ error: (e as Error).message, loading: false })
      throw e
    }
  },

  updateMeasurement: async (id, data) => {
    set({ loading: true, error: null })
    try {
      const result = await apiFetch<Measurement>(`/api/measurements/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      })
      set({ loading: false })
      return result
    } catch (e) {
      set({ error: (e as Error).message, loading: false })
      throw e
    }
  },

  deleteMeasurement: async (id) => {
    set({ loading: true, error: null })
    try {
      await apiFetch(`/api/measurements/${id}`, { method: 'DELETE' })
      set({ loading: false })
    } catch (e) {
      set({ error: (e as Error).message, loading: false })
    }
  },

  submitMeasurement: async (id) => {
    set({ loading: true, error: null })
    try {
      const role = get().role
      const operatorMap: Record<Role, string> = { station: '测站人员', reviewer: '复核员', duty: '值班员' }
      await apiFetch(`/api/measurements/${id}/submit`, {
        method: 'POST',
        body: JSON.stringify({ operator: operatorMap[role], operatorRole: role }),
      })
      set({ loading: false })
    } catch (e) {
      set({ error: (e as Error).message, loading: false })
      throw e
    }
  },

  fetchDashboardStats: async () => {
    set({ loading: true, error: null })
    try {
      const data = await apiFetch<DashboardStats>('/api/stats/dashboard')
      set({ dashboardStats: data, loading: false })
    } catch (e) {
      set({ error: (e as Error).message, loading: false })
    }
  },

  fetchReviewList: async () => {
    set({ loading: true, error: null })
    try {
      const data = await apiFetch<ReviewItem[]>('/api/reviews')
      set({ reviewList: data, loading: false })
    } catch (e) {
      set({ error: (e as Error).message, loading: false })
    }
  },

  approveMeasurement: async (id, comment) => {
    set({ loading: true, error: null })
    try {
      const role = get().role
      const operatorMap: Record<Role, string> = { station: '测站人员', reviewer: '复核员', duty: '值班员' }
      await apiFetch(`/api/reviews/${id}/approve`, {
        method: 'POST',
        body: JSON.stringify({ operator: operatorMap[role], operatorRole: role, comment }),
      })
      set({ loading: false })
    } catch (e) {
      set({ error: (e as Error).message, loading: false })
      throw e
    }
  },

  rejectMeasurement: async (id, comment) => {
    set({ loading: true, error: null })
    try {
      const role = get().role
      const operatorMap: Record<Role, string> = { station: '测站人员', reviewer: '复核员', duty: '值班员' }
      await apiFetch(`/api/reviews/${id}/reject`, {
        method: 'POST',
        body: JSON.stringify({ operator: operatorMap[role], operatorRole: role, comment }),
      })
      set({ loading: false })
    } catch (e) {
      set({ error: (e as Error).message, loading: false })
      throw e
    }
  },

  remeasureMeasurement: async (id, reason) => {
    set({ loading: true, error: null })
    try {
      const role = get().role
      const operatorMap: Record<Role, string> = { station: '测站人员', reviewer: '复核员', duty: '值班员' }
      await apiFetch(`/api/reviews/${id}/remeasure`, {
        method: 'POST',
        body: JSON.stringify({ operator: operatorMap[role], operatorRole: role, remeasureReason: reason }),
      })
      set({ loading: false })
    } catch (e) {
      set({ error: (e as Error).message, loading: false })
      throw e
    }
  },

  fetchPublishList: async () => {
    set({ loading: true, error: null })
    try {
      const data = await apiFetch<PublishItem[]>('/api/publish')
      set({ publishList: data, loading: false })
    } catch (e) {
      set({ error: (e as Error).message, loading: false })
    }
  },

  publishMeasurement: async (id) => {
    set({ loading: true, error: null })
    try {
      const role = get().role
      const operatorMap: Record<Role, string> = { station: '测站人员', reviewer: '复核员', duty: '值班员' }
      await apiFetch(`/api/publish/${id}`, {
        method: 'POST',
        body: JSON.stringify({ operator: operatorMap[role], operatorRole: role }),
      })
      set({ loading: false })
    } catch (e) {
      set({ error: (e as Error).message, loading: false })
      throw e
    }
  },

  addCorrectionNote: async (id, content) => {
    set({ loading: true, error: null })
    try {
      const role = get().role
      const operatorMap: Record<Role, string> = { station: '测站人员', reviewer: '复核员', duty: '值班员' }
      await apiFetch(`/api/measurements/${id}/corrections`, {
        method: 'POST',
        body: JSON.stringify({ content, operator: operatorMap[role], operatorRole: role }),
      })
      set({ loading: false })
    } catch (e) {
      set({ error: (e as Error).message, loading: false })
      throw e
    }
  },

  clearError: () => set({ error: null }),
  clearCurrentMeasurement: () => set({ currentMeasurement: null }),
}))
