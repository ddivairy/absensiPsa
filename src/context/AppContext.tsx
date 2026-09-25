import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  User,
  Kejuruan,
  AttendanceRecord,
  LeaveRequest,
  AttendanceSettings,
  AttendanceStatus,
  VerificationStatus,
  Mission,
  MissionSubmission,
  DailyReport,
  DailyReportStatus
} from '../types';
import {
  INITIAL_KEJURUAN,
  INITIAL_SETTINGS,
} from '../data/mockData';
import { getTodayDateString, getCurrentTimeWIB } from '../utils/dateUtils';
import { generate8DigitLoginCode, generateDefaultPassword } from '../utils/userExcelUtils';
import confetti from 'canvas-confetti';
import { api } from '../services/api';

interface AppContextType {
  currentUser: User;
  users: User[];
  kejuruanList: Kejuruan[];
  attendanceRecords: AttendanceRecord[];
  leaveRequests: LeaveRequest[];
  settings: AttendanceSettings;
  missions: Mission[];
  missionSubmissions: MissionSubmission[];
  activeTab: string;
  isAuthenticated: boolean;
  authReady: boolean;
  jwtToken: string | null;
  tidbStatus: 'connected' | 'connecting' | 'error' | 'offline';
  setActiveTab: (tab: string) => void;
  // Auth methods
  loginWithCode: (code: string, password?: string) => Promise<{ success: boolean; message: string; user?: User }>;
  loginWithAdmin: (identifier: string, password?: string) => Promise<{ success: boolean; message: string; user?: User }>;
  logout: () => void;
  // Clock in/out actions
  clockIn: (notes?: string, photoUrl?: string, coordinates?: { lat: number; lng: number }, workMode?: 'WFO' | 'WFH') => { success: boolean; message: string };
  clockOut: (notes?: string, coordinates?: { lat: number; lng: number }) => { success: boolean; message: string };
  getTodayRecordForUser: (userId: string) => AttendanceRecord | undefined;
  // Leave request actions
  submitLeaveRequest: (req: {
    type: 'izin' | 'sakit';
    startDate: string;
    endDate: string;
    reason: string;
    attachmentName?: string;
  }) => void;
  reviewLeaveRequest: (
    id: string,
    status: 'approved' | 'rejected',
    reviewNotes?: string
  ) => void;
  // Missions & Points system
  addMission: (missionData: Omit<Mission, 'id' | 'createdAt'>) => void;
  updateMission: (id: string, updates: Partial<Mission>) => void;
  deleteMission: (id: string) => void;
  submitMissionWork: (submissionData: {
    missionId: string;
    submissionLink?: string;
    notes: string;
  }) => { success: boolean; message: string };
  reviewMissionSubmission: (
    submissionId: string,
    status: 'approved' | 'rejected',
    feedback?: string,
    awardedPoints?: number
  ) => void;
  getUserPoints: (userId: string) => number;
  // Daily Reports
  dailyReports: DailyReport[];
  submitDailyReport: (data: {
    date: string;
    description: string;
    photoUrl?: string;
    photoName?: string;
    submissionLink?: string;
  }) => { success: boolean; message: string };
  reviewDailyReport: (
    reportId: string,
    status: 'approved' | 'rejected',
    reviewNotes?: string
  ) => void;
  // Attendance management & hierarchical verification
  verifyAttendance: (recordId: string, status: 'verified' | 'rejected', reason?: string) => void;
  markAttendanceStatus: (
    recordId: string,
    newStatus: AttendanceStatus,
    newVerification?: VerificationStatus
  ) => void;
  manualAddOrUpdateAttendance: (
    userId: string,
    date: string,
    status: AttendanceStatus,
    checkInTime?: string,
    notes?: string
  ) => void;
  // User & Kejuruan management
  addUser: (userData: Omit<User, 'id'>) => Promise<{ success: boolean; message: string; user?: User }>;
  updateUser: (id: string, updates: Partial<User>) => Promise<{ success: boolean; message: string }>;
  deleteUser: (id: string) => Promise<{ success: boolean; message: string }>;
  deleteUsersByRole: (role: 'trainee' | 'mentor' | 'all') => Promise<{ success: boolean; count: number; message: string }>;
  importUsers: (importedUsers: Partial<User>[]) => Promise<{ success: boolean; count: number; message: string }>;
  regenerateUserCredentials: (userId: string) => Promise<{ loginCode: string; password: string; success: boolean; message?: string }>;
  addKejuruan: (kjData: Omit<Kejuruan, 'id'>) => void;
  updateKejuruan: (id: string, updates: Partial<Kejuruan>) => void;
  updateSettings: (newSettings: Partial<AttendanceSettings>) => void;
  resetToDefaultData: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string>('');

