import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  KeyRound,
  Shield,
  UserCheck,
  GraduationCap,
  Eye,
  EyeOff,
  AlertCircle,
  Sparkles,
  ArrowRight,
  Lock
} from 'lucide-react';

export const LoginView: React.FC = () => {
  const { loginWithCode, loginWithAdmin, users } = useApp();

  const [activeLoginType, setActiveLoginType] = useState<'code' | 'admin'>('code');

  // Trainee / Mentor state
  const [loginCode, setLoginCode] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Admin state
  const [adminIdentifier, setAdminIdentifier] = useState('admin@hadirku.id');
  const [adminPassword, setAdminPassword] = useState('admin123');

  const [errorMessage, setErrorMessage] = useState('');

  const sampleTrainee = users.find(u => u.role === 'trainee') || {
    name: 'Aditya Pratama',
    loginCode: '18492041',
    password: '123456'
  };
  const sampleMentor = users.find(u => u.role === 'mentor') || {
    name: 'Siti Nurhaliza',
    loginCode: '82049182',
    password: 'mentor123'
  };

  const handleCodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    if (!loginCode.trim()) {
      setErrorMessage('Silakan masukkan 8-digit kode login Anda.');
      return;
    }
    const result = loginWithCode(loginCode, password);
    if (!result.success) {
      setErrorMessage(result.message);
    }
  };

  const handleAdminSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    const result = loginWithAdmin(adminIdentifier, adminPassword);
    if (!result.success) {
      setErrorMessage(result.message);
    }
  };

  const quickFillCredentials = (code: string, pass: string) => {
    setLoginCode(code);
    setPassword(pass);
    setErrorMessage('');
  };

  return (
    <div className="min-h-screen bg-[#F4F6F8] flex flex-col justify-center items-center p-4 sm:p-6 font-sans">
      <div className="w-full max-w-md space-y-6">
        {/* App Branding from style.html */}
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-3">
            <svg className="w-11 h-13 shrink-0" viewBox="0 0 50 58" aria-label="Logo HadirKu Skill" role="img">
              <path d="M4 3h42v32c0 10-9 16-21 21C13 51 4 45 4 35V3Z" fill="#123B59" />
              <path d="M6 5h38v29c0 9-8 14-19 19C14 48 6 43 6 34V5Z" fill="#0D2F47" />
              <path d="M10 29h30v5c-3 7-8 10-15 14-7-4-12-7-15-14v-5Z" fill="#fff" />
              <path d="M16 15c4-3 7 1 9 3 2-2 5-6 9-3v8c-3-2-6-2-9 0-3-2-6-2-9 0v-8Z" fill="#fff" />
              <path d="M15 38c3 0 4 4 6 4 2 0 2-7 4-7s2 7 4 7c2 0 3-4 6-4" fill="none" stroke="#0D2F47" strokeWidth="2" />
            </svg>
            <div className="text-left">
              <div className="brand-punya text-[#123B59]">hadir</div>
              <div className="brand-skill">
                SK<b>I</b>LL
              </div>
            </div>
          </div>
          <p className="text-[10px] font-bold tracking-[.16em] text-[#4C83B5] uppercase pt-1">
            PRESENSI MAGANG HARIAN
          </p>
          <p className="text-xs text-[#6F7F8D]">
            Sistem Absensi Berjenjang: Admin &middot; Mentor &middot; Peserta
          </p>
        </div>

        {/* Surface Card Box */}
        <div className="surface rounded-2xl p-6 sm:p-7 shadow-xl space-y-5">
          {/* Tab Selector */}
          <div className="grid grid-cols-2 p-1 bg-[#F4F6F8] rounded-xl border border-[#E4EAF0]">
            <button
              type="button"
              onClick={() => {
                setActiveLoginType('code');
                setErrorMessage('');
              }}
              className={`py-2 px-3 text-xs font-bold rounded-lg transition cursor-pointer flex items-center justify-center gap-1.5 ${
                activeLoginType === 'code'
                  ? 'bg-[#123B59] text-white shadow-xs'
                  : 'text-[#6F7F8D] hover:text-[#123B59]'
              }`}
            >
              <KeyRound className="w-3.5 h-3.5" />
              <span>Kode 8-Digit</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveLoginType('admin');
                setErrorMessage('');
              }}
              className={`py-2 px-3 text-xs font-bold rounded-lg transition cursor-pointer flex items-center justify-center gap-1.5 ${
                activeLoginType === 'admin'
                  ? 'bg-[#123B59] text-white shadow-xs'
                  : 'text-[#6F7F8D] hover:text-[#123B59]'
              }`}
            >
              <Shield className="w-3.5 h-3.5" />
              <span>Administrator</span>
            </button>
          </div>

          {/* Error Notification */}
          {errorMessage && (
            <div className="p-3.5 rounded-xl border border-[#E3C4D0] bg-[#FCF3F6] flex items-start gap-2.5 text-xs text-[#B84469] font-medium">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-[#D95B83]" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* TAB 1: CODE 8 DIGIT (TRAINEE & MENTOR) */}
          {activeLoginType === 'code' ? (
            <form onSubmit={handleCodeSubmit} className="space-y-4 text-xs">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="font-bold text-[#123B59]">
                    Kode Login 8 Digit (Diberikan Admin)
                  </label>
                  <span className="text-[10px] text-[#6F7F8D]">Peserta & Instruktur</span>
                </div>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-[#6F7F8D] absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    maxLength={12}
                    value={loginCode}
                    onChange={e => setLoginCode(e.target.value)}
                    placeholder="Contoh: 18492041"
                    className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-[#E4EAF0] bg-[#F8FAFB] text-[#123B59] font-mono text-sm tracking-wider outline-none focus:border-[#4C83B5] focus:ring-2 focus:ring-[#4C83B5]/20"
                    autoFocus
                  />
                </div>
                <p className="text-[11px] text-[#6F7F8D] mt-1">
                  Masukkan kode akses 8 digit unik yang terdaftar pada akun Anda.
                </p>
              </div>

              <div>
                <label className="block font-bold text-[#123B59] mb-1.5">
                  Password Akun
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-[#6F7F8D] absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Masukkan password..."
                    className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-[#E4EAF0] bg-[#F8FAFB] text-[#123B59] outline-none focus:border-[#4C83B5] focus:ring-2 focus:ring-[#4C83B5]/20"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#6F7F8D] hover:text-[#123B59] cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3.5 rounded-xl bg-[#123B59] hover:bg-[#0D2F47] text-white font-bold transition cursor-pointer shadow-md flex items-center justify-center gap-2 hover:-translate-y-0.5 active:translate-y-0 text-sm"
              >
                <span>Masuk ke Sistem</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              {/* Quick Auto-Fill Demo Accounts */}
              <div className="pt-4 border-t border-[#E4EAF0] space-y-2">
                <div className="text-[11px] font-bold text-[#6F7F8D] uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-3 h-3 text-[#4C83B5]" />
                  <span>Akun Demo Cepat (Siap Uji):</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      quickFillCredentials(
                        sampleTrainee.loginCode || '18492041',
                        sampleTrainee.password || '123456'
                      )
                    }
                    className="p-2.5 rounded-xl border border-[#E4EAF0] bg-[#F8FAFB] hover:bg-[#EAF2F8] hover:border-[#4C83B5] text-left transition cursor-pointer group"
                  >
                    <div className="flex items-center gap-1 text-[11px] font-bold text-[#123B59]">
                      <GraduationCap className="w-3.5 h-3.5 text-[#4C83B5]" />
                      <span>Peserta ({sampleTrainee.name.split(' ')[0]})</span>
                    </div>
                    <div className="text-[10px] text-[#6F7F8D] font-mono mt-0.5">
                      Kode: {sampleTrainee.loginCode || '18492041'} &middot; pw: {sampleTrainee.password || '123456'}
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      quickFillCredentials(
                        sampleMentor.loginCode || '82049182',
                        sampleMentor.password || 'mentor123'
                      )
                    }
                    className="p-2.5 rounded-xl border border-[#E4EAF0] bg-[#F8FAFB] hover:bg-[#EAF2F8] hover:border-[#4C83B5] text-left transition cursor-pointer group"
                  >
                    <div className="flex items-center gap-1 text-[11px] font-bold text-[#123B59]">
                      <UserCheck className="w-3.5 h-3.5 text-[#4C83B5]" />
                      <span>Mentor ({sampleMentor.name.split(' ')[0]})</span>
                    </div>
                    <div className="text-[10px] text-[#6F7F8D] font-mono mt-0.5">
                      Kode: {sampleMentor.loginCode || '82049182'} &middot; pw: {sampleMentor.password || 'mentor123'}
                    </div>
                  </button>
                </div>
              </div>
            </form>
          ) : (
            /* TAB 2: ADMIN LOGIN */
            <form onSubmit={handleAdminSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-[#123B59] mb-1.5">
                  Email Administrator
                </label>
                <input
                  type="email"
                  value={adminIdentifier}
                  onChange={e => setAdminIdentifier(e.target.value)}
                  placeholder="admin@hadirku.id"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#E4EAF0] bg-[#F8FAFB] text-[#123B59] outline-none focus:border-[#4C83B5]"
                />
              </div>

              <div>
                <label className="block font-bold text-[#123B59] mb-1.5">
                  Password Administrator
                </label>
                <input
                  type="password"
                  value={adminPassword}
                  onChange={e => setAdminPassword(e.target.value)}
                  placeholder="admin123"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#E4EAF0] bg-[#F8FAFB] text-[#123B59] outline-none focus:border-[#4C83B5]"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3.5 rounded-xl bg-[#123B59] hover:bg-[#0D2F47] text-white font-bold transition cursor-pointer shadow-md flex items-center justify-center gap-2 hover:-translate-y-0.5 active:translate-y-0 text-sm"
              >
                <Shield className="w-4 h-4 text-[#A9C7DE]" />
                <span>Masuk sebagai Administrator</span>
              </button>

              <div className="pt-2 text-center">
                <button
                  type="button"
                  onClick={() => {
                    loginWithAdmin('admin@hadirku.id', 'admin123');
                  }}
                  className="text-xs font-bold text-[#4C83B5] hover:underline cursor-pointer"
                >
                  1-Klik Masuk sebagai Admin (Bambang Sudirman) &rarr;
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Footer info */}
        <div className="text-center text-xs text-[#6F7F8D]">
          <p>Presensi Magang Harian &middot; Punya SKILL Vokasi 2026</p>
        </div>
      </div>
    </div>
  );
};
