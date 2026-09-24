import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import {
  LayoutDashboard,
  CalendarCheck,
  FileSpreadsheet,
  Users,
  FileText,
  Sliders,
  ChevronDown,
  ShieldCheck,
  GraduationCap,
  UserCheck,
  CheckCircle2,
  X,
  LogOut,
  Trophy,
  Target,
  MapPin,
  Clock,
  BookOpen
} from 'lucide-react';
import { INDONESIAN_DAYS, INDONESIAN_MONTHS, getTodayDateString } from '../utils/dateUtils';

interface SidebarProps {
  onOpenRoleModal: () => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  onOpenRoleModal,
  mobileOpen,
  onCloseMobile
}) => {
  const {
    currentUser,
    activeTab,
    setActiveTab,
    leaveRequests,
    attendanceRecords,
    missionSubmissions,
    dailyReports,
    logout
  } = useApp();
  const [currentTime, setCurrentTime] = useState<string>('');
  const [currentDateString, setCurrentDateString] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const hours = String(now.getHours()).padStart(2, '0');
      const minutes = String(now.getMinutes()).padStart(2, '0');
      const seconds = String(now.getSeconds()).padStart(2, '0');
      setCurrentTime(`${hours}.${minutes}.${seconds}`);

      const dayName = INDONESIAN_DAYS[now.getDay()];
      const day = now.getDate();
      const monthName = INDONESIAN_MONTHS[now.getMonth()];
      const year = now.getFullYear();
      setCurrentDateString(`${dayName}, ${day} ${monthName} ${year}`);
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const todayStr = getTodayDateString();

  // Pending counts
  const pendingLeavesCount = leaveRequests.filter(l => {
    if (currentUser.role === 'admin') return l.status === 'pending';
    if (currentUser.role === 'mentor') return l.status === 'pending' && l.kejuruanId === currentUser.kejuruanId;
    return false;
  }).length;

  const pendingMissionsCount = missionSubmissions.filter(s => {
    if (currentUser.role === 'admin') return s.status === 'pending';
    if (currentUser.role === 'mentor') return s.status === 'pending' && s.kejuruanId === currentUser.kejuruanId;
    return false;
  }).length;

  const pendingMentorVerifications = attendanceRecords.filter(r => {
    return r.date === todayStr && r.userRole === 'mentor' && r.verificationStatus === 'pending';
  }).length;

  const pendingTraineeVerifications = attendanceRecords.filter(r => {
    return (
      r.date === todayStr &&
      r.kejuruanId === currentUser.kejuruanId &&
      (r.userRole === 'trainee' || !r.userRole) &&
      r.verificationStatus === 'pending'
    );
  }).length;

  const pendingDailyReportsCount = dailyReports.filter(r => {
    if (currentUser.role === 'admin') return r.status === 'pending';
    if (currentUser.role === 'mentor') return r.status === 'pending' && r.kejuruanId === currentUser.kejuruanId;
    return false;
  }).length;

  const roleLabel =
    currentUser.role === 'admin'
      ? 'Administrator'
      : currentUser.role === 'mentor'
      ? 'Instruktur / Mentor'
      : 'Peserta Magang';

  const navItems = () => {
    if (currentUser.role === 'admin') {
      return [
        { id: 'verifikasi-mentor', label: 'Verifikasi Mentor', icon: CheckCircle2, badge: pendingMentorVerifications },
        { id: 'laporan-harian', label: 'Laporan Harian', icon: BookOpen, badge: pendingDailyReportsCount },
        { id: 'misi', label: 'Misi & Tugas Kejuruan', icon: Target, badge: pendingMissionsCount },
        { id: 'hall-of-fame', label: 'Hall of Fame', icon: Trophy },
        { id: 'rekap', label: 'Rekapitulasi Presensi', icon: FileSpreadsheet },
        { id: 'peserta', label: 'Peserta & Kejuruan', icon: Users },
        { id: 'izin', label: 'Izin & Sakit', icon: FileText, badge: pendingLeavesCount },
        { id: 'pengaturan', label: 'Pengaturan Sistem', icon: Sliders }
      ];
    } else if (currentUser.role === 'mentor') {
      return [
        { id: 'presensi', label: 'Verifikasi Peserta', icon: CalendarCheck, badge: pendingTraineeVerifications },
        { id: 'laporan-harian', label: 'Laporan Harian', icon: BookOpen, badge: pendingDailyReportsCount },
        { id: 'misi', label: 'Misi Kejuruan', icon: Target, badge: pendingMissionsCount },
        { id: 'hall-of-fame', label: 'Hall of Fame', icon: Trophy },
        { id: 'rekap', label: 'Rekap Bulanan', icon: FileSpreadsheet },
        { id: 'izin', label: 'Verifikasi Izin', icon: FileText, badge: pendingLeavesCount }
      ];
    } else {
      return [
        { id: 'dashboard', label: 'Dashboard Presensi', icon: LayoutDashboard },
        { id: 'laporan-harian', label: 'Laporan Harian', icon: BookOpen },
        { id: 'misi', label: 'Misi Kejuruan', icon: Target },
        { id: 'hall-of-fame', label: 'Hall of Fame', icon: Trophy },
        { id: 'rekap', label: 'Rekap Kehadiran', icon: FileSpreadsheet },
        { id: 'izin', label: 'Pengajuan Izin', icon: FileText }
      ];
    }
  };

  const handleNavClick = (tabId: string) => {
    setActiveTab(tabId);
    onCloseMobile();
  };

  const sidebarInner = (
    <div className="flex flex-col h-full bg-[#123B59] text-white p-5 select-none w-64 md:w-[260px] overflow-y-auto">
      {/* Brand Header */}
      <div className="flex items-center justify-between px-1">
        <button
          type="button"
          onClick={() =>
            handleNavClick(
              currentUser.role === 'admin'
                ? 'verifikasi-mentor'
                : currentUser.role === 'mentor'
                ? 'presensi'
                : 'dashboard'
            )
          }
          className="flex items-center gap-3 text-left hover:opacity-90 transition cursor-pointer group"
          title="Ke Halaman Utama"
        >
          {/* Logo Shield SVG from style.html */}
          <svg className="logo-shield" viewBox="0 0 50 58" aria-label="Emblem HadirKu Skill" role="img">
            <path d="M4 3h42v32c0 10-9 16-21 21C13 51 4 45 4 35V3Z" fill="#fff" />
            <path d="M6 5h38v29c0 9-8 14-19 19C14 48 6 43 6 34V5Z" fill="#0D2F47" />
            <path d="M10 29h30v5c-3 7-8 10-15 14-7-4-12-7-15-14v-5Z" fill="#fff" />
            <path d="M16 15c4-3 7 1 9 3 2-2 5-6 9-3v8c-3-2-6-2-9 0-3-2-6-2-9 0v-8Z" fill="#fff" />
            <path d="M15 38c3 0 4 4 6 4 2 0 2-7 4-7s2 7 4 7c2 0 3-4 6-4" fill="none" stroke="#0D2F47" strokeWidth="2" />
          </svg>
          <div>
            <div className="brand-punya text-white">hadir</div>
            <div className="brand-skill">
              SK<b>I</b>LL
            </div>
          </div>
        </button>

        {/* Close button for mobile drawer */}
        <button
          onClick={onCloseMobile}
          className="lg:hidden p-1.5 rounded-lg text-white/60 hover:text-white hover:bg-white/10 cursor-pointer"
          aria-label="Tutup Menu"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <p className="mt-4 px-1 text-[10px] font-bold tracking-[.16em] text-[#A9C7DE]">
        PRESENSI MAGANG HARIAN
      </p>

      {/* User Section / Card */}
      <section className="mt-4 rounded-2xl border border-white/10 bg-white/[.07] p-3.5">
        <div className="flex items-center gap-3">
          {currentUser.avatar ? (
            <img
              src={currentUser.avatar}
              alt={currentUser.name}
              className="h-10 w-10 rounded-xl object-cover shrink-0 border border-white/20"
            />
          ) : (
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#4C83B5] font-bold text-white shrink-0">
              {currentUser.name.charAt(0).toUpperCase()}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold text-white">{currentUser.name}</p>
            <p className="truncate text-xs text-white/55">
              {currentUser.kejuruanName || (currentUser.role === 'admin' ? 'Pusat Pelatihan' : 'Kejuruan Vokasi')}
            </p>
          </div>
        </div>

        <div className="mt-3 flex items-center justify-between border-t border-white/10 pt-3">
          <span className="text-[9px] font-bold tracking-[.13em] text-[#A9C7DE]">PERAN AKTIF</span>
          <button
            type="button"
            onClick={() => {
              onOpenRoleModal();
              onCloseMobile();
            }}
            className="flex items-center gap-1 rounded-full bg-white/10 hover:bg-white/20 px-2 py-0.5 text-[10px] font-bold text-white transition cursor-pointer"
            title="Klik untuk beralih peran demo"
          >
            <span>{roleLabel}</span>
            <ChevronDown className="w-3 h-3 text-white/60" />
          </button>
        </div>
      </section>

      {/* Navigation Menu */}
      <nav className="mt-5 space-y-1.5 flex-1" aria-label="Menu dashboard">
        {navItems().map(item => {
          const isActive =
            activeTab === item.id ||
            (currentUser.role === 'mentor' && item.id === 'presensi' && activeTab === 'dashboard') ||
            (currentUser.role === 'admin' && item.id === 'verifikasi-mentor' && activeTab === 'dashboard');
          const Icon = item.icon;

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => handleNavClick(item.id)}
              className={`side-nav-item w-full flex items-center justify-between px-3.5 py-3 rounded-xl text-left text-sm font-semibold transition cursor-pointer ${
                isActive ? 'is-active' : ''
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <Icon className={`side-icon h-4 w-4 shrink-0 ${isActive ? 'text-[#A9C7DE]' : ''}`} />
                <span className="truncate">{item.label}</span>
              </div>

              {item.badge !== undefined && item.badge > 0 && (
                <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-[#D95B83] text-white shrink-0">
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Tip Banner from style.html */}
      <div className="mt-4 rounded-xl border border-white/10 bg-[#0D2F47] p-3.5">
        <div className="flex gap-2.5">
          <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[#A9C7DE]" />
          <div>
            <p className="text-xs font-bold text-white">Presensi lebih mudah</p>
            <p className="mt-1 text-[11px] leading-relaxed text-[#A9C7DE]">
              Pastikan lokasi aktif sebelum melakukan check-in atau check-out.
            </p>
          </div>
        </div>
      </div>

      {/* Logout / Switch Role Footer */}
      <div className="mt-3 pt-3 border-t border-white/10 flex items-center justify-between text-xs text-white/60">
        {currentUser.loginCode && (
          <span className="font-mono text-[10px]">
            Kode: <strong className="text-white">{currentUser.loginCode}</strong>
          </span>
        )}
        <button
          type="button"
          onClick={() => {
            logout();
            onCloseMobile();
          }}
          className="inline-flex items-center gap-1.5 text-white/70 hover:text-[#D95B83] transition cursor-pointer ml-auto text-xs font-medium"
          title="Keluar dari mode preview"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Keluar</span>
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Fixed Sidebar (Matching style.html .desktop-sidebar) */}
      <aside
        className="hidden lg:flex fixed left-5 top-5 bottom-5 w-[252px] bg-[#123B59] rounded-[20px] shadow-[0_18px_42px_rgba(13,47,71,0.17)] z-30 overflow-hidden"
        aria-label="Navigasi utama"
      >
        {sidebarInner}
      </aside>

      {/* Mobile Drawer Overlay */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-[#0D2F47]/60 backdrop-blur-xs transition-opacity"
            onClick={onCloseMobile}
          />
          <div className="relative z-10 h-full shadow-2xl">
            {sidebarInner}
          </div>
        </div>
      )}
    </>
  );
};
