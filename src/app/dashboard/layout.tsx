import Navbar from '@/components/Navbar'
import PlanGuard from '@/components/PlanGuard'
import InactivityLogout from '@/components/InactivityLogout'
import PermissionsModal from '@/components/PermissionsModal'
import ScreenshotGuard from '@/components/ScreenshotGuard'
import GpsUpdater from '@/components/GpsUpdater'
import './dashboard.css'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="dashboard-root" style={{ background: '#1C192C' }}>
      <PlanGuard />
      <InactivityLogout />
      <PermissionsModal />
      <GpsUpdater />
      <ScreenshotGuard />
      <div className="lg:flex lg:h-screen lg:overflow-hidden">
        <Navbar />
        <main className="flex-1 min-w-0 relative z-10 lg:overflow-y-auto lg:h-full pb-20 lg:pb-0">
          {children}
        </main>
      </div>
    </div>
  )
}
