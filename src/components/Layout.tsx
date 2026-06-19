import { NavLink, Outlet, useLocation } from 'react-router-dom'
import {
  LayoutDashboard,
  Droplets,
  CheckCircle,
  RotateCcw,
  Send,
  Waves,
} from 'lucide-react'
import { useStore } from '@/store'

const NAV_ITEMS = [
  { to: '/', icon: LayoutDashboard, label: '仪表盘' },
  { to: '/measure/new', icon: Droplets, label: '测次录入' },
  { to: '/review', icon: CheckCircle, label: '测次复核' },
  { to: '/remeasure', icon: RotateCcw, label: '复测管理' },
  { to: '/publish', icon: Send, label: '水情发布' },
]

const ROLE_OPTIONS = [
  { value: 'station' as const, label: '测站人员' },
  { value: 'reviewer' as const, label: '复核员' },
  { value: 'duty' as const, label: '水情值班' },
]

const PAGE_TITLES: Record<string, string> = {
  '/': '仪表盘',
  '/measure/new': '测次录入',
  '/review': '测次复核',
  '/remeasure': '复测管理',
  '/publish': '水情发布',
}

function getPageTitle(pathname: string): string {
  if (pathname.startsWith('/measure/edit/')) return '测次编辑'
  if (pathname.startsWith('/measure/') && pathname !== '/measure/new') return '测次详情'
  if (pathname.startsWith('/remeasure/')) return '复测录入'
  return PAGE_TITLES[pathname] || '水文流量测验审核系统'
}

export default function Layout() {
  const { role, setRole } = useStore()
  const location = useLocation()
  const pageTitle = getPageTitle(location.pathname)

  return (
    <div className="flex h-screen overflow-hidden">
      <aside className="w-60 bg-primary flex flex-col shrink-0">
        <div className="px-5 py-5 flex items-center gap-2.5 border-b border-white/10">
          <Waves className="w-7 h-7 text-secondary" />
          <span className="text-white font-bold text-base tracking-wide">水文流量测验</span>
        </div>

        <div className="px-4 py-4 space-y-1.5">
          <p className="text-xs text-primary-200 mb-2 px-1">当前角色</p>
          {ROLE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setRole(opt.value)}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                role === opt.value
                  ? 'bg-secondary text-white font-medium'
                  : 'text-primary-100 hover:bg-white/10'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <nav className="flex-1 px-3 py-2 space-y-0.5">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                  isActive
                    ? 'bg-secondary/20 text-secondary font-medium'
                    : 'text-primary-100 hover:bg-white/10'
                }`
              }
            >
              <item.icon className="w-[18px] h-[18px]" />
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="px-4 py-4 border-t border-white/10">
          <p className="text-xs text-primary-300">水文流量测验审核系统 v1.0</p>
        </div>
      </aside>

      <div className="flex-1 flex flex-col overflow-hidden bg-slate-50">
        <header className="h-14 bg-white border-b border-slate-200 flex items-center justify-between px-6 shrink-0">
          <h1 className="text-lg font-semibold text-slate-800">{pageTitle}</h1>
          <span className="badge-submitted text-xs">
            {ROLE_OPTIONS.find((r) => r.value === role)?.label}
          </span>
        </header>
        <main className="flex-1 overflow-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
