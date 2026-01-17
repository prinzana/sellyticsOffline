-- ============================================
-- 7. SHARED DRAFTS FOR COLLABORATION
-- ============================================
CREATE TABLE IF NOT EXISTS warehouse_session_draft_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES warehouse_collaboration_sessions(id) ON DELETE CASCADE,
  
  -- Product Data
  product_name TEXT,
  sku TEXT,
  product_type VARCHAR(20) DEFAULT 'STANDARD', -- 'SERIALIZED', 'BATCH', 'STANDARD'
  unit_cost NUMERIC(10,2),
  quantity INTEGER DEFAULT 1,
  
  -- Scanner Data
  scanned_value TEXT, -- The primary barcode that started this draft
  scanned_data JSONB DEFAULT '[]', -- Array of all scans if serialized
  unique_count INTEGER DEFAULT 0,
  
  -- Workflow Status
  status VARCHAR(20) DEFAULT 'draft', -- 'draft', 'ready', 'error'
  is_locked_by TEXT, -- email of user currently editing this line
  locked_at TIMESTAMPTZ,
  
  created_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_drft_session ON warehouse_session_draft_items(session_id);
CREATE INDEX IF NOT EXISTS idx_drft_status ON warehouse_session_draft_items(status);

-- Enable Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE warehouse_session_draft_items;
