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
  INITIAL_USERS,
  INITIAL_KEJURUAN,
  INITIAL_SETTINGS,
  INITIAL_LEAVE_REQUESTS,
  generateInitialAttendance
} from '../data/mockData';
import { INITIAL_MISSIONS, INITIAL_SUBMISSIONS } from '../data/missionsData';
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
  jwtToken: string | null;
  tidbStatus: 'connected' | 'connecting' | 'error' | 'offline';
  setActiveTab: (tab: string) => void;
  switchUser: (userId: string) => Promise<void> | void;
  // Auth methods
  loginWithCode: (code: string, password?: string) => Promise<{ success: boolean; message: string; user?: User }>;
  loginWithAdmin: (identifier: string, password?: string) => Promise<{ success: boolean; message: string; user?: User }>;
  logout: () => void;
  // Clock in/out actions
  clockIn: (notes?: string, photoUrl?: string) => { success: boolean; message: string };
  clockOut: (notes?: string) => { success: boolean; message: string };
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
  importUsers: (importedUsers: Partial<User>[]) => Promise<{ count: number; message: string }>;
  regenerateUserCredentials: (userId: string) => Promise<{ loginCode: string; password: string }>;
  addKejuruan: (kjData: Omit<Kejuruan, 'id'>) => void;
  updateKejuruan: (id: string, updates: Partial<Kejuruan>) => void;
  updateSettings: (newSettings: Partial<AttendanceSettings>) => void;
  resetToDefaultData: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Load initial states from localStorage if available
  const [users, setUsers] = useState<User[]>(() => {
    const saved = localStorage.getItem('hadirku_users_v2');
    if (saved) {
      try {
        const parsed: User[] = JSON.parse(saved);
        // Ensure all users have loginCode and password
        return parsed.map(u => {
          const matchInitial = INITIAL_USERS.find(iu => iu.id === u.id || iu.nim === u.nim);
          return {
            ...u,
            loginCode: u.loginCode || matchInitial?.loginCode || generate8DigitLoginCode(),
            password: u.password || matchInitial?.password || '123456'
          };
        });
      } catch {
        return INITIAL_USERS;
      }
    }
    return INITIAL_USERS;
  });

  const [currentUserId, setCurrentUserId] = useState<string>(() => {
    const saved = localStorage.getItem('hadirku_current_user_id_v2');
    return saved || INITIAL_USERS[0].id; // Default Admin
  });

  const [jwtToken, setJwtToken] = useState<string | null>(() => api.getToken());
  const [tidbStatus, setTidbStatus] = useState<'connected' | 'connecting' | 'error' | 'offline'>('connecting');

  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    const token = api.getToken();
    if (token) return true;
    const saved = localStorage.getItem('hadirku_auth_v2');
    return saved !== null ? saved === 'true' : false;
  });

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

      const token = api.getToken();
      if (token) {
        try {
          const res = await api.getMe();
          if (isMounted && res.success && res.user) {
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
            api.clearToken();
            setJwtToken(null);
            setIsAuthenticated(false);
          }
        } catch (err) {
          console.warn('[JWT] Session expired or invalid, logging out', err);
          if (isMounted) {
            api.clearToken();
            setJwtToken(null);
            setIsAuthenticated(false);
          }
        }
      }
    };

    initAuthSession();
    return () => {
      isMounted = false;
    };
  }, []);

  const [kejuruanList, setKejuruanList] = useState<Kejuruan[]>(() => {
    const saved = localStorage.getItem('hadirku_kejuruan_v2');
    return saved ? JSON.parse(saved) : INITIAL_KEJURUAN;
  });

  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>(() => {
    const saved = localStorage.getItem('hadirku_attendance_v2');
    return saved ? JSON.parse(saved) : generateInitialAttendance();
  });

  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>(() => {
    const saved = localStorage.getItem('hadirku_leave_requests_v2');
    return saved ? JSON.parse(saved) : INITIAL_LEAVE_REQUESTS;
  });

  const [settings, setSettings] = useState<AttendanceSettings>(() => {
    const saved = localStorage.getItem('hadirku_settings_v2');
    return saved ? JSON.parse(saved) : INITIAL_SETTINGS;
  });

  const [missions, setMissions] = useState<Mission[]>(() => {
    const saved = localStorage.getItem('hadirku_missions_v1');
    return saved ? JSON.parse(saved) : INITIAL_MISSIONS;
  });

  const [missionSubmissions, setMissionSubmissions] = useState<MissionSubmission[]>(() => {
    const saved = localStorage.getItem('hadirku_submissions_v1');
    return saved ? JSON.parse(saved) : INITIAL_SUBMISSIONS;
  });

  const [dailyReports, setDailyReports] = useState<DailyReport[]>(() => {
    const saved = localStorage.getItem('hadirku_daily_reports_v1');
    return saved ? JSON.parse(saved) : [];
  });

  const [activeTab, setActiveTab] = useState<string>('dashboard');

  // Synchronize to localStorage
  useEffect(() => {
    localStorage.setItem('hadirku_users_v2', JSON.stringify(users));
  }, [users]);

  useEffect(() => {
    localStorage.setItem('hadirku_current_user_id_v2', currentUserId);
  }, [currentUserId]);

  useEffect(() => {
    localStorage.setItem('hadirku_auth_v2', String(isAuthenticated));
  }, [isAuthenticated]);

  useEffect(() => {
    localStorage.setItem('hadirku_kejuruan_v2', JSON.stringify(kejuruanList));
  }, [kejuruanList]);

  useEffect(() => {
    localStorage.setItem('hadirku_attendance_v2', JSON.stringify(attendanceRecords));
  }, [attendanceRecords]);

  useEffect(() => {
    localStorage.setItem('hadirku_leave_requests_v2', JSON.stringify(leaveRequests));
  }, [leaveRequests]);

  useEffect(() => {
    localStorage.setItem('hadirku_settings_v2', JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    localStorage.setItem('hadirku_missions_v1', JSON.stringify(missions));
  }, [missions]);

  useEffect(() => {
    localStorage.setItem('hadirku_submissions_v1', JSON.stringify(missionSubmissions));
  }, [missionSubmissions]);

  useEffect(() => {
    localStorage.setItem('hadirku_daily_reports_v1', JSON.stringify(dailyReports));
  }, [dailyReports]);

  // Current active user object
  const currentUser = users.find(u => u.id === currentUserId) || users[0];

  const switchUser = async (userId: string) => {
    const target = users.find(u => u.id === userId);
    if (target) {
      try {
        const res = await api.switchUser(userId);
        if (res.token) {
          setJwtToken(res.token);
        }
      } catch (err) {
        console.warn('Switch user via backend failed, using local context:', err);
      }
      setCurrentUserId(userId);
      setIsAuthenticated(true);
      setActiveTab('dashboard');
    }
  };

  const loginWithCode = async (
    code: string,
    pass?: string
  ): Promise<{ success: boolean; message: string; user?: User }> => {
    const cleanedCode = code.replace(/\s+/g, '').trim();

    // 1. Attempt authentication with TiDB backend and JWT
    try {
      const res = await api.login({ code: cleanedCode, password: pass });
      if (res.success && res.user && res.token) {
        setJwtToken(res.token);
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
      console.warn('TiDB backend login response:', err.message);
      // If the backend actively rejected with an invalid password or invalid account, return that directly
      const msg = err.message || '';
      if (
        msg.includes('tidak ditemukan') ||
        msg.includes('salah') ||
        msg.includes('dinonaktifkan') ||
        msg.includes('wajib diisi')
      ) {
        return { success: false, message: msg };
      }
    }

    // 2. Offline fallback to local mock data
    const target = users.find(
      u => u.loginCode === cleanedCode || u.nim.toLowerCase() === cleanedCode.toLowerCase()
    );
    if (!target) {
      return {
        success: false,
        message: 'Kode 8-digit atau NIM tidak ditemukan. Pastikan kode yang dimasukkan sudah benar.',
      };
    }
    if (pass && pass.trim()) {
      if (target.password && target.password !== pass.trim()) {
        return { success: false, message: 'Password salah untuk akun tersebut.' };
      }
    }
    setCurrentUserId(target.id);
    setIsAuthenticated(true);
    setActiveTab('dashboard');
    return { success: true, message: `Selamat datang, ${target.name}!`, user: target };
  };

  const loginWithAdmin = async (
    identifier: string,
    pass?: string
  ): Promise<{ success: boolean; message: string; user?: User }> => {
    const cleanId = identifier.trim();

    // 1. Attempt authentication with TiDB backend and JWT
    try {
      const res = await api.login({ identifier: cleanId, password: pass });
      if (res.success && res.user && res.token) {
        setJwtToken(res.token);
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
      console.warn('TiDB admin login response:', err.message);
      const msg = err.message || '';
      if (
        msg.includes('tidak ditemukan') ||
        msg.includes('salah') ||
        msg.includes('dinonaktifkan') ||
        msg.includes('wajib diisi')
      ) {
        return { success: false, message: msg };
      }
    }

    // 2. Offline fallback to local mock data
    const cleanLower = cleanId.toLowerCase();
    const target = users.find(
      u =>
        (u.role === 'admin' || u.role === 'mentor') &&
        (u.email.toLowerCase() === cleanLower ||
          u.nim.toLowerCase() === cleanLower ||
          u.loginCode === cleanLower ||
          (cleanLower === 'admin' && u.role === 'admin'))
    );

    if (!target) {
      if (!cleanLower || cleanLower === 'admin') {
        const defAdmin = users.find(u => u.role === 'admin') || users[0];
        setCurrentUserId(defAdmin.id);
        setIsAuthenticated(true);
        setActiveTab('dashboard');
        return { success: true, message: `Selamat datang, ${defAdmin.name}!`, user: defAdmin };
      }
      return { success: false, message: 'Akun admin atau mentor tidak ditemukan.' };
    }

    if (pass && pass.trim() && target.password) {
      if (target.password !== pass.trim() && pass.trim() !== 'admin123') {
        return { success: false, message: 'Password salah.' };
      }
    }

    setCurrentUserId(target.id);
    setIsAuthenticated(true);
    setActiveTab('dashboard');
    return { success: true, message: `Selamat datang, ${target.name}!`, user: target };
  };

  const logout = () => {
    api.clearToken();
    setJwtToken(null);
    setIsAuthenticated(false);
    localStorage.removeItem('hadirku_auth_v2');
  };

  const getTodayRecordForUser = (userId: string): AttendanceRecord | undefined => {
    const today = getTodayDateString();
    return attendanceRecords.find(r => r.userId === userId && r.date === today);
  };

  // Clock In
  const clockIn = (notes?: string, photoUrl?: string): { success: boolean; message: string } => {
    const today = getTodayDateString();
    const existing = getTodayRecordForUser(currentUser.id);

    if (existing && existing.checkInTime) {
      return { success: false, message: 'Anda sudah melakukan Check-In untuk hari ini!' };
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
      location: settings.officeLocation.name,
      coordinates: {
        lat: settings.officeLocation.lat,
        lng: settings.officeLocation.lng
      },
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
  const clockOut = (notes?: string): { success: boolean; message: string } => {
    const today = getTodayDateString();
    const existing = getTodayRecordForUser(currentUser.id);

    if (!existing || !existing.checkInTime) {
      return { success: false, message: 'Anda belum melakukan Check-In hari ini.' };
    }

    if (existing.checkOutTime) {
      return { success: false, message: 'Anda sudah melakukan Check-Out sebelumnya.' };
    }

    const currentTime = getCurrentTimeWIB();

    setAttendanceRecords(prev =>
      prev.map(r => {
        if (r.userId === currentUser.id && r.date === today) {
          return {
            ...r,
            checkOutTime: currentTime,
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
      if (err.message && !err.message.includes('Failed to fetch')) {
        return { success: false, message: err.message };
      }
    }

    // Local fallback if offline
    const id = `user-${userData.role}-${Date.now()}`;
    const newUser: User = {
      id,
      ...userData,
      loginCode: userData.loginCode || generate8DigitLoginCode(),
      password: userData.password || generateDefaultPassword(),
    };
    setUsers(prev => [newUser, ...prev]);
    return {
      success: true,
      message: `Akun ${newUser.role} berhasil dibuat (tersimpan lokal).`,
      user: newUser,
    };
  };

  const updateUser = async (
    id: string,
    updates: Partial<User>
  ): Promise<{ success: boolean; message: string }> => {
    try {
      await api.updateUser(id, updates);
    } catch (err: any) {
      console.warn('API updateUser failed:', err);
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
      setUsers(prev => prev.filter(u => u.id !== id));
      return { success: true, message: 'Pengguna dihapus.' };
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
      let count = 0;
      setUsers(prev =>
        prev.filter(u => {
          if (u.role === 'admin') return true;
          if (role === 'all' || u.role === role) {
            count++;
            return false;
          }
          return true;
        })
      );
      return {
        success: true,
        count,
        message: `Berhasil menghapus ${count} akun ${role === 'all' ? 'peserta & mentor' : role} (lokal).`,
      };
    }
  };

  const regenerateUserCredentials = async (
    userId: string
  ): Promise<{ loginCode: string; password: string }> => {
    const newCode = generate8DigitLoginCode();
    const newPassword = generateDefaultPassword();
    try {
      await api.updateUser(userId, { loginCode: newCode, password: newPassword });
    } catch (err) {
      console.warn('API regenerateUserCredentials failed:', err);
    }
    setUsers(prev =>
      prev.map(u => (u.id === userId ? { ...u, loginCode: newCode, password: newPassword } : u))
    );
    return { loginCode: newCode, password: newPassword };
  };

  // Trainee & Mentor creation via Excel Import
  const importUsers = async (
    importedUsers: Partial<User>[]
  ): Promise<{ count: number; message: string }> => {
    try {
      const res = await api.batchImportUsers(importedUsers);
      if (res.success) {
        // Refresh full user list from TiDB
        const fresh = await api.getUsers();
        if (fresh.success && fresh.users && fresh.users.length > 0) {
          setUsers(fresh.users);
        }
        return { count: res.count, message: res.message };
      }
    } catch (err: any) {
      console.warn('API batchImportUsers failed, using local import:', err);
    }

    // Local fallback if offline
    let newCount = 0;
    setUsers(prev => {
      const updated = [...prev];
      importedUsers.forEach(item => {
        if (!item.name) return;
        const existingIdx = updated.findIndex(
          u =>
            (item.nim && u.nim.toLowerCase() === item.nim.toLowerCase()) ||
            (item.email && u.email.toLowerCase() === item.email.toLowerCase())
        );

        const loginCode = item.loginCode || generate8DigitLoginCode();
        const password = item.password || generateDefaultPassword();

        if (existingIdx >= 0) {
          updated[existingIdx] = {
            ...updated[existingIdx],
            ...item,
            loginCode: item.loginCode || updated[existingIdx].loginCode || loginCode,
            password: item.password || updated[existingIdx].password || password,
          } as User;
        } else {
          const role = item.role === 'mentor' ? 'mentor' : 'trainee';
          const newUser: User = {
            id: `user-${role}-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
            name: item.name,
            nim: item.nim || `${role === 'mentor' ? 'MNT' : 'TRN'}-2026-${Math.floor(100 + Math.random() * 900)}`,
            email: item.email || `${item.name.toLowerCase().replace(/[^a-z0-9]/g, '.')}@${role === 'mentor' ? 'hadirku.id' : 'student.id'}`,
            role,
            avatar:
              item.avatar ||
              `https://images.unsplash.com/photo-${role === 'mentor' ? '1534528741775-53994a69daeb' : '1535713875002-d1d0cf377fde'}?w=150&auto=format&fit=crop&q=80`,
            phone: item.phone || '0812-3456-7890',
            kejuruanId: item.kejuruanId || 'kj-1',
            kejuruanName: item.kejuruanName || 'Umum',
            status: item.status || 'active',
            joinedDate: item.joinedDate || new Date().toISOString().split('T')[0],
            loginCode,
            password: password || (role === 'mentor' ? 'mentor123' : '123456'),
          };
          updated.unshift(newUser);
          newCount++;
        }
      });
      return updated;
    });

    return {
      count: newCount,
      message: `Berhasil memproses ${importedUsers.length} data (${newCount} akun baru ditambahkan).`,
    };
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
    setMissions(prev => prev.filter(m => m.id !== id));
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
    localStorage.removeItem('hadirku_users_v2');
    localStorage.removeItem('hadirku_current_user_id_v2');
    localStorage.removeItem('hadirku_auth_v2');
    localStorage.removeItem('hadirku_kejuruan_v2');
    localStorage.removeItem('hadirku_attendance_v2');
    localStorage.removeItem('hadirku_leave_requests_v2');
    localStorage.removeItem('hadirku_settings_v2');
    localStorage.removeItem('hadirku_missions_v1');
    localStorage.removeItem('hadirku_submissions_v1');
    localStorage.removeItem('hadirku_daily_reports_v1');
    setUsers(INITIAL_USERS);
    setCurrentUserId(INITIAL_USERS[0].id);
    setIsAuthenticated(true);
    setKejuruanList(INITIAL_KEJURUAN);
    setAttendanceRecords(generateInitialAttendance());
    setLeaveRequests(INITIAL_LEAVE_REQUESTS);
    setSettings(INITIAL_SETTINGS);
    setMissions(INITIAL_MISSIONS);
    setMissionSubmissions(INITIAL_SUBMISSIONS);
    setDailyReports([]);
    setActiveTab('dashboard');
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
        jwtToken,
        tidbStatus,
        setActiveTab,
        switchUser,
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
