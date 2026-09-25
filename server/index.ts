import express, { Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { getPool, initDatabase, DbUser } from './db';
import bcrypt from 'bcryptjs';
import {
  generateToken,
  authenticateToken,
  authorizeRoles,
  comparePassword,
  AuthenticatedRequest,
  Role,
} from './auth';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// 1. Health check & DB status
app.get('/api/health', async (_req, res) => {
  try {
    const pool = getPool();
    const [result] = await pool.query('SELECT 1 as connected');
    res.json({
      status: 'online',
      database: 'TiDB Cloud',
      jwt: 'enabled',
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    res.status(500).json({
      status: 'error',
      database: 'TiDB Cloud Error',
      error: err.message,
    });
  }
});

// 2. Login Endpoint (Supports all 3 roles: admin, mentor, trainee)
// Accepts either { code, password } or { identifier, password }
app.post('/api/auth/login', async (req, res: Response) => {
  try {
    const { code, identifier, password } = req.body;
    const searchKey = (code || identifier || '').trim();

    if (!searchKey) {
      return res.status(400).json({
        success: false,
        message: 'Silakan masukkan Kode Login 8-digit, NIM, atau Email Anda.',
      });
    }

    const pool = getPool();
    // Query user by login_code, email, or nim from TiDB
    const [rows] = await pool.query<any[]>(
      `SELECT * FROM users 
       WHERE login_code = ? OR LOWER(email) = LOWER(?) OR LOWER(nim) = LOWER(?) 
       LIMIT 1`,
      [searchKey, searchKey, searchKey]
    );

    if (!rows || rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Akun dengan kode/email/NIM tersebut tidak ditemukan.',
      });
    }

    const user: DbUser = rows[0];

    // Admin masuk hanya dengan login_code numerik 8 digit; email dan NIM
    // tetap hanya dapat dipakai untuk role mentor/peserta.
    if (user.role === 'admin' && !/^\d{8}$/.test(searchKey)) {
      return res.status(401).json({
        success: false,
        message: 'Administrator harus masuk menggunakan kode login 8 digit.',
      });
    }

    // Check account status
    if (user.status !== 'active') {
      return res.status(403).json({
        success: false,
        message: 'Akun Anda sedang dinonaktifkan. Silakan hubungi Administrator.',
      });
    }

    // Semua role wajib melalui verifikasi password.
    if (password && password.trim()) {
      const isMatch = await comparePassword(password.trim(), user.password_hash);
      if (!isMatch) {
        return res.status(401).json({
          success: false,
          message: 'Password yang Anda masukkan salah.',
        });
      }
    } else {
      return res.status(400).json({
        success: false,
        message: 'Password akun wajib diisi.',
      });
    }

    // Generate JWT token
    const token = generateToken({
      id: user.id,
      nim: user.nim,
      name: user.name,
      email: user.email,
      role: user.role,
      kejuruanId: user.kejuruan_id,
      kejuruanName: user.kejuruan_name,
      loginCode: user.login_code,
    });

    const safeUser = {
      id: user.id,
      nim: user.nim,
      name: user.name,
      email: user.email,
      role: user.role,
      avatar: user.avatar,
      phone: user.phone,
      kejuruanId: user.kejuruan_id,
      kejuruanName: user.kejuruan_name,
      status: user.status,
      joinedDate: user.joined_date,
      loginCode: user.login_code,
    };

    return res.json({
      success: true,
      message: `Login berhasil sebagai ${user.role.toUpperCase()} (${user.name})`,
      token,
      user: safeUser,
    });
  } catch (error: any) {
    console.error('[TiDB Auth Error]', error);
    return res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan saat memproses login ke database TiDB.',
      error: error.message,
    });
  }
});

// 3. Current User Profile (Protected by JWT)
app.get('/api/auth/me', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const pool = getPool();

    const [rows] = await pool.query<any[]>(
      `SELECT id, nim, name, email, role, avatar, phone, kejuruan_id, kejuruan_name,
              status, joined_date, login_code 
       FROM users WHERE id = ? LIMIT 1`,
      [userId]
    );

    if (!rows || rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Pengguna tidak ditemukan di TiDB.',
      });
    }

    const row = rows[0];
    const user = {
      id: row.id,
      nim: row.nim,
      name: row.name,
      email: row.email,
      role: row.role as Role,
      avatar: row.avatar,
      phone: row.phone,
      kejuruanId: row.kejuruan_id,
      kejuruanName: row.kejuruan_name,
      status: row.status,
      joinedDate: row.joined_date,
      loginCode: row.login_code,
    };

    return res.json({
      success: true,
      user,
      tokenPayload: req.user,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: 'Gagal memuat profil pengguna dari TiDB.',
      error: error.message,
    });
  }
});

