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
 */
export function downloadUserImportTemplate(kejuruanList: Kejuruan[]): void {
  const titleRow = ['TEMPLATE IMPORT DATA PESERTA / MENTOR HADIRKU'];
  const instructionsRow = [
    'Petunjuk: Kolom bertanda (*) wajib diisi. Kode Login (8 digit) & Password boleh dikosongkan agar dibuat otomatis oleh sistem.'
  ];
  const blankRow: string[] = [];

  const headers = [
    'Nama Lengkap (*)',
    'Peran (trainee/mentor) (*)',
    'NIM / ID Siswa (*)',
    'Kode Kejuruan (*)',
    'Kode Login 8 Digit (Opsional)',
    'Password (Opsional)',
    'Email (*)',
    'No. WhatsApp'
  ];

  const sampleKj1 = kejuruanList[0]?.code || 'WD-01';
  const sampleKj2 = kejuruanList[1]?.code || 'UX-02';

  const sampleRows = [
    [
      'Budi Santoso',
      'trainee',
      'TRN-2026-101',
      sampleKj1,
      '84920194',
      'vokasi123',
      'budi.santoso@example.com',
      '0812-3456-7890'
    ],
    [
      'Ratna Sari Dewi',
      'trainee',
      'TRN-2026-102',
      sampleKj2,
      '', // empty -> auto-generated 8 digit
      '', // empty -> auto-generated password
      'ratna.dewi@example.com',
      '0813-9876-5432'
    ],
    [
      'Ahmad Syarifudin, M.Kom',
      'mentor',
      'MNT-WD-02',
      sampleKj1,
      '73920184',
      'mentor2026',
      'ahmad.mentor@example.com',
      '0821-5544-3322'
    ]
  ];

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
    { wch: 25 },
    { wch: 18 },
    { wch: 16 },
    { wch: 16 },
    { wch: 22 },
    { wch: 18 },
    { wch: 26 },
    { wch: 18 }
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Template_Import');

  XLSX.writeFile(wb, 'Template_Import_Akun_HadirKu.xlsx');
}

/**
 * Parse an Excel file (.xlsx / .xls / .csv) into User candidate objects
 */
export async function parseUsersFromExcelFile(
  file: File,
  kejuruanList: Kejuruan[]
): Promise<{ success: boolean; users?: Partial<User>[]; error?: string }> {
  try {
    const buffer = await file.arrayBuffer();
    const wb = XLSX.read(buffer, { type: 'array' });

    const firstSheetName = wb.SheetNames[0];
    if (!firstSheetName) {
      return { success: false, error: 'File Excel tidak memiliki lembar kerja (sheet).' };
    }

    const ws = wb.Sheets[firstSheetName];
    const rawRows = XLSX.utils.sheet_to_json<Record<string, any>>(ws, { header: 1 });

    if (!rawRows || rawRows.length < 2) {
      return { success: false, error: 'Format data Excel kosong atau tidak valid.' };
    }

    // Find the header row (look for "Nama" or "NIM" or "Peran")
    let headerRowIdx = -1;
    for (let i = 0; i < Math.min(rawRows.length, 10); i++) {
      const row = rawRows[i] as any[];
      if (Array.isArray(row)) {
        const text = row.map(c => String(c || '').toLowerCase()).join(' ');
        if (text.includes('nama') || text.includes('nim') || text.includes('peran') || text.includes('role')) {
          headerRowIdx = i;
          break;
        }
      }
    }

    if (headerRowIdx === -1) {
      return {
        success: false,
        error: 'Kolom header tidak ditemukan. Pastikan ada baris dengan kolom "Nama Lengkap" atau "NIM".'
      };
    }

    const headerRow = (rawRows[headerRowIdx] as any[]).map(c => String(c || '').trim().toLowerCase());

    // Map column indices
    const findColIdx = (keywords: string[]) => {
      return headerRow.findIndex(h => keywords.some(k => h.includes(k)));
    };

    const nameIdx = findColIdx(['nama']);
    const nimIdx = findColIdx(['nim', 'nip', 'id']);
    const roleIdx = findColIdx(['peran', 'role']);
    const kjIdx = findColIdx(['kejuruan', 'kode kejuruan']);
    const codeIdx = findColIdx(['kode login', 'login code', 'kode', 'kode 8 digit']);
    const passIdx = findColIdx(['password', 'kata sandi', 'pw']);
    const emailIdx = findColIdx(['email', 'surel']);
    const phoneIdx = findColIdx(['telepon', 'whatsapp', 'phone', 'hp', 'no']);

    if (nameIdx === -1) {
      return { success: false, error: 'Kolom "Nama Lengkap" tidak ditemukan di dalam berkas Excel.' };
    }

    const parsedUsers: Partial<User>[] = [];

    for (let r = headerRowIdx + 1; r < rawRows.length; r++) {
      const row = rawRows[r] as any[];
      if (!row || row.length === 0) continue;

      const rawName = row[nameIdx] ? String(row[nameIdx]).trim() : '';
      if (!rawName || rawName.startsWith('CATATAN') || rawName.startsWith('DAFTAR') || rawName.startsWith('Petunjuk')) {
        continue;
      }

      // Role parsing
      let rawRole: Role = 'trainee';
      if (roleIdx !== -1 && row[roleIdx]) {
        const rVal = String(row[roleIdx]).toLowerCase();
        if (rVal.includes('mentor') || rVal.includes('instruktur')) {
          rawRole = 'mentor';
        } else if (rVal.includes('admin')) {
          rawRole = 'admin';
        }
      }

      // NIM / ID
      const rawNim =
        nimIdx !== -1 && row[nimIdx]
          ? String(row[nimIdx]).trim()
          : `${rawRole === 'mentor' ? 'MNT' : 'TRN'}-2026-${Math.floor(100 + Math.random() * 900)}`;

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
        rawPass = generateDefaultPassword();
      }

      // Email
      const rawEmail =
        emailIdx !== -1 && row[emailIdx]
          ? String(row[emailIdx]).trim()
          : `${rawName.toLowerCase().replace(/[^a-z0-9]/g, '.')}@vokasi.id`;

      // Phone
      const rawPhone = phoneIdx !== -1 && row[phoneIdx] ? String(row[phoneIdx]).trim() : '0812-3456-7890';

      parsedUsers.push({
        name: rawName,
        nim: rawNim,
        role: rawRole,
        kejuruanId: targetKj?.id || 'kj-1',
        kejuruanName: targetKj?.name || 'Umum',
        loginCode: rawCode,
        password: rawPass,
        email: rawEmail,
        phone: rawPhone,
        status: 'active',
        joinedDate: new Date().toISOString().split('T')[0],
        avatar: `https://images.unsplash.com/photo-${1500000000000 + Math.floor(Math.random() * 1000000)}?w=150&auto=format&fit=crop&q=80`
      });
    }

    if (parsedUsers.length === 0) {
      return { success: false, error: 'Tidak ada baris data peserta yang valid untuk diimpor.' };
    }

    return { success: true, users: parsedUsers };
  } catch (err: any) {
    return { success: false, error: err.message || 'Gagal membaca berkas Excel.' };
  }
}
