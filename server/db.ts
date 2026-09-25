import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

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

export async function ensureDatabaseExists() {
  const dbConfig = getDbConfig();
  if (!/^[a-zA-Z0-9_]+$/.test(dbConfig.database)) {
    throw new Error('Nama database hanya boleh berisi huruf, angka, dan garis bawah.');
  }
  const { database, ...serverConfig } = dbConfig;
  const serverConnection = await mysql.createConnection(serverConfig);
  try {
    await serverConnection.query(
      `CREATE DATABASE IF NOT EXISTS \`${database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
    );
  } finally {
    await serverConnection.end();
  }
}

export async function initDatabase() {
  const { database } = getDbConfig();
  const p = getPool();
  console.log(`[TiDB] Memeriksa tabel aplikasi pada database ${database}...`);

  const tableMigrations = [
    `
    CREATE TABLE IF NOT EXISTS users (
      id VARCHAR(64) PRIMARY KEY,
      nim CHAR(8) NOT NULL UNIQUE,
      name VARCHAR(128) NOT NULL,
      email VARCHAR(128) NOT NULL UNIQUE,
      role ENUM('admin', 'mentor', 'trainee') NOT NULL,
      avatar TEXT,
      phone VARCHAR(32),
      kejuruan_id VARCHAR(64),
      kejuruan_name VARCHAR(255),
      status ENUM('active', 'inactive') DEFAULT 'active',
      joined_date VARCHAR(32),
      login_code CHAR(8) NOT NULL UNIQUE,
      password_hash VARCHAR(255) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `,
    `
    CREATE TABLE IF NOT EXISTS kejuruan (
      id VARCHAR(64) PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      code VARCHAR(64) NOT NULL,
      category VARCHAR(128) NOT NULL,
      color VARCHAR(16) NOT NULL,
      description TEXT,
      mentor_id VARCHAR(64),
      mentor_name VARCHAR(128),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_kejuruan_code (code),
      INDEX idx_kejuruan_mentor (mentor_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `,
    `
    CREATE TABLE IF NOT EXISTS attendance_records (
      id VARCHAR(64) PRIMARY KEY,
      user_id VARCHAR(64) NOT NULL,
      user_name VARCHAR(128) NOT NULL,
      user_nim VARCHAR(64) NOT NULL,
      user_role ENUM('admin','mentor','trainee') NOT NULL DEFAULT 'trainee',
      kejuruan_id VARCHAR(64),
      kejuruan_name VARCHAR(255),
      attendance_date DATE NOT NULL,
      check_in_time TIME,
      check_out_time TIME,
      status ENUM('hadir','terlambat','izin','sakit','alpha') NOT NULL,
      verification_status ENUM('pending','verified','rejected') NOT NULL DEFAULT 'pending',
      verified_by VARCHAR(64),
      verified_at DATETIME,
      location TEXT,
      latitude DECIMAL(10,7),
      longitude DECIMAL(10,7),
      notes TEXT,
      photo_url LONGTEXT,
      rejection_reason TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_attendance_user_date (user_id, attendance_date),
      INDEX idx_attendance_date_status (attendance_date, verification_status),
      INDEX idx_attendance_kejuruan_date (kejuruan_id, attendance_date)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `,
    `
    CREATE TABLE IF NOT EXISTS leave_requests (
      id VARCHAR(64) PRIMARY KEY,
      user_id VARCHAR(64) NOT NULL,
      user_name VARCHAR(128) NOT NULL,
      user_nim VARCHAR(64) NOT NULL,
      kejuruan_id VARCHAR(64),
      kejuruan_name VARCHAR(255),
      request_type ENUM('izin','sakit') NOT NULL,
      start_date DATE NOT NULL,
      end_date DATE NOT NULL,
      days_count INT NOT NULL DEFAULT 1,
      reason TEXT NOT NULL,
      attachment_name VARCHAR(255),
      attachment_url LONGTEXT,
      status ENUM('pending','approved','rejected') NOT NULL DEFAULT 'pending',
      submitted_at DATETIME NOT NULL,
      reviewed_by VARCHAR(64),
      reviewed_at DATETIME,
      review_notes TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_leave_user (user_id),
      INDEX idx_leave_status_dates (status, start_date, end_date),
      INDEX idx_leave_kejuruan_status (kejuruan_id, status)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `,
    `
    CREATE TABLE IF NOT EXISTS attendance_settings (
      id VARCHAR(64) PRIMARY KEY,
      start_time TIME NOT NULL,
      late_limit_time TIME NOT NULL,
      end_time TIME NOT NULL,
      allow_checkout_start TIME NOT NULL,
      work_days JSON NOT NULL,
      office_location JSON NOT NULL,
      updated_by VARCHAR(64),
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `,
    `
    CREATE TABLE IF NOT EXISTS missions (
      id VARCHAR(64) PRIMARY KEY,
      title VARCHAR(200) NOT NULL,
      description TEXT NOT NULL,
      kejuruan_id VARCHAR(64) NOT NULL,
      kejuruan_name VARCHAR(255) NOT NULL,
      mentor_id VARCHAR(64) NOT NULL,
      mentor_name VARCHAR(128) NOT NULL,
      points INT NOT NULL DEFAULT 0,
      difficulty ENUM('Mudah','Sedang','Tantangan') NOT NULL,
      due_date DATE NOT NULL,
      created_at DATETIME NOT NULL,
      status ENUM('active','archived') NOT NULL DEFAULT 'active',
      category VARCHAR(128),
      submission_guide TEXT,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_missions_kejuruan_status (kejuruan_id, status),
      INDEX idx_missions_due_date (due_date)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `,
    `
    CREATE TABLE IF NOT EXISTS mission_submissions (
      id VARCHAR(64) PRIMARY KEY,
      mission_id VARCHAR(64) NOT NULL,
      mission_title VARCHAR(200) NOT NULL,
      trainee_id VARCHAR(64) NOT NULL,
      trainee_name VARCHAR(128) NOT NULL,
      trainee_nim VARCHAR(64) NOT NULL,
      trainee_avatar LONGTEXT,
      kejuruan_id VARCHAR(64),
      kejuruan_name VARCHAR(255),
      submission_link TEXT,
      notes TEXT,
      points INT NOT NULL DEFAULT 0,
      submitted_at DATETIME NOT NULL,
      status ENUM('pending','approved','rejected') NOT NULL DEFAULT 'pending',
      reviewed_by VARCHAR(64),
      reviewed_at DATETIME,
      feedback TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_submissions_mission (mission_id, status),
      INDEX idx_submissions_trainee (trainee_id, submitted_at),
      INDEX idx_submissions_kejuruan (kejuruan_id, status)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `,
    `
    CREATE TABLE IF NOT EXISTS daily_reports (
      id VARCHAR(64) PRIMARY KEY,
      trainee_id VARCHAR(64) NOT NULL,
      trainee_name VARCHAR(128) NOT NULL,
      trainee_nim VARCHAR(64) NOT NULL,
      trainee_avatar LONGTEXT,
      kejuruan_id VARCHAR(64),
      kejuruan_name VARCHAR(255),
      report_date DATE NOT NULL,
      description TEXT NOT NULL,
      photo_url LONGTEXT,
      photo_name VARCHAR(255),
      submission_link TEXT,
      status ENUM('pending','approved','rejected') NOT NULL DEFAULT 'pending',
      submitted_at DATETIME NOT NULL,
      reviewed_by VARCHAR(64),
      reviewed_at DATETIME,
      review_notes TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uq_daily_report_trainee_date (trainee_id, report_date),
      INDEX idx_daily_reports_status_date (status, report_date),
      INDEX idx_daily_reports_kejuruan (kejuruan_id, status)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `,
  ];

  for (const migration of tableMigrations) {
    await p.query(migration);
  }

  console.log(`[TiDB] Skema aplikasi siap: ${tableMigrations.length} tabel.`);
}