// 5. Get Users List from TiDB (RBAC: Admin & Mentor only)
app.get(
  '/api/users',
  authenticateToken,
  authorizeRoles('admin', 'mentor'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const pool = getPool();
      let query = `
        SELECT id, nim, name, email, role, avatar, phone, kejuruan_id, kejuruan_name,
               status, joined_date, login_code 
        FROM users ORDER BY role ASC, name ASC
      `;
      const [rows] = await pool.query<any[]>(query);

      const mappedUsers = rows.map(r => ({
        id: r.id,
        nim: r.nim,
        name: r.name,
        email: r.email,
        role: r.role,
        avatar: r.avatar,
        phone: r.phone,
        kejuruanId: r.kejuruan_id,
        kejuruanName: r.kejuruan_name,
        status: r.status,
        joinedDate: r.joined_date,
        loginCode: r.login_code,
      }));

      return res.json({
        success: true,
        count: mappedUsers.length,
        users: mappedUsers,
      });
    } catch (error: any) {
      return res.status(500).json({ success: false, error: error.message });
    }
  }
);

// 6. Create User (Mentor or Trainee by Admin)
app.post(
  '/api/users',
  authenticateToken,
  authorizeRoles('admin'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const {
        name,
        nim,
        email,
        role,
        avatar,
        phone,
        kejuruanId,
        kejuruanName,
        status = 'active',
        loginCode,
        password,
      } = req.body;

      if (!name || !nim || !email || !role) {
        return res.status(400).json({
          success: false,
          message: 'Nama, NIM, Email, dan Role wajib diisi.',
        });
      }

      if (role !== 'mentor' && role !== 'trainee') {
        return res.status(400).json({
          success: false,
          message: 'Role yang dapat dibuat oleh Admin hanya "mentor" atau "trainee". Akun admin dibuat langsung di database MySQL.',
        });
      }

      const normalizedNim = String(nim).trim();
      const code = String(loginCode || normalizedNim).trim();
      const rawPassword = String(password || '').trim();
      if (!/^\d{8}$/.test(normalizedNim) || normalizedNim !== code) {
        return res.status(400).json({ success: false, message: 'NIM/Kode Login harus satu nilai yang sama dan tepat 8 digit angka.' });
      }
      if (!/^\d{8}$/.test(rawPassword)) {
        return res.status(400).json({ success: false, message: 'Sandi harus tepat 8 digit angka.' });
      }

      const pool = getPool();

      // Check if email, nim, or loginCode already exists
      const [dupes] = await pool.query<any[]>(
        'SELECT id, email, nim, login_code FROM users WHERE email = ? OR nim = ? OR login_code = ? LIMIT 1',
        [email.trim(), nim.trim(), code]
      );

      if (dupes && dupes.length > 0) {
        const found = dupes[0];
        let field = 'Data';
        if (found.email.toLowerCase() === email.trim().toLowerCase()) field = 'Email';
        else if (found.nim.toLowerCase() === nim.trim().toLowerCase()) field = 'NIM';
        else if (found.login_code === code) field = 'Kode login';
        return res.status(409).json({
          success: false,
          message: `${field} "${found.email || found.nim || code}" sudah terdaftar di sistem.`,
        });
      }

      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(rawPassword, salt);
      const id = `user-${role}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      const joinedDate = new Date().toISOString().split('T')[0];

      await pool.query(
        `INSERT INTO users (
          id, nim, name, email, role, avatar, phone, kejuruan_id, kejuruan_name,
          status, joined_date, login_code, password_hash
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          nim.trim(),
          name.trim(),
          email.trim(),
          role,
          avatar || null,
          phone || null,
          kejuruanId || null,
          kejuruanName || null,
          status,
          joinedDate,
          code,
          passwordHash,
        ]
      );

      const createdUser = {
        id,
        nim: nim.trim(),
        name: name.trim(),
        email: email.trim(),
        role,
        avatar: avatar || '',
        phone: phone || '',
        kejuruanId: kejuruanId || null,
        kejuruanName: kejuruanName || null,
        status,
        joinedDate,
        loginCode: code,
        password: rawPassword,
      };

      return res.status(201).json({
        success: true,
        message: `Akun ${role === 'mentor' ? 'Mentor' : 'Peserta'} (${name}) berhasil dibuat di database TiDB.`,
        user: createdUser,
      });
    } catch (error: any) {
      console.error('[Create User Error]', error);
      return res.status(500).json({ success: false, message: 'Gagal membuat user di database TiDB.', error: error.message });
    }
  }
);

