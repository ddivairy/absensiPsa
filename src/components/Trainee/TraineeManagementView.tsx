import React, { useState, useMemo, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Users,
  UserPlus,
  Plus,
  Search,
  Filter,
  X,
  Phone,
  Mail,
  GraduationCap,
  FileSpreadsheet,
  Upload,
  Download,
  KeyRound,
  Lock,
  Copy,
  Check,
  RefreshCw,
  Eye,
  EyeOff,
  AlertCircle,
  FileCheck2,
  Trash2,
  ShieldCheck,
  UserCheck
} from 'lucide-react';
import { Kejuruan, User, Role } from '../../types';
import {
  exportUsersToExcel,
  downloadUserImportTemplate,
  parseUsersFromExcelFile,
  generate8DigitLoginCode,
  generateDefaultPassword
} from '../../utils/userExcelUtils';

export const TraineeManagementView: React.FC = () => {
  const {
    users,
    kejuruanList,
    addUser,
    deleteUser,
    addKejuruan,
    importUsers,
    regenerateUserCredentials
  } = useApp();

  const [activeRoleFilter, setActiveRoleFilter] = useState<'all' | 'trainee' | 'mentor'>('all');
  const [selectedKejuruan, setSelectedKejuruan] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modals
  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState<boolean>(false);
  const [isAddKjModalOpen, setIsAddKjModalOpen] = useState<boolean>(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState<boolean>(false);

  // Copied feedback
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [copiedType, setCopiedType] = useState<'code' | 'pass' | null>(null);

  // Password visibility map
  const [visiblePasswords, setVisiblePasswords] = useState<Record<string, boolean>>({});

  // Notification Banner
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // New User Form State
  const [newUserName, setNewUserName] = useState('');
  const [newUserNim, setNewUserNim] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPhone, setNewUserPhone] = useState('');
  const [newUserKejuruanId, setNewUserKejuruanId] = useState(kejuruanList[0]?.id || '');
  const [newUserRole, setNewUserRole] = useState<'trainee' | 'mentor'>('trainee');
  const [newUserLoginCode, setNewUserLoginCode] = useState(generate8DigitLoginCode());
  const [newUserPassword, setNewUserPassword] = useState(generateDefaultPassword());

  // New Kejuruan Form State
  const [newKjName, setNewKjName] = useState('');
  const [newKjCode, setNewKjCode] = useState('');
  const [newKjCategory, setNewKjCategory] = useState('');
  const [newKjColor, setNewKjColor] = useState('#2563eb');
  const [newKjMentorName, setNewKjMentorName] = useState('');
  const [newKjDesc, setNewKjDesc] = useState('');

  // Import State
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importingFile, setImportingFile] = useState<File | null>(null);
  const [parsedImportUsers, setParsedImportUsers] = useState<Partial<User>[]>([]);
  const [importError, setImportError] = useState<string | null>(null);
  const [isProcessingImport, setIsProcessingImport] = useState(false);

  const trainees = useMemo(() => users.filter(u => u.role === 'trainee'), [users]);
  const mentors = useMemo(() => users.filter(u => u.role === 'mentor'), [users]);

  const filteredUsers = useMemo(() => {
    return users.filter(u => {
      // Role filter
      if (activeRoleFilter !== 'all' && u.role !== activeRoleFilter) {
        return false;
      }
      // Kejuruan filter
      if (selectedKejuruan !== 'all' && u.kejuruanId !== selectedKejuruan) {
        return false;
      }
      // Search
      const q = searchQuery.toLowerCase();
      const matchSearch =
        u.name.toLowerCase().includes(q) ||
        u.nim.toLowerCase().includes(q) ||
        (u.loginCode && u.loginCode.includes(q)) ||
        u.email.toLowerCase().includes(q) ||
        (u.kejuruanName || '').toLowerCase().includes(q);

      return matchSearch;
    });
  }, [users, activeRoleFilter, selectedKejuruan, searchQuery]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  const copyToClipboard = (text: string, id: string, type: 'code' | 'pass') => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setCopiedType(type);
    showToast(`Tersalin ke clipboard: ${text}`);
    setTimeout(() => {
      setCopiedId(null);
      setCopiedType(null);
    }, 2000);
  };

  const togglePasswordVisibility = (userId: string) => {
    setVisiblePasswords(prev => ({
      ...prev,
      [userId]: !prev[userId]
    }));
  };

  const handleOpenAddUserModal = (role: 'trainee' | 'mentor' = 'trainee') => {
    setNewUserRole(role);
    setNewUserLoginCode(generate8DigitLoginCode());
    setNewUserPassword(generateDefaultPassword());
    setNewUserName('');
    setNewUserNim('');
    setNewUserEmail('');
    setNewUserPhone('');
    setNewUserKejuruanId(kejuruanList[0]?.id || '');
    setIsAddUserModalOpen(true);
  };

  const handleRegenerateCredentialsForUser = (userId: string, userName: string) => {
    const creds = regenerateUserCredentials(userId);
    showToast(`Kredensial baru untuk ${userName}: Kode ${creds.loginCode} · PW: ${creds.password}`);
  };

  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserName.trim()) return;

    const kj = kejuruanList.find(k => k.id === newUserKejuruanId);

    addUser({
      name: newUserName,
      email: newUserEmail || `${newUserName.toLowerCase().replace(/\s+/g, '.')}@vokasi.id`,
      role: newUserRole,
      nim: newUserNim || `${newUserRole === 'mentor' ? 'MNT' : 'TRN'}-${Date.now().toString().slice(-4)}`,
      kejuruanId: newUserKejuruanId,
      kejuruanName: kj?.name || '',
      phone: newUserPhone || '0812-3456-7890',
      loginCode: newUserLoginCode,
      password: newUserPassword,
      status: 'active',
      joinedDate: new Date().toISOString().split('T')[0],
      avatar: `https://images.unsplash.com/photo-${newUserRole === 'mentor' ? '1534528741775-53994a69daeb' : '1535713875002-d1d0cf377fde'}?w=150`
    });

    showToast(`Akun ${newUserRole === 'mentor' ? 'Mentor' : 'Peserta'} ${newUserName} berhasil dibuat!`);
    setIsAddUserModalOpen(false);
  };

  const handleCreateKejuruan = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKjName.trim() || !newKjCode.trim()) return;

    addKejuruan({
      name: newKjName,
      code: newKjCode.toUpperCase(),
      category: newKjCategory || 'Teknologi',
      color: newKjColor,
      mentorName: newKjMentorName || 'Instruktur Kejuruan',
      description: newKjDesc || 'Program kejuruan vokasi industri terapan.'
    });

    showToast(`Kejuruan ${newKjName} (${newKjCode}) berhasil ditambahkan!`);
    setIsAddKjModalOpen(false);
    setNewKjName('');
    setNewKjCode('');
    setNewKjDesc('');
    setNewKjMentorName('');
  };

  // Excel Export
  const handleExportExcel = () => {
    exportUsersToExcel(users, kejuruanList, activeRoleFilter);
    showToast('File Excel data akun peserta & mentor berhasil diunduh!');
  };

  // Excel Import Handling
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportingFile(file);
    setImportError(null);
    setIsProcessingImport(true);

    const res = await parseUsersFromExcelFile(file, kejuruanList);
    setIsProcessingImport(false);

    if (!res.success || !res.users) {
      setImportError(res.error || 'Gagal membaca file Excel.');
      setParsedImportUsers([]);
    } else {
      setParsedImportUsers(res.users);
      setImportError(null);
    }
  };

  const handleApplyImport = () => {
    if (parsedImportUsers.length === 0) return;
    const result = importUsers(parsedImportUsers);
    showToast(result.message);
    setIsImportModalOpen(false);
    setImportingFile(null);
    setParsedImportUsers([]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="space-y-6">
      {/* Toast banner */}
      {toastMessage && (
        <div className="fixed bottom-7 left-1/2 -translate-x-1/2 z-50 bg-[#0D2F47] text-white px-5 py-3 rounded-xl shadow-xl text-xs font-bold flex items-center gap-2 animate-in fade-in">
          <FileCheck2 className="w-4 h-4 text-[#A9C7DE]" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-[#E4EAF0]">
        <div>
          <p className="text-[10px] font-bold tracking-[.14em] text-[#4C83B5] uppercase">
            ADMINISTRASI & MANAJEMEN AKUN
          </p>
          <h1 className="mt-1 text-2xl lg:text-3xl font-bold tracking-tight text-[#123B59]">
            Kelola Akun Peserta & Instruktur
          </h1>
          <p className="text-xs text-[#6F7F8D] mt-1">
            Input & Kelola Kredensial Login (Kode 8-Digit & Password), Ekspor/Impor Excel (.xlsx), dan Alokasi Kejuruan.
          </p>
        </div>

        {/* Action Buttons: Add, Export, Import */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleExportExcel}
            className="surface px-3.5 py-2.5 rounded-xl border border-[#E4EAF0] hover:bg-[#F8FAFB] text-xs font-bold text-[#123B59] transition flex items-center gap-1.5 cursor-pointer shadow-xs"
            title="Ekspor data akun & kode login ke file Excel"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>Ekspor Excel</span>
          </button>

          <button
            onClick={() => {
              setImportingFile(null);
              setParsedImportUsers([]);
              setImportError(null);
              setIsImportModalOpen(true);
            }}
            className="surface px-3.5 py-2.5 rounded-xl border border-[#E4EAF0] hover:bg-[#F8FAFB] text-xs font-bold text-[#123B59] transition flex items-center gap-1.5 cursor-pointer shadow-xs"
            title="Impor peserta & mentor dari file Excel"
          >
            <Upload className="w-4 h-4 text-[#4C83B5]" />
            <span>Impor Excel</span>
          </button>

          <button
            onClick={() => handleOpenAddUserModal('trainee')}
            className="px-4 py-2.5 rounded-xl bg-[#123B59] hover:bg-[#0D2F47] text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-sm hover:-translate-y-0.5"
          >
            <UserPlus className="w-4 h-4 text-[#A9C7DE]" />
            <span>Tambah Akun</span>
          </button>

          <button
            onClick={() => setIsAddKjModalOpen(true)}
            className="surface px-3.5 py-2.5 rounded-xl border border-[#E4EAF0] hover:bg-[#F8FAFB] text-xs font-bold text-[#123B59] transition flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            <Plus className="w-4 h-4 text-[#6F7F8D]" />
            <span>Kejuruan</span>
          </button>
        </div>
      </div>

      {/* Role Filter Tabs Strip */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1 bg-[#F4F6F8] p-1 rounded-xl border border-[#E4EAF0]">
          <button
            type="button"
            onClick={() => setActiveRoleFilter('all')}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold transition cursor-pointer ${
              activeRoleFilter === 'all'
                ? 'bg-[#123B59] text-white shadow-xs'
                : 'text-[#6F7F8D] hover:text-[#123B59]'
            }`}
          >
            Semua Akun ({users.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveRoleFilter('trainee')}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
              activeRoleFilter === 'trainee'
                ? 'bg-[#123B59] text-white shadow-xs'
                : 'text-[#6F7F8D] hover:text-[#123B59]'
            }`}
          >
            <GraduationCap className="w-3.5 h-3.5" />
            <span>Peserta Magang ({trainees.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveRoleFilter('mentor')}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
              activeRoleFilter === 'mentor'
                ? 'bg-[#123B59] text-white shadow-xs'
                : 'text-[#6F7F8D] hover:text-[#123B59]'
            }`}
          >
            <UserCheck className="w-3.5 h-3.5" />
            <span>Instruktur Mentor ({mentors.length})</span>
          </button>
        </div>

        {/* Info label about credentials */}
        <div className="text-[11px] text-[#28618F] bg-[#EAF2F8] border border-[#C8DCEB] px-3 py-1.5 rounded-xl flex items-center gap-1.5 font-bold">
          <KeyRound className="w-3.5 h-3.5 text-[#4C83B5]" />
          <span>Peserta & Mentor login via <strong>Kode 8-Digit</strong> & <strong>Password</strong> di bawah.</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="surface p-4 rounded-2xl border border-[#E4EAF0] flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-[#123B59]">Filter Kejuruan:</span>
          <select
            value={selectedKejuruan}
            onChange={e => setSelectedKejuruan(e.target.value)}
            className="text-xs py-2 px-3 rounded-xl border border-[#E4EAF0] bg-[#F8FAFB] text-[#123B59] font-bold outline-none focus:border-[#4C83B5]"
          >
            <option value="all">Semua Program Kejuruan</option>
            {kejuruanList.map(kj => (
              <option key={kj.id} value={kj.id}>
                {kj.code} - {kj.name}
              </option>
            ))}
          </select>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="w-3.5 h-3.5 text-[#6F7F8D] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Cari nama, NIM, kode 8-digit, email..."
            className="w-full text-xs pl-9 pr-3 py-2 rounded-xl border border-[#E4EAF0] bg-[#F8FAFB] text-[#123B59] outline-none focus:border-[#4C83B5]"
          />
        </div>
      </div>

      {/* Main Accounts Table with 8-Digit Codes and Passwords */}
      <div className="surface rounded-2xl border border-[#E4EAF0] overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-[#F8FAFB] border-b border-[#E4EAF0] text-[#6F7F8D] text-[10px] font-bold tracking-wide uppercase">
                <th className="py-3 px-3.5 w-10 text-center">No</th>
                <th className="py-3 px-3 min-w-[200px]">Nama Pengguna</th>
                <th className="py-3 px-3 w-28">Peran (Role)</th>
                <th className="py-3 px-3 w-28">NIM / NIP</th>
                <th className="py-3 px-3 min-w-[150px]">Kejuruan</th>
                <th className="py-3 px-3 min-w-[150px] bg-[#EAF2F8] text-[#28618F] font-bold">
                  Kode Login 8-Digit
                </th>
                <th className="py-3 px-3 min-w-[130px] bg-[#F4F6F8]">
                  Password
                </th>
                <th className="py-3 px-3 min-w-[160px]">Kontak (Email / WA)</th>
                <th className="py-3 px-3 w-24 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E4EAF0]">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-[#6F7F8D] italic">
                    Tidak ada data akun yang cocok dengan filter pencarian.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user, idx) => {
                  const isPasswordVisible = !!visiblePasswords[user.id];
                  const isCodeCopied = copiedId === user.id && copiedType === 'code';
                  const isPassCopied = copiedId === user.id && copiedType === 'pass';

                  return (
                    <tr key={user.id} className="hover:bg-[#F8FAFB]/60 transition">
                      <td className="py-3 px-3.5 text-center text-[#6F7F8D] tabular-nums font-semibold">
                        {idx + 1}
                      </td>

                      {/* User Info */}
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2.5">
                          <img
                            src={user.avatar}
                            alt={user.name}
                            className="w-8 h-8 rounded-xl object-cover border border-[#E4EAF0] shrink-0"
                          />
                          <div className="min-w-0">
                            <div className="font-bold text-[#123B59] truncate">
                              {user.name}
                            </div>
                            <div className="text-[10px] text-[#6F7F8D] truncate">
                              Bergabung {user.joinedDate}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Role */}
                      <td className="py-3 px-3">
                        {user.role === 'admin' ? (
                          <span className="px-2.5 py-1 rounded-full bg-[#123B59] text-white font-bold text-[10px]">
                            Admin
                          </span>
                        ) : user.role === 'mentor' ? (
                          <span className="px-2.5 py-1 rounded-full bg-[#EAF2F8] text-[#28618F] font-bold text-[10px]">
                            Instruktur
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 rounded-full bg-[#EEF5FA] text-[#4C83B5] font-bold text-[10px]">
                            Peserta
                          </span>
                        )}
                      </td>

                      {/* NIM / NIP */}
                      <td className="py-3 px-3 font-mono text-[11px] text-[#123B59] font-semibold">
                        {user.nim}
                      </td>

                      {/* Kejuruan */}
                      <td className="py-3 px-3 text-[#123B59] font-medium truncate max-w-[180px]">
                        {user.kejuruanName || '-'}
                      </td>

                      {/* 8-Digit Login Code */}
                      <td className="py-3 px-3 bg-[#EAF2F8]/30">
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-white border border-[#C8DCEB] shadow-2xs font-mono text-xs font-bold text-[#28618F] tracking-wider">
                          <span>{user.loginCode || 'Belum ada'}</span>
                          {user.loginCode && (
                            <button
                              type="button"
                              onClick={() => copyToClipboard(user.loginCode!, user.id, 'code')}
                              className="text-[#6F7F8D] hover:text-[#28618F] cursor-pointer p-0.5"
                              title="Salin Kode Login 8 Digit"
                            >
                              {isCodeCopied ? (
                                <Check className="w-3.5 h-3.5 text-emerald-600" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>
                          )}
                        </div>
                      </td>

                      {/* Password */}
                      <td className="py-3 px-3 bg-[#F8FAFB]/50">
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-white border border-[#E4EAF0] shadow-2xs font-mono text-xs text-[#123B59] font-semibold">
                          <span>{isPasswordVisible ? user.password || '123456' : '••••••••'}</span>
                          <button
                            type="button"
                            onClick={() => togglePasswordVisibility(user.id)}
                            className="text-[#6F7F8D] hover:text-[#123B59] cursor-pointer p-0.5"
                            title={isPasswordVisible ? 'Sembunyikan password' : 'Lihat password'}
                          >
                            {isPasswordVisible ? (
                              <EyeOff className="w-3.5 h-3.5" />
                            ) : (
                              <Eye className="w-3.5 h-3.5" />
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={() => copyToClipboard(user.password || '123456', user.id, 'pass')}
                            className="text-[#6F7F8D] hover:text-[#123B59] cursor-pointer p-0.5"
                            title="Salin password"
                          >
                            {isPassCopied ? (
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </td>

                      {/* Email & WA */}
                      <td className="py-3 px-3 text-[#6F7F8D] text-[11px]">
                        <div className="truncate max-w-[150px] font-medium text-[#123B59]">{user.email}</div>
                        <div className="text-[#6F7F8D]">{user.phone}</div>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-3 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleRegenerateCredentialsForUser(user.id, user.name)}
                            className="p-1.5 rounded-lg hover:bg-[#EAF2F8] text-[#6F7F8D] hover:text-[#28618F] cursor-pointer transition"
                            title="Acak Kode 8-Digit & Password Baru"
                          >
                            <RefreshCw className="w-3.5 h-3.5" />
                          </button>
                          {user.role !== 'admin' && (
                            <button
                              type="button"
                              onClick={() => {
                                if (confirm(`Hapus akun ${user.name}?`)) {
                                  deleteUser(user.id);
                                  showToast(`Akun ${user.name} telah dihapus.`);
                                }
                              }}
                              className="p-1.5 rounded-lg hover:bg-[#FCF3F6] text-[#6F7F8D] hover:text-[#B84469] cursor-pointer transition"
                              title="Hapus akun"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL 1: ADD USER (TRAINEE / MENTOR) */}
      {isAddUserModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0D2F47]/45 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="surface rounded-2xl border border-[#E4EAF0] w-full max-w-lg p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#E4EAF0] pb-3">
              <div>
                <p className="text-[10px] font-bold tracking-[.13em] text-[#4C83B5] uppercase">
                  TAMBAH PENGGUNA
                </p>
                <h3 className="text-base font-bold text-[#123B59]">
                  Tambah Akun Pengguna Baru
                </h3>
              </div>
              <button
                onClick={() => setIsAddUserModalOpen(false)}
                className="text-[#6F7F8D] hover:text-[#123B59] p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#123B59] font-bold mb-1">Peran Akun</label>
                  <select
                    value={newUserRole}
                    onChange={e => setNewUserRole(e.target.value as 'trainee' | 'mentor')}
                    className="w-full p-2.5 rounded-xl border border-[#E4EAF0] bg-[#F8FAFB] text-[#123B59] font-bold"
                  >
                    <option value="trainee">Peserta (Trainee)</option>
                    <option value="mentor">Instruktur (Mentor)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[#123B59] font-bold mb-1">NIM / NIP</label>
                  <input
                    type="text"
                    value={newUserNim}
                    onChange={e => setNewUserNim(e.target.value)}
                    placeholder={newUserRole === 'mentor' ? 'MNT-WD-01' : 'TRN-2026-001'}
                    className="w-full p-2.5 rounded-xl border border-[#E4EAF0] bg-[#F8FAFB] text-[#123B59] font-mono font-semibold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[#123B59] font-bold mb-1">Nama Lengkap</label>
                <input
                  type="text"
                  required
                  value={newUserName}
                  onChange={e => setNewUserName(e.target.value)}
                  placeholder="Contoh: Rian Pratama"
                  className="w-full p-2.5 rounded-xl border border-[#E4EAF0] bg-[#F8FAFB] text-[#123B59] font-semibold"
                />
              </div>

              <div>
                <label className="block text-[#123B59] font-bold mb-1">Program Kejuruan</label>
                <select
                  value={newUserKejuruanId}
                  onChange={e => setNewUserKejuruanId(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-[#E4EAF0] bg-[#F8FAFB] text-[#123B59] font-semibold"
                >
                  {kejuruanList.map(k => (
                    <option key={k.id} value={k.id}>
                      {k.code} - {k.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* 8-Digit Login Code & Password generation box */}
              <div className="p-3.5 rounded-2xl bg-[#EEF6FB] border border-[#C8DCEB] space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[#123B59] text-[11px] flex items-center gap-1.5">
                    <KeyRound className="w-3.5 h-3.5 text-[#4C83B5]" />
                    <span>Kredensial Login (Dibuat Otomatis)</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setNewUserLoginCode(generate8DigitLoginCode());
                      setNewUserPassword(generateDefaultPassword());
                    }}
                    className="text-[11px] text-[#4C83B5] hover:underline flex items-center gap-1 cursor-pointer font-bold"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>Acak Ulang</span>
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] text-[#6F7F8D] font-bold mb-1">
                      Kode Login (8 Digit)
                    </label>
                    <input
                      type="text"
                      required
                      maxLength={8}
                      value={newUserLoginCode}
                      onChange={e => setNewUserLoginCode(e.target.value.replace(/\D/g, ''))}
                      className="w-full p-2 rounded-xl border border-[#A9C7DE] bg-white font-mono font-bold tracking-wider text-[#28618F]"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] text-[#6F7F8D] font-bold mb-1">
                      Password Login
                    </label>
                    <input
                      type="text"
                      required
                      value={newUserPassword}
                      onChange={e => setNewUserPassword(e.target.value)}
                      className="w-full p-2 rounded-xl border border-[#A9C7DE] bg-white font-mono font-bold text-[#123B59]"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[#123B59] font-bold mb-1">Email</label>
                  <input
                    type="email"
                    required
                    value={newUserEmail}
                    onChange={e => setNewUserEmail(e.target.value)}
                    placeholder="user@vokasi.id"
                    className="w-full p-2.5 rounded-xl border border-[#E4EAF0] bg-[#F8FAFB] text-[#123B59]"
                  />
                </div>
                <div>
                  <label className="block text-[#123B59] font-bold mb-1">No. WhatsApp</label>
                  <input
                    type="tel"
                    value={newUserPhone}
                    onChange={e => setNewUserPhone(e.target.value)}
                    placeholder="0812-xxxx-xxxx"
                    className="w-full p-2.5 rounded-xl border border-[#E4EAF0] bg-[#F8FAFB] text-[#123B59]"
                  />
                </div>
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-[#E4EAF0]">
                <button
                  type="button"
                  onClick={() => setIsAddUserModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-[#E4EAF0] text-[#6F7F8D] hover:bg-[#F8FAFB] font-bold cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#123B59] hover:bg-[#0D2F47] text-white font-bold cursor-pointer shadow-sm"
                >
                  Simpan Akun
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: IMPORT EXCEL */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0D2F47]/45 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="surface rounded-2xl border border-[#E4EAF0] w-full max-w-2xl p-6 space-y-4 shadow-2xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-[#E4EAF0] pb-3">
              <div>
                <p className="text-[10px] font-bold tracking-[.13em] text-[#4C83B5] uppercase">
                  IMPOR DATA MASSAL
                </p>
                <h3 className="text-base font-bold text-[#123B59] flex items-center gap-2">
                  <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                  <span>Impor Peserta & Mentor dari Excel</span>
                </h3>
              </div>
              <button
                onClick={() => setIsImportModalOpen(false)}
                className="text-[#6F7F8D] hover:text-[#123B59] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="overflow-y-auto space-y-4 pr-1 flex-1 text-xs">
              {/* Template Download Card */}
              <div className="p-3.5 rounded-2xl bg-[#F8FAFB] border border-[#E4EAF0] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="font-bold text-[#123B59]">
                    Belum punya format Excel yang sesuai?
                  </div>
                  <div className="text-[11px] text-[#6F7F8D] mt-0.5">
                    Gunakan template resmi kami yang sudah berisi format kolom dan kode kejuruan.
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => downloadUserImportTemplate(kejuruanList)}
                  className="surface inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-[#E4EAF0] hover:bg-white text-[#123B59] text-xs font-bold cursor-pointer shrink-0 shadow-xs"
                >
                  <Download className="w-3.5 h-3.5 text-[#4C83B5]" />
                  <span>Unduh Template Excel</span>
                </button>
              </div>

              {/* Upload Dropzone */}
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-[#A9C7DE] hover:border-[#123B59] rounded-2xl p-7 text-center cursor-pointer bg-[#F8FAFB] transition"
              >
                <Upload className="w-8 h-8 mx-auto text-[#4C83B5] mb-2" />
                <div className="font-bold text-[#123B59]">
                  {importingFile ? importingFile.name : 'Pilih atau Tarik Berkas Excel ke Sini'}
                </div>
                <p className="text-[11px] text-[#6F7F8D] mt-1">
                  Mendukung berkas .xlsx, .xls, atau .csv (Maksimal 10MB)
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx, .xls, .csv"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </div>

              {/* Error feedback */}
              {importError && (
                <div className="p-3.5 rounded-xl bg-[#FCF3F6] border border-[#E3C4D0] text-[#B84469] text-xs font-bold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-[#D95B83]" />
                  <span>{importError}</span>
                </div>
              )}

              {/* Preview Table of Parsed Users */}
              {parsedImportUsers.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[#123B59]">
                      Pratinjau Data ({parsedImportUsers.length} Akun Terdeteksi):
                    </span>
                    <span className="text-[11px] text-[#28618F] font-bold bg-[#EAF2F8] px-2.5 py-0.5 rounded-full">
                      Siap disimpan
                    </span>
                  </div>

                  <div className="max-h-48 overflow-y-auto border border-[#E4EAF0] rounded-xl surface">
                    <table className="w-full text-left text-[11px]">
                      <thead className="bg-[#F8FAFB] sticky top-0 border-b border-[#E4EAF0] text-[#6F7F8D] font-bold">
                        <tr>
                          <th className="py-2.5 px-3">No</th>
                          <th className="py-2.5 px-3">Nama</th>
                          <th className="py-2.5 px-3">Peran</th>
                          <th className="py-2.5 px-3">Kejuruan</th>
                          <th className="py-2.5 px-3 font-mono">Kode 8-Digit</th>
                          <th className="py-2.5 px-3 font-mono">Password</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#E4EAF0]">
                        {parsedImportUsers.map((u, i) => (
                          <tr key={i} className="hover:bg-[#F8FAFB]/60">
                            <td className="py-2 px-3 text-[#6F7F8D]">{i + 1}</td>
                            <td className="py-2 px-3 font-bold text-[#123B59]">
                              {u.name}
                            </td>
                            <td className="py-2 px-3 capitalize text-[#6F7F8D]">{u.role}</td>
                            <td className="py-2 px-3 text-[#6F7F8D]">{u.kejuruanName}</td>
                            <td className="py-2 px-3 font-mono font-bold text-[#28618F]">
                              {u.loginCode}
                            </td>
                            <td className="py-2 px-3 font-mono text-[#6F7F8D]">{u.password}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-[#E4EAF0] flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsImportModalOpen(false)}
                className="px-4 py-2 rounded-xl border border-[#E4EAF0] text-[#6F7F8D] hover:bg-[#F8FAFB] font-bold cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={parsedImportUsers.length === 0}
                onClick={handleApplyImport}
                className="px-5 py-2 rounded-xl bg-[#123B59] hover:bg-[#0D2F47] disabled:opacity-50 text-white font-bold cursor-pointer shadow-sm"
              >
                Terapkan & Simpan {parsedImportUsers.length} Akun
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: ADD KEJURUAN */}
      {isAddKjModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0D2F47]/45 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="surface rounded-2xl border border-[#E4EAF0] w-full max-w-md p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#E4EAF0] pb-3">
              <div>
                <p className="text-[10px] font-bold tracking-[.13em] text-[#4C83B5] uppercase">
                  MASTER DATA
                </p>
                <h3 className="text-base font-bold text-[#123B59]">
                  Tambah Program Kejuruan Baru
                </h3>
              </div>
              <button
                onClick={() => setIsAddKjModalOpen(false)}
                className="text-[#6F7F8D] hover:text-[#123B59] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateKejuruan} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-[#123B59] font-bold mb-1">Nama Kejuruan</label>
                <input
                  type="text"
                  required
                  value={newKjName}
                  onChange={e => setNewKjName(e.target.value)}
                  placeholder="Contoh: Digital Marketing & Content Creator"
                  className="w-full p-2.5 rounded-xl border border-[#E4EAF0] bg-[#F8FAFB] text-[#123B59] font-semibold"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[#123B59] font-bold mb-1">Kode Kelas</label>
                  <input
                    type="text"
                    required
                    value={newKjCode}
                    onChange={e => setNewKjCode(e.target.value)}
                    placeholder="DM-01"
                    className="w-full p-2.5 rounded-xl border border-[#E4EAF0] bg-[#F8FAFB] text-[#123B59] font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[#123B59] font-bold mb-1">Nama Mentor</label>
                  <input
                    type="text"
                    value={newKjMentorName}
                    onChange={e => setNewKjMentorName(e.target.value)}
                    placeholder="Nama Instruktur"
                    className="w-full p-2.5 rounded-xl border border-[#E4EAF0] bg-[#F8FAFB] text-[#123B59] font-semibold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[#123B59] font-bold mb-1">Deskripsi Singkat</label>
                <textarea
                  value={newKjDesc}
                  onChange={e => setNewKjDesc(e.target.value)}
                  placeholder="Kurikulum atau fokus pembelajaran..."
                  rows={2}
                  className="w-full p-2.5 rounded-xl border border-[#E4EAF0] bg-[#F8FAFB] text-[#123B59]"
                />
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-[#E4EAF0]">
                <button
                  type="button"
                  onClick={() => setIsAddKjModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-[#E4EAF0] text-[#6F7F8D] hover:bg-[#F8FAFB] font-bold cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#123B59] hover:bg-[#0D2F47] text-white font-bold cursor-pointer shadow-sm"
                >
                  Simpan Kejuruan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