  // Marker for a session restored from the server cookie or the tab-scoped bearer fallback.
  const [jwtToken, setJwtToken] = useState<string | null>(null);
  const [tidbStatus, setTidbStatus] = useState<'connected' | 'connecting' | 'error' | 'offline'>('connecting');

  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authReady, setAuthReady] = useState(false);
  const [appDataReady, setAppDataReady] = useState(false);

  // Verify JWT session and check TiDB health on startup
  useEffect(() => {
    let isMounted = true;
    const initAuthSession = async () => {
      try {
        const health = await api.checkHealth();
        if (isMounted) {
          if (health?.database?.includes('TiDB')) {
            setTidbStatus('connected');
          } else {
            setTidbStatus('connected');
          }
        }
      } catch (e) {
        if (isMounted) setTidbStatus('offline');
      }

      try {
          const res = await api.getMe();
          if (isMounted && res.success && res.user) {
            setJwtToken('cookie-session');
            setUsers([res.user]);
            setCurrentUserId(res.user.id);
            setIsAuthenticated(true);
            if (res.user.role === 'admin' || res.user.role === 'mentor') {
              try {
                const usersRes = await api.getUsers();
                if (isMounted && usersRes.success && usersRes.users && usersRes.users.length > 0) {
                  setUsers(usersRes.users);
                }
              } catch (e) {
                console.warn('Could not fetch users list from TiDB:', e);
              }
            } else {
              setUsers(prev => {
                const idx = prev.findIndex(u => u.id === res.user!.id);
                if (idx >= 0) {
                  const next = [...prev];
                  next[idx] = { ...next[idx], ...res.user! };
                  return next;
                }
                return [res.user!, ...prev];
              });
            }
          } else if (isMounted) {
            setJwtToken(null);
            setIsAuthenticated(false);
          }
        } catch {
          if (isMounted) {
            setJwtToken(null);
            setIsAuthenticated(false);
          }
        } finally {
          if (isMounted) setAuthReady(true);
        }
    };

    initAuthSession();
    return () => {
      isMounted = false;
    };
  }, []);

  const [kejuruanList, setKejuruanList] = useState<Kejuruan[]>(() => {
    return INITIAL_KEJURUAN;
  });

  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);

  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);

  const [settings, setSettings] = useState<AttendanceSettings>(() => {
    const saved = typeof window !== 'undefined' ? localStorage.getItem('hadirku_settings_v2') : null;
    if (!saved) return INITIAL_SETTINGS;

    try {
      const parsed = JSON.parse(saved) as AttendanceSettings;
      const legacyJakartaPin = parsed.officeLocation?.lat === -6.2088 && parsed.officeLocation?.lng === 106.8456;
      return {
        ...INITIAL_SETTINGS,
        ...parsed,
        officeLocation: {
          ...INITIAL_SETTINGS.officeLocation,
          ...parsed.officeLocation,
          ...(legacyJakartaPin ? {
            lat: INITIAL_SETTINGS.officeLocation.lat,
            lng: INITIAL_SETTINGS.officeLocation.lng
          } : {})
        }
      };
    } catch {
      return INITIAL_SETTINGS;
    }
  });

  const [missions, setMissions] = useState<Mission[]>([]);

  const [missionSubmissions, setMissionSubmissions] = useState<MissionSubmission[]>([]);

  const [dailyReports, setDailyReports] = useState<DailyReport[]>([]);

  const [activeTab, setActiveTab] = useState<string>('dashboard');

  // Current active user object
  const currentUser = users.find(u => u.id === currentUserId) || ({} as User);

  useEffect(() => {
    if (!isAuthenticated || !jwtToken || !currentUser.id || !currentUser.role) {
      setAppDataReady(false);
      return;
    }
    let active = true;
    setAppDataReady(false);
    api.getAppData().then(data => {
      if (!active) return;
      setKejuruanList(data.kejuruanList.length ? data.kejuruanList : INITIAL_KEJURUAN);
      setAttendanceRecords(data.attendanceRecords);
      setLeaveRequests(data.leaveRequests);
      setMissions(data.missions);
      setMissionSubmissions(data.missionSubmissions);
      setDailyReports(data.dailyReports);
      if (data.settings) setSettings(data.settings);
      setTidbStatus('connected');
      setAppDataReady(true);
    }).catch(error => {
      if (!active) return;
      console.error('[TiDB] Gagal memuat data project:', error);
      setTidbStatus('offline');
      setAppDataReady(false);
    });
    return () => { active = false; };
  }, [isAuthenticated, jwtToken, currentUserId, currentUser.id, currentUser.role]);

  useEffect(() => {
    if (!appDataReady || !isAuthenticated || !jwtToken) return;
    const timer = window.setTimeout(async () => {
      const isAdmin = currentUser.role === 'admin';
      const isTrainee = currentUser.role === 'trainee';
      try {
        await api.saveAppData({
          kejuruanList: isAdmin ? kejuruanList : [],
          attendanceRecords,
          leaveRequests,
          settings: isAdmin ? settings : null,
          missions: isTrainee ? [] : missions,
          missionSubmissions,
          dailyReports,
        });
        setTidbStatus('connected');
      } catch (error) {
        console.error('[TiDB] Gagal menyimpan data project:', error);
        setTidbStatus('offline');
      }
    }, 350);
    return () => window.clearTimeout(timer);
  }, [appDataReady, isAuthenticated, jwtToken, currentUser.role, kejuruanList, attendanceRecords, leaveRequests, settings, missions, missionSubmissions, dailyReports]);


  const loginWithCode = async (
    code: string,
    pass?: string
  ): Promise<{ success: boolean; message: string; user?: User }> => {
    const cleanedCode = code.replace(/\s+/g, '').trim();
    try {
      const res = await api.login({ code: cleanedCode, password: pass });
      if (res.success && res.user) {
        setJwtToken('cookie-session');
        setTidbStatus('connected');
        setUsers(prev => {
          const idx = prev.findIndex(u => u.id === res.user!.id);
          if (idx >= 0) {
            const next = [...prev];
            next[idx] = { ...next[idx], ...res.user! };
            return next;
          }
          return [res.user!, ...prev];
        });
        setCurrentUserId(res.user.id);
        setIsAuthenticated(true);
        setActiveTab('dashboard');
        return { success: true, message: res.message, user: res.user };
      }
    } catch (err: any) {
      return { success: false, message: err.message || 'Tidak dapat terhubung ke server TiDB.' };
    }
    return { success: false, message: 'Login gagal.' };
  };

  const loginWithAdmin = async (
    identifier: string,
    pass?: string
  ): Promise<{ success: boolean; message: string; user?: User }> => {
    const cleanId = identifier.replace(/\s+/g, '').trim();
    if (!/^\d{8}$/.test(cleanId)) {
      return { success: false, message: 'Administrator harus masuk menggunakan kode login 8 digit.' };
    }
    return loginWithCode(cleanId, pass);
  };

  const logout = () => {
    void api.logoutSession().catch(err => console.warn('Gagal mengakhiri sesi server:', err));
    setJwtToken(null);
    setIsAuthenticated(false);
    setCurrentUserId('');
    setUsers([]);
    setAppDataReady(false);
  };

  const getTodayRecordForUser = (userId: string): AttendanceRecord | undefined => {
    const today = getTodayDateString();
    return attendanceRecords.find(r => r.userId === userId && r.date === today);
  };

  // Clock In
  const clockIn = (notes?: string, photoUrl?: string, coordinates?: { lat: number; lng: number }, workMode: 'WFO' | 'WFH' = 'WFO'): { success: boolean; message: string } => {
    const today = getTodayDateString();
    const existing = getTodayRecordForUser(currentUser.id);

    if (existing && existing.checkInTime) {
      return { success: false, message: 'Anda sudah melakukan Check-In untuk hari ini!' };
    }

    if (coordinates && workMode === 'WFO') {
      const toRadians = (degrees: number) => degrees * Math.PI / 180;
      const dLat = toRadians(coordinates.lat - settings.officeLocation.lat);
      const dLng = toRadians(coordinates.lng - settings.officeLocation.lng);
      const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRadians(settings.officeLocation.lat)) * Math.cos(toRadians(coordinates.lat)) * Math.sin(dLng / 2) ** 2;
      const distance = 6371000 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      if (distance > settings.officeLocation.radiusMeters) {
        return { success: false, message: `Lokasi Anda sekitar ${Math.round(distance)} m dari ${settings.officeLocation.name}. Presensi hanya dapat dilakukan dalam radius ${settings.officeLocation.radiusMeters} m.` };
      }
    }

    const currentTime = getCurrentTimeWIB();
    const isLate = currentTime > `${settings.lateLimitTime}:00`;
    const status: AttendanceStatus = isLate ? 'terlambat' : 'hadir';

    const isAdmin = currentUser.role === 'admin';
    const isMentor = currentUser.role === 'mentor';
    const isTrainee = currentUser.role === 'trainee';

    // Hierarchical verification status:
    // Trainee -> pending mentor verification
    // Mentor -> pending admin verification
    // Admin -> auto verified
    const verificationStatus: VerificationStatus = isAdmin ? 'verified' : 'pending';
    const verifiedBy = isAdmin ? 'Administrator' : undefined;
    const verifiedAt = isAdmin ? `${today} ${currentTime}` : undefined;

    const newRecord: AttendanceRecord = {
      id: `att-${currentUser.id}-${today}`,
      userId: currentUser.id,
      userName: currentUser.name,
      userNim: currentUser.nim,
      userRole: currentUser.role,
      kejuruanId: currentUser.kejuruanId || 'kj-1',
      kejuruanName: currentUser.kejuruanName || 'Umum',
      date: today,
      checkInTime: currentTime,
      status,
      verificationStatus,
      verifiedBy,
      verifiedAt,
      location: workMode === 'WFH' ? 'WFH · lokasi GPS peserta' : settings.officeLocation.name,
      workMode,
      coordinates: coordinates || {
        lat: settings.officeLocation.lat,
        lng: settings.officeLocation.lng
      },
      checkInCoordinates: coordinates,
      notes: notes || (isLate ? 'Terlambat check-in' : 'Hadir tepat waktu'),
      photoUrl: photoUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'
    };

    setAttendanceRecords(prev => {
      const filtered = prev.filter(r => !(r.userId === currentUser.id && r.date === today));
      return [newRecord, ...filtered];
    });

    try {
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.8 }
      });
    } catch {
      // Ignore
    }

    let msg = '';
    if (isTrainee) {
      msg = `Check-In Berhasil dicatat (${currentTime} WIB). Status: ${status === 'terlambat' ? 'Terlambat' : 'Tepat Waktu'}. Menunggu verifikasi kehadiran oleh Mentor Kejuruan Anda.`;
    } else if (isMentor) {
      msg = `Check-In Instruktur Berhasil dicatat (${currentTime} WIB). Status: ${status === 'terlambat' ? 'Terlambat' : 'Tepat Waktu'}. Menunggu verifikasi kehadiran oleh Administrator.`;
    } else {
      msg = `Check-In Berhasil dicatat pada ${currentTime} WIB.`;
    }

    return { success: true, message: msg };
  };

  // Clock Out
  const clockOut = (notes?: string, coordinates?: { lat: number; lng: number }, workMode?: 'WFO' | 'WFH'): { success: boolean; message: string } => {
    const today = getTodayDateString();
    const existing = getTodayRecordForUser(currentUser.id);

    if (!existing || !existing.checkInTime) {
      return { success: false, message: 'Anda belum melakukan Check-In hari ini.' };
    }

    if (existing.checkOutTime) {
      return { success: false, message: 'Anda sudah melakukan Check-Out sebelumnya.' };
    }

    if (coordinates && (workMode || existing.workMode || 'WFO') === 'WFO') {
      const toRadians = (degrees: number) => degrees * Math.PI / 180;
      const dLat = toRadians(coordinates.lat - settings.officeLocation.lat);
      const dLng = toRadians(coordinates.lng - settings.officeLocation.lng);
      const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRadians(settings.officeLocation.lat)) * Math.cos(toRadians(coordinates.lat)) * Math.sin(dLng / 2) ** 2;
      const distance = 6371000 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      if (distance > settings.officeLocation.radiusMeters) {
        return { success: false, message: `Lokasi Anda sekitar ${Math.round(distance)} m dari ${settings.officeLocation.name}. Presensi hanya dapat dilakukan dalam radius ${settings.officeLocation.radiusMeters} m.` };
      }
    }

    const currentTime = getCurrentTimeWIB();

    setAttendanceRecords(prev =>
      prev.map(r => {
        if (r.userId === currentUser.id && r.date === today) {
          return {
            ...r,
            checkOutTime: currentTime,
            coordinates: coordinates || r.coordinates,
            checkOutCoordinates: coordinates,
            notes: notes ? `${r.notes || ''} | Selesai: ${notes}` : r.notes
          };
        }
        return r;
      })
    );

    return {
      success: true,
      message: `Check-Out Berhasil dicatat pada ${currentTime} WIB. Sesi pelatihan hari ini selesai!`
    };
  };

  // Submit Leave Request
  const submitLeaveRequest = (req: {
    type: 'izin' | 'sakit';
    startDate: string;
    endDate: string;
    reason: string;
    attachmentName?: string;
  }) => {
    const start = new Date(req.startDate);
    const end = new Date(req.endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

    const newLeave: LeaveRequest = {
      id: `leave-${Date.now()}`,
      userId: currentUser.id,
      userName: currentUser.name,
      userNim: currentUser.nim,
      kejuruanId: currentUser.kejuruanId || 'kj-1',
      kejuruanName: currentUser.kejuruanName || 'Umum',
      type: req.type,
      startDate: req.startDate,
      endDate: req.endDate,
      daysCount: diffDays,
      reason: req.reason,
      attachmentName: req.attachmentName || (req.type === 'sakit' ? 'surat_keterangan_sakit.pdf' : 'surat_izin.pdf'),
      status: 'pending',
      submittedAt: `${getTodayDateString()} ${getCurrentTimeWIB()}`
    };

    setLeaveRequests(prev => [newLeave, ...prev]);
  };

  // Review Leave Request (Admin / Mentor)
  const reviewLeaveRequest = (
    id: string,
    status: 'approved' | 'rejected',
    reviewNotes?: string
  ) => {
    const targetLeave = leaveRequests.find(l => l.id === id);
    if (!targetLeave) return;

    setLeaveRequests(prev =>
      prev.map(l => {
        if (l.id === id) {
          return {
            ...l,
            status,
            reviewedBy: currentUser.name,
            reviewedAt: `${getTodayDateString()} ${getCurrentTimeWIB()}`,
            reviewNotes: reviewNotes || (status === 'approved' ? 'Pengajuan disetujui' : 'Pengajuan ditolak')
          };
        }
        return l;
      })
    );

    if (status === 'approved') {
      const start = new Date(targetLeave.startDate);
      const end = new Date(targetLeave.endDate);
      const curr = new Date(start);

      const recordsToAdd: AttendanceRecord[] = [];

      while (curr <= end) {
        const year = curr.getFullYear();
        const month = String(curr.getMonth() + 1).padStart(2, '0');
        const day = String(curr.getDate()).padStart(2, '0');
        const dateStr = `${year}-${month}-${day}`;

        const dayOfWeek = curr.getDay();
        if (dayOfWeek !== 0 && dayOfWeek !== 6) {
          recordsToAdd.push({
            id: `att-${targetLeave.userId}-${dateStr}`,
            userId: targetLeave.userId,
            userName: targetLeave.userName,
            userNim: targetLeave.userNim,
            kejuruanId: targetLeave.kejuruanId,
            kejuruanName: targetLeave.kejuruanName,
            date: dateStr,
            status: targetLeave.type,
            verificationStatus: 'verified',
            verifiedBy: `${currentUser.name} (${currentUser.role === 'admin' ? 'Admin' : 'Mentor'})`,
            verifiedAt: `${getTodayDateString()} ${getCurrentTimeWIB()}`,
            notes: `${targetLeave.type.toUpperCase()}: ${targetLeave.reason}`
          });
        }
        curr.setDate(curr.getDate() + 1);
      }

      setAttendanceRecords(prev => {
        const datesToReplace = recordsToAdd.map(r => `${r.userId}_${r.date}`);
        const filtered = prev.filter(r => !datesToReplace.includes(`${r.userId}_${r.date}`));
        return [...recordsToAdd, ...filtered];
      });
    }
  };

  // Verify Attendance (Hierarchical: Admin verifies Mentor, Mentor verifies Trainee)
  const verifyAttendance = (recordId: string, status: 'verified' | 'rejected', reason?: string) => {
    setAttendanceRecords(prev =>
      prev.map(r => {
        if (r.id === recordId) {
          return {
            ...r,
            verificationStatus: status,
            verifiedBy: `${currentUser.name} (${currentUser.role === 'admin' ? 'Admin' : 'Mentor'})`,
            verifiedAt: `${getTodayDateString()} ${getCurrentTimeWIB()}`,
            rejectionReason: reason
          };
        }
        return r;
      })
    );
  };

  // Mark / Change attendance status directly
  const markAttendanceStatus = (
    recordId: string,
    newStatus: AttendanceStatus,
    newVerification: VerificationStatus = 'verified'
  ) => {
    setAttendanceRecords(prev =>
      prev.map(r => {
        if (r.id === recordId) {
          return {
            ...r,
            status: newStatus,
            verificationStatus: newVerification,
            verifiedBy: `${currentUser.name} (${currentUser.role === 'admin' ? 'Admin' : 'Mentor'})`,
            verifiedAt: `${getTodayDateString()} ${getCurrentTimeWIB()}`,
            notes: r.notes || `Diverifikasi oleh ${currentUser.name}`
          };
        }
        return r;
      })
    );
  };

  const manualAddOrUpdateAttendance = (
    userId: string,
    date: string,
    status: AttendanceStatus,
    checkInTime?: string,
    notes?: string
  ) => {
    const targetUser = users.find(u => u.id === userId);
    if (!targetUser) return;

    setAttendanceRecords(prev => {
      const existingIdx = prev.findIndex(r => r.userId === userId && r.date === date);
      const updatedRecord: AttendanceRecord = {
        id: existingIdx >= 0 ? prev[existingIdx].id : `att-${userId}-${date}`,
        userId,
        userName: targetUser.name,
        userNim: targetUser.nim,
        userRole: targetUser.role,
        kejuruanId: targetUser.kejuruanId || 'kj-1',
        kejuruanName: targetUser.kejuruanName || 'Umum',
        date,
        checkInTime: checkInTime || (status === 'hadir' ? '08:00:00' : status === 'terlambat' ? '08:25:00' : undefined),
        status,
        verificationStatus: 'verified',
        verifiedBy: `${currentUser.name} (${currentUser.role === 'admin' ? 'Admin' : 'Mentor'})`,
        verifiedAt: `${getTodayDateString()} ${getCurrentTimeWIB()}`,
        notes: notes || `Diverifikasi manual oleh ${currentUser.name}`
      };

      if (existingIdx >= 0) {
        const copy = [...prev];
        copy[existingIdx] = updatedRecord;
        return copy;
      } else {
        return [updatedRecord, ...prev];
      }
    });
  };

  // User CRUD (Mentor created by Admin, Trainee created by Admin / Excel, Admin created in MySQL)
  const addUser = async (
    userData: Omit<User, 'id'>
  ): Promise<{ success: boolean; message: string; user?: User }> => {
    try {
      const res = await api.createUser(userData);
      if (res.success && res.user) {
        setUsers(prev => [res.user, ...prev]);
        return { success: true, message: res.message, user: res.user };
      }
    } catch (err: any) {
      console.warn('API createUser failed:', err.message);
      return { success: false, message: err.message || 'Tidak dapat menyimpan pengguna ke TiDB.' };
    }
    return { success: false, message: 'Tidak dapat menyimpan pengguna ke TiDB.' };
  };

  const updateUser = async (
    id: string,
    updates: Partial<User>
  ): Promise<{ success: boolean; message: string }> => {
    try {
      await api.updateUser(id, updates);
    } catch (err: any) {
      console.warn('API updateUser failed:', err);
      return { success: false, message: err.message || 'Tidak dapat memperbarui pengguna di TiDB.' };
    }
    setUsers(prev => prev.map(u => (u.id === id ? { ...u, ...updates } : u)));
    return { success: true, message: 'Data pengguna berhasil diperbarui.' };
  };

  const deleteUser = async (id: string): Promise<{ success: boolean; message: string }> => {
    try {
      const res = await api.deleteUser(id);
      setUsers(prev => prev.filter(u => u.id !== id));
      return { success: true, message: res.message || 'Pengguna berhasil dihapus dari TiDB.' };
    } catch (err: any) {
      console.warn('API deleteUser failed:', err);
      return { success: false, message: err.message || 'Tidak dapat menghapus pengguna dari TiDB.' };
    }
  };

  const deleteUsersByRole = async (
    role: 'trainee' | 'mentor' | 'all'
  ): Promise<{ success: boolean; count: number; message: string }> => {
    try {
      const res = await api.clearUsersByRole(role);
      setUsers(prev =>
        prev.filter(u => {
          if (u.role === 'admin') return true;
          if (role === 'all') return false;
          return u.role !== role;
        })
      );
      return res;
    } catch (err: any) {
      console.warn('API clearUsersByRole failed:', err);
      return { success: false, count: 0, message: err.message || 'Tidak dapat menghapus pengguna dari TiDB.' };
    }
  };

  const regenerateUserCredentials = async (
    userId: string
  ): Promise<{ loginCode: string; password: string; success: boolean; message?: string }> => {
    const newCode = generate8DigitLoginCode();
    const newPassword = generateDefaultPassword();
    try {
      await api.updateUser(userId, {
        nim: newCode,
        loginCode: newCode,
        email: `${newCode}@hadirku.id`,
        password: newPassword,
      });
    } catch (err: any) {
      console.warn('API regenerateUserCredentials failed:', err);
      return {
        loginCode: '',
        password: '',
        success: false,
        message: err.message || 'Gagal memperbarui kredensial di database.',
      };
    }
    setUsers(prev =>
      prev.map(u =>
        u.id === userId
          ? { ...u, nim: newCode, loginCode: newCode, email: `${newCode}@hadirku.id`, password: newPassword }
          : u
      )
    );
    return { loginCode: newCode, password: newPassword, success: true };
  };

  // Trainee & Mentor creation via Excel Import
  const importUsers = async (
    importedUsers: Partial<User>[]
  ): Promise<{ success: boolean; count: number; message: string }> => {
    try {
      const res = await api.batchImportUsers(importedUsers);
      if (!res.success) {
        return { success: false, count: 0, message: res.message || 'Impor gagal disimpan ke TiDB.' };
      }
      const fresh = await api.getUsers();
      if (fresh.success) setUsers(fresh.users);
      const appData = await api.getAppData();
      if (appData.success) setKejuruanList(appData.kejuruanList);
      return { success: true, count: res.count, message: res.message };
    } catch (err: any) {
      console.warn('API batchImportUsers failed:', err);
      return { success: false, count: 0, message: err.message || 'Impor gagal disimpan ke TiDB.' };
    }
  };

  // Kejuruan CRUD
  const addKejuruan = (kjData: Omit<Kejuruan, 'id'>) => {
    const id = `kj-${Date.now()}`;
    const newKj: Kejuruan = { id, ...kjData };
    setKejuruanList(prev => [...prev, newKj]);
  };

  const updateKejuruan = (id: string, updates: Partial<Kejuruan>) => {
    setKejuruanList(prev => prev.map(k => (k.id === id ? { ...k, ...updates } : k)));
  };

  const updateSettings = (newSettings: Partial<AttendanceSettings>) => {
    setSettings(prev => ({ ...prev, ...newSettings }));
  };

  // Missions & Submissions Actions
  const addMission = (missionData: Omit<Mission, 'id' | 'createdAt'>) => {
    const id = `msn-${Date.now()}`;
    const newMission: Mission = {
      id,
      ...missionData,
      createdAt: getTodayDateString()
    };
    setMissions(prev => [newMission, ...prev]);
  };

  const updateMission = (id: string, updates: Partial<Mission>) => {
    setMissions(prev => prev.map(m => (m.id === id ? { ...m, ...updates } : m)));
  };

  const deleteMission = (id: string) => {
    api.deleteAppData('missions', id).then(() => {
      setMissions(prev => prev.filter(m => m.id !== id));
    }).catch(error => {
      console.error('[TiDB] Gagal menghapus misi:', error);
    });
  };

  const submitMissionWork = (data: {
    missionId: string;
    submissionLink?: string;
    notes: string;
  }) => {
    const targetMission = missions.find(m => m.id === data.missionId);
    if (!targetMission) {
      return { success: false, message: 'Misi tidak ditemukan' };
    }

    const existing = missionSubmissions.find(
      s => s.missionId === data.missionId && s.traineeId === currentUser.id
    );

    if (existing && existing.status === 'approved') {
      return { success: false, message: 'Anda sudah menyelesaikan misi ini dan poin telah diterima.' };
    }

    const newSubmission: MissionSubmission = {
      id: existing ? existing.id : `sub-${Date.now()}`,
      missionId: targetMission.id,
      missionTitle: targetMission.title,
      traineeId: currentUser.id,
      traineeName: currentUser.name,
      traineeNim: currentUser.nim,
      traineeAvatar: currentUser.avatar,
      kejuruanId: targetMission.kejuruanId,
      kejuruanName: targetMission.kejuruanName,
      submissionLink: data.submissionLink,
      notes: data.notes,
      points: targetMission.points,
      submittedAt: `${getTodayDateString()} ${getCurrentTimeWIB()}`,
      status: 'pending'
    };

    if (existing) {
      setMissionSubmissions(prev => prev.map(s => (s.id === existing.id ? newSubmission : s)));
    } else {
      setMissionSubmissions(prev => [newSubmission, ...prev]);
    }

    try {
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.7 }
      });
    } catch {
      // Ignored
    }

    return { success: true, message: 'Tugas misi berhasil dikirimkan ke Mentor untuk direview!' };
  };

  const reviewMissionSubmission = (
    submissionId: string,
    status: 'approved' | 'rejected',
    feedback?: string,
    awardedPoints?: number
  ) => {
    setMissionSubmissions(prev =>
      prev.map(sub => {
        if (sub.id === submissionId) {
          const updated: MissionSubmission = {
            ...sub,
            status,
            points: awardedPoints !== undefined ? awardedPoints : sub.points,
            reviewedBy: currentUser.name,
            reviewedAt: `${getTodayDateString()} ${getCurrentTimeWIB()}`,
            feedback
          };

          if (status === 'approved') {
            try {
              confetti({
                particleCount: 80,
                spread: 70,
                origin: { y: 0.6 }
              });
            } catch {
              // Ignored
            }
          }

          return updated;
        }
        return sub;
      })
    );
  };

  const getUserPoints = (userId: string) => {
    return missionSubmissions
      .filter(s => s.traineeId === userId && s.status === 'approved')
      .reduce((sum, s) => sum + s.points, 0);
  };

  // Daily Report: submit (trainee) — 1 per day per user
  const submitDailyReport = (data: {
    date: string;
    description: string;
    photoUrl?: string;
    photoName?: string;
    submissionLink?: string;
  }): { success: boolean; message: string } => {
    const existing = dailyReports.find(
      r => r.traineeId === currentUser.id && r.date === data.date
    );
    if (existing) {
      if (existing.status === 'rejected') {
        setDailyReports(prev =>
          prev.map(r =>
            r.id === existing.id
              ? {
                  ...r,
                  description: data.description,
                  photoUrl: data.photoUrl,
                  photoName: data.photoName,
                  submissionLink: data.submissionLink,
                  status: 'pending',
                  submittedAt: new Date().toISOString(),
                  reviewedBy: undefined,
                  reviewedAt: undefined,
                  reviewNotes: undefined
                }
              : r
          )
        );
        return { success: true, message: 'Laporan harian berhasil diperbarui dan dikembalikan ke mentor.' };
      }
      return { success: false, message: 'Kamu sudah mengumpulkan laporan untuk tanggal ini.' };
    }

    const newReport: DailyReport = {
      id: `dr_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      traineeId: currentUser.id,
      traineeName: currentUser.name,
      traineeNim: currentUser.nim,
      traineeAvatar: currentUser.avatar,
      kejuruanId: currentUser.kejuruanId || '',
      kejuruanName: currentUser.kejuruanName || '',
      date: data.date,
      description: data.description,
      photoUrl: data.photoUrl,
      photoName: data.photoName,
      submissionLink: data.submissionLink,
      status: 'pending',
      submittedAt: new Date().toISOString()
    };
    setDailyReports(prev => [...prev, newReport]);
    return { success: true, message: 'Laporan harian berhasil dikirim ke mentor!' };
  };

  // Daily Report: review (mentor / admin)
  const reviewDailyReport = (
    reportId: string,
    status: 'approved' | 'rejected',
    reviewNotes?: string
  ) => {
    setDailyReports(prev =>
      prev.map(r =>
        r.id === reportId
          ? {
              ...r,
              status,
              reviewedBy: currentUser.name,
              reviewedAt: new Date().toISOString(),
              reviewNotes: reviewNotes || ''
            }
          : r
      )
    );
  };

  const resetToDefaultData = () => {
    if (!isAuthenticated || !jwtToken) return;
    setAppDataReady(false);
    api.getAppData().then(data => {
      setKejuruanList(data.kejuruanList);
      setAttendanceRecords(data.attendanceRecords);
      setLeaveRequests(data.leaveRequests);
      setMissions(data.missions);
      setMissionSubmissions(data.missionSubmissions);
      setDailyReports(data.dailyReports);
      if (data.settings) setSettings(data.settings);
      setAppDataReady(true);
    }).catch(error => {
      console.error('[TiDB] Gagal memuat ulang data:', error);
      setTidbStatus('offline');
    });
  };

  return (
    <AppContext.Provider
      value={{
        currentUser,
        users,
        kejuruanList,
        attendanceRecords,
        leaveRequests,
        settings,
        missions,
        missionSubmissions,
        dailyReports,
        activeTab,
        isAuthenticated,
        authReady,
        jwtToken,
        tidbStatus,
        setActiveTab,
        loginWithCode,
        loginWithAdmin,
        logout,
        clockIn,
        clockOut,
        getTodayRecordForUser,
        submitLeaveRequest,
        reviewLeaveRequest,
        verifyAttendance,
        markAttendanceStatus,
        manualAddOrUpdateAttendance,
        addMission,
        updateMission,
        deleteMission,
        submitMissionWork,
        reviewMissionSubmission,
        getUserPoints,
        submitDailyReport,
        reviewDailyReport,
        addUser,
        updateUser,
        deleteUser,
        deleteUsersByRole,
        importUsers,
        regenerateUserCredentials,
        addKejuruan,
        updateKejuruan,
        updateSettings,
        resetToDefaultData
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