// 7. Batch Import Users (for Trainees/Mentors via Excel)
app.post(
  '/api/users/batch',
  authenticateToken,
  authorizeRoles('admin'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { users } = req.body;
      if (!Array.isArray(users) || users.length === 0) {
        return res.status(400).json({ success: false, message: 'Daftar data pengguna tidak boleh kosong.' });
      }

      const invalidIndex = users.findIndex((item: any) => {
        const identifier = String(item?.loginCode || item?.nim || '').trim();
        const nimValue = String(item?.nim || '').trim();
        const passwordValue = String(item?.password || '').trim();
        return !item?.name?.trim() ||
          !['mentor', 'trainee'].includes(item?.role) ||
          !/^\d{8}$/.test(identifier) ||
          nimValue !== identifier ||
          !/^\d{8}$/.test(passwordValue) ||
          !item?.kejuruanName?.trim();
      });
      if (invalidIndex !== -1) {
        return res.status(400).json({
          success: false,
          message: `Data pengguna pada baris ${invalidIndex + 1} tidak sesuai. Isi nama, NIM/Kode Login 8 digit, sandi 8 digit, program kejuruan, dan role mentor/trainee.`,
        });
      }

      const pool = getPool();
      let insertedCount = 0;
      const createdUsers = [];

      for (const item of users) {
        if (!item.name || !item.name.trim()) continue;

        const role = item.role as 'mentor' | 'trainee';
        const code = String(item.loginCode || item.nim).trim();
        const nim = code;
        const email = item.email?.trim() || `${code}@hadirku.id`;
        const rawPassword = String(item.password).trim();

        // Check if exists
        const [existing] = await pool.query<any[]>(
          'SELECT id FROM users WHERE email = ? OR nim = ? OR login_code = ? LIMIT 1',
          [email, nim, code]
        );

        const salt = await bcrypt.genSalt(10);
        const hash = await bcrypt.hash(rawPassword, salt);

        if (existing.length > 0) {
          await pool.query(
            `UPDATE users SET
              nim = ?, name = ?, email = ?, role = ?, avatar = ?, phone = ?,
              kejuruan_id = ?, kejuruan_name = ?, status = ?, joined_date = ?,
              login_code = ?, password_hash = ?
             WHERE id = ?`,
            [
              nim,
              item.name.trim(),
              email,
              role,
              item.avatar || null,
              item.phone || null,
              item.kejuruanId || null,
              item.kejuruanName || null,
              item.status || 'active',
              item.joinedDate || new Date().toISOString().split('T')[0],
              code,
              hash,
              existing[0].id,
            ]
          );
        } else {
          const id = `user-${role}-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
          const joinedDate = item.joinedDate || new Date().toISOString().split('T')[0];

          await pool.query(
            `INSERT INTO users (
              id, nim, name, email, role, avatar, phone, kejuruan_id, kejuruan_name,
              status, joined_date, login_code, password_hash
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              id,
              nim,
              item.name.trim(),
              email,
              role,
              item.avatar || null,
              item.phone || null,
              item.kejuruanId || null,
              item.kejuruanName || null,
              item.status || 'active',
              joinedDate,
              code,
              hash,
            ]
          );

          createdUsers.push({
            id,
            nim,
            name: item.name.trim(),
            email,
            role,
            kejuruanId: item.kejuruanId || null,
            kejuruanName: item.kejuruanName || null,
            status: item.status || 'active',
            joinedDate,
            loginCode: code,
            password: rawPassword,
          });
          insertedCount++;
        }
      }

      const traineeCount = users.filter((u: any) => u.role === 'trainee').length;
      const mentorCount = users.filter((u: any) => u.role === 'mentor').length;

      return res.json({
        success: true,
        count: insertedCount,
        traineeCount,
        mentorCount,
        message: `Berhasil mengimpor ${insertedCount} akun (${traineeCount} Peserta Magang, ${mentorCount} Instruktur Mentor) ke database TiDB.`,
        createdUsers,
      });
    } catch (error: any) {
      console.error('[Batch Import Error]', error);
      return res.status(500).json({ success: false, message: 'Gagal mengimpor ke database TiDB.', error: error.message });
    }
  }
);

// 8. Update User (Admin only)
app.put(
  '/api/users/:id',
  authenticateToken,
  authorizeRoles('admin'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id } = req.params;
      const { name, nim, email, phone, kejuruanId, kejuruanName, status, loginCode, password } = req.body;

      const pool = getPool();
      const [existing] = await pool.query<any[]>('SELECT * FROM users WHERE id = ? LIMIT 1', [id]);
      if (!existing || existing.length === 0) {
        return res.status(404).json({ success: false, message: 'Pengguna tidak ditemukan.' });
      }

      let passwordClause = '';
      const params: any[] = [
        name !== undefined ? name : existing[0].name,
        nim !== undefined ? nim : existing[0].nim,
        email !== undefined ? email : existing[0].email,
        phone !== undefined ? phone : existing[0].phone,
        kejuruanId !== undefined ? kejuruanId : existing[0].kejuruan_id,
        kejuruanName !== undefined ? kejuruanName : existing[0].kejuruan_name,
        status !== undefined ? status : existing[0].status,
        loginCode !== undefined ? loginCode : existing[0].login_code,
      ];

      if (password && password.trim()) {
        const salt = await bcrypt.genSalt(10);
        const hash = await bcrypt.hash(password.trim(), salt);
        passwordClause = ', password_hash = ?';
        params.push(hash);
      }

      params.push(id);

      await pool.query(
        `UPDATE users SET
          name = ?, nim = ?, email = ?, phone = ?, kejuruan_id = ?,
          kejuruan_name = ?, status = ?, login_code = ? ${passwordClause}
         WHERE id = ?`,
        params
      );

      return res.json({
        success: true,
        message: 'Data pengguna berhasil diperbarui di TiDB.',
      });
    } catch (error: any) {
      return res.status(500).json({ success: false, error: error.message });
    }
  }
);

// 9. Delete User (Admin only, cannot delete Admin)
app.delete(
  '/api/users/:id',
  authenticateToken,
  authorizeRoles('admin'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id } = req.params;
      const pool = getPool();

      const [existing] = await pool.query<any[]>('SELECT id, role, name FROM users WHERE id = ? LIMIT 1', [id]);
      if (!existing || existing.length === 0) {
        return res.status(404).json({ success: false, message: 'Pengguna tidak ditemukan.' });
      }

      if (existing[0].role === 'admin') {
        return res.status(403).json({
          success: false,
          message: 'Akun Administrator utama tidak boleh dihapus dari sistem.',
        });
      }

      await pool.query('DELETE FROM users WHERE id = ?', [id]);

      return res.json({
        success: true,
        message: `Pengguna ${existing[0].name} (${existing[0].role}) berhasil dihapus dari database TiDB.`,
      });
    } catch (error: any) {
      return res.status(500).json({ success: false, error: error.message });
    }
  }
);

// 10. Clear All Users by Role (Admin only: bulk delete trainees, mentors, or both)
app.delete(
  '/api/users/clear/:role',
  authenticateToken,
  authorizeRoles('admin'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { role } = req.params;
      const validRoles = ['trainee', 'mentor', 'all'];

      if (!validRoles.includes(role)) {
        return res.status(400).json({
          success: false,
          message: 'Parameter role tidak valid. Pilih "trainee", "mentor", atau "all".',
        });
      }

      const pool = getPool();
      let query = '';
      let roleLabel = '';

      if (role === 'trainee') {
        query = "DELETE FROM users WHERE role = 'trainee'";
        roleLabel = 'Peserta Magang';
      } else if (role === 'mentor') {
        query = "DELETE FROM users WHERE role = 'mentor'";
        roleLabel = 'Instruktur Mentor';
      } else {
        // 'all' deletes both trainees and mentors, but ALWAYS preserves admin
        query = "DELETE FROM users WHERE role IN ('trainee', 'mentor')";
        roleLabel = 'Peserta Magang dan Instruktur Mentor';
      }

      const [result]: any = await pool.query(query);
      const affected = result?.affectedRows || 0;

      return res.json({
        success: true,
        count: affected,
        message: `Berhasil menghapus ${affected} akun ${roleLabel} dari database TiDB. Akun Administrator tetap aman.`,
      });
    } catch (error: any) {
      console.error('[Clear Users Error]', error);
      return res.status(500).json({
        success: false,
        message: 'Gagal menghapus data dari database TiDB.',
        error: error.message,
      });
    }
  }
);

// Start server after initializing TiDB
async function startServer() {
  try {
    await initDatabase();
    app.listen(PORT, () => {
      console.log(`[Server] Auth & TiDB API running on port ${PORT}`);
      console.log(`[Server] TiDB connected and 3 Roles seeded: Admin, Mentor, Trainee`);
    });
  } catch (err) {
    console.error('[Server Error] Failed to initialize TiDB:', err);
    process.exit(1);
  }
}

startServer();
