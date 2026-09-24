import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { Mission, MissionDifficulty, MissionSubmission } from '../../types';
import {
  Target,
  Plus,
  CheckCircle2,
  Clock,
  AlertCircle,
  ExternalLink,
  Award,
  Sparkles,
  Search,
  Filter,
  Trash2,
  Edit3,
  X,
  Send,
  MessageSquare,
  Check,
  ChevronRight,
  FileText,
  UserCheck,
  Calendar,
  Flame
} from 'lucide-react';
import { formatIndonesianDate, getTodayDateString } from '../../utils/dateUtils';

export const MissionManagementView: React.FC = () => {
  const {
    currentUser,
    users,
    kejuruanList,
    missions,
    missionSubmissions,
    addMission,
    updateMission,
    deleteMission,
    submitMissionWork,
    reviewMissionSubmission,
    getUserPoints
  } = useApp();

  const isMentor = currentUser.role === 'mentor';
  const isAdmin = currentUser.role === 'admin';
  const isTrainee = currentUser.role === 'trainee';

  const [activeTab, setActiveTab] = useState<'missions' | 'submissions'>(
    isMentor ? 'missions' : 'missions'
  );

  const [selectedKejuruanFilter, setSelectedKejuruanFilter] = useState<string>(
    isMentor ? currentUser.kejuruanId || 'all' : isTrainee ? currentUser.kejuruanId || 'all' : 'all'
  );
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modal states for creating / editing mission (Mentor / Admin)
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMissionId, setEditingMissionId] = useState<string | null>(null);
  const [formTitle, setFormTitle] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formPoints, setFormPoints] = useState<number>(100);
  const [formDifficulty, setFormDifficulty] = useState<MissionDifficulty>('Sedang');
  const [formCategory, setFormCategory] = useState('');
  const [formDueDate, setFormDueDate] = useState('');
  const [formSubmissionGuide, setFormSubmissionGuide] = useState('');
  const [formKejuruanId, setFormKejuruanId] = useState(
    isMentor ? currentUser.kejuruanId || kejuruanList[0]?.id : kejuruanList[0]?.id
  );

  // Modal states for submitting mission work (Trainee)
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [targetMissionForSubmit, setTargetMissionForSubmit] = useState<Mission | null>(null);
  const [submissionLink, setSubmissionLink] = useState('');
  const [submissionNotes, setSubmissionNotes] = useState('');
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Modal states for reviewing submission (Mentor / Admin)
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [selectedSubmissionForReview, setSelectedSubmissionForReview] = useState<MissionSubmission | null>(null);
  const [reviewFeedback, setReviewFeedback] = useState('');
  const [reviewAwardedPoints, setReviewAwardedPoints] = useState<number>(100);

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Filter missions
  const filteredMissions = useMemo(() => {
    return missions.filter(m => {
      if (selectedKejuruanFilter !== 'all' && m.kejuruanId !== selectedKejuruanFilter) {
        return false;
      }
      if (selectedDifficulty !== 'all' && m.difficulty !== selectedDifficulty) {
        return false;
      }
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchTitle = m.title.toLowerCase().includes(q);
        const matchDesc = m.description.toLowerCase().includes(q);
        const matchCat = m.category?.toLowerCase().includes(q);
        if (!matchTitle && !matchDesc && !matchCat) return false;
      }
      return true;
    });
  }, [missions, selectedKejuruanFilter, selectedDifficulty, searchQuery]);

  // Submissions filtered for Mentor / Admin
  const relevantSubmissions = useMemo(() => {
    return missionSubmissions.filter(sub => {
      if (isMentor && currentUser.kejuruanId) {
        return sub.kejuruanId === currentUser.kejuruanId;
      }
      if (selectedKejuruanFilter !== 'all' && sub.kejuruanId !== selectedKejuruanFilter) {
        return false;
      }
      return true;
    });
  }, [missionSubmissions, isMentor, currentUser.kejuruanId, selectedKejuruanFilter]);

  const pendingSubmissionsCount = useMemo(() => {
    return relevantSubmissions.filter(s => s.status === 'pending').length;
  }, [relevantSubmissions]);

  // Trainee personal stats
  const traineePoints = useMemo(() => {
    if (!isTrainee) return 0;
    return getUserPoints(currentUser.id);
  }, [isTrainee, currentUser.id, getUserPoints, missionSubmissions]);

  const traineeCompletedMissions = useMemo(() => {
    return missionSubmissions.filter(s => s.traineeId === currentUser.id && s.status === 'approved').length;
  }, [missionSubmissions, currentUser.id]);

  // Open Create Mission Modal
  const handleOpenCreateModal = () => {
    setEditingMissionId(null);
    setFormTitle('');
    setFormDescription('');
    setFormPoints(100);
    setFormDifficulty('Sedang');
    setFormCategory('');
    setFormDueDate('');
    setFormSubmissionGuide('Sertakan tautan repositori GitHub / Figma / Google Drive beserta catatan ringkasan pengerjaan.');
    setFormKejuruanId(isMentor ? currentUser.kejuruanId || kejuruanList[0]?.id : kejuruanList[0]?.id);
    setIsModalOpen(true);
  };

  // Open Edit Mission Modal
  const handleOpenEditModal = (m: Mission) => {
    setEditingMissionId(m.id);
    setFormTitle(m.title);
    setFormDescription(m.description);
    setFormPoints(m.points);
    setFormDifficulty(m.difficulty);
    setFormCategory(m.category || '');
    setFormDueDate(m.dueDate);
    setFormSubmissionGuide(m.submissionGuide || '');
    setFormKejuruanId(m.kejuruanId);
    setIsModalOpen(true);
  };

  const handleSaveMission = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim() || !formDescription.trim()) {
      alert('Judul dan deskripsi misi wajib diisi.');
      return;
    }

    const assignedKj = kejuruanList.find(k => k.id === formKejuruanId) || kejuruanList[0];

    if (editingMissionId) {
      updateMission(editingMissionId, {
        title: formTitle,
        description: formDescription,
        points: Number(formPoints),
        difficulty: formDifficulty,
        category: formCategory || 'Tugas Praktik',
        dueDate: formDueDate || '2026-10-31',
        submissionGuide: formSubmissionGuide,
        kejuruanId: assignedKj.id,
        kejuruanName: assignedKj.name
      });
      showToast('Misi kejuruan berhasil diperbarui!');
    } else {
      addMission({
        title: formTitle,
        description: formDescription,
        points: Number(formPoints),
        difficulty: formDifficulty,
        category: formCategory || 'Tugas Praktik',
        dueDate: formDueDate || '2026-10-31',
        submissionGuide: formSubmissionGuide,
        kejuruanId: assignedKj.id,
        kejuruanName: assignedKj.name,
        mentorId: currentUser.id,
        mentorName: currentUser.name,
        status: 'active'
      });
      showToast('Misi baru berhasil diterbitkan untuk peserta!');
    }

    setIsModalOpen(false);
  };

  const handleDeleteMission = (id: string, title: string) => {
    if (confirm(`Apakah Anda yakin ingin menghapus misi "${title}"?`)) {
      deleteMission(id);
      showToast('Misi berhasil dihapus.');
    }
  };

  // Trainee Submission Modal
  const handleOpenSubmitModal = (m: Mission) => {
    setTargetMissionForSubmit(m);
    setSubmissionLink('');
    setSubmissionNotes('');
    setSubmitError(null);
    setIsSubmitModalOpen(true);
  };

  const handleSubmitWork = (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetMissionForSubmit) return;
    if (!submissionNotes.trim()) {
      setSubmitError('Catatan hasil pengerjaan wajib diisi.');
      return;
    }

    const res = submitMissionWork({
      missionId: targetMissionForSubmit.id,
      submissionLink: submissionLink.trim() || undefined,
      notes: submissionNotes.trim()
    });

    if (res.success) {
      showToast(res.message);
      setIsSubmitModalOpen(false);
    } else {
      setSubmitError(res.message);
    }
  };

  // Mentor Review Modal
  const handleOpenReviewModal = (submission: MissionSubmission) => {
    setSelectedSubmissionForReview(submission);
    setReviewFeedback(submission.feedback || '');
    setReviewAwardedPoints(submission.points);
    setIsReviewModalOpen(true);
  };

  const handleConfirmReview = (status: 'approved' | 'rejected') => {
    if (!selectedSubmissionForReview) return;
    reviewMissionSubmission(
      selectedSubmissionForReview.id,
      status,
      reviewFeedback.trim() || (status === 'approved' ? 'Tugas disetujui dengan predikat memuaskan.' : 'Perlu perbaikan sesuai arahan instruktur.'),
      Number(reviewAwardedPoints)
    );
    showToast(
      status === 'approved'
        ? `Tugas disetujui! ${reviewAwardedPoints} poin berhasil diberikan kepada ${selectedSubmissionForReview.traineeName}.`
        : `Tugas peserta ${selectedSubmissionForReview.traineeName} telah ditolak dengan catatan evaluasi.`
    );
    setIsReviewModalOpen(false);
  };

  const getDifficultyBadge = (difficulty: MissionDifficulty) => {
    switch (difficulty) {
      case 'Mudah':
        return (
          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold tracking-wide bg-[#EAF2F8] text-[#28618F] border border-[#A9C7DE]/40">
            Mudah
          </span>
        );
      case 'Sedang':
        return (
          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold tracking-wide bg-[#EEF5FA] text-[#4C83B5] border border-[#A9C7DE]/40">
            Sedang
          </span>
        );
      case 'Tantangan':
        return (
          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold tracking-wide bg-[#FCF3F6] text-[#B84469] border border-[#D95B83]/20 flex items-center gap-1">
            <Flame className="w-3 h-3" />
            Tantangan
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 py-2.5 px-4 rounded-xl bg-[#0D2F47] text-white text-xs font-medium shadow-lg flex items-center gap-2">
          <Check className="w-3.5 h-3.5 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="text-[10px] font-bold tracking-[.14em] text-[#4C83B5] uppercase mb-1">
            Kejuruan Vokasi
          </p>
          <h1 className="text-xl sm:text-2xl font-bold text-[#123B59]">
            Misi &amp; Tugas Kejuruan
          </h1>
          <p className="text-xs text-[#6F7F8D] mt-0.5">
            {isMentor
              ? 'Rancang misi tantangan untuk peserta kejuruan Anda, validasi tugas, dan berikan poin penghargaan.'
              : isTrainee
              ? 'Kerjakan misi tantangan sesuai kejuruan Anda, kumpulkan poin, dan raih posisi teratas di Hall of Fame!'
              : 'Kelola dan monitor seluruh misi tantangan vokasi lintas kejuruan.'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Action Button for Mentor / Admin */}
          {(isMentor || isAdmin) && (
            <button
              onClick={handleOpenCreateModal}
              className="px-4 py-2 rounded-xl bg-[#123B59] hover:bg-[#0D2F47] text-white text-xs font-semibold shadow-sm flex items-center gap-1.5 transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Buat Misi Baru</span>
            </button>
          )}

          {/* Quick Stats for Trainee */}
          {isTrainee && (
            <div className="surface flex items-center gap-3 px-3.5 py-2 rounded-xl">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                  <Award className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-[10px] text-[#6F7F8D]">Poin Anda</div>
                  <div className="text-sm font-bold text-amber-600 font-mono tabular-nums leading-none">
                    {traineePoints} Pts
                  </div>
                </div>
              </div>
              <div className="h-6 w-px bg-[#E4EAF0]" />
              <div>
                <div className="text-[10px] text-[#6F7F8D]">Misi Selesai</div>
                <div className="text-sm font-bold text-[#123B59] font-mono tabular-nums leading-none">
                  {traineeCompletedMissions}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Tabs Switcher for Mentor / Admin */}
      {(isMentor || isAdmin) && (
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('missions')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition cursor-pointer flex items-center gap-2 ${
              activeTab === 'missions'
                ? 'bg-[#123B59] text-white shadow-sm'
                : 'bg-white border border-[#E4EAF0] text-[#6F7F8D] hover:text-[#123B59] hover:border-[#4C83B5]'
            }`}
          >
            <Target className="w-3.5 h-3.5" />
            <span>Katalog Misi ({filteredMissions.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('submissions')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition cursor-pointer flex items-center gap-2 ${
              activeTab === 'submissions'
                ? 'bg-[#123B59] text-white shadow-sm'
                : 'bg-white border border-[#E4EAF0] text-[#6F7F8D] hover:text-[#123B59] hover:border-[#4C83B5]'
            }`}
          >
            <UserCheck className="w-3.5 h-3.5" />
            <span>Review Tugas Masuk</span>
            {pendingSubmissionsCount > 0 && (
              <span className="px-1.5 py-0.5 rounded-full bg-[#D95B83] text-white font-bold text-[10px]">
                {pendingSubmissionsCount}
              </span>
            )}
          </button>
        </div>
      )}

      {/* Filters Bar */}
      <div className="surface flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 rounded-2xl">
        <div className="flex flex-wrap items-center gap-2 flex-1">
          <div className="relative min-w-[200px] flex-1 sm:max-w-xs">
            <Search className="w-3.5 h-3.5 text-[#A9C7DE] absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari misi, kategori, atau topik..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-[#E4EAF0] bg-[#F4F6F8] text-[#123B59] placeholder-[#A9C7DE] outline-none focus:ring-1 focus:ring-[#4C83B5]"
            />
          </div>

          {/* Kejuruan Filter */}
          {!isTrainee && (
            <select
              value={selectedKejuruanFilter}
              onChange={e => setSelectedKejuruanFilter(e.target.value)}
              className="text-xs py-1.5 px-2.5 rounded-lg border border-[#E4EAF0] bg-[#F4F6F8] text-[#123B59] outline-none"
            >
              <option value="all">Semua Program Kejuruan</option>
              {kejuruanList.map(k => (
                <option key={k.id} value={k.id}>
                  {k.code} - {k.name}
                </option>
              ))}
            </select>
          )}

          {/* Difficulty Filter */}
          <select
            value={selectedDifficulty}
            onChange={e => setSelectedDifficulty(e.target.value)}
            className="text-xs py-1.5 px-2.5 rounded-lg border border-[#E4EAF0] bg-[#F4F6F8] text-[#123B59] outline-none"
          >
            <option value="all">Semua Tingkat Kesulitan</option>
            <option value="Mudah">Mudah</option>
            <option value="Sedang">Sedang</option>
            <option value="Tantangan">Tantangan</option>
          </select>
        </div>

        <div className="text-[11px] text-[#6F7F8D] self-center">
          Menampilkan <strong className="text-[#123B59]">{filteredMissions.length}</strong> misi
        </div>
      </div>

      {/* VIEW 1: MISSIONS CATALOG */}
      {activeTab === 'missions' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredMissions.length === 0 ? (
            <div className="col-span-full py-12 text-center surface rounded-2xl text-[#6F7F8D] text-xs">
              Tidak ada misi yang sesuai dengan filter pencarian.
            </div>
          ) : (
            filteredMissions.map(mission => {
              // Check trainee's personal submission for this mission
              const mySubmission = isTrainee
                ? missionSubmissions.find(
                    s => s.missionId === mission.id && s.traineeId === currentUser.id
                  )
                : null;

              const isCompleted = mySubmission?.status === 'approved';
              const isPending = mySubmission?.status === 'pending';
              const isRejected = mySubmission?.status === 'rejected';

              // Total submissions count across trainees
              const totalSubs = missionSubmissions.filter(s => s.missionId === mission.id);
              const approvedSubs = totalSubs.filter(s => s.status === 'approved').length;

              return (
                <div
                  key={mission.id}
                  className={`surface soft-hover rounded-2xl flex flex-col justify-between p-4 ${
                    isCompleted ? 'border-emerald-300 bg-emerald-50/10' : ''
                  }`}
                >
                  <div>
                    {/* Header: Kejuruan & Points badge */}
                    <div className="flex items-center justify-between gap-2 mb-2.5">
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-[#EAF2F8] text-[#4C83B5] truncate max-w-[170px]">
                        {mission.kejuruanName}
                      </span>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {getDifficultyBadge(mission.difficulty)}
                        <span className="px-2 py-0.5 rounded-full text-xs font-bold font-mono bg-[#123B59] text-white flex items-center gap-1">
                          <Award className="w-3 h-3" />
                          <span>+{mission.points} Pts</span>
                        </span>
                      </div>
                    </div>

                    {/* Mission Title */}
                    <h3 className="font-semibold text-sm text-[#123B59] line-clamp-2 leading-snug">
                      {mission.title}
                    </h3>

                    {/* Mission Description */}
                    <p className="text-xs text-[#6F7F8D] mt-2 line-clamp-3 leading-relaxed">
                      {mission.description}
                    </p>

                    {/* Guide Info */}
                    {mission.submissionGuide && (
                      <div className="mt-3 p-2 rounded-lg bg-[#F4F6F8] border border-[#E4EAF0] text-[11px] text-[#6F7F8D]">
                        <span className="font-semibold text-[#123B59] block mb-0.5">
                          Ketentuan Pengumpulan:
                        </span>
                        <span className="line-clamp-2">{mission.submissionGuide}</span>
                      </div>
                    )}
                  </div>

                  {/* Card Footer */}
                  <div className="mt-4 pt-3 border-t border-[#E4EAF0]">
                    <div className="flex items-center justify-between text-[11px] text-[#A9C7DE] mb-3">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        <span>Batas: {mission.dueDate || 'Sesuai Jadwal'}</span>
                      </span>
                      <span>{approvedSubs} peserta selesai</span>
                    </div>

                    {/* Trainee Actions */}
                    {isTrainee && (
                      <div>
                        {isCompleted ? (
                          <div className="w-full py-2 px-3 rounded-xl bg-emerald-50 text-emerald-700 text-xs font-semibold flex items-center justify-center gap-1.5 border border-emerald-200">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                            <span>Misi Selesai (+{mySubmission.points} Pts Diperoleh)</span>
                          </div>
                        ) : isPending ? (
                          <div className="w-full py-2 px-3 rounded-xl bg-[#FFF5E6] text-[#C05621] border border-orange-200 text-xs font-semibold flex items-center justify-center gap-1.5">
                            <Clock className="w-4 h-4" />
                            <span>Menunggu Review Mentor</span>
                          </div>
                        ) : isRejected ? (
                          <button
                            onClick={() => handleOpenSubmitModal(mission)}
                            className="w-full py-2 px-3 rounded-xl bg-[#FCF3F6] hover:bg-[#D95B83] hover:text-white text-[#B84469] text-xs font-semibold flex items-center justify-center gap-1.5 border border-[#D95B83]/30 transition cursor-pointer"
                          >
                            <Send className="w-3.5 h-3.5" />
                            <span>Revisi &amp; Kirim Ulang Tugas</span>
                          </button>
                        ) : (
                          <button
                            onClick={() => handleOpenSubmitModal(mission)}
                            className="w-full py-2 px-3 rounded-xl bg-[#123B59] hover:bg-[#0D2F47] text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer"
                          >
                            <Send className="w-3.5 h-3.5" />
                            <span>Kerjakan &amp; Kirim Hasil Misi</span>
                          </button>
                        )}

                        {/* If feedback exists from mentor */}
                        {mySubmission?.feedback && (
                          <div className="mt-2 p-2 rounded-lg bg-[#F4F6F8] border border-[#E4EAF0] text-[11px] text-[#6F7F8D]">
                            <strong className="text-[#123B59]">Catatan Mentor:</strong> {mySubmission.feedback}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Mentor / Admin Actions */}
                    {(isMentor || isAdmin) && (
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[11px] text-[#A9C7DE] truncate">
                          Oleh: {mission.mentorName}
                        </span>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleOpenEditModal(mission)}
                            className="p-1.5 rounded-lg text-[#6F7F8D] hover:text-[#4C83B5] hover:bg-[#EAF2F8] transition cursor-pointer"
                            title="Edit Misi"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteMission(mission.id, mission.title)}
                            className="p-1.5 rounded-lg text-[#6F7F8D] hover:text-[#D95B83] hover:bg-[#FCF3F6] transition cursor-pointer"
                            title="Hapus Misi"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* VIEW 2: SUBMISSIONS REVIEW (FOR MENTOR & ADMIN) */}
      {activeTab === 'submissions' && (isMentor || isAdmin) && (
        <div className="surface rounded-2xl overflow-hidden">
          <div className="p-4 border-b border-[#E4EAF0] flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold tracking-[.14em] text-[#4C83B5] uppercase mb-0.5">
                Evaluasi Tugas
              </p>
              <h2 className="text-sm font-bold text-[#123B59]">
                Daftar Pengumpulan Misi Peserta
              </h2>
              <p className="text-xs text-[#6F7F8D]">
                Tinjau bukti pengerjaan peserta, verifikasi kualitas tugas, dan tetapkan perolehan poin.
              </p>
            </div>
            <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-[#EAF2F8] text-[#28618F]">
              Total {relevantSubmissions.length} Tugas
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[#E4EAF0] text-[#6F7F8D] text-[11px] font-semibold bg-[#F8FAFB]">
                  <th className="py-2.5 px-4">Peserta Pelatihan</th>
                  <th className="py-2.5 px-3">Misi Kejuruan</th>
                  <th className="py-2.5 px-3">Tautan Tugas</th>
                  <th className="py-2.5 px-3">Catatan Peserta</th>
                  <th className="py-2.5 px-3">Status &amp; Poin</th>
                  <th className="py-2.5 px-4 text-right">Aksi Mentor</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E4EAF0]">
                {relevantSubmissions.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-10 text-center text-[#6F7F8D]">
                      Belum ada tugas misi yang dikirimkan oleh peserta.
                    </td>
                  </tr>
                ) : (
                  relevantSubmissions.map(sub => {
                    const isPending = sub.status === 'pending';
                    const isApproved = sub.status === 'approved';
                    const isRejected = sub.status === 'rejected';

                    return (
                      <tr
                        key={sub.id}
                        className="hover:bg-[#F4F6F8] transition"
                      >
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2.5">
                            <img
                              src={sub.traineeAvatar}
                              alt={sub.traineeName}
                              className="w-8 h-8 rounded-full object-cover border border-[#E4EAF0]"
                            />
                            <div>
                              <div className="font-semibold text-[#123B59]">
                                {sub.traineeName}
                              </div>
                              <div className="text-[11px] text-[#A9C7DE]">
                                {sub.traineeNim} &middot; {sub.kejuruanName}
                              </div>
                            </div>
                          </div>
                        </td>

                        <td className="py-3 px-3">
                          <div className="font-medium text-[#123B59] max-w-[200px] truncate">
                            {sub.missionTitle}
                          </div>
                          <div className="text-[10px] text-[#A9C7DE]">{sub.submittedAt}</div>
                        </td>

                        <td className="py-3 px-3">
                          {sub.submissionLink ? (
                            <a
                              href={sub.submissionLink}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 text-[#4C83B5] hover:underline max-w-[160px] truncate"
                              title={sub.submissionLink}
                            >
                              <ExternalLink className="w-3 h-3 shrink-0" />
                              <span className="truncate">{sub.submissionLink}</span>
                            </a>
                          ) : (
                            <span className="text-[#A9C7DE] italic">Tidak ada tautan</span>
                          )}
                        </td>

                        <td className="py-3 px-3 max-w-[220px]">
                          <p className="line-clamp-2 text-[#6F7F8D]">
                            {sub.notes}
                          </p>
                          {sub.feedback && (
                            <div className="mt-1 text-[10px] text-[#A9C7DE] italic">
                              Catatan Mentor: "{sub.feedback}"
                            </div>
                          )}
                        </td>

                        <td className="py-3 px-3">
                          {isPending && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-[#FFF5E6] text-[#C05621] border border-orange-200">
                              <Clock className="w-3 h-3" />
                              <span>Menunggu Review</span>
                            </span>
                          )}
                          {isApproved && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              <span>Disetujui (+{sub.points} Pts)</span>
                            </span>
                          )}
                          {isRejected && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-[#FCF3F6] text-[#B84469] border border-[#D95B83]/20">
                              <AlertCircle className="w-3 h-3" />
                              <span>Perlu Revisi</span>
                            </span>
                          )}
                        </td>

                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => handleOpenReviewModal(sub)}
                            className="px-3 py-1.5 rounded-lg border border-[#E4EAF0] bg-white hover:bg-[#EAF2F8] hover:border-[#4C83B5] text-xs font-semibold text-[#123B59] transition cursor-pointer"
                          >
                            {isPending ? 'Beri Penilaian & Poin' : 'Ubah Penilaian'}
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL 1: CREATE / EDIT MISSION (MENTOR / ADMIN) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0D2F47]/45 backdrop-blur-sm">
          <div className="surface rounded-2xl max-w-lg w-full overflow-hidden">
            <div className="p-4 border-b border-[#E4EAF0] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Target className="w-4 h-4 text-[#4C83B5]" />
                <h3 className="font-bold text-sm text-[#123B59]">
                  {editingMissionId ? 'Perbarui Misi Kejuruan' : 'Buat Misi Baru Kejuruan'}
                </h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg text-[#6F7F8D] hover:text-[#123B59] hover:bg-[#F4F6F8] transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveMission} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#123B59] mb-1">
                  Program Kejuruan Target
                </label>
                <select
                  value={formKejuruanId}
                  onChange={e => setFormKejuruanId(e.target.value)}
                  disabled={isMentor && !!currentUser.kejuruanId}
                  className="w-full text-xs p-2.5 rounded-lg border border-[#E4EAF0] bg-[#F4F6F8] text-[#123B59] outline-none focus:ring-1 focus:ring-[#4C83B5]"
                >
                  {kejuruanList.map(kj => (
                    <option key={kj.id} value={kj.id}>
                      {kj.code} - {kj.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#123B59] mb-1">
                  Judul Misi <span className="text-[#D95B83]">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Membangun RESTful API dengan Express & Prisma"
                  value={formTitle}
                  onChange={e => setFormTitle(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-lg border border-[#E4EAF0] bg-white text-[#123B59] outline-none focus:ring-1 focus:ring-[#4C83B5]"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#123B59] mb-1">
                    Reward Poin <span className="text-[#D95B83]">*</span>
                  </label>
                  <input
                    type="number"
                    min={10}
                    max={500}
                    step={10}
                    required
                    value={formPoints}
                    onChange={e => setFormPoints(Number(e.target.value))}
                    className="w-full text-xs p-2.5 rounded-lg border border-[#E4EAF0] bg-white text-[#123B59] outline-none font-mono focus:ring-1 focus:ring-[#4C83B5]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#123B59] mb-1">
                    Kesulitan
                  </label>
                  <select
                    value={formDifficulty}
                    onChange={e => setFormDifficulty(e.target.value as MissionDifficulty)}
                    className="w-full text-xs p-2.5 rounded-lg border border-[#E4EAF0] bg-[#F4F6F8] text-[#123B59] outline-none focus:ring-1 focus:ring-[#4C83B5]"
                  >
                    <option value="Mudah">Mudah</option>
                    <option value="Sedang">Sedang</option>
                    <option value="Tantangan">Tantangan</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#123B59] mb-1">
                    Batas Waktu (Deadline)
                  </label>
                  <input
                    type="date"
                    value={formDueDate}
                    onChange={e => setFormDueDate(e.target.value)}
                    className="w-full text-xs p-2.5 rounded-lg border border-[#E4EAF0] bg-white text-[#123B59] outline-none focus:ring-1 focus:ring-[#4C83B5]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#123B59] mb-1">
                  Kategori / Topik
                </label>
                <input
                  type="text"
                  placeholder="Contoh: Backend Architecture, UX Research, Mobile"
                  value={formCategory}
                  onChange={e => setFormCategory(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-lg border border-[#E4EAF0] bg-white text-[#123B59] outline-none focus:ring-1 focus:ring-[#4C83B5]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#123B59] mb-1">
                  Deskripsi &amp; Instruksi Misi <span className="text-[#D95B83]">*</span>
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="Jelaskan tujuan misi, kriteria keberhasilan, dan ekspektasi hasil akhir..."
                  value={formDescription}
                  onChange={e => setFormDescription(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-lg border border-[#E4EAF0] bg-white text-[#123B59] outline-none focus:ring-1 focus:ring-[#4C83B5]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#123B59] mb-1">
                  Ketentuan Format Pengumpulan (Opsional)
                </label>
                <input
                  type="text"
                  placeholder="Contoh: Kirim tautan GitHub dan link Figma prototype."
                  value={formSubmissionGuide}
                  onChange={e => setFormSubmissionGuide(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-lg border border-[#E4EAF0] bg-white text-[#123B59] outline-none focus:ring-1 focus:ring-[#4C83B5]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#E4EAF0]">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3 py-2 rounded-lg border border-[#E4EAF0] text-xs text-[#6F7F8D] hover:bg-[#F4F6F8] transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-[#123B59] hover:bg-[#0D2F47] text-white text-xs font-semibold transition cursor-pointer"
                >
                  {editingMissionId ? 'Simpan Perubahan' : 'Terbitkan Misi'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: SUBMIT WORK (TRAINEE) */}
      {isSubmitModalOpen && targetMissionForSubmit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0D2F47]/45 backdrop-blur-sm">
          <div className="surface rounded-2xl max-w-lg w-full overflow-hidden">
            <div className="p-4 border-b border-[#E4EAF0] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Send className="w-4 h-4 text-[#4C83B5]" />
                <h3 className="font-bold text-sm text-[#123B59]">
                  Pengumpulan Tugas Misi
                </h3>
              </div>
              <button
                onClick={() => setIsSubmitModalOpen(false)}
                className="p-1 rounded-lg text-[#6F7F8D] hover:text-[#123B59] hover:bg-[#F4F6F8] transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitWork} className="p-5 space-y-4">
              <div className="p-3 rounded-xl bg-[#EAF2F8] border border-[#A9C7DE]/40">
                <div className="text-xs font-bold text-[#123B59]">
                  {targetMissionForSubmit.title}
                </div>
                <div className="text-[11px] text-[#4C83B5] mt-0.5">
                  Reward: <strong>+{targetMissionForSubmit.points} Poin</strong> &middot; Mentor:{' '}
                  {targetMissionForSubmit.mentorName}
                </div>
              </div>

              {submitError && (
                <div className="p-2.5 rounded-lg bg-[#FCF3F6] text-[#B84469] text-xs border border-[#D95B83]/20">
                  {submitError}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-[#123B59] mb-1">
                  Tautan Hasil Kerja (GitHub / Figma / Drive / Deploy URL)
                </label>
                <input
                  type="url"
                  placeholder="https://github.com/... atau https://figma.com/..."
                  value={submissionLink}
                  onChange={e => setSubmissionLink(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-lg border border-[#E4EAF0] bg-white text-[#123B59] outline-none focus:ring-1 focus:ring-[#4C83B5] font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#123B59] mb-1">
                  Catatan Ringkasan Hasil Pengerjaan <span className="text-[#D95B83]">*</span>
                </label>
                <textarea
                  rows={4}
                  required
                  placeholder="Jelaskan fitur yang berhasil Anda buat, kendala yang dihadapi, serta instruksi cara mencoba hasil tugas Anda..."
                  value={submissionNotes}
                  onChange={e => setSubmissionNotes(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-lg border border-[#E4EAF0] bg-white text-[#123B59] outline-none focus:ring-1 focus:ring-[#4C83B5]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#E4EAF0]">
                <button
                  type="button"
                  onClick={() => setIsSubmitModalOpen(false)}
                  className="px-3 py-2 rounded-lg border border-[#E4EAF0] text-xs text-[#6F7F8D] hover:bg-[#F4F6F8] transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-[#123B59] hover:bg-[#0D2F47] text-white text-xs font-semibold transition cursor-pointer flex items-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Kirim Tugas ke Mentor</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: REVIEW SUBMISSION (MENTOR / ADMIN) */}
      {isReviewModalOpen && selectedSubmissionForReview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0D2F47]/45 backdrop-blur-sm">
          <div className="surface rounded-2xl max-w-lg w-full overflow-hidden">
            <div className="p-4 border-b border-[#E4EAF0] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-[#4C83B5]" />
                <h3 className="font-bold text-sm text-[#123B59]">
                  Evaluasi &amp; Penilaian Tugas Peserta
                </h3>
              </div>
              <button
                onClick={() => setIsReviewModalOpen(false)}
                className="p-1 rounded-lg text-[#6F7F8D] hover:text-[#123B59] hover:bg-[#F4F6F8] transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {/* Trainee Details */}
              <div className="flex items-center gap-3 p-3 rounded-xl bg-[#F4F6F8] border border-[#E4EAF0]">
                <img
                  src={selectedSubmissionForReview.traineeAvatar}
                  alt={selectedSubmissionForReview.traineeName}
                  className="w-10 h-10 rounded-full object-cover border border-[#E4EAF0]"
                />
                <div>
                  <div className="font-semibold text-xs text-[#123B59]">
                    {selectedSubmissionForReview.traineeName}
                  </div>
                  <div className="text-[11px] text-[#A9C7DE]">
                    {selectedSubmissionForReview.traineeNim} &middot; {selectedSubmissionForReview.kejuruanName}
                  </div>
                </div>
              </div>

              <div>
                <span className="text-[11px] text-[#A9C7DE] block mb-0.5">Judul Misi:</span>
                <div className="font-semibold text-xs text-[#123B59]">
                  {selectedSubmissionForReview.missionTitle}
                </div>
              </div>

              {selectedSubmissionForReview.submissionLink && (
                <div>
                  <span className="text-[11px] text-[#A9C7DE] block mb-0.5">Tautan Tugas:</span>
                  <a
                    href={selectedSubmissionForReview.submissionLink}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 text-[#4C83B5] text-xs hover:underline font-mono"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>{selectedSubmissionForReview.submissionLink}</span>
                  </a>
                </div>
              )}

              <div>
                <span className="text-[11px] text-[#A9C7DE] block mb-0.5">Catatan Peserta:</span>
                <div className="p-2.5 rounded-lg bg-[#F4F6F8] border border-[#E4EAF0] text-xs text-[#6F7F8D]">
                  {selectedSubmissionForReview.notes}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#123B59] mb-1">
                  Poin yang Diberikan
                </label>
                <input
                  type="number"
                  min={0}
                  max={500}
                  step={10}
                  value={reviewAwardedPoints}
                  onChange={e => setReviewAwardedPoints(Number(e.target.value))}
                  className="w-full text-xs p-2.5 rounded-lg border border-[#E4EAF0] bg-white text-[#123B59] outline-none font-mono focus:ring-1 focus:ring-[#4C83B5]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#123B59] mb-1">
                  Feedback &amp; Catatan Evaluasi Mentor
                </label>
                <textarea
                  rows={3}
                  placeholder="Beri catatan apresiasi atau saran perbaikan..."
                  value={reviewFeedback}
                  onChange={e => setReviewFeedback(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-lg border border-[#E4EAF0] bg-white text-[#123B59] outline-none focus:ring-1 focus:ring-[#4C83B5]"
                />
              </div>

              <div className="flex items-center justify-between gap-2 pt-3 border-t border-[#E4EAF0]">
                <button
                  type="button"
                  onClick={() => handleConfirmReview('rejected')}
                  className="px-3.5 py-2 rounded-lg bg-[#FCF3F6] hover:bg-[#D95B83] hover:text-white text-[#B84469] text-xs font-semibold transition cursor-pointer"
                >
                  Tolak / Minta Revisi
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsReviewModalOpen(false)}
                    className="px-3 py-2 rounded-lg border border-[#E4EAF0] text-xs text-[#6F7F8D] hover:bg-[#F4F6F8] transition cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="button"
                    onClick={() => handleConfirmReview('approved')}
                    className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Setujui &amp; Beri Poin</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
