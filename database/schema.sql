-- =============================================================================
-- Industrial Equipment Failure & Maintenance Profiler - PostgreSQL Schema
-- =============================================================================

-- Drop existing tables (reverse dependency order)
DROP TABLE IF EXISTS audit_logs CASCADE;
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS failure_history CASCADE;
DROP TABLE IF EXISTS maintenance CASCADE;
DROP TABLE IF EXISTS predictions CASCADE;
DROP TABLE IF EXISTS sensor_data CASCADE;
DROP TABLE IF EXISTS machines CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- ENUM Types
DROP TYPE IF EXISTS user_role;
CREATE TYPE user_role AS ENUM ('ADMIN', 'ENGINEER', 'TECHNICIAN');

DROP TYPE IF EXISTS machine_status;
CREATE TYPE machine_status AS ENUM ('HEALTHY', 'WARNING', 'CRITICAL', 'MAINTENANCE_DUE', 'OFFLINE');

DROP TYPE IF EXISTS maintenance_priority;
CREATE TYPE maintenance_priority AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

DROP TYPE IF EXISTS maintenance_status;
CREATE TYPE maintenance_status AS ENUM ('SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- 1. Users Table (Authentication & RBAC)
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role user_role NOT NULL DEFAULT 'TECHNICIAN',
    phone VARCHAR(20),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Machines Table
CREATE TABLE machines (
    id SERIAL PRIMARY KEY,
    machine_code VARCHAR(50) UNIQUE NOT NULL, -- e.g. M1001, CNC-03
    name VARCHAR(100) NOT NULL,              -- e.g. CNC Machine
    type VARCHAR(10) NOT NULL,               -- 'L', 'M', or 'H'
    location VARCHAR(100) NOT NULL,          -- Plant A
    status machine_status NOT NULL DEFAULT 'HEALTHY',
    health_score DECIMAL(5, 2) DEFAULT 100.00,
    installation_date DATE,
    last_serviced_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Sensor Data Table (Telemetry Ingestion)
CREATE TABLE sensor_data (
    id BIGSERIAL PRIMARY KEY,
    machine_id INT NOT NULL REFERENCES machines(id) ON DELETE CASCADE,
    air_temperature DECIMAL(6, 2) NOT NULL,    -- in Kelvin (K)
    process_temperature DECIMAL(6, 2) NOT NULL,-- in Kelvin (K)
    rotational_speed DECIMAL(8, 2) NOT NULL,  -- in RPM
    torque DECIMAL(6, 2) NOT NULL,            -- in Nm
    tool_wear DECIMAL(6, 2) NOT NULL,          -- in minutes
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. Predictions Table (ML Inferences)
CREATE TABLE predictions (
    id SERIAL PRIMARY KEY,
    machine_id INT NOT NULL REFERENCES machines(id) ON DELETE CASCADE,
    sensor_data_id BIGINT REFERENCES sensor_data(id) ON DELETE SET NULL,
    failure_type VARCHAR(100) NOT NULL,
    failure_probability DECIMAL(5, 2) NOT NULL,
    health_score DECIMAL(5, 2) NOT NULL,
    is_at_risk BOOLEAN DEFAULT FALSE,
    recommendation TEXT,
    predicted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. Maintenance Scheduler
CREATE TABLE maintenance (
    id SERIAL PRIMARY KEY,
    machine_id INT NOT NULL REFERENCES machines(id) ON DELETE CASCADE,
    assigned_technician_id INT REFERENCES users(id) ON DELETE SET NULL,
    created_by_engineer_id INT REFERENCES users(id) ON DELETE SET NULL,
    title VARCHAR(150) NOT NULL,
    description TEXT,
    priority maintenance_priority NOT NULL DEFAULT 'MEDIUM',
    status maintenance_status NOT NULL DEFAULT 'SCHEDULED',
    scheduled_date DATE NOT NULL,
    completed_at TIMESTAMP WITH TIME ZONE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 6. Failure History (Analytics Ledger)
CREATE TABLE failure_history (
    id SERIAL PRIMARY KEY,
    machine_id INT NOT NULL REFERENCES machines(id) ON DELETE CASCADE,
    maintenance_id INT REFERENCES maintenance(id) ON DELETE SET NULL,
    failure_type VARCHAR(100) NOT NULL,
    occurred_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    downtime_hours DECIMAL(6, 2) DEFAULT 0.0,
    repair_cost DECIMAL(10, 2) DEFAULT 0.00,
    spare_parts_replaced TEXT,
    technician_notes TEXT
);

-- 7. Notifications & Alerts
CREATE TABLE notifications (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id) ON DELETE CASCADE,
    machine_id INT REFERENCES machines(id) ON DELETE CASCADE,
    title VARCHAR(150) NOT NULL,
    message TEXT NOT NULL,
    severity VARCHAR(20) DEFAULT 'INFO',
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 8. Audit Logs
CREATE TABLE audit_logs (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    entity VARCHAR(50) NOT NULL,
    entity_id INT,
    details JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- INDEXES FOR PERFORMANCE
CREATE INDEX idx_sensor_data_machine_time ON sensor_data(machine_id, recorded_at DESC);
CREATE INDEX idx_predictions_machine ON predictions(machine_id, predicted_at DESC);
CREATE INDEX idx_maintenance_status_date ON maintenance(status, scheduled_date);
CREATE INDEX idx_notifications_user_read ON notifications(user_id, is_read);
CREATE INDEX idx_machines_status ON machines(status);

-- SEED DATA
INSERT INTO users (name, email, password_hash, role, phone) VALUES
('Alex Rivera (Admin)', 'admin@factory.com', '$2b$10$e8W/x8R/1zG...hash_placeholder', 'ADMIN', '+1-555-0101'),
('Sarah Chen (Engineer)', 'engineer@factory.com', '$2b$10$e8W/x8R/1zG...hash_placeholder', 'ENGINEER', '+1-555-0102'),
('John Doe (Technician)', 'technician@factory.com', '$2b$10$e8W/x8R/1zG...hash_placeholder', 'TECHNICIAN', '+1-555-0103');

INSERT INTO machines (machine_code, name, type, location, status, health_score, installation_date) VALUES
('M1001', 'CNC Milling Machine', 'M', 'Plant A - Section 1', 'HEALTHY', 98.50, '2023-01-15'),
('M1002', 'Hydraulic Press 50T', 'H', 'Plant A - Section 2', 'WARNING', 62.40, '2022-08-20'),
('M1003', 'Automated Lathe', 'L', 'Plant B - Section 1', 'CRITICAL', 18.20, '2021-11-05');