import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';

dotenv.config();

const rawDbUrl = process.env.DATABASE_URL || '';

// Parse connection details
function getDbConfig() {
  const url = new URL(rawDbUrl || 'mysql://localhost:3306/test');
  const dbName = url.pathname.replace(/^\//, '');
  const database = dbName && dbName !== 'sys' ? dbName : 'absensi_db';
  return {
    host: url.hostname,
    port: parseInt(url.port || '4000', 10),
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    database,
    ssl: {
      minVersion: 'TLSv1.2',
      rejectUnauthorized: true,
    },
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
  };
}

let pool: mysql.Pool;

export function getPool(): mysql.Pool {
  if (!pool) {
    pool = mysql.createPool(getDbConfig());
  }
  return pool;
}

export interface DbUser {
  id: string;
  nim: string;
  name: string;
  email: string;
  role: 'admin' | 'mentor' | 'trainee';
  avatar: string;
  phone: string;
  kejuruan_id?: string;
  kejuruan_name?: string;
  status: 'active' | 'inactive';
  joined_date: string;
  login_code: string;
  password_hash: string;
}

// 1. Akun ADMIN dibuat di MySQL / TiDB langsung
const DIRECT_MYSQL_ADMIN = {
  id: 'user-admin-1',
  nim: 'ADM-2026-001',
  name: 'Bambang Sudirman, M.Kom',
  email: 'admin@hadirku.id',
  role: 'admin' as const,
  avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80',
  phone: '0812-3456-7890',
  kejuruanId: null,
  kejuruanName: null,
  status: 'active' as const,
  joinedDate: '2025-01-10',
  loginCode: '10000001',
  rawPassword: 'admin123',
};

export async function initDatabase() {
  const p = getPool();
  console.log('[TiDB] Memeriksa tabel dan akun Administrator...');

  // Create users table if not exists
  await p.query(`
    CREATE TABLE IF NOT EXISTS users (
      id VARCHAR(64) PRIMARY KEY,
      nim VARCHAR(64) NOT NULL UNIQUE,
      name VARCHAR(128) NOT NULL,
      email VARCHAR(128) NOT NULL UNIQUE,
      role ENUM('admin', 'mentor', 'trainee') NOT NULL,
      avatar TEXT,
      phone VARCHAR(32),
      kejuruan_id VARCHAR(64),
      kejuruan_name VARCHAR(128),
      status ENUM('active', 'inactive') DEFAULT 'active',
      joined_date VARCHAR(32),
      login_code VARCHAR(32) NOT NULL UNIQUE,
      password_hash VARCHAR(255) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  console.log('[TiDB] Tabel `users` aktif.');

  await p.query(`
    CREATE TABLE IF NOT EXISTS leave_requests (
      id VARCHAR(96) PRIMARY KEY,
      user_id VARCHAR(64) NOT NULL,
      user_name VARCHAR(128) NOT NULL,
      user_nim VARCHAR(64) NOT NULL,
      kejuruan_id VARCHAR(64) NOT NULL,
      kejuruan_name VARCHAR(128) NOT NULL,
      request_type ENUM('izin', 'sakit') NOT NULL,
      start_date VARCHAR(10) NOT NULL,
      end_date VARCHAR(10) NOT NULL,
      days_count INT NOT NULL,
      reason TEXT NOT NULL,
      attachment_url VARCHAR(2048) NOT NULL,
      status ENUM('pending', 'approved', 'rejected') NOT NULL DEFAULT 'pending',
      submitted_at VARCHAR(32) NOT NULL,
      reviewed_by VARCHAR(128),
      reviewed_at VARCHAR(32),
      review_notes TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_leave_user (user_id),
      INDEX idx_leave_kejuruan_status (kejuruan_id, status)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  // Pastikan akun Administrator langsung terdaftar di MySQL
  const [existingAdmin] = await p.query<any[]>(
    "SELECT id FROM users WHERE role = 'admin' LIMIT 1"
  );

  if (existingAdmin.length === 0) {
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(DIRECT_MYSQL_ADMIN.rawPassword, salt);

    await p.query(
      `INSERT INTO users (
        id, nim, name, email, role, avatar, phone, kejuruan_id, kejuruan_name,
        status, joined_date, login_code, password_hash
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        DIRECT_MYSQL_ADMIN.id,
        DIRECT_MYSQL_ADMIN.nim,
        DIRECT_MYSQL_ADMIN.name,
        DIRECT_MYSQL_ADMIN.email,
        DIRECT_MYSQL_ADMIN.role,
        DIRECT_MYSQL_ADMIN.avatar,
        DIRECT_MYSQL_ADMIN.phone,
        DIRECT_MYSQL_ADMIN.kejuruanId,
        DIRECT_MYSQL_ADMIN.kejuruanName,
        DIRECT_MYSQL_ADMIN.status,
        DIRECT_MYSQL_ADMIN.joinedDate,
        DIRECT_MYSQL_ADMIN.loginCode,
        hash,
      ]
    );
    console.log('[TiDB] Akun Admin berhasil dibuat di MySQL langsung (admin@hadirku.id)');
  } else {
    console.log('[TiDB] Akun Admin siap di MySQL.');
  }

  console.log('[TiDB] Database setup siap. Akun Mentor & Trainee dibuat oleh Admin via aplikasi / Excel.');
}
