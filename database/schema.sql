-- ForgeFlow Manufacturing Management System
-- Run this file in MySQL Workbench. It creates the database and tables only.
CREATE DATABASE IF NOT EXISTS manufacturing_management
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE manufacturing_management;

CREATE TABLE IF NOT EXISTS employees (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  employee_code VARCHAR(30) NOT NULL UNIQUE,
  name VARCHAR(120) NOT NULL,
  email VARCHAR(190) NOT NULL UNIQUE,
  phone VARCHAR(30) NOT NULL,
  department ENUM('Production','Quality Control','Maintenance','Warehouse','Administration','Dispatch') NOT NULL,
  designation VARCHAR(100) NOT NULL,
  joining_date DATE NOT NULL,
  salary DECIMAL(12,2) NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS attendance (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  employee_id BIGINT UNSIGNED NOT NULL,
  attendance_date DATE NOT NULL,
  status ENUM('Present','Absent','Leave') NOT NULL,
  remarks VARCHAR(255) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_attendance_employee_day (employee_id, attendance_date),
  CONSTRAINT fk_attendance_employee FOREIGN KEY (employee_id) REFERENCES employees(id)
    ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS inventory (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  sku VARCHAR(50) NOT NULL UNIQUE,
  name VARCHAR(150) NOT NULL,
  category ENUM('Raw Material','Components','Packaging','Consumables','Finished Goods') NOT NULL,
  unit ENUM('pcs','kg','g','litre','metre','box','unit') NOT NULL DEFAULT 'unit',
  quantity DECIMAL(14,3) NOT NULL DEFAULT 0,
  reorder_level DECIMAL(14,3) NOT NULL DEFAULT 0,
  unit_cost DECIMAL(14,2) NULL,
  supplier VARCHAR(150) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_inventory_name (name),
  INDEX idx_inventory_quantity (quantity)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS production_orders (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  order_no VARCHAR(50) NOT NULL UNIQUE,
  product_name VARCHAR(150) NOT NULL,
  planned_quantity DECIMAL(14,3) NOT NULL,
  produced_quantity DECIMAL(14,3) NOT NULL DEFAULT 0,
  start_date DATE NOT NULL,
  due_date DATE NOT NULL,
  status ENUM('Planned','In Progress','On Hold','Completed','Cancelled') NOT NULL DEFAULT 'Planned',
  assigned_to VARCHAR(150) NULL,
  notes TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_production_status (status),
  INDEX idx_production_due_date (due_date)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS dispatches (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  dispatch_no VARCHAR(50) NOT NULL UNIQUE,
  customer_name VARCHAR(150) NOT NULL,
  product_name VARCHAR(150) NOT NULL,
  quantity DECIMAL(14,3) NOT NULL,
  dispatch_date DATE NOT NULL,
  expected_delivery DATE NULL,
  status ENUM('Pending','Packed','Dispatched','Delivered','Returned') NOT NULL DEFAULT 'Pending',
  tracking_no VARCHAR(100) NULL,
  notes TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_dispatch_status (status),
  INDEX idx_dispatch_date (dispatch_date)
) ENGINE=InnoDB;

-- Optional sample rows (uncomment if you want demo data)
-- INSERT INTO inventory (sku,name,category,unit,quantity,reorder_level,unit_cost,supplier)
-- VALUES ('MAT-001','Copper Wire','Raw Material','kg',120,30,450.00,'Sample Supplier');
