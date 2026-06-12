-- ============================================
-- NAST Database Schema
-- MySQL 8.0 with UTF8MB4 encoding
-- ============================================

CREATE DATABASE IF NOT EXISTS nast
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_general_ci;

USE nast;

-- ============================================
-- User Management Tables
-- ============================================

CREATE TABLE users (
    uid INT(11) AUTO_INCREMENT PRIMARY KEY,
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(150) NOT NULL,
    password VARCHAR(255) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX (email)
);

CREATE TABLE admin (
    aid INT(11) AUTO_INCREMENT PRIMARY KEY,
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(150) NOT NULL,
    password VARCHAR(255) NOT NULL,
    department VARCHAR(100) DEFAULT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX (email)
);

CREATE TABLE evaluators (
    evaluator_id INT(11) AUTO_INCREMENT PRIMARY KEY,
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(150) NOT NULL,
    institution VARCHAR(150) NOT NULL,
    designation VARCHAR(100) NOT NULL,
    password VARCHAR(255) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX (email)
);

-- ============================================
-- Prize Management Tables
-- ============================================

CREATE TABLE prize (
    prize_id INT(11) AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT DEFAULT NULL,
    open_date DATE NOT NULL,
    close_date DATE NOT NULL,
    is_active TINYINT(1) DEFAULT 1,
    INDEX idx_prize_active_open (is_active, open_date)
);

CREATE TABLE common_fields (
    common_field_id INT(11) AUTO_INCREMENT PRIMARY KEY,
    field_name VARCHAR(255) NOT NULL,
    field_type ENUM('text', 'textarea', 'number', 'file', 'date', 'label') NOT NULL,
    is_required TINYINT(1) DEFAULT 1
);

CREATE TABLE prize_specific_fields (
    prize_specific_field_id INT(11) AUTO_INCREMENT PRIMARY KEY,
    prize_id INT(11) NOT NULL,
    field_name VARCHAR(255) NOT NULL,
    field_type ENUM('text', 'textarea', 'number', 'file', 'date', 'label') NOT NULL,
    is_required TINYINT(1) DEFAULT 1,
    INDEX (prize_id),
    CONSTRAINT fk_psf_prize
        FOREIGN KEY (prize_id) REFERENCES prize(prize_id)
        ON DELETE CASCADE
);

-- ============================================
-- Application Tables
-- ============================================

CREATE TABLE applications (
    application_id INT(11) AUTO_INCREMENT PRIMARY KEY,
    user_id INT(11) NOT NULL,
    prize_id INT(11) NOT NULL,
    status ENUM('submitted', 'processing', 'accepted', 'declined') DEFAULT 'submitted',
    submitted_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX (user_id),
    INDEX (prize_id),
    INDEX idx_app_prize_status_submitted (prize_id, status, submitted_at),
    CONSTRAINT fk_app_user
        FOREIGN KEY (user_id) REFERENCES users(uid)
        ON DELETE CASCADE,
    CONSTRAINT fk_app_prize
        FOREIGN KEY (prize_id) REFERENCES prize(prize_id)
        ON DELETE CASCADE
);

CREATE TABLE application_field_values (
    id INT(11) AUTO_INCREMENT PRIMARY KEY,
    application_id INT(11) NOT NULL,
    common_field_id INT(11) NOT NULL,
    value TEXT DEFAULT NULL,
    file_path VARCHAR(255) DEFAULT NULL,
    INDEX (application_id),
    INDEX (common_field_id),
    CONSTRAINT fk_afv_application
        FOREIGN KEY (application_id) REFERENCES applications(application_id)
        ON DELETE CASCADE,
    CONSTRAINT fk_afv_common_field
        FOREIGN KEY (common_field_id) REFERENCES common_fields(common_field_id)
        ON DELETE CASCADE
);

