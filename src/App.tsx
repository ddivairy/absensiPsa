import React, { useState, useEffect } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Sidebar } from './components/Sidebar';
import { RoleSwitcherModal } from './components/RoleSwitcherModal';
import { AdminDashboard } from './components/Dashboard/AdminDashboard';
import { MentorDashboard } from './components/Dashboard/MentorDashboard';
import { TraineeDashboard } from './components/Dashboard/TraineeDashboard';
import { MonthlyRecapView } from './components/Recap/MonthlyRecapView';
import { LeaveManagementView } from './components/Leave/LeaveManagementView';
import { TraineeManagementView } from './components/Trainee/TraineeManagementView';
import { SettingsView } from './components/Settings/SettingsView';
import { LoginView } from './components/Auth/LoginView';
import { MissionManagementView } from './components/Missions/MissionManagementView';
import { HallOfFameView } from './components/HallOfFame/HallOfFameView';
import { DailyReportView } from './components/DailyReport/DailyReportView';
import {
  Menu,
  Clock,
  LayoutDashboard,
  CalendarCheck,
  FileText,
  UserRound,
  FileSpreadsheet,
  ChevronDown
} from 'lucide-react';
import { INDONESIAN_DAYS, INDONESIAN_MONTHS } from './utils/dateUtils';

