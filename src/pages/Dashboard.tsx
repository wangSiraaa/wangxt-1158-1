import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { Droplets, ClipboardCheck, Send, Lock, AlertTriangle, FileText } from 'lucide-react'
import { format } from 'date-fns'
import { useStore } from '@/store'

const STAT_CARDS = [
  { key: 'todayCount' as const, label: '今日施测', icon: Droplets, color: 'bg-blue-50 text-blue-600' },
  { key: 'pendingReviewCount' as const, label: '待复核', icon: ClipboardCheck, color: 'bg-amber-50 text-amber-600' },
  { key: 'pendingPublishCount' as const, label: '待发布', icon: Send, color: 'bg-emerald-50 text-emerald-600' },
  { key: 'publishedCount' as const, label: '已发布', icon: Lock, color: 'bg-purple-50 text-purple-600' },
]

export default function Dashboard() {
  const { dashboardStats, role, fetchDashboardStats, measurements, fetchMeasurements, loading } = useStore()
  const navigate = useNavigate()

  useEffect(() => {
    fetchDashboardStats()
    fetchMeasurements()
  }, [fetchDashboardStats, fetchMeasurements])

  if (loading && !dashboardStats) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="spinner" />
      </div>
    )
  }

  const stats = dashboardStats

  const todos = (() => {
    const items: { text: string; type: 'info' | 'warn'; action?: () => void }[] = []
    if (role === 'station') {
      const drafts = measurements.filter((m) => m.status === 'draft')
      if (drafts.length > 0) items.push({ text: `您有 ${drafts.length} 条草稿待提交`, type: 'info' })
      const remeasures = measurements.filter((m) => m.status === 'remeasure' || m.remeasureFromId)
      if (remeasures.length > 0) items.push({ text: `${remeasures.length} 条记录需要复测`, type: 'warn', action: () => navigate('/remeasure') })
    }
    if (role === 'reviewer') {
      if (stats?.pendingReviewCount) items.push({ text: `${stats.pendingReviewCount} 条记录待复核`, type: 'info', action: () => navigate('/review') })
    }
    if (role === 'duty') {
      if (stats?.pendingPublishCount) items.push({ text: `${stats.pendingPublishCount} 条记录待发布`, type: 'info', action: () => navigate('/publish') })
    }
    if (items.length === 0) items.push({ text: '暂无待办事项', type: 'info' })
    return items
  })()

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {STAT_CARDS.map((card) => (
          <div key={card.key} className="card flex items-center gap-4">
            <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${card.color}`}>
              <card.icon className="w-6 h-6" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-800">{stats?.[card.key] ?? 0}</p>
              <p className="text-sm text-slate-500">{card.label}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="card lg:col-span-2">
          <h3 className="text-base font-semibold text-slate-800 mb-4">近7日施测趋势</h3>
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={stats?.recentTrend ?? []}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis
                dataKey="date"
                tickFormatter={(v) => format(new Date(v), 'M/d')}
                tick={{ fontSize: 12, fill: '#94a3b8' }}
              />
              <YAxis tick={{ fontSize: 12, fill: '#94a3b8' }} allowDecimals={false} />
              <Tooltip
                labelFormatter={(v) => format(new Date(v), 'yyyy-MM-dd')}
                contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0' }}
              />
              <Area type="monotone" dataKey="count" stroke="#06B6D4" fill="#06B6D4" fillOpacity={0.15} strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <h3 className="text-base font-semibold text-slate-800 mb-4">待办事项</h3>
          <div className="space-y-3">
            {todos.map((todo, i) => (
              <div
                key={i}
                onClick={todo.action}
                className={`flex items-start gap-2.5 p-3 rounded-lg ${
                  todo.action ? 'cursor-pointer hover:bg-slate-50' : ''
                }`}
              >
                {todo.type === 'warn' ? (
                  <AlertTriangle className="w-4 h-4 text-warning mt-0.5 shrink-0" />
                ) : (
                  <FileText className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                )}
                <span className={`text-sm ${todo.type === 'warn' ? 'text-warning-700' : 'text-slate-600'}`}>
                  {todo.text}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
