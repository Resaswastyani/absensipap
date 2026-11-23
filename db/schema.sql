-- PAP Attendance — skema database (MariaDB / MySQL 8)
-- Aman dijalankan berulang (IF NOT EXISTS).

SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS departments (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS shifts (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(60) NOT NULL UNIQUE,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  late_tolerance_minutes SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS users (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  nik VARCHAR(30) NOT NULL UNIQUE,
  email VARCHAR(150) NULL UNIQUE,
  name VARCHAR(120) NOT NULL,
  password_hash VARCHAR(100) NOT NULL,
  role ENUM('admin','employee') NOT NULL DEFAULT 'employee',
  department_id INT UNSIGNED NULL,
  shift_id INT UNSIGNED NULL,
  position VARCHAR(100) NULL,
  phone VARCHAR(30) NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  must_change_password TINYINT(1) NOT NULL DEFAULT 1,
  token_version INT UNSIGNED NOT NULL DEFAULT 0,
  last_login_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_users_department FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL,
  CONSTRAINT fk_users_shift FOREIGN KEY (shift_id) REFERENCES shifts(id) ON DELETE SET NULL,
  INDEX idx_users_role (role, is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS office_locations (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  address VARCHAR(255) NULL,
  latitude DECIMAL(10,7) NOT NULL,
  longitude DECIMAL(10,7) NOT NULL,
  radius_m INT UNSIGNED NOT NULL DEFAULT 150,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS attendance (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNSIGNED NOT NULL,
  work_date DATE NOT NULL,
  status ENUM('hadir','terlambat','izin','sakit','cuti','alpha') NOT NULL DEFAULT 'hadir',
  late_minutes SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  check_in_at DATETIME NULL,
  check_in_lat DECIMAL(10,7) NULL,
  check_in_lng DECIMAL(10,7) NULL,
  check_in_accuracy_m INT UNSIGNED NULL,
  check_in_distance_m INT UNSIGNED NULL,
  check_in_location_id INT UNSIGNED NULL,
  check_in_photo VARCHAR(80) NULL,
  check_out_at DATETIME NULL,
  check_out_lat DECIMAL(10,7) NULL,
  check_out_lng DECIMAL(10,7) NULL,
  check_out_accuracy_m INT UNSIGNED NULL,
  check_out_distance_m INT UNSIGNED NULL,
  check_out_photo VARCHAR(80) NULL,
  note VARCHAR(255) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_attendance_user_date (user_id, work_date),
  INDEX idx_attendance_date (work_date, status),
  CONSTRAINT fk_attendance_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_attendance_location FOREIGN KEY (check_in_location_id) REFERENCES office_locations(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS leave_requests (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNSIGNED NOT NULL,
  type ENUM('izin','sakit','cuti','koreksi') NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  reason VARCHAR(500) NOT NULL,
  status ENUM('menunggu','disetujui','ditolak','dibatalkan') NOT NULL DEFAULT 'menunggu',
  reviewed_by INT UNSIGNED NULL,
  reviewed_at DATETIME NULL,
  review_note VARCHAR(255) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_leave_status (status, created_at),
  INDEX idx_leave_user (user_id, created_at),
  CONSTRAINT fk_leave_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_leave_reviewer FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS login_attempts (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  identifier VARCHAR(150) NOT NULL,
  ip VARCHAR(64) NOT NULL,
  success TINYINT(1) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_attempt_identifier (identifier, created_at),
  INDEX idx_attempt_ip (ip, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS audit_logs (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNSIGNED NULL,
  action VARCHAR(60) NOT NULL,
  entity VARCHAR(40) NULL,
  entity_id INT UNSIGNED NULL,
  detail TEXT NULL,
  ip VARCHAR(64) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_audit_created (created_at),
  INDEX idx_audit_user (user_id, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data awal
INSERT IGNORE INTO shifts (name, start_time, end_time, late_tolerance_minutes) VALUES
  ('Shift Pagi', '08:00:00', '17:00:00', 5),
  ('Shift Siang', '14:00:00', '22:00:00', 5),
  ('Shift Malam', '22:00:00', '06:00:00', 5);

INSERT IGNORE INTO departments (name) VALUES
  ('Produksi'), ('Quality Control'), ('Warehouse'), ('Maintenance'), ('Administrasi'), ('Human Resources');

-- Admin yang juga karyawan (bisa absen). Untuk role employee selalu dianggap bisa absen.
ALTER TABLE users ADD COLUMN IF NOT EXISTS can_attend TINYINT(1) NOT NULL DEFAULT 0 AFTER role;

-- Shift default untuk karyawan tanpa shift khusus.
ALTER TABLE shifts ADD COLUMN IF NOT EXISTS is_default TINYINT(1) NOT NULL DEFAULT 0;
