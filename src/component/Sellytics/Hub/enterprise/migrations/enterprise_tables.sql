-- ============================================
-- SELLYTICS HUB ENTERPRISE - MINIMAL MIGRATION
-- Only tables that DON'T already exist
-- ============================================

-- ============================================
-- EXISTING TABLES YOU ALREADY HAVE:
-- ============================================
-- ✓ warehouses
-- ✓ warehouse_clients
-- ✓ warehouse_products
-- ✓ warehouse_inventory
-- ✓ warehouse_ledger
-- ✓ warehouse_scan_sessions
-- ✓ warehouse_scan_events
-- ✓ warehouse_serials ← USE THIS instead of warehouse_product_identifiers!
-- ✓ warehouse_transfers
-- ✓ warehouse_transfer_items
-- ✓ warehouse_return_requests
-- ✓ warehouse_stock_movements

-- ============================================
-- 1. COLLABORATION SESSIONS (NEW)
-- ============================================
CREATE TABLE IF NOT EXISTS warehouse_collaboration_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  warehouse_id INTEGER REFERENCES warehouses(id) ON DELETE CASCADE NOT NULL,
  client_id INTEGER REFERENCES warehouse_clients(id),
  session_code VARCHAR(20) UNIQUE NOT NULL,
  session_type VARCHAR(20) NOT NULL DEFAULT 'co-edit',
  session_purpose VARCHAR(50),
  created_by TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  metadata JSONB DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS warehouse_collaboration_participants (
  id BIGSERIAL PRIMARY KEY,
  session_id UUID REFERENCES warehouse_collaboration_sessions(id) ON DELETE CASCADE,
  user_email VARCHAR(255) NOT NULL,
  role VARCHAR(20) NOT NULL DEFAULT 'editor',
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  last_activity TIMESTAMPTZ,
  status VARCHAR(20) DEFAULT 'active',
  current_view VARCHAR(100),
  cursor_data JSONB,
  UNIQUE(session_id, user_email)
);

CREATE INDEX IF NOT EXISTS idx_wcs_code ON warehouse_collaboration_sessions(session_code);
CREATE INDEX IF NOT EXISTS idx_wcs_active ON warehouse_collaboration_sessions(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_wcp_session ON warehouse_collaboration_participants(session_id);

-- ============================================
-- 2. CLIENT PORTAL ACCESS (NEW)
-- ============================================
CREATE TABLE IF NOT EXISTS warehouse_client_portal_access (
  id BIGSERIAL PRIMARY KEY,
  warehouse_id INTEGER REFERENCES warehouses(id) ON DELETE CASCADE NOT NULL,
  client_id INTEGER REFERENCES warehouse_clients(id) ON DELETE CASCADE,
  access_token VARCHAR(100) UNIQUE NOT NULL,
  allowed_emails TEXT[] DEFAULT '{}',
  allowed_domains TEXT[] DEFAULT '{}',
  permissions JSONB NOT NULL DEFAULT '{"view_inventory": true, "view_movements": true}',
  branding JSONB DEFAULT '{}',
  created_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true
);

CREATE TABLE IF NOT EXISTS warehouse_client_portal_sessions (
  id BIGSERIAL PRIMARY KEY,
  portal_access_id BIGINT REFERENCES warehouse_client_portal_access(id) ON DELETE CASCADE,
  verified_email VARCHAR(255) NOT NULL,
  session_token VARCHAR(255) UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  last_activity TIMESTAMPTZ,
  ip_address INET,
  user_agent TEXT
);

CREATE INDEX IF NOT EXISTS idx_wcpa_token ON warehouse_client_portal_access(access_token);
CREATE INDEX IF NOT EXISTS idx_wcpa_client ON warehouse_client_portal_access(client_id);
CREATE INDEX IF NOT EXISTS idx_wcps_token ON warehouse_client_portal_sessions(session_token);

-- ============================================
-- 3. IMPORT JOBS (NEW)
-- ============================================
CREATE TABLE IF NOT EXISTS warehouse_import_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  warehouse_id INTEGER REFERENCES warehouses(id) ON DELETE CASCADE NOT NULL,
  client_id INTEGER REFERENCES warehouse_clients(id),
  file_name VARCHAR(255) NOT NULL,
  file_url TEXT,
  source_type VARCHAR(20) NOT NULL DEFAULT 'csv',
  status VARCHAR(20) DEFAULT 'pending',
  total_rows INT,
  processed_rows INT DEFAULT 0,
  success_count INT DEFAULT 0,
  error_count INT DEFAULT 0,
  column_mapping JSONB,
  validation_errors JSONB DEFAULT '[]',
  created_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  CONSTRAINT warehouse_import_jobs_status_check CHECK (
    status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')
  )
);

CREATE INDEX IF NOT EXISTS idx_wij_status ON warehouse_import_jobs(status);
CREATE INDEX IF NOT EXISTS idx_wij_warehouse ON warehouse_import_jobs(warehouse_id);

-- ============================================
-- 4. AUDIT LOGS (NEW) - for bulk operations
-- ============================================
CREATE TABLE IF NOT EXISTS warehouse_audit_logs (
  id BIGSERIAL PRIMARY KEY,
  warehouse_id INTEGER REFERENCES warehouses(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  action VARCHAR(50) NOT NULL,
  entity_type VARCHAR(50) NOT NULL,
  entity_id TEXT,
  old_values JSONB,
  new_values JSONB,
  details JSONB DEFAULT '{}',
  ip_address INET,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_wal_warehouse ON warehouse_audit_logs(warehouse_id);
CREATE INDEX IF NOT EXISTS idx_wal_action ON warehouse_audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_wal_entity ON warehouse_audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_wal_created ON warehouse_audit_logs(created_at DESC);

-- ============================================
-- 5. OPTIONAL: Link scan sessions to collaboration
-- ============================================
ALTER TABLE warehouse_scan_sessions 
  ADD COLUMN IF NOT EXISTS collaboration_session_id UUID REFERENCES warehouse_collaboration_sessions(id);

-- ============================================
-- 6. ENABLE REALTIME FOR COLLABORATION
-- ============================================
-- Uncomment if you want real-time updates:
-- ALTER PUBLICATION supabase_realtime ADD TABLE warehouse_collaboration_participants;
