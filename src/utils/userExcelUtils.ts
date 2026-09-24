import * as XLSX from 'xlsx';
import { User, Kejuruan, Role } from '../types';

/**
 * Generates an 8-digit random numeric code (e.g., "84920194")
 */
export function generate8DigitLoginCode(): string {
  // Generates an 8-digit integer string between 10000000 and 99999999
  const num = Math.floor(10000000 + Math.random() * 90000000);
  return num.toString();
}

/**
 * Generates a default user password (e.g., "pass1234")
 */
export function generateDefaultPassword(): string {
  const digits = Math.floor(1000 + Math.random() * 9000);
  return `vokasi${digits}`;
}

/**
 * Export Trainees, Mentors, or All Users to Excel format (.xlsx)
 */
export function exportUsersToExcel(
  users: User[],
  kejuruanList: Kejuruan[],
  filterRole: 'all' | 'trainee' | 'mentor' = 'all'
): void {
  const targetUsers = users.filter(u => {
    if (filterRole === 'all') return true;
    return u.role === filterRole;
  });

  const titleRow = ['DATA AKUN LOGIN PESERTA & INSTRUKTUR (HADIRKU)'];
  const subTitleRow = ['Lembaga Pelatihan Kejuruan Vokasi'];
  const exportDate = new Date().toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
  const metaRow = [
    `Tanggal Ekspor: ${exportDate}`,
    '',
    `Total Akun: ${targetUsers.length} Orang`,
    '',
    `Filter: ${filterRole === 'all' ? 'Semua Akun' : filterRole === 'trainee' ? 'Peserta Trainee' : 'Instruktur Mentor'}`
  ];
  const blankRow: string[] = [];

  const headers = [
    'No',
    'Peran (Role)',
    'NIM / ID',
    'Nama Lengkap',
    'Kode Login (8 Digit)',
    'Password',
    'Kejuruan',
    'Email',
    'No. WhatsApp / Telepon',
    'Status Akun',
    'Tanggal Terdaftar'
  ];

  const dataRows = targetUsers.map((user, idx) => {
    const roleLabel =
      user.role === 'trainee' ? 'Peserta (Trainee)' : user.role === 'mentor' ? 'Instruktur (Mentor)' : 'Administrator';
    return [
      idx + 1,
      roleLabel,
      user.nim || '-',
      user.name,
      user.loginCode || generate8DigitLoginCode(),
      user.password || '123456',
      user.kejuruanName || '-',
      user.email,
      user.phone || '-',
      user.status === 'active' ? 'Aktif' : 'Nonaktif',
      user.joinedDate || new Date().toISOString().split('T')[0]
    ];
  });

  const footerNote = [
    'CATATAN PENGGUNAAN:',
    'Kode Login (8 Digit) dan Password digunakan oleh Peserta & Mentor untuk masuk ke aplikasi HadirKu.',
    'Harap jaga kerahasiaan password masing-masing.'
  ];

  const wsData = [
    titleRow,
    subTitleRow,
    metaRow,
    blankRow,
    headers,
    ...dataRows,
    blankRow,
    [footerNote[0]],
    [footerNote[1]],
    [footerNote[2]]
  ];

  const ws = XLSX.utils.aoa_to_sheet(wsData);

  // Column width configuration
  ws['!cols'] = [
    { wch: 6 },  // No
    { wch: 22 }, // Peran
    { wch: 16 }, // NIM
    { wch: 26 }, // Nama
    { wch: 22 }, // Kode Login (8 Digit)
    { wch: 16 }, // Password
    { wch: 26 }, // Kejuruan
    { wch: 28 }, // Email
    { wch: 18 }, // Phone
    { wch: 12 }, // Status
    { wch: 16 }  // Tanggal
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Daftar_Akun_Login');

  const fileLabel = filterRole === 'trainee' ? 'Peserta' : filterRole === 'mentor' ? 'Mentor' : 'Semua_Pengguna';
  const fileName = `HadirKu_Data_Akun_${fileLabel}_${new Date().toISOString().split('T')[0]}.xlsx`;

  XLSX.writeFile(wb, fileName);
}

/**
 * Download a blank sample Excel template for bulk import
 * Supports role-specific templates ('trainee', 'mentor', or 'all')
 */
export function downloadUserImportTemplate(
  kejuruanList: Kejuruan[],
  targetRole: 'all' | 'auto' | 'trainee' | 'mentor' = 'all'
): void {
  const sampleKj1 = kejuruanList[0]?.code || 'WD-01';
  const sampleKj2 = kejuruanList[1]?.code || 'UX-02';

  let title = 'TEMPLATE IMPORT DATA PESERTA & MENTOR (HADIRKU)';
  let fileName = 'Template_Import_Akun_HadirKu.xlsx';
  let headers: string[] = [];
  let sampleRows: any[][] = [];

  if (targetRole === 'trainee') {
    title = 'TEMPLATE IMPORT DATA PESERTA MAGANG (HADIRKU)';
    fileName = 'Template_Import_Peserta_Magang.xlsx';
    headers = [
      'Nama Lengkap (*)',
      'Peran (trainee) (*)',
      'NIM / ID Siswa (*)',
      'Kode Kejuruan (*)',
      'Kode Login 8 Digit (Opsional)',
      'Password (Opsional)',
      'Email (*)',
      'No. WhatsApp'
    ];
    sampleRows = [
      [
        'Budi Santoso',
        'trainee',
        'TRN-2026-101',
        sampleKj1,
        '84920194',
        '123456',
        'budi.santoso@vokasi.id',
        '0812-3456-7890'
      ],
      [
        'Ratna Sari Dewi',
        'trainee',
        'TRN-2026-102',
        sampleKj2,
        '', // empty -> auto-generated 8 digit
        '', // empty -> auto-generated password
        'ratna.dewi@vokasi.id',
        '0813-9876-5432'
      ]
    ];
  } else if (targetRole === 'mentor') {
    title = 'TEMPLATE IMPORT DATA INSTRUKTUR MENTOR (HADIRKU)';
    fileName = 'Template_Import_Instruktur_Mentor.xlsx';
    headers = [
      'Nama Lengkap (*)',
      'Peran (mentor) (*)',
      'NIP / ID Instruktur (*)',
      'Kode Kejuruan (*)',
      'Kode Login 8 Digit (Opsional)',
      'Password (Opsional)',
      'Email (*)',
      'No. WhatsApp'
    ];
    sampleRows = [
      [
        'Ahmad Syarifudin, M.Kom',
        'mentor',
        'MNT-WD-01',
        sampleKj1,
        '73920184',
        'mentor123',
        'ahmad.mentor@vokasi.id',
        '0821-5544-3322'
      ],
      [
        'Siti Nurhaliza, M.Ds.',
        'mentor',
        'MNT-UX-02',
        sampleKj2,
        '',
        '',
        'siti.mentor@vokasi.id',
        '0812-9988-7766'
      ]
    ];
  } else {
    // Both
    headers = [
      'Nama Lengkap (*)',
      'Peran (trainee/mentor) (*)',
      'NIM / NIP / ID (*)',
      'Kode Kejuruan (*)',
      'Kode Login 8 Digit (Opsional)',
      'Password (Opsional)',
      'Email (*)',
      'No. WhatsApp'
    ];
    sampleRows = [
      [
        'Budi Santoso',
        'trainee',
        'TRN-2026-101',
        sampleKj1,
        '84920194',
        '123456',
        'budi.santoso@vokasi.id',
        '0812-3456-7890'
      ],
      [
        'Ahmad Syarifudin, M.Kom',
        'mentor',
        'MNT-WD-01',
        sampleKj1,
        '73920184',
        'mentor123',
        'ahmad.mentor@vokasi.id',
        '0821-5544-3322'
      ]
    ];
  }

  const titleRow = [title];
  const instructionsRow = [
    'Petunjuk: Kolom bertanda (*) wajib diisi. Kolom Peran wajib diisi "trainee" (peserta) atau "mentor" (instruktur). Kode Login (8 digit) & Password boleh dikosongkan agar dibuat otomatis oleh sistem.'
  ];
  const blankRow: string[] = [];

  const refKjHeader = ['DAFTAR REFERENSI KODE KEJURUAN:'];
  const refKjRows = kejuruanList.map(k => [`${k.code} : ${k.name}`]);

  const wsData = [
    titleRow,
    instructionsRow,
    blankRow,
    headers,
    ...sampleRows,
    blankRow,
    blankRow,
    refKjHeader,
    ...refKjRows
  ];

  const ws = XLSX.utils.aoa_to_sheet(wsData);
  ws['!cols'] = [
    { wch: 26 },
    { wch: 24 },
    { wch: 18 },
    { wch: 16 },
    { wch: 22 },
    { wch: 18 },
    { wch: 28 },
    { wch: 18 }
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Template_Import');

  XLSX.writeFile(wb, fileName);
}

/**
 * Parse an Excel file (.xlsx / .xls / .csv) into User candidate objects
 * Supports explicit targetRole ('auto' | 'trainee' | 'mentor') to guarantee separation
 */
export async function parseUsersFromExcelFile(
  file: File,
  kejuruanList: Kejuruan[],
  targetRole: 'auto' | 'trainee' | 'mentor' = 'auto'
): Promise<{ success: boolean; users?: Partial<User>[]; error?: string }> {
  try {
    const buffer = await file.arrayBuffer();
    const wb = XLSX.read(buffer, { type: 'array' });

    if (!wb.SheetNames || wb.SheetNames.length === 0) {
      return { success: false, error: 'File Excel tidak memiliki lembar kerja (sheet).' };
    }

    const parsedUsers: Partial<User>[] = [];

    // Parse all sheets or detect role by sheet name
    for (const sheetName of wb.SheetNames) {
      const ws = wb.Sheets[sheetName];
      if (!ws) continue;

      const rawRows = XLSX.utils.sheet_to_json<Record<string, any>>(ws, { header: 1 });
      if (!rawRows || rawRows.length < 2) continue;

      // Detect sheet-level role from sheet name
      const sheetLower = sheetName.toLowerCase();
      let sheetRole: Role | null = null;
      if (
        sheetLower.includes('mentor') ||
        sheetLower.includes('instruktur') ||
        sheetLower.includes('guru') ||
        sheetLower.includes('dosen') ||
        sheetLower.includes('pengajar')
      ) {
        sheetRole = 'mentor';
      } else if (
        sheetLower.includes('peserta') ||
        sheetLower.includes('siswa') ||
        sheetLower.includes('trainee') ||
        sheetLower.includes('magang')
      ) {
        sheetRole = 'trainee';
      }

      // Find the header row (look for "nama", "nim", "nip", "peran", "role")
      let headerRowIdx = -1;
      for (let i = 0; i < Math.min(rawRows.length, 12); i++) {
        const row = rawRows[i] as any[];
        if (Array.isArray(row)) {
          const text = row.map(c => String(c || '').toLowerCase()).join(' ');
          if (
            text.includes('nama') ||
            text.includes('nim') ||
            text.includes('nip') ||
            text.includes('peran') ||
            text.includes('role') ||
            text.includes('kejuruan')
          ) {
            headerRowIdx = i;
            break;
          }
        }
      }

      if (headerRowIdx === -1) continue;

      const headerRow = (rawRows[headerRowIdx] as any[]).map(c => String(c || '').trim().toLowerCase());

      // Comprehensive keyword matching for columns
      const findColIdx = (keywords: string[]) => {
        return headerRow.findIndex(h => keywords.some(k => h.includes(k)));
      };

      const nameIdx = findColIdx(['nama']);
      const nimIdx = findColIdx(['nim', 'nip', 'nis', 'id', 'nomor induk']);
      const roleIdx = findColIdx(['peran', 'role', 'jabatan', 'kategori', 'tipe', 'posisi', 'sebagai', 'status peran']);
      const kjIdx = findColIdx(['kejuruan', 'kode kejuruan', 'program', 'jurusan', 'kelas']);
      const codeIdx = findColIdx(['kode login', 'login code', 'kode 8 digit', 'kode']);
      const passIdx = findColIdx(['password', 'kata sandi', 'pw', 'pass']);
      const emailIdx = findColIdx(['email', 'surel', 'e-mail']);
      const phoneIdx = findColIdx(['telepon', 'whatsapp', 'phone', 'hp', 'wa', 'no telp', 'no hp', 'kontak']);

      if (nameIdx === -1) continue;

      for (let r = headerRowIdx + 1; r < rawRows.length; r++) {
        const row = rawRows[r] as any[];
        if (!row || row.length === 0) continue;

        const rawName = row[nameIdx] ? String(row[nameIdx]).trim() : '';
        if (
          !rawName ||
          rawName.startsWith('CATATAN') ||
          rawName.startsWith('DAFTAR') ||
          rawName.startsWith('Petunjuk') ||
          rawName.startsWith('TEMPLATE')
        ) {
          continue;
        }

        // Determine Role with strict separation
        let finalRole: Role = 'trainee';

        if (targetRole === 'mentor') {
          finalRole = 'mentor';
        } else if (targetRole === 'trainee') {
          finalRole = 'trainee';
        } else {
          // Auto detection mode
          if (roleIdx !== -1 && row[roleIdx]) {
            const rVal = String(row[roleIdx]).trim().toLowerCase();
            const mentorKeywords = ['mentor', 'instruktur', 'guru', 'pengajar', 'pembimbing', 'dosen', 'trainer', 'fasilitator', 'pendamping', 'mnt'];
            const traineeKeywords = ['trainee', 'peserta', 'siswa', 'murid', 'mahasiswa', 'magang', 'pelajar', 'trn'];

            if (mentorKeywords.some(k => rVal.includes(k))) {
              finalRole = 'mentor';
            } else if (traineeKeywords.some(k => rVal.includes(k))) {
              finalRole = 'trainee';
            } else if (sheetRole) {
              finalRole = sheetRole;
            }
          } else if (sheetRole) {
            finalRole = sheetRole;
          } else if (nimIdx !== -1 && row[nimIdx]) {
            const nimVal = String(row[nimIdx]).trim().toUpperCase();
            if (nimVal.startsWith('MNT') || nimVal.startsWith('NIP')) {
              finalRole = 'mentor';
            } else if (nimVal.startsWith('TRN') || nimVal.startsWith('NIM') || nimVal.startsWith('NIS')) {
              finalRole = 'trainee';
            }
          }
        }

        // NIM / ID
        let rawNim = '';
        if (nimIdx !== -1 && row[nimIdx]) {
          rawNim = String(row[nimIdx]).trim();
        }
        if (!rawNim) {
          rawNim = `${finalRole === 'mentor' ? 'MNT' : 'TRN'}-2026-${Math.floor(100 + Math.random() * 900)}`;
        }

        // Kejuruan
        let targetKj: Kejuruan | undefined = undefined;
        if (kjIdx !== -1 && row[kjIdx]) {
          const kjVal = String(row[kjIdx]).trim().toLowerCase();
          targetKj = kejuruanList.find(
            k =>
              k.code.toLowerCase() === kjVal ||
              k.name.toLowerCase().includes(kjVal) ||
              kjVal.includes(k.code.toLowerCase())
          );
        }
        if (!targetKj) {
          targetKj = kejuruanList[0];
        }

        // 8-Digit Login Code
        let rawCode = '';
        if (codeIdx !== -1 && row[codeIdx]) {
          const cVal = String(row[codeIdx]).replace(/\D/g, '').trim();
          if (cVal.length >= 6) {
            rawCode = cVal.padEnd(8, '0').slice(0, 8);
          }
        }
        if (!rawCode) {
          rawCode = generate8DigitLoginCode();
        }

        // Password
        let rawPass = '';
        if (passIdx !== -1 && row[passIdx]) {
          rawPass = String(row[passIdx]).trim();
        }
        if (!rawPass) {
          rawPass = finalRole === 'mentor' ? 'mentor123' : '123456';
        }

        // Email
        const rawEmail =
          emailIdx !== -1 && row[emailIdx]
            ? String(row[emailIdx]).trim()
            : `${rawName.toLowerCase().replace(/[^a-z0-9]/g, '.')}@${finalRole === 'mentor' ? 'hadirku.id' : 'student.id'}`;

        // Phone
        const rawPhone = phoneIdx !== -1 && row[phoneIdx] ? String(row[phoneIdx]).trim() : '0812-3456-7890';

        parsedUsers.push({
          name: rawName,
          nim: rawNim,
          role: finalRole,
          kejuruanId: targetKj?.id || 'kj-1',
          kejuruanName: targetKj?.name || 'Umum',
          loginCode: rawCode,
          password: rawPass,
          email: rawEmail,
          phone: rawPhone,
          status: 'active',
          joinedDate: new Date().toISOString().split('T')[0],
          avatar: `https://images.unsplash.com/photo-${
            finalRole === 'mentor' ? '1534528741775-53994a69daeb' : '1535713875002-d1d0cf377fde'
          }?w=150&auto=format&fit=crop&q=80`
        });
      }
    }

    if (parsedUsers.length === 0) {
      return { success: false, error: 'Tidak ada baris data pengguna yang valid untuk diimpor. Pastikan file memiliki baris data di bawah judul kolom.' };
    }

    return { success: true, users: parsedUsers };
  } catch (err: any) {
    return { success: false, error: err.message || 'Gagal membaca berkas Excel.' };
  }
}