CREATE TABLE application_specific_field_values (
    id INT(11) AUTO_INCREMENT PRIMARY KEY,
    application_id INT(11) NOT NULL,
    prize_specific_field_id INT(11) NOT NULL,
    value TEXT DEFAULT NULL,
    file_path VARCHAR(255) DEFAULT NULL,
    INDEX (application_id),
    INDEX (prize_specific_field_id),
    CONSTRAINT fk_asfv_application
        FOREIGN KEY (application_id) REFERENCES applications(application_id)
        ON DELETE CASCADE,
    CONSTRAINT fk_asfv_psf
        FOREIGN KEY (prize_specific_field_id)
        REFERENCES prize_specific_fields(prize_specific_field_id)
        ON DELETE CASCADE
);

-- ============================================
-- Evaluation Tables
-- ============================================

CREATE TABLE application_marks (
    mark_id INT(11) AUTO_INCREMENT PRIMARY KEY,
    application_id INT(11) NOT NULL,
    admin_id INT(11) NOT NULL,
    marks DECIMAL(5,2) NOT NULL,
    is_winner TINYINT(1) NOT NULL DEFAULT 0,
    remarks TEXT DEFAULT NULL,
    status ENUM('assigned') NOT NULL DEFAULT 'assigned',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX (application_id),
    INDEX (admin_id),
    INDEX idx_marks_created (created_at),
    INDEX idx_marks_app_status (application_id, status),
    CONSTRAINT fk_marks_application
        FOREIGN KEY (application_id)
        REFERENCES applications(application_id)
        ON DELETE CASCADE,
    CONSTRAINT fk_marks_admin
        FOREIGN KEY (admin_id)
        REFERENCES admin(aid)
        ON DELETE CASCADE
);
-- ============================================
-- Gallery Table
-- ============================================

CREATE TABLE gallery (
    gallery_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    award VARCHAR(150) NOT NULL,
    description TEXT DEFAULT NULL,
    photo VARCHAR(255) NOT NULL,
    year YEAR NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- Password Reset Table
-- ============================================

CREATE TABLE password_resets (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(150) NOT NULL,
    user_type ENUM('user', 'admin', 'evaluator') NOT NULL,
    token_hash VARCHAR(255) NOT NULL,
    expires_at DATETIME NOT NULL,
    used TINYINT(1) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX (email),
    INDEX (token_hash)
);

CREATE TABLE auth_sessions (
    session_id BIGINT AUTO_INCREMENT PRIMARY KEY,
    token_hash VARCHAR(255) NOT NULL UNIQUE,
    user_id INT(11) NULL,
    admin_id INT(11) NULL,
    evaluator_id INT(11) NULL,
    role ENUM('user', 'admin', 'evaluator') NOT NULL,
    expires_at DATETIME NOT NULL,
    revoked_at DATETIME NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX (user_id),
    INDEX (admin_id),
    INDEX (evaluator_id),
    CONSTRAINT fk_session_user FOREIGN KEY (user_id) REFERENCES users(uid) ON DELETE CASCADE,
    CONSTRAINT fk_session_admin FOREIGN KEY (admin_id) REFERENCES admin(aid) ON DELETE CASCADE,
    CONSTRAINT fk_session_evaluator FOREIGN KEY (evaluator_id) REFERENCES evaluators(evaluator_id) ON DELETE CASCADE
);

-- ============================================
-- Email Settings Table
-- ============================================

CREATE TABLE email_settings (
    id TINYINT NOT NULL DEFAULT 1 PRIMARY KEY,
    enabled TINYINT(1) NOT NULL DEFAULT 0,
    smtp_host VARCHAR(255) NOT NULL DEFAULT 'smtp.gmail.com',
    smtp_port INT NOT NULL DEFAULT 587,
    smtp_secure TINYINT(1) NOT NULL DEFAULT 0,
    smtp_user VARCHAR(255) DEFAULT NULL,
    smtp_pass_encrypted TEXT DEFAULT NULL,
    from_email VARCHAR(255) DEFAULT NULL,
    from_name VARCHAR(255) DEFAULT NULL,
    updated_by INT NULL,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT chk_email_settings_single_row CHECK (id = 1),
    CONSTRAINT fk_email_settings_admin
        FOREIGN KEY (updated_by) REFERENCES admin(aid)
        ON DELETE SET NULL
);

