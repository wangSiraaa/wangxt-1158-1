import { useEffect, useState } from 'react'
import { format } from 'date-fns'
import { Lock, Send, X, AlertTriangle } from 'lucide-react'
import type { PublishItem } from '@/store'
import { useStore } from '@/store'

export default function Publish() {
  const { publishList, fetchPublishList, publishMeasurement, loading } = useStore()
  const [activeTab, setActiveTab] = useState<'pending' | 'published'>('pending')
  const [confirmId, setConfirmId] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState(false)

  useEffect(() => {
    fetchPublishList()
  }, [fetchPublishList])

  const pendingItems = publishList.filter((m) => m.status === 'approved')
  const publishedItems = publishList.filter((m) => m.status === 'published')

  const handlePublish = async (id: string) => {
    setActionLoading(true)
    try {
      await publishMeasurement(id)
      setConfirmId(null)
      fetchPublishList()
    } catch {
      // handled in store
    } finally {
      setActionLoading(false)
    }
  }

  const renderPendingTable = () => (
    <table className="w-full text-sm">
      <thead>
        <tr className="bg-slate-50 border-b border-slate-200">
          <th className="text-left py-3 px-4 text-slate-500 font-medium">断面</th>
          <th className="text-left py-3 px-4 text-slate-500 font-medium">施测日期</th>
          <th className="text-left py-3 px-4 text-slate-500 font-medium">测法</th>
          <th className="text-left py-3 px-4 text-slate-500 font-medium">平均水位</th>
          <th className="text-left py-3 px-4 text-slate-500 font-medium">水位变率</th>
          <th className="text-left py-3 px-4 text-slate-500 font-medium">操作</th>
        </tr>
      </thead>
      <tbody>
        {pendingItems.length === 0 && (
          <tr><td colSpan={6} className="text-center py-10 text-slate-400">暂无待发布记录</td></tr>
        )}
        {pendingItems.map((item: PublishItem) => (
          <tr key={item.id} className="border-b border-slate-100 hover:bg-slate-50">
            <td className="py-3 px-4 text-slate-700">{item.sectionName}</td>
            <td className="py-3 px-4 text-slate-700">{format(new Date(item.measureDate), 'yyyy-MM-dd')}</td>
            <td className="py-3 px-4 text-slate-700">{item.method === 'point_integration' ? '积点法' : '积深法'}</td>
            <td className="py-3 px-4 text-slate-700">{item.waterLevel?.avgLevel ?? '-'}</td>
            <td className="py-3 px-4 text-slate-700">
              {item.waterLevel ? (
                <span className={item.waterLevel.changeRate > 0.5 ? 'text-warning font-semibold' : ''}>
                  {item.waterLevel.changeRate}
                  {item.waterLevel.changeRate > 0.5 && <AlertTriangle className="w-3.5 h-3.5 inline ml-1" />}
                </span>
              ) : '-'}
            </td>
            <td className="py-3 px-4">
              <button onClick={() => setConfirmId(item.id)} className="btn-primary text-xs py-1.5 px-3 flex items-center gap-1">
                <Send className="w-3.5 h-3.5" /> 发布
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )

  const renderPublishedTable = () => (
    <table className="w-full text-sm">
      <thead>
        <tr className="bg-slate-50 border-b border-slate-200">
          <th className="text-left py-3 px-4 text-slate-500 font-medium">断面</th>
          <th className="text-left py-3 px-4 text-slate-500 font-medium">施测日期</th>
          <th className="text-left py-3 px-4 text-slate-500 font-medium">测法</th>
          <th className="text-left py-3 px-4 text-slate-500 font-medium">平均水位</th>
          <th className="text-left py-3 px-4 text-slate-500 font-medium">发布时间</th>
          <th className="text-left py-3 px-4 text-slate-500 font-medium">发布人</th>
          <th className="text-left py-3 px-4 text-slate-500 font-medium">状态</th>
        </tr>
      </thead>
      <tbody>
        {publishedItems.length === 0 && (
          <tr><td colSpan={7} className="text-center py-10 text-slate-400">暂无已发布记录</td></tr>
        )}
        {publishedItems.map((item: PublishItem) => (
          <tr key={item.id} className="border-b border-slate-100">
            <td className="py-3 px-4 text-slate-700">{item.sectionName}</td>
            <td className="py-3 px-4 text-slate-700">{format(new Date(item.measureDate), 'yyyy-MM-dd')}</td>
            <td className="py-3 px-4 text-slate-700">{item.method === 'point_integration' ? '积点法' : '积深法'}</td>
            <td className="py-3 px-4 text-slate-700">{item.waterLevel?.avgLevel ?? '-'}</td>
            <td className="py-3 px-4 text-slate-700">
              {item.publishRecord ? format(new Date(item.publishRecord.publishedAt), 'yyyy-MM-dd HH:mm') : '-'}
            </td>
            <td className="py-3 px-4 text-slate-700">{item.publishRecord?.publishedBy ?? '-'}</td>
            <td className="py-3 px-4">
              <span className="badge-published flex items-center gap-1 w-fit">
                <Lock className="w-3 h-3" /> 已发布
              </span>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )

  if (loading && publishList.length === 0) {
    return <div className="flex justify-center py-20"><div className="spinner" /></div>
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-1 border-b border-slate-200">
        <button
          onClick={() => setActiveTab('pending')}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'pending'
              ? 'border-secondary text-secondary'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          待发布 ({pendingItems.length})
        </button>
        <button
          onClick={() => setActiveTab('published')}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'published'
              ? 'border-secondary text-secondary'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          已发布 ({publishedItems.length})
        </button>
      </div>

      <div className="card p-0 overflow-hidden">
        {activeTab === 'pending' ? renderPendingTable() : renderPublishedTable()}
      </div>

      {confirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/30" onClick={() => setConfirmId(null)} />
          <div className="relative bg-white rounded-lg shadow-xl w-[400px] p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-slate-800">确认发布</h3>
              <button onClick={() => setConfirmId(null)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
            </div>
            <p className="text-sm text-slate-600 mb-5">发布后数据将锁定，不可再修改。确认发布此测次数据？</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setConfirmId(null)} className="btn-secondary">取消</button>
              <button onClick={() => handlePublish(confirmId)} disabled={actionLoading} className="btn-primary flex items-center gap-1.5">
                <Send className="w-4 h-4" /> {actionLoading ? '发布中...' : '确认发布'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