const MainLayout: React.FC = () => {
  const { currentUser, kejuruanList, activeTab, setActiveTab, isAuthenticated } = useApp();

  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [liveClock, setLiveClock] = useState('00.00.00');
  const [headerDate, setHeaderDate] = useState('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const pad = (n: number) => String(n).padStart(2, '0');
      setLiveClock(`${pad(now.getHours())}.${pad(now.getMinutes())}.${pad(now.getSeconds())}`);

      const dayName = INDONESIAN_DAYS[now.getDay()];
      const day = now.getDate();
      const monthName = INDONESIAN_MONTHS[now.getMonth()];
      const year = now.getFullYear();
      setHeaderDate(`${dayName}, ${day} ${monthName} ${year}`);
    };

    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  if (!isAuthenticated) {
    return <LoginView />;
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        if (currentUser.role === 'admin') {
          return <AdminDashboard />;
        } else if (currentUser.role === 'mentor') {
          return <MentorDashboard />;
        } else {
          return <TraineeDashboard />;
        }

      case 'verifikasi-mentor':
        return <AdminDashboard />;

      case 'presensi':
        if (currentUser.role === 'mentor') {
          return <MentorDashboard />;
        }
        return <TraineeDashboard />;

      case 'misi':
        return <MissionManagementView />;

      case 'laporan-harian':
        return <DailyReportView />;

      case 'hall-of-fame':
        return <HallOfFameView />;

      case 'rekap':
        return <MonthlyRecapView />;

      case 'izin':
        return <LeaveManagementView />;

      case 'peserta':
        return <TraineeManagementView />;

      case 'pengaturan':
        return <SettingsView />;

      default:
        return <AdminDashboard />;
    }
  };

  const roleBadgeLabel =
    currentUser.role === 'admin'
      ? 'Admin demo'
      : currentUser.role === 'mentor'
      ? 'Mentor'
      : 'Peserta';

  const activeKejuruan = currentUser.kejuruanId
    ? kejuruanList.find(k => k.id === currentUser.kejuruanId)
    : undefined;
  const headerClassName = activeKejuruan?.name || currentUser.kejuruanName || 'Pusat Pelatihan';
  const headerMentorName = activeKejuruan?.mentorName || 'Tim Punya Skill';

  return (
    <div className="min-h-screen bg-[#F4F6F8] text-[#123B59] flex flex-col font-sans">
      {/* Sidebar Navigation (Fixed on desktop, drawer on mobile) */}
      <Sidebar
        onOpenRoleModal={() => setIsRoleModalOpen(true)}
        mobileOpen={mobileSidebarOpen}
        onCloseMobile={() => setMobileSidebarOpen(false)}
      />

      {/* Main Workspace Area (padded on left for fixed sidebar) */}
      <div className="flex-1 w-full lg:pl-[280px] p-4 sm:p-5 lg:p-6 pb-24 lg:pb-8 flex flex-col">
        {/* Top Header */}
        <header className="mb-6 flex flex-col gap-4 border-b border-[#E4EAF0] pb-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex items-start justify-between gap-4">
            {/* Mobile Brand with Hamburger */}
            <div className="lg:hidden flex items-center gap-2.5">
              <button
                onClick={() => setMobileSidebarOpen(true)}
                className="p-2 rounded-xl bg-white border border-[#E4EAF0] text-[#123B59] hover:bg-[#F8FAFB] transition cursor-pointer"
                aria-label="Buka Menu Navigasi"
              >
                <Menu className="w-5 h-5" />
              </button>
              <div className="flex items-center gap-2">
                <svg className="h-8 w-7" viewBox="0 0 50 58" aria-hidden="true">
                  <path d="M4 3h42v32c0 10-9 16-21 21C13 51 4 45 4 35V3Z" fill="#123B59" />
                  <path d="M16 15c4-3 7 1 9 3 2-2 5-6 9-3v8c-3-2-6-2-9 0-3-2-6-2-9 0v-8Z" fill="#fff" />
                </svg>
                <span className="font-bold tracking-tight text-[#123B59]">
                  PSA <span className="font-medium text-[#4C83B5]">Punya Skill Akademi</span>
                </span>
              </div>
            </div>

            {/* Global Title and Context */}
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-[.14em] text-[#4C83B5]">
                Presensi Magang Harian
              </p>
              <h1 className="mt-1 text-2xl font-bold tracking-tight text-[#123B59] lg:text-3xl">
                Selamat datang, {currentUser.name}
              </h1>
              <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-[#6F7F8D]">
                <span>{headerDate}</span>
                <span className="hidden text-[#C8D6E2] sm:inline">&middot;</span>
                <span>Kelas: <strong className="text-[#123B59]">{headerClassName}</strong></span>
                <span className="hidden text-[#C8D6E2] sm:inline">&middot;</span>
                <span>Mentor: <strong className="text-[#123B59]">{headerMentorName}</strong></span>
                {activeKejuruan?.code && (
                  <>
                    <span className="hidden text-[#C8D6E2] sm:inline">&middot;</span>
                    <span>Kode: <strong className="text-[#123B59]">{activeKejuruan.code}</strong></span>
                  </>
                )}
              </div>
            </div>

            {/* Mobile Quick Role Button */}
            <button
              onClick={() => setIsRoleModalOpen(true)}
              className="lg:hidden rounded-xl border border-[#E4EAF0] bg-white px-2.5 py-1.5 text-xs font-bold text-[#123B59] shadow-xs"
            >
              {roleBadgeLabel}
            </button>
          </div>

          {/* Right Clock & Role Switcher Widget */}
          <div className="surface flex shrink-0 items-center gap-3 rounded-2xl px-3.5 py-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#EAF2F8] text-[#4C83B5]">
              <Clock className="h-4 w-4" />
            </span>
            <div className="pr-2">
              <p className="text-[9px] font-bold tracking-[.1em] text-[#6F7F8D]">
                WAKTU SAAT INI
              </p>
              <p className="text-base font-bold text-[#123B59] tabular-nums">
                {liveClock} WIB
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsRoleModalOpen(true)}
              className="flex items-center gap-1.5 rounded-xl border border-[#E4EAF0] bg-[#F4F6F8] hover:bg-[#EAF2F8] px-3 py-2 text-xs font-semibold text-[#123B59] transition cursor-pointer"
              title="Ganti peran pengguna"
            >
              <span>{roleBadgeLabel}</span>
              <ChevronDown className="w-3.5 h-3.5 text-[#6F7F8D]" />
            </button>
          </div>
        </header>

        {/* Page Content View */}
        <main className="flex-1 w-full">{renderContent()}</main>

        {/* Footer */}
        <footer className="mt-10 pt-4 border-t border-[#E4EAF0] text-xs text-[#6F7F8D] flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>Punya Skill Akademi &copy; 2026 Sistem Presensi Magang & Vokasi</span>
          <span>Verifikasi Bertingkat: Admin &rarr; Mentor &rarr; Peserta</span>
        </footer>
      </div>

      {/* Mobile Bottom Navigation Bar (from style.html) */}
      <nav
        className="lg:hidden fixed bottom-0 left-0 z-30 w-full border-t border-[#E4EAF0] bg-white/95 px-3 pb-3 pt-2 backdrop-blur-md"
        aria-label="Navigasi mobile"
      >
        <div className="grid grid-cols-4 gap-1 text-center">
          <button
            type="button"
            onClick={() =>
              setActiveTab(
                currentUser.role === 'admin'
                  ? 'verifikasi-mentor'
                  : currentUser.role === 'mentor'
                  ? 'presensi'
                  : 'dashboard'
              )
            }
            className={`mobile-nav-item flex flex-col items-center gap-1 rounded-xl py-1.5 text-[10px] font-bold transition cursor-pointer ${
              activeTab === 'dashboard' || activeTab === 'verifikasi-mentor' || activeTab === 'presensi'
                ? 'is-active text-[#4C83B5]'
                : 'text-[#6F7F8D]'
            }`}
          >
            <span className="mobile-icon rounded-xl p-1.5">
              <LayoutDashboard className="h-5 w-5" />
            </span>
            <span>Dashboard</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('laporan-harian')}
            className={`mobile-nav-item flex flex-col items-center gap-1 rounded-xl py-1.5 text-[10px] font-bold transition cursor-pointer ${
              activeTab === 'laporan-harian' ? 'is-active text-[#4C83B5]' : 'text-[#6F7F8D]'
            }`}
          >
            <span className="mobile-icon rounded-xl p-1.5">
              <FileText className="h-5 w-5" />
            </span>
            <span>Laporan</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('izin')}
            className={`mobile-nav-item flex flex-col items-center gap-1 rounded-xl py-1.5 text-[10px] font-bold transition cursor-pointer ${
              activeTab === 'izin' ? 'is-active text-[#4C83B5]' : 'text-[#6F7F8D]'
            }`}
          >
            <span className="mobile-icon rounded-xl p-1.5">
              <CalendarCheck className="h-5 w-5" />
            </span>
            <span>Izin</span>
          </button>

          <button
            type="button"
            onClick={() => setMobileSidebarOpen(true)}
            className={`mobile-nav-item flex flex-col items-center gap-1 rounded-xl py-1.5 text-[10px] font-bold transition cursor-pointer text-[#6F7F8D]`}
          >
            <span className="mobile-icon rounded-xl p-1.5">
              <UserRound className="h-5 w-5" />
            </span>
            <span>Menu & Profil</span>
          </button>
        </div>
      </nav>

      {/* Role Switcher Modal */}
      <RoleSwitcherModal
        isOpen={isRoleModalOpen}
        onClose={() => setIsRoleModalOpen(false)}
      />
    </div>
  );
};

export default function App() {
  return (
    <AppProvider>
      <MainLayout />
    </AppProvider>
  );
}
