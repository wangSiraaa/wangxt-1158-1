import { useState, useEffect, useCallback } from 'react'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import { AlertTriangle, Plus, Trash2, Send, Save, X } from 'lucide-react'
import type { VelocityPoint } from '../../shared/types'
import { useStore } from '@/store'

interface VpRow {
  pointNo: number
  startDistance: string
  waterDepth: string
  velocity: string
  isMissing: boolean
}

export default function MeasureEntry() {
  const { id } = useParams()
  const location = useLocation()
  const isEditMode = location.pathname.startsWith('/measure/edit/')
  const navigate = useNavigate()
  const {
    sections, fetchSections, createMeasurement, updateMeasurement, submitMeasurement,
    currentMeasurement, fetchMeasurementDetail, loading,
  } = useStore()

  const [sectionId, setSectionId] = useState('')
  const [measureDate, setMeasureDate] = useState(new Date().toISOString().slice(0, 10))
  const [weather, setWeather] = useState('')
  const [method, setMethod] = useState<'point_integration' | 'depth_integration'>('point_integration')
  const [vpRows, setVpRows] = useState<VpRow[]>([
    { pointNo: 1, startDistance: '', waterDepth: '', velocity: '', isMissing: false },
  ])
  const [startLevel, setStartLevel] = useState('')
  const [endLevel, setEndLevel] = useState('')
  const [submitError, setSubmitError] = useState('')

  const [showConfirm, setShowConfirm] = useState(false)
  const [confirmType, setConfirmType] = useState<'save' | 'submit'>('save')
  const [actionLoading, setActionLoading] = useState(false)

  useEffect(() => {
    fetchSections()
  }, [fetchSections])

  useEffect(() => {
    if (isEditMode && id) {
      fetchMeasurementDetail(id)
    }
  }, [isEditMode, id, fetchMeasurementDetail])

  useEffect(() => {
    if (isEditMode && currentMeasurement && currentMeasurement.id === id) {
      setSectionId(currentMeasurement.sectionId)
      setMeasureDate(currentMeasurement.measureDate)
      setWeather(currentMeasurement.weather)
      setMethod(currentMeasurement.method)
      setVpRows(
        currentMeasurement.velocityPoints.map((vp: VelocityPoint) => ({
          pointNo: vp.pointNo,
          startDistance: String(vp.startDistance),
          waterDepth: String(vp.waterDepth),
          velocity: vp.velocity != null ? String(vp.velocity) : '',
          isMissing: vp.isMissing,
        }))
      )
      if (currentMeasurement.waterLevel) {
        setStartLevel(String(currentMeasurement.waterLevel.startLevel))
        setEndLevel(String(currentMeasurement.waterLevel.endLevel))
      }
    }
  }, [isEditMode, currentMeasurement, id])

  const avgLevel = (() => {
    const s = parseFloat(startLevel)
    const e = parseFloat(endLevel)
    if (!isNaN(s) && !isNaN(e)) return ((s + e) / 2).toFixed(3)
    return ''
  })()

  const changeRate = (() => {
    const s = parseFloat(startLevel)
    const e = parseFloat(endLevel)
    if (!isNaN(s) && !isNaN(e) && s !== 0) return Math.abs(e - s).toFixed(3)
    return ''
  })()

  const hasMissing = vpRows.some((r) => r.isMissing)
  const rateWarning = parseFloat(changeRate) > 0.5
  const canSubmit = !hasMissing

  const addRow = useCallback(() => {
    setVpRows((prev) => [
      ...prev,
      { pointNo: prev.length + 1, startDistance: '', waterDepth: '', velocity: '', isMissing: false },
    ])
  }, [])

  const removeRow = useCallback((idx: number) => {
    setVpRows((prev) => prev.filter((_, i) => i !== idx).map((r, i) => ({ ...r, pointNo: i + 1 })))
  }, [])

  const updateRow = useCallback((idx: number, field: keyof VpRow, value: string | boolean) => {
    setVpRows((prev) => prev.map((r, i) => (i === idx ? { ...r, [field]: value } : r)))
  }, [])

  const buildPayload = () => ({
    sectionId,
    measureDate,
    weather,
    method,
    velocityPoints: vpRows.map((r) => ({
      pointNo: r.pointNo,
      startDistance: parseFloat(r.startDistance) || 0,
      waterDepth: parseFloat(r.waterDepth) || 0,
      velocity: r.velocity ? parseFloat(r.velocity) : null,
      isMissing: r.isMissing,
    })),
    waterLevel: {
      startLevel: parseFloat(startLevel) || 0,
      endLevel: parseFloat(endLevel) || 0,
      avgLevel: parseFloat(avgLevel) || 0,
      changeRate: parseFloat(changeRate) || 0,
    },
  })

  const doSave = async () => {
    setActionLoading(true)
    setSubmitError('')
    try {
      const payload = buildPayload()
      if (isEditMode && id) {
        await updateMeasurement(id, payload)
      } else {
        await createMeasurement(payload)
      }
      navigate('/')
    } catch (e) {
      setSubmitError((e as Error).message)
    } finally {
      setActionLoading(false)
      setShowConfirm(false)
    }
  }

  const doSubmit = async () => {
    if (!canSubmit) {
      setSubmitError('流速点位存在缺测，无法提交')
      return
    }
    setActionLoading(true)
    setSubmitError('')
    try {
      const payload = buildPayload()
      let measurementId = id || ''

      if (isEditMode && id) {
        await updateMeasurement(id, payload)
      } else {
        const created = await createMeasurement(payload)
        measurementId = created.id
      }

      await submitMeasurement(measurementId)
      navigate(`/measure/${measurementId}`)
    } catch (e) {
      setSubmitError((e as Error).message)
    } finally {
      setActionLoading(false)
      setShowConfirm(false)
    }
  }

  const handleSaveClick = () => {
    setConfirmType('save')
    setShowConfirm(true)
  }

  const handleSubmitClick = () => {
    if (hasMissing) {
      setSubmitError('流速点位存在缺测，无法提交')
      return
    }
    if (!sectionId || !measureDate) {
      setSubmitError('请填写断面和施测日期')
      return
    }
    setConfirmType('submit')
    setShowConfirm(true)
  }

  if (loading && isEditMode && !currentMeasurement) {
    return <div className="flex justify-center py-20"><div className="spinner" /></div>
  }

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      {hasMissing && (
        <div className="bg-danger-50 border border-danger-200 rounded-lg p-4 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-danger shrink-0" />
          <span className="text-danger-700 text-sm font-medium">存在缺测点位，无法提交</span>
        </div>
      )}
      {rateWarning && !hasMissing && (
        <div className="bg-warning-50 border border-warning-200 rounded-lg p-4 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-warning shrink-0" />
          <span className="text-warning-700 text-sm font-medium">水位变化率 {changeRate}m/h 超过阈值，建议复测后再提交</span>
        </div>
      )}

      <div className="card">
        <h3 className="text-base font-semibold text-slate-800 mb-4">基本信息</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-slate-600 mb-1">断面 <span className="text-danger">*</span></label>
            <select className="input-field" value={sectionId} onChange={(e) => setSectionId(e.target.value)}>
              <option value="">请选择断面</option>
              {sections.map((s) => (
                <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm text-slate-600 mb-1">施测日期 <span className="text-danger">*</span></label>
            <input type="date" className="input-field" value={measureDate} onChange={(e) => setMeasureDate(e.target.value)} />
          </div>
          <div>
            <label className="block text-sm text-slate-600 mb-1">天气</label>
            <input className="input-field" placeholder="如：晴、多云" value={weather} onChange={(e) => setWeather(e.target.value)} />
          </div>
          <div>
            <label className="block text-sm text-slate-600 mb-1">测法 <span className="text-danger">*</span></label>
            <select className="input-field" value={method} onChange={(e) => setMethod(e.target.value as 'point_integration' | 'depth_integration')}>
              <option value="point_integration">积点法</option>
              <option value="depth_integration">积深法</option>
            </select>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold text-slate-800">流速测点</h3>
          <button onClick={addRow} className="btn-secondary text-sm flex items-center gap-1 py-1.5 px-3">
            <Plus className="w-4 h-4" /> 添加测点
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="text-left py-2 px-2 text-slate-500 font-medium">点号</th>
                <th className="text-left py-2 px-2 text-slate-500 font-medium">起点距(m)</th>
                <th className="text-left py-2 px-2 text-slate-500 font-medium">水深(m)</th>
                <th className="text-left py-2 px-2 text-slate-500 font-medium">流速(m/s)</th>
                <th className="text-left py-2 px-2 text-slate-500 font-medium">缺测</th>
                <th className="py-2 px-2"></th>
              </tr>
            </thead>
            <tbody>
              {vpRows.map((row, idx) => (
                <tr key={idx} className={`border-b border-slate-100 ${row.isMissing ? 'bg-danger-50' : ''}`}>
                  <td className="py-2 px-2 text-slate-600">{row.pointNo}</td>
                  <td className="py-2 px-2">
                    <input className="input-field py-1" value={row.startDistance} onChange={(e) => updateRow(idx, 'startDistance', e.target.value)} />
                  </td>
                  <td className="py-2 px-2">
                    <input className="input-field py-1" value={row.waterDepth} onChange={(e) => updateRow(idx, 'waterDepth', e.target.value)} />
                  </td>
                  <td className="py-2 px-2">
                    <div className="flex items-center gap-1.5">
                      <input className="input-field py-1" value={row.velocity} onChange={(e) => updateRow(idx, 'velocity', e.target.value)} disabled={row.isMissing} />
                      {row.isMissing && <AlertTriangle className="w-4 h-4 text-danger shrink-0" />}
                    </div>
                  </td>
                  <td className="py-2 px-2">
                    <input type="checkbox" checked={row.isMissing} onChange={(e) => updateRow(idx, 'isMissing', e.target.checked)} className="w-4 h-4 accent-danger rounded" />
                  </td>
                  <td className="py-2 px-2">
                    {vpRows.length > 1 && (
                      <button onClick={() => removeRow(idx)} className="text-slate-400 hover:text-danger"><Trash2 className="w-4 h-4" /></button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card">
        <h3 className="text-base font-semibold text-slate-800 mb-4">水位信息</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-slate-600 mb-1">始水位(m)</label>
            <input type="number" step="0.001" className="input-field" value={startLevel} onChange={(e) => setStartLevel(e.target.value)} />
          </div>
          <div>
            <label className="block text-sm text-slate-600 mb-1">终水位(m)</label>
            <input type="number" step="0.001" className="input-field" value={endLevel} onChange={(e) => setEndLevel(e.target.value)} />
          </div>
          <div>
            <label className="block text-sm text-slate-600 mb-1">平均水位(m)</label>
            <input type="text" className="input-field bg-slate-50" value={avgLevel} readOnly />
          </div>
          <div>
            <label className="block text-sm text-slate-600 mb-1">变化率(m/h)</label>
            <input type="text" className={`input-field bg-slate-50 ${rateWarning ? 'text-warning font-semibold' : ''}`} value={changeRate} readOnly />
          </div>
        </div>
      </div>

      {submitError && (
        <div className="bg-danger-50 border border-danger-200 rounded-lg p-3 text-sm text-danger-700">{submitError}</div>
      )}

      <div className="flex justify-end gap-3 pb-6">
        <button onClick={() => navigate('/')} className="btn-secondary">取消</button>
        <button onClick={handleSaveClick} disabled={actionLoading} className="btn-secondary flex items-center gap-1.5">
          <Save className="w-4 h-4" /> {actionLoading ? '保存中...' : '保存草稿'}
        </button>
        <button
          onClick={handleSubmitClick}
          disabled={!canSubmit || actionLoading}
          className="btn-primary flex items-center gap-1.5"
        >
          <Send className="w-4 h-4" /> {actionLoading ? '提交中...' : '提交复核'}
        </button>
      </div>

      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/30" onClick={() => setShowConfirm(false)} />
          <div className="relative bg-white rounded-lg shadow-xl w-[460px] p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-slate-800">
                {confirmType === 'save' ? '确认保存草稿' : '确认提交复核'}
              </h3>
              <button onClick={() => setShowConfirm(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            {confirmType === 'submit' && rateWarning && (
              <div className="bg-warning-50 border border-warning-200 rounded-lg p-3 mb-4 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-warning shrink-0 mt-0.5" />
                <span className="text-warning-700 text-sm">
                  水位变化率 {changeRate}m/h 超过 0.5m/h 阈值，提交后将被标记需要复测。是否继续提交？
                </span>
              </div>
            )}
            <p className="text-sm text-slate-600 mb-5">
              {confirmType === 'save'
                ? '保存为草稿后可继续编辑。确认保存？'
                : hasMissing
                  ? '存在缺测点位，无法提交。'
                  : '提交后将进入复核流程，数据不可随意修改。确认提交？'}
            </p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setShowConfirm(false)} className="btn-secondary">取消</button>
              {confirmType === 'save' && (
                <button onClick={doSave} disabled={actionLoading} className="btn-secondary flex items-center gap-1.5">
                  <Save className="w-4 h-4" /> {actionLoading ? '保存中...' : '确认保存'}
                </button>
              )}
              {confirmType === 'submit' && (
                <button
                  onClick={doSubmit}
                  disabled={!canSubmit || actionLoading}
                  className="btn-primary flex items-center gap-1.5"
                >
                  <Send className="w-4 h-4" /> {actionLoading ? '提交中...' : '确认提交'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
