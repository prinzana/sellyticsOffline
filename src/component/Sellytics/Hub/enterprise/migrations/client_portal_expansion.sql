-- ============================================
-- 2. DISPATCH REQUEST SYSTEM (NEW)
-- ============================================

CREATE TABLE IF NOT EXISTS warehouse_dispatch_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  warehouse_id INTEGER REFERENCES warehouses(id) ON DELETE CASCADE NOT NULL,
  client_id INTEGER REFERENCES warehouse_clients(id) ON DELETE CASCADE NOT NULL,
  status VARCHAR(20) DEFAULT 'PENDING' NOT NULL,
  notes TEXT,
  requested_by_email VARCHAR(255) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  resolved_by VARCHAR(255),
  metadata JSONB DEFAULT '{}',
  CONSTRAINT warehouse_dispatch_requests_status_check CHECK (
    status IN ('PENDING', 'APPROVED', 'PROCESSING', 'DISPATCHED', 'CANCELLED', 'REJECTED')
  )
);

CREATE TABLE IF NOT EXISTS warehouse_dispatch_request_items (
  id BIGSERIAL PRIMARY KEY,
  request_id UUID REFERENCES warehouse_dispatch_requests(id) ON DELETE CASCADE,
  product_id INTEGER REFERENCES warehouse_products(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  status VARCHAR(20) DEFAULT 'PENDING',
  notes TEXT,
  UNIQUE(request_id, product_id)
);

CREATE INDEX IF NOT EXISTS idx_wdr_status ON warehouse_dispatch_requests(status);
CREATE INDEX IF NOT EXISTS idx_wdr_client ON warehouse_dispatch_requests(client_id);
CREATE INDEX IF NOT EXISTS idx_wdr_warehouse ON warehouse_dispatch_requests(warehouse_id);
CREATE INDEX IF NOT EXISTS idx_wdri_request ON warehouse_dispatch_request_items(request_id);

-- ============================================
-- 3. NOTIFICATION SYSTEM (NEW)
-- ============================================

CREATE TABLE IF NOT EXISTS warehouse_notifications (
  id BIGSERIAL PRIMARY KEY,
  warehouse_id INTEGER REFERENCES warehouses(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL,
  title TEXT NOT NULL,
  message TEXT,
  link TEXT,
  is_read BOOLEAN DEFAULT false,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_wn_warehouse ON warehouse_notifications(warehouse_id);
CREATE INDEX IF NOT EXISTS idx_wn_is_read ON warehouse_notifications(is_read) WHERE is_read = false;
