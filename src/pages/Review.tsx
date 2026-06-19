import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { format } from 'date-fns'
import { CheckCircle, XCircle, RotateCcw, Eye, X, AlertTriangle } from 'lucide-react'
import type { ReviewItem } from '@/store'
import { useStore } from '@/store'

const STATUS_MAP: Record<string, { label: string; badge: string }> = {
  draft: { label: '草稿', badge: 'badge-draft' },
  submitted: { label: '已提交', badge: 'badge-submitted' },
  approved: { label: '已审核', badge: 'badge-approved' },
  rejected: { label: '已驳回', badge: 'badge-rejected' },
  remeasure: { label: '需复测', badge: 'badge-remeasure' },
  published: { label: '已发布', badge: 'badge-published' },
}

function isForceRemeasure(item: ReviewItem): boolean {
  if (item.needRemeasure) return true
  if (item.waterLevel && Math.abs(item.waterLevel.changeRate) > 0.5) return true
  return false
}

export default function Review() {
  const { reviewList, fetchReviewList, approveMeasurement, rejectMeasurement, remeasureMeasurement, loading } = useStore()
  const navigate = useNavigate()
  const [selectedItem, setSelectedItem] = useState<ReviewItem | null>(null)
  const [comment, setComment] = useState('')
  const [actionLoading, setActionLoading] = useState(false)
  const [confirmAction, setConfirmAction] = useState<'approve' | 'reject' | 'remeasure' | null>(null)

  useEffect(() => {
    fetchReviewList()
  }, [fetchReviewList])

  const handleAction = async (action: () => Promise<void>) => {
    setActionLoading(true)
    try {
      await action()
      setConfirmAction(null)
      setComment('')
      setSelectedItem(null)
      fetchReviewList()
    } catch {
      // handled in store
    } finally {
      setActionLoading(false)
    }
  }

  if (loading && reviewList.length === 0) {
    return <div className="flex justify-center py-20"><div className="spinner" /></div>
  }

  return (
    <div className="flex gap-6">
      <div className="w-64 shrink-0">
        <div className="card sticky top-0">
          <h3 className="text-sm font-semibold text-slate-700 mb-3">筛选条件</h3>
          <p className="text-xs text-slate-400">当前仅显示"已提交"状态记录</p>
        </div>
      </div>

      <div className="flex-1">
        <div className="card p-0 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="text-left py-3 px-4 text-slate-500 font-medium">断面</th>
                <th className="text-left py-3 px-4 text-slate-500 font-medium">施测日期</th>
                <th className="text-left py-3 px-4 text-slate-500 font-medium">测法</th>
                <th className="text-left py-3 px-4 text-slate-500 font-medium">水位变率</th>
                <th className="text-left py-3 px-4 text-slate-500 font-medium">状态</th>
                <th className="text-left py-3 px-4 text-slate-500 font-medium">操作</th>
              </tr>
            </thead>
            <tbody>
              {reviewList.length === 0 && (
                <tr><td colSpan={6} className="text-center py-10 text-slate-400">暂无待复核记录</td></tr>
              )}
              {reviewList.map((item) => {
                const statusInfo = STATUS_MAP[item.status] ?? { label: item.status, badge: 'badge-draft' }
                const forceRemeasure = isForceRemeasure(item)
                return (
                  <tr key={item.id} className={`border-b border-slate-100 hover:bg-slate-50 cursor-pointer ${forceRemeasure ? 'bg-warning-50/30' : ''}`} onClick={() => setSelectedItem(item)}>
                    <td className="py-3 px-4 text-slate-700">{item.sectionName}</td>
                    <td className="py-3 px-4 text-slate-700">{format(new Date(item.measureDate), 'yyyy-MM-dd')}</td>
                    <td className="py-3 px-4 text-slate-700">{item.method === 'point_integration' ? '积点法' : '积深法'}</td>
                    <td className="py-3 px-4">
                      {item.waterLevel ? (
                        <span className={`inline-flex items-center gap-1 ${Math.abs(item.waterLevel.changeRate) > 0.5 ? 'text-warning font-semibold' : 'text-slate-700'}`}>
                          {Math.abs(item.waterLevel.changeRate) > 0.5 && <AlertTriangle className="w-3.5 h-3.5" />}
                          {item.waterLevel.changeRate}
                        </span>
                      ) : '-'}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <span className={statusInfo.badge}>{statusInfo.label}</span>
                        {forceRemeasure && <span className="badge-remeasure text-xs">需复测</span>}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => { setSelectedItem(item); setConfirmAction('approve') }}
                          disabled={forceRemeasure}
                          className={`p-1.5 rounded ${forceRemeasure ? 'text-slate-300 cursor-not-allowed' : 'hover:bg-emerald-50 text-emerald-600'}`}
                          title={forceRemeasure ? '水位变化过快，需走复测流程' : '通过'}
                        >
                          <CheckCircle className="w-4 h-4" />
                        </button>
                        <button onClick={() => { setSelectedItem(item); setConfirmAction('reject') }} className="p-1.5 rounded hover:bg-slate-100 text-slate-500" title="驳回"><XCircle className="w-4 h-4" /></button>
                        <button onClick={() => { setSelectedItem(item); setConfirmAction('remeasure') }} className="p-1.5 rounded hover:bg-amber-50 text-amber-600" title="复测"><RotateCcw className="w-4 h-4" /></button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {selectedItem && !confirmAction && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/30" onClick={() => setSelectedItem(null)} />
          <div className="relative w-[480px] bg-white shadow-xl overflow-auto">
            <div className="flex items-center justify-between p-4 border-b border-slate-200">
              <h3 className="font-semibold text-slate-800">测次详情</h3>
              <button onClick={() => setSelectedItem(null)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-4 space-y-4">
              <div className="grid grid-cols-2 gap-y-2 text-sm">
                <div><span className="text-slate-500">断面：</span>{selectedItem.sectionName}</div>
                <div><span className="text-slate-500">日期：</span>{format(new Date(selectedItem.measureDate), 'yyyy-MM-dd')}</div>
                <div><span className="text-slate-500">测法：</span>{selectedItem.method === 'point_integration' ? '积点法' : '积深法'}</div>
                <div><span className="text-slate-500">天气：</span>{selectedItem.weather || '-'}</div>
              </div>
              {selectedItem.velocityPoints.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-slate-700 mb-2">流速测点</p>
                  <table className="w-full text-xs">
                    <thead><tr className="border-b border-slate-200">
                      <th className="text-left py-1 px-1 text-slate-500">点号</th>
                      <th className="text-left py-1 px-1 text-slate-500">起点距</th>
                      <th className="text-left py-1 px-1 text-slate-500">水深</th>
                      <th className="text-left py-1 px-1 text-slate-500">流速</th>
                    </tr></thead>
                    <tbody>
                      {selectedItem.velocityPoints.map((vp) => (
                        <tr key={vp.id} className={vp.isMissing ? 'bg-danger-50' : ''}>
                          <td className="py-1 px-1">{vp.pointNo}</td>
                          <td className="py-1 px-1">{vp.startDistance}</td>
                          <td className="py-1 px-1">{vp.waterDepth}</td>
                          <td className="py-1 px-1">{vp.velocity ?? '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              {selectedItem.waterLevel && (
                <div className="text-sm">
                  <p className="font-medium text-slate-700 mb-1">水位信息</p>
                  <div className="grid grid-cols-2 gap-y-1">
                    <div>始水位：{selectedItem.waterLevel.startLevel}m</div>
                    <div>终水位：{selectedItem.waterLevel.endLevel}m</div>
                    <div>平均：{selectedItem.waterLevel.avgLevel}m</div>
                    <div>变化率：<span className={Math.abs(selectedItem.waterLevel.changeRate) > 0.5 ? 'text-warning font-semibold' : ''}>{selectedItem.waterLevel.changeRate}m/h</span></div>
                  </div>
                </div>
              )}
              {isForceRemeasure(selectedItem) && (
                <div className="bg-warning-50 border border-warning-200 rounded-lg p-3 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-warning shrink-0 mt-0.5" />
                  <div className="text-xs text-warning-700">
                    <p className="font-medium">该测次需走复测流程</p>
                    <p className="mt-0.5">{selectedItem.needRemeasure ? '已标记需要复测' : '水位变化率超过 0.5m/h 阈值'}</p>
                    <p className="mt-0.5">不得直接审核通过，请使用"复测"操作</p>
                  </div>
                </div>
              )}
              <button onClick={() => navigate(`/measure/${selectedItem.id}`)} className="btn-secondary text-sm w-full flex items-center justify-center gap-1.5">
                <Eye className="w-4 h-4" /> 查看完整详情
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmAction && selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/30" onClick={() => setConfirmAction(null)} />
          <div className="relative bg-white rounded-lg shadow-xl w-[400px] p-6">
            <h3 className="font-semibold text-slate-800 mb-4">
              {confirmAction === 'approve' && '确认通过'}
              {confirmAction === 'reject' && '确认驳回'}
              {confirmAction === 'remeasure' && '要求复测'}
            </h3>
            <div className="mb-4">
              <label className="block text-sm text-slate-600 mb-1">
                {confirmAction === 'remeasure' ? '复测原因' : '审核意见'}
              </label>
              <textarea
                className="input-field"
                rows={3}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder={confirmAction === 'remeasure' ? '请输入复测原因...' : '可选填写意见...'}
              />
            </div>
            <div className="flex justify-end gap-3">
              <button onClick={() => setConfirmAction(null)} className="btn-secondary">取消</button>
              {confirmAction === 'approve' && (
                <button
                  onClick={() => handleAction(() => approveMeasurement(selectedItem.id, comment))}
                  disabled={actionLoading || isForceRemeasure(selectedItem)}
                  className="btn-success flex items-center gap-1.5"
                >
                  <CheckCircle className="w-4 h-4" /> {actionLoading ? '处理中...' : '确认通过'}
                </button>
              )}
              {confirmAction === 'reject' && (
                <button onClick={() => handleAction(() => rejectMeasurement(selectedItem.id, comment))} disabled={actionLoading} className="btn-danger flex items-center gap-1.5">
                  <XCircle className="w-4 h-4" /> {actionLoading ? '处理中...' : '确认驳回'}
                </button>
              )}
              {confirmAction === 'remeasure' && (
                <button onClick={() => handleAction(() => remeasureMeasurement(selectedItem.id, comment))} disabled={actionLoading} className="btn-warning flex items-center gap-1.5">
                  <RotateCcw className="w-4 h-4" /> {actionLoading ? '处理中...' : '确认复测'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
