import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { format } from 'date-fns'
import {
  AlertTriangle, Edit, Send, CheckCircle, XCircle,
  RotateCcw, Lock, FileText, ArrowUpRight, ThumbsUp, ThumbsDown,
} from 'lucide-react'
import type { AuditTrail } from '../../shared/types'
import { useStore } from '@/store'

const STATUS_MAP: Record<string, { label: string; badge: string }> = {
  draft: { label: '草稿', badge: 'badge-draft' },
  submitted: { label: '已提交', badge: 'badge-submitted' },
  approved: { label: '已审核', badge: 'badge-approved' },
  rejected: { label: '已驳回', badge: 'badge-rejected' },
  remeasure: { label: '需复测', badge: 'badge-remeasure' },
  published: { label: '已发布', badge: 'badge-published' },
}

const ACTION_ICONS: Record<string, typeof Send> = {
  submit: Send,
  approve: ThumbsUp,
  reject: ThumbsDown,
  remeasure: RotateCcw,
  publish: ArrowUpRight,
}

const ACTION_LABELS: Record<string, string> = {
  submit: '提交',
  approve: '审核通过',
  reject: '驳回',
  remeasure: '要求复测',
  publish: '发布',
}

export default function MeasureDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const {
    currentMeasurement, sections, role, loading,
    fetchMeasurementDetail, submitMeasurement, clearCurrentMeasurement,
  } = useStore()
  const [actionLoading, setActionLoading] = useState(false)

  useEffect(() => {
    if (id) fetchMeasurementDetail(id)
    return () => clearCurrentMeasurement()
  }, [id, fetchMeasurementDetail, clearCurrentMeasurement])

  if (loading || !currentMeasurement) {
    return <div className="flex justify-center py-20"><div className="spinner" /></div>
  }

  const m = currentMeasurement
  const sectionName = sections.find((s) => s.id === m.sectionId)?.name ?? m.sectionId
  const statusInfo = STATUS_MAP[m.status] ?? { label: m.status, badge: 'badge-draft' }

  const canEdit = ['draft', 'rejected'].includes(m.status) && role === 'station'
  const canSubmit = ['draft', 'rejected'].includes(m.status) && role === 'station'
  const canReview = m.status === 'submitted' && role === 'reviewer'
  const canPublish = m.status === 'approved' && role === 'duty'

  const handleAction = async (action: () => Promise<void>) => {
    setActionLoading(true)
    try {
      await action()
      if (id) fetchMeasurementDetail(id)
    } catch {
      // error handled in store
    } finally {
      setActionLoading(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold text-slate-800">基本信息</h3>
          <span className={statusInfo.badge}>{statusInfo.label}</span>
        </div>
        <div className="grid grid-cols-2 gap-y-3 gap-x-6 text-sm">
          <div><span className="text-slate-500">断面：</span><span className="text-slate-800">{sectionName}</span></div>
          <div><span className="text-slate-500">施测日期：</span><span className="text-slate-800">{format(new Date(m.measureDate), 'yyyy-MM-dd')}</span></div>
          <div><span className="text-slate-500">天气：</span><span className="text-slate-800">{m.weather || '-'}</span></div>
          <div><span className="text-slate-500">测法：</span><span className="text-slate-800">{m.method === 'point_integration' ? '积点法' : '积深法'}</span></div>
        </div>
      </div>

      <div className="card">
        <h3 className="text-base font-semibold text-slate-800 mb-4">流速测点</h3>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200">
              <th className="text-left py-2 px-2 text-slate-500 font-medium">点号</th>
              <th className="text-left py-2 px-2 text-slate-500 font-medium">起点距(m)</th>
              <th className="text-left py-2 px-2 text-slate-500 font-medium">水深(m)</th>
              <th className="text-left py-2 px-2 text-slate-500 font-medium">流速(m/s)</th>
              <th className="text-left py-2 px-2 text-slate-500 font-medium">状态</th>
            </tr>
          </thead>
          <tbody>
            {m.velocityPoints.map((vp) => (
              <tr key={vp.id} className={`border-b border-slate-100 ${vp.isMissing ? 'bg-danger-50' : ''}`}>
                <td className="py-2 px-2 text-slate-700">{vp.pointNo}</td>
                <td className="py-2 px-2 text-slate-700">{vp.startDistance}</td>
                <td className="py-2 px-2 text-slate-700">{vp.waterDepth}</td>
                <td className="py-2 px-2 text-slate-700">
                  {vp.velocity != null ? vp.velocity : '-'}
                </td>
                <td className="py-2 px-2">
                  {vp.isMissing ? (
                    <span className="flex items-center gap-1 text-danger text-xs"><AlertTriangle className="w-3.5 h-3.5" />缺测</span>
                  ) : (
                    <span className="text-slate-400 text-xs">正常</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="card">
        <h3 className="text-base font-semibold text-slate-800 mb-4">水位信息</h3>
        {m.waterLevel ? (
          <div className="grid grid-cols-2 gap-y-3 gap-x-6 text-sm">
            <div><span className="text-slate-500">始水位：</span><span className="text-slate-800">{m.waterLevel.startLevel} m</span></div>
            <div><span className="text-slate-500">终水位：</span><span className="text-slate-800">{m.waterLevel.endLevel} m</span></div>
            <div><span className="text-slate-500">平均水位：</span><span className="text-slate-800">{m.waterLevel.avgLevel} m</span></div>
            <div>
              <span className="text-slate-500">变化率：</span>
              <span className={m.waterLevel.changeRate > 0.5 ? 'text-warning font-semibold' : 'text-slate-800'}>
                {m.waterLevel.changeRate} m/h
              </span>
              {m.waterLevel.changeRate > 0.5 && (
                <AlertTriangle className="w-4 h-4 text-warning inline ml-1" />
              )}
            </div>
          </div>
        ) : (
          <p className="text-sm text-slate-400">暂无水位数据</p>
        )}
      </div>

      {m.auditTrails.length > 0 && (
        <div className="card">
          <h3 className="text-base font-semibold text-slate-800 mb-4">审核记录</h3>
          <div className="relative pl-6">
            <div className="absolute left-2 top-0 bottom-0 w-0.5 bg-slate-200" />
            <div className="space-y-4">
              {m.auditTrails.map((trail: AuditTrail) => {
                const Icon = ACTION_ICONS[trail.action] ?? FileText
                return (
                  <div key={trail.id} className="relative flex items-start gap-3">
                    <div className="absolute -left-[18px] w-7 h-7 rounded-full bg-white border-2 border-secondary flex items-center justify-center z-10">
                      <Icon className="w-3.5 h-3.5 text-secondary" />
                    </div>
                    <div className="flex-1 pt-0.5">
                      <div className="flex items-center gap-2 text-sm">
                        <span className="font-medium text-slate-700">{ACTION_LABELS[trail.action] ?? trail.action}</span>
                        <span className="text-slate-400">·</span>
                        <span className="text-slate-500">{trail.operator}</span>
                        <span className="text-slate-400">·</span>
                        <span className="text-slate-400 text-xs">{format(new Date(trail.createdAt), 'yyyy-MM-dd HH:mm')}</span>
                      </div>
                      {trail.comment && (
                        <p className="text-sm text-slate-600 mt-1">{trail.comment}</p>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      <div className="flex justify-end gap-3 pb-6">
        {m.status === 'published' && (
          <div className="flex items-center gap-2 text-purple-600 text-sm">
            <Lock className="w-4 h-4" /> 已发布，不可编辑
          </div>
        )}
        {canEdit && (
          <button onClick={() => navigate(`/measure/edit/${m.id}`)} className="btn-secondary flex items-center gap-1.5">
            <Edit className="w-4 h-4" /> 编辑
          </button>
        )}
        {canSubmit && (
          <button
            onClick={() => handleAction(() => submitMeasurement(m.id))}
            disabled={actionLoading}
            className="btn-primary flex items-center gap-1.5"
          >
            <Send className="w-4 h-4" /> {actionLoading ? '提交中...' : '提交'}
          </button>
        )}
        {canReview && (
          <>
            <button onClick={() => handleAction(() => useStore.getState().approveMeasurement(m.id))} disabled={actionLoading} className="btn-success flex items-center gap-1.5">
              <CheckCircle className="w-4 h-4" /> 通过
            </button>
            <button onClick={() => handleAction(() => useStore.getState().rejectMeasurement(m.id))} disabled={actionLoading} className="btn-danger flex items-center gap-1.5">
              <XCircle className="w-4 h-4" /> 驳回
            </button>
            <button onClick={() => handleAction(() => useStore.getState().remeasureMeasurement(m.id))} disabled={actionLoading} className="btn-warning flex items-center gap-1.5">
              <RotateCcw className="w-4 h-4" /> 复测
            </button>
          </>
        )}
        {canPublish && (
          <button onClick={() => handleAction(() => useStore.getState().publishMeasurement(m.id))} disabled={actionLoading} className="btn-primary flex items-center gap-1.5">
            <ArrowUpRight className="w-4 h-4" /> {actionLoading ? '发布中...' : '发布'}
          </button>
        )}
      </div>
    </div>
  )
}
