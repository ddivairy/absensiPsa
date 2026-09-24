import React from 'react';
import { useApp } from '../context/AppContext';
import { Check, X, Shield, GraduationCap, UserCheck } from 'lucide-react';

interface RoleSwitcherModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const RoleSwitcherModal: React.FC<RoleSwitcherModalProps> = ({ isOpen, onClose }) => {
  const { currentUser, users, switchUser } = useApp();

  if (!isOpen) return null;

  const admins = users.filter(u => u.role === 'admin');
  const mentors = users.filter(u => u.role === 'mentor');
  const trainees = users.filter(u => u.role === 'trainee');

  const handleSelect = (userId: string) => {
    switchUser(userId);
    onClose();
  };

  const renderUserItem = (u: (typeof users)[0], roleLabel: string, RoleIcon: React.ElementType) => {
    const isCurrent = currentUser.id === u.id;
    return (
      <div
        key={u.id}
        onClick={() => handleSelect(u.id)}
        className={`flex items-center justify-between p-3 rounded-xl border transition cursor-pointer ${
          isCurrent
            ? 'border-[#4C83B5] bg-[#EAF2F8]'
            : 'border-[#E4EAF0] bg-white hover:bg-[#F8FAFB] hover:border-[#C8DCEB]'
        }`}
      >
        <div className="flex items-center gap-3 min-w-0">
          {u.avatar ? (
            <img
              src={u.avatar}
              alt={u.name}
              className="w-9 h-9 rounded-xl object-cover border border-[#E4EAF0] shrink-0"
            />
          ) : (
            <div className="w-9 h-9 rounded-xl bg-[#4C83B5] text-white font-bold flex items-center justify-center shrink-0 text-sm">
              {u.name.charAt(0)}
            </div>
          )}
          <div className="truncate text-xs">
            <div className="font-bold text-[#123B59] truncate flex items-center gap-1.5">
              <span>{u.name}</span>
              <RoleIcon className="w-3 h-3 text-[#4C83B5]" />
            </div>
            <div className="text-[#6F7F8D] text-[11px] truncate mt-0.5">
              {roleLabel} &middot; {u.kejuruanName || u.email}
            </div>
            {u.loginCode && (
              <div className="text-[10px] text-[#6F7F8D] font-mono mt-0.5">
                Kode: <strong className="text-[#123B59]">{u.loginCode}</strong> &middot; PW: <span className="text-[#123B59]">{u.password || '123456'}</span>
              </div>
            )}
          </div>
        </div>

        {isCurrent ? (
          <span className="flex items-center gap-1 text-xs text-[#28618F] font-bold rounded-full bg-white/80 px-2.5 py-1 border border-[#C8DCEB] shrink-0">
            <Check className="w-3.5 h-3.5 text-[#4C83B5]" />
            <span>Aktif</span>
          </span>
        ) : (
          <span className="text-xs font-bold text-[#4C83B5] hover:underline shrink-0">
            Pilih &rarr;
          </span>
        )}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0D2F47]/45 backdrop-blur-xs animate-in fade-in">
      <div className="surface bg-white rounded-2xl max-w-xl w-full p-5 sm:p-6 max-h-[85vh] flex flex-col shadow-2xl border border-[#E4EAF0]">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#E4EAF0]">
          <div>
            <p className="text-[10px] font-bold tracking-[.13em] text-[#4C83B5] uppercase">
              MODE DEMO CEPAT
            </p>
            <h2 className="text-lg font-bold text-[#123B59]">
              Beralih Akun & Peran
            </h2>
            <p className="text-xs text-[#6F7F8D] mt-0.5">
              Pilih akun untuk menguji peran Admin, Mentor, atau Peserta (Token JWT diterbitkan ulang otomatis via TiDB).
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-[#6F7F8D] hover:text-[#123B59] hover:bg-[#F4F6F8] rounded-xl transition cursor-pointer"
            aria-label="Tutup"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* List */}
        <div className="overflow-y-auto py-3 space-y-4 flex-1 pr-1">
          {/* Admin */}
          <div>
            <div className="text-[10px] font-bold text-[#6F7F8D] uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Shield className="w-3 h-3 text-[#123B59]" />
              <span>Administrator Pusat</span>
            </div>
            <div className="space-y-2">
              {admins.map(u => renderUserItem(u, 'Admin Pusat', Shield))}
            </div>
          </div>

          {/* Mentors */}
          <div>
            <div className="text-[10px] font-bold text-[#6F7F8D] uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <GraduationCap className="w-3 h-3 text-[#4C83B5]" />
              <span>Instruktur / Mentor Kejuruan</span>
            </div>
            <div className="space-y-2">
              {mentors.map(u => renderUserItem(u, 'Mentor Kejuruan', GraduationCap))}
            </div>
          </div>

          {/* Trainees */}
          <div>
            <div className="text-[10px] font-bold text-[#6F7F8D] uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <UserCheck className="w-3 h-3 text-[#D95B83]" />
              <span>Peserta Magang (Trainee)</span>
            </div>
            <div className="space-y-2">
              {trainees.map(u => renderUserItem(u, 'Peserta Magang', UserCheck))}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="pt-3 border-t border-[#E4EAF0] flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-[#E4EAF0] bg-white hover:bg-[#F8FAFB] px-4 py-2 text-xs font-bold text-[#123B59] transition cursor-pointer shadow-xs"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
