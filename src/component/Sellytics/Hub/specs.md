# 🏢 Sellytics Hub - Enterprise Feature Specifications

> **Version**: 2.0 Enterprise  
> **Last Updated**: January 2026  
> **Status**: Specification Draft

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Product Batching System](#1-product-batching-system)
3. [Unique ID & Barcode Generation](#2-unique-id--barcode-generation)
4. [Multi-Product Operations](#3-multi-product-operations)
5. [CSV/Excel Batch Upload](#4-csvexcel-batch-upload)
6. [Multi-Collaboration Environment](#5-multi-collaboration-environment)
7. [Client Reporting & Dashboard Sharing](#6-client-reporting--dashboard-sharing)
8. [Database Schema Extensions](#7-database-schema-extensions)
9. [Security & Compliance](#8-security--compliance)
10. [Implementation Phases](#9-implementation-phases)

---

## Executive Summary

This specification outlines enterprise-grade enhancements to the Sellytics Hub warehouse management system. The proposed features transform the existing single-user inventory system into a **global-standard, multi-tenant, collaborative platform** capable of handling:

- **Batch product operations** with intelligent ID aggregation
- **Auto-generated barcodes** for generic products
- **Real-time multi-user collaboration** with session sharing
- **White-label client dashboards** with role-based access
- **Enterprise reporting** with automated distribution

---

## 1. Product Batching System

### 1.1 Overview

Enable users to add multiple products simultaneously under a unified batch operation. The system distinguishes between **unique** and **non-unique** products.

### 1.2 Product Types Matrix

| Type | ID Behavior | Quantity Calculation | Use Case |
|------|-------------|---------------------|----------|
| **SERIALIZED** | Each ID is unique | `qty = COUNT(DISTINCT ids)` | Electronics, high-value items |
| **BATCH** | IDs represent groups | `qty = COUNT(ids)` | Fast-moving goods |
| **STANDARD** | Manual qty entry | User-defined | Generic commodities |
| **BUNDLED** | Parent with child IDs | `qty = SUM(child_qtys)` | Package deals |

### 1.3 Batch Entry UI Flow

```
┌─────────────────────────────────────────────────────────────────┐
│  📦 BATCH PRODUCT ENTRY                                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Product Name: [___iPhone 15 Pro Max___________]                │
│  Product Type: [● SERIALIZED ○ BATCH ○ STANDARD]                │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ UNIQUE IDs / BARCODES                                    │   │
│  │ ─────────────────────────────────────────────────────── │   │
│  │ IMEI-001234567890 │ ✓ Valid    │ [Remove]               │   │
│  │ IMEI-001234567891 │ ✓ Valid    │ [Remove]               │   │
│  │ IMEI-001234567892 │ ⚠ Duplicate│ [Remove]               │   │
│  │ IMEI-001234567893 │ ✓ Valid    │ [Remove]               │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  [+ Scan Barcode] [+ Manual Entry] [+ Import CSV]              │
│                                                                 │
│  ┌───────────────────────────────────────────────────────┐     │
│  │ 📊 BATCH SUMMARY                                       │     │
│  │ ───────────────────────────────────────────────────── │     │
│  │ Unique IDs: 3      │ Duplicates: 1   │ Total Qty: 3   │     │
│  └───────────────────────────────────────────────────────┘     │
│                                                                 │
│  [Cancel]                                    [Add to Inventory] │
└─────────────────────────────────────────────────────────────────┘
```

### 1.4 Technical Implementation

#### 1.4.1 Data Structure

```typescript
interface BatchProductEntry {
  productId: number;
  productName: string;
  productType: 'SERIALIZED' | 'BATCH' | 'STANDARD' | 'BUNDLED';
  identifiers: UniqueIdentifier[];
  metadata: {
    source: 'scan' | 'manual' | 'csv' | 'api';
    batchSessionId: string;
    createdBy: string;
    createdAt: string;
  };
}

interface UniqueIdentifier {
  id: string;
  value: string;
  type: 'BARCODE' | 'SERIAL' | 'IMEI' | 'CUSTOM' | 'GENERATED';
  status: 'valid' | 'duplicate' | 'invalid';
  scannedAt: string;
  scannedBy: string;
}
```

#### 1.4.2 Quantity Calculation Logic

```javascript
const calculateQuantity = (entry: BatchProductEntry): number => {
  switch (entry.productType) {
    case 'SERIALIZED':
      // Each unique ID = 1 unit
      return new Set(entry.identifiers.map(i => i.value)).size;
    
    case 'BATCH':
      // All IDs share same product, each scan = 1 unit
      return entry.identifiers.length;
    
    case 'BUNDLED':
      // Sum of child quantities
      return entry.childItems?.reduce((sum, c) => sum + c.qty, 0) || 0;
    
    case 'STANDARD':
    default:
      return entry.manualQuantity || 1;
  }
};
```

### 1.5 Aggregation Under Product Name

All scanned/entered identifiers are appended under a single product name:

```sql
-- Each identifier linked to the same product
INSERT INTO warehouse_product_identifiers (
  warehouse_product_id,
  identifier_value,
  identifier_type,
  batch_session_id,
  created_by
) VALUES 
  (123, 'IMEI-001', 'IMEI', 'batch-xyz', 'user@email.com'),
  (123, 'IMEI-002', 'IMEI', 'batch-xyz', 'user@email.com'),
  (123, 'IMEI-003', 'IMEI', 'batch-xyz', 'user@email.com');

-- Quantity auto-calculated from identifier count
UPDATE warehouse_inventory 
SET quantity = (
  SELECT COUNT(DISTINCT identifier_value) 
  FROM warehouse_product_identifiers 
  WHERE warehouse_product_id = 123
)
WHERE warehouse_product_id = 123;
```

---

## 2. Unique ID & Barcode Generation

### 2.1 Problem Statement

Many products arrive without unique barcodes (open-box items, handmade goods, local supplies). The system must generate unique, trackable identifiers for these items.

### 2.2 Generated ID Formats

| Format | Pattern | Example | Use Case |
|--------|---------|---------|----------|
| **SLY-ID** | `SLY-{STORE}-{YYYYMMDD}-{SEQ}` | `SLY-NYC01-20260112-0001` | Standard generated |
| **QR-UUID** | UUID v4 | `a1b2c3d4-e5f6-7890-abcd-ef1234567890` | QR code compatible |
| **EAN-13** | 13-digit EAN | `5901234123457` | Retail compatible |
| **Custom** | User-defined prefix | `BRAND-{SEQ}` | Brand-specific |

### 2.3 Barcode Generation Service

```typescript
interface BarcodeGeneratorConfig {
  format: 'SLY-ID' | 'QR-UUID' | 'EAN-13' | 'CUSTOM';
  prefix?: string;
  includeCheckDigit: boolean;
  quantity: number;
  warehouseId: number;
  productId: number;
}

interface GeneratedBarcode {
  value: string;
  format: string;
  qrCode?: string; // Base64 encoded QR image
  barcode?: string; // Base64 encoded barcode image
  printLabel?: string; // ZPL/EPL for label printers
}
```

### 2.4 Auto-Generation UI

```
┌─────────────────────────────────────────────────────────────────┐
│  🏷️ GENERATE PRODUCT IDENTIFIERS                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Product: iPhone 15 Case (Generic)                              │
│  Current Qty: 0  │  Target Qty: [    50    ]                    │
│                                                                 │
│  ID Format: [▼ SLY-ID (Recommended)          ]                  │
│  Prefix:    [SLY-NYC01-20260112-] (auto-generated)              │
│                                                                 │
│  [☑] Generate printable labels                                  │
│  [☑] Enable QR codes for mobile scanning                        │
│  [☐] EAN-13 compatible (requires GS1 validation)                │
│                                                                 │
│  Preview:                                                       │
│  ┌───────────────────────────────────────────────────────┐     │
│  │ SLY-NYC01-20260112-0001  [■■■ QR ■■■]                 │     │
│  │ SLY-NYC01-20260112-0002  [■■■ QR ■■■]                 │     │
│  │ SLY-NYC01-20260112-0003  [■■■ QR ■■■]                 │     │
│  │ ... (47 more)                                          │     │
│  └───────────────────────────────────────────────────────┘     │
│                                                                 │
│  [Cancel]                     [Generate & Print] [Generate Only]│
└─────────────────────────────────────────────────────────────────┘
```

### 2.5 Database Table

```sql
CREATE TABLE warehouse_generated_identifiers (
  id BIGSERIAL PRIMARY KEY,
  warehouse_id BIGINT REFERENCES warehouses(id),
  warehouse_product_id BIGINT REFERENCES warehouse_products(id),
  identifier_value VARCHAR(100) UNIQUE NOT NULL,
  identifier_format VARCHAR(20) NOT NULL,
  qr_code_url TEXT,
  barcode_url TEXT,
  status VARCHAR(20) DEFAULT 'ACTIVE', -- ACTIVE, VOID, ASSIGNED
  assigned_to_unit_id BIGINT, -- Links to specific inventory unit
  generated_by VARCHAR(255),
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  voided_at TIMESTAMPTZ,
  voided_by VARCHAR(255),
  void_reason TEXT
);

CREATE INDEX idx_gen_id_product ON warehouse_generated_identifiers(warehouse_product_id);
CREATE INDEX idx_gen_id_value ON warehouse_generated_identifiers(identifier_value);
```

---

## 3. Multi-Product Operations

### 3.1 Multi-Delete Feature

Bulk delete multiple products with safeguards:

```
┌─────────────────────────────────────────────────────────────────┐
│  🗑️ BULK DELETE PRODUCTS                                        │
├─────────────────────────────────────────────────────────────────┤
│  ⚠️ WARNING: This action cannot be undone                       │
│                                                                 │
│  Selected: 12 products                                          │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ [☑] iPhone 15 Pro        │ Qty: 45  │ ⚠️ Has inventory  │   │
│  │ [☑] Samsung Galaxy S24   │ Qty: 0   │ ✓ Empty           │   │
│  │ [☑] AirPods Pro 2        │ Qty: 23  │ ⚠️ Has inventory  │   │
│  │ [☐] MacBook Pro 16"      │ Qty: 12  │ 🔒 Active orders  │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ SUMMARY                                                  │   │
│  │ • Deletable: 11 products                                 │   │
│  │ • Blocked: 1 product (active orders)                     │   │
│  │ • Inventory affected: 68 units will be written off      │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  Type "DELETE" to confirm: [____________]                       │
│                                                                 │
│  [Cancel]                               [Delete Selected (11)]  │
└─────────────────────────────────────────────────────────────────┘
```

### 3.2 Bulk Operations Service

```typescript
interface BulkOperationResult {
  success: number;
  failed: number;
  blocked: number;
  details: {
    productId: number;
    productName: string;
    status: 'deleted' | 'failed' | 'blocked';
    reason?: string;
  }[];
  auditLogId: string;
}

interface BulkOperationService {
  bulkDelete(productIds: number[], options: BulkDeleteOptions): Promise<BulkOperationResult>;
  bulkUpdatePrice(productIds: number[], priceChange: PriceUpdatePayload): Promise<BulkOperationResult>;
  bulkTransfer(productIds: number[], targetWarehouse: number): Promise<BulkOperationResult>;
  bulkExport(productIds: number[], format: 'csv' | 'xlsx' | 'pdf'): Promise<Blob>;
}
```

---

## 4. CSV/Excel Batch Upload

### 4.1 Supported Formats

| Format | Extension | Max Size | Encoding |
|--------|-----------|----------|----------|
| CSV | `.csv` | 50MB | UTF-8, UTF-16 |
| Excel | `.xlsx`, `.xls` | 50MB | - |
| Google Sheets | URL import | 100k rows | - |
| TSV | `.tsv` | 50MB | UTF-8 |

### 4.2 Column Mapping Interface

```
┌─────────────────────────────────────────────────────────────────┐
│  📊 BATCH UPLOAD - COLUMN MAPPING                               │
├─────────────────────────────────────────────────────────────────┤
│  File: products_january_2026.xlsx (2,847 rows detected)         │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ YOUR COLUMN          →    SYSTEM FIELD                  │   │
│  │ ─────────────────────────────────────────────────────── │   │
│  │ "Item Name"          →    [▼ Product Name     ] ✓       │   │
│  │ "SKU Code"           →    [▼ SKU              ] ✓       │   │
│  │ "Unit Price"         →    [▼ Unit Cost        ] ✓       │   │
│  │ "Stock Count"        →    [▼ Quantity         ] ✓       │   │
│  │ "Bar Code"           →    [▼ Barcode/ID       ] ✓       │   │
│  │ "Category"           →    [▼ (Skip this column)] ○      │   │
│  │ "Supplier Ref"       →    [▼ Notes            ] ○       │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  Preview (first 5 rows):                                        │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ Product       │ SKU      │ Price  │ Qty │ Barcode       │   │
│  │ iPhone 15     │ IPH15-BK │ 999.00 │ 25  │ 194253000001  │   │
│  │ Samsung S24   │ SAM24-WH │ 899.00 │ 18  │ 887276000003  │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  Import Options:                                                │
│  [☑] Skip duplicates based on SKU                               │
│  [☐] Update existing products if SKU matches                    │
│  [☑] Generate IDs for products without barcodes                 │
│  [☐] Create new clients from "Supplier" column                  │
│                                                                 │
│  [Cancel]  [Save Mapping Template]         [Validate & Import]  │
└─────────────────────────────────────────────────────────────────┘
```

### 4.3 Import Pipeline Architecture

```
┌─────────┐    ┌──────────┐    ┌───────────┐    ┌─────────────┐
│  File   │───>│  Parser  │───>│ Validator │───>│  Processor  │
│ Upload  │    │ (CSV/XLS)│    │           │    │             │
└─────────┘    └──────────┘    └───────────┘    └──────┬──────┘
                                                        │
                    ┌───────────────────────────────────┘
                    │
              ┌─────▼─────┐    ┌──────────────┐    ┌──────────┐
              │   Queue   │───>│ Batch Worker │───>│ Database │
              │ (Supabase)│    │              │    │  Insert  │
              └───────────┘    └──────────────┘    └──────────┘
```

### 4.4 Validation Rules

```typescript
interface ImportValidationRule {
  field: string;
  rules: {
    required?: boolean;
    type?: 'string' | 'number' | 'date' | 'barcode';
    minLength?: number;
    maxLength?: number;
    pattern?: RegExp;
    unique?: boolean;
    customValidator?: (value: any, row: any[]) => ValidationResult;
  };
}

const defaultValidation: ImportValidationRule[] = [
  { field: 'product_name', rules: { required: true, minLength: 2, maxLength: 255 } },
  { field: 'sku', rules: { pattern: /^[A-Z0-9\-]{3,50}$/i, unique: true } },
  { field: 'unit_cost', rules: { type: 'number', min: 0 } },
  { field: 'quantity', rules: { type: 'number', min: 0, integer: true } },
  { field: 'barcode', rules: { pattern: /^[0-9A-Z\-]{5,30}$/i } },
];
```

### 4.5 Google Sheets Integration

```typescript
interface GoogleSheetsImport {
  // Direct URL import
  importFromUrl(sheetsUrl: string): Promise<ImportResult>;
  
  // OAuth-based import (for private sheets)
  importWithAuth(sheetId: string, range: string): Promise<ImportResult>;
  
  // Scheduled sync
  scheduleSync(sheetId: string, interval: 'hourly' | 'daily' | 'weekly'): Promise<SyncJob>;
}
```

---

## 5. Multi-Collaboration Environment

### 5.1 Real-Time Collaboration Architecture

```
                    ┌───────────────────────────────────────┐
                    │         SUPABASE REALTIME             │
                    │    (Postgres Changes + Broadcast)     │
                    └───────────────────┬───────────────────┘
                                        │
            ┌───────────────────────────┼───────────────────────────┐
            │                           │                           │
    ┌───────▼───────┐          ┌───────▼───────┐          ┌───────▼───────┐
    │   User A      │          │   User B      │          │   User C      │
    │  (NYC Office) │          │ (LA Office)   │          │ (Remote)      │
    │               │          │               │          │               │
    │ ┌───────────┐ │          │ ┌───────────┐ │          │ ┌───────────┐ │
    │ │ UI State  │ │          │ │ UI State  │ │          │ │ UI State  │ │
    │ │ Synced    │ │          │ │ Synced    │ │          │ │ Synced    │ │
    │ └───────────┘ │          │ └───────────┘ │          │ └───────────┘ │
    └───────────────┘          └───────────────┘          └───────────────┘
```

### 5.2 Collaboration Session Types

| Session Type | Description | Use Case |
|--------------|-------------|----------|
| **Shared Session** | Same view, synchronized cursors | Training, pair work |
| **Co-Edit** | Same data, independent views | Parallel data entry |
| **Observer** | Read-only with live updates | Supervisor monitoring |
| **Async** | Offline-capable with sync | Field operations |

### 5.3 Session Management UI

```
┌─────────────────────────────────────────────────────────────────┐
│  👥 COLLABORATION SESSION                                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Session: Stock-In January Batch                                │
│  Code: SLY-COLLAB-A7B2C9  [Copy Link]                           │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ ACTIVE PARTICIPANTS                                      │   │
│  │ ─────────────────────────────────────────────────────── │   │
│  │ 🟢 John D. (You)        │ Owner  │ Editing Product List │   │
│  │ 🟢 Sarah M.             │ Editor │ Scanning Items       │   │
│  │ 🟡 Mike T.              │ Editor │ Idle (2 min)         │   │
│  │ 🔵 Lisa K.              │ Viewer │ Observing            │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  [+ Invite User]  [📋 Copy Session Link]  [⚙️ Session Settings] │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ ACTIVITY FEED                                            │   │
│  │ ─────────────────────────────────────────────────────── │   │
│  │ 14:32 │ Sarah scanned IMEI-001234 (iPhone 15 Pro)       │   │
│  │ 14:31 │ Mike added "Samsung Galaxy" to batch            │   │
│  │ 14:30 │ John updated quantity to 45                     │   │
│  │ 14:28 │ Lisa joined as viewer                           │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  [End Session]                              [Commit All Changes]│
└─────────────────────────────────────────────────────────────────┘
```

### 5.4 Presence & Cursor Tracking

```typescript
interface CollaborationPresence {
  userId: string;
  userName: string;
  avatarUrl?: string;
  status: 'active' | 'idle' | 'away';
  currentView: string; // e.g., 'stock-in', 'inventory', 'products'
  currentAction?: string;
  cursorPosition?: { x: number; y: number };
  selectedItems?: string[];
  lastActivity: string;
}

interface CollaborationChannel {
  // Join/leave
  join(sessionId: string, role: 'owner' | 'editor' | 'viewer'): Promise<void>;
  leave(sessionId: string): Promise<void>;
  
  // Presence
  trackPresence(presence: CollaborationPresence): void;
  onPresenceChange(callback: (users: CollaborationPresence[]) => void): void;
  
  // Data sync
  broadcastChange(change: DataChange): void;
  onDataChange(callback: (change: DataChange) => void): void;
  
  // Communication
  sendMessage(message: string): void;
  onMessage(callback: (message: ChatMessage) => void): void;
}
```

### 5.5 Conflict Resolution

```typescript
interface ConflictResolver {
  strategy: 'last-write-wins' | 'first-write-wins' | 'manual' | 'merge';
  
  resolve(
    localChange: DataChange,
    remoteChange: DataChange
  ): ResolvedChange | ConflictPrompt;
}

// Example: Automatic merge for quantity changes
const quantityMerger = {
  field: 'quantity',
  merge: (local: number, remote: number, original: number) => {
    const localDelta = local - original;
    const remoteDelta = remote - original;
    return original + localDelta + remoteDelta;
  }
};
```

---

## 6. Client Reporting & Dashboard Sharing

### 6.1 Report Generation System

```
┌─────────────────────────────────────────────────────────────────┐
│  📊 GENERATE CLIENT REPORT                                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Client: Acme Electronics Ltd.                                  │
│  Report Period: [Jan 1, 2026] to [Jan 31, 2026]                 │
│                                                                 │
│  Report Sections:                                               │
│  [☑] Inventory Summary         [☑] Stock Movements             │
│  [☑] Product List              [☐] Cost Analysis               │
│  [☑] Returns Summary           [☐] Forecasting                 │
│                                                                 │
│  Delivery:                                                      │
│  [☑] Email to: client@acme.com                                  │
│  [☑] Generate shareable link (expires in 7 days)               │
│  [☐] Schedule weekly/monthly auto-send                         │
│                                                                 │
│  Format: [● PDF  ○ Excel  ○ Both]                               │
│                                                                 │
│  [Preview Report]              [Generate & Send]                │
└─────────────────────────────────────────────────────────────────┘
```

### 6.2 Client Dashboard Portal

A white-labeled, secure portal where clients can view their data:

```
┌─────────────────────────────────────────────────────────────────┐
│  🔗 CLIENT DASHBOARD ACCESS                                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Dashboard URL:                                                 │
│  https://hub.sellytics.com/client/abc123xyz                    │
│  [Copy Link]                                                    │
│                                                                 │
│  Access Method:                                                 │
│  [● Client Email Verification]                                  │
│  [○ Client ID + PIN]                                            │
│  [○ SSO (Enterprise)]                                           │
│                                                                 │
│  Allowed Client Emails:                                         │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ client@acme.com          │ Full Access   │ [Remove]     │   │
│  │ manager@acme.com         │ View Only     │ [Remove]     │   │
│  │ [+ Add Email]                                           │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  Client Permissions:                                            │
│  [☑] View inventory levels                                      │
│  [☑] View stock movements                                       │
│  [☐] Initiate return requests                                   │
│  [☐] Place stock-out requests                                   │
│  [☐] Download reports                                           │
│  [☐] View pricing/costs                                         │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 6.3 Client Authentication Flow

```
┌──────────────┐     ┌────────────────────────┐     ┌─────────────┐
│   Client     │────>│  Client Portal URL     │────>│  Verify     │
│   Clicks     │     │  hub.sellytics.com/    │     │  Identity   │
│   Link       │     │  client/abc123xyz      │     │             │
└──────────────┘     └────────────────────────┘     └──────┬──────┘
                                                           │
            ┌──────────────────────────────────────────────┤
            │                                              │
     ┌──────▼──────┐                               ┌──────▼──────┐
     │ Email OTP   │                               │ Client ID   │
     │ Verification│                               │ + PIN       │
     └──────┬──────┘                               └──────┬──────┘
            │                                              │
            └──────────────────┬───────────────────────────┘
                               │
                        ┌──────▼──────┐
                        │  Dashboard  │
                        │  Rendered   │
                        │  with RBAC  │
                        └─────────────┘
```

### 6.4 Client Portal Features

```typescript
interface ClientPortalConfig {
  clientId: string;
  accessToken: string; // Unique per-client
  expiresAt: string;
  
  permissions: {
    viewInventory: boolean;
    viewMovements: boolean;
    viewPricing: boolean;
    initiateReturns: boolean;
    requestDispatch: boolean;
    downloadReports: boolean;
    viewAnalytics: boolean;
  };
  
  branding?: {
    logoUrl: string;
    primaryColor: string;
    companyName: string;
  };
  
  allowedEmails: string[];
  allowedDomains?: string[]; // e.g., '@acme.com'
}
```

### 6.5 Client Actions Matrix

| Action | Permission Required | Triggers |
|--------|---------------------|----------|
| View Inventory | `viewInventory` | None |
| View History | `viewMovements` | None |
| Request Return | `initiateReturns` | Creates return request |
| Request Dispatch | `requestDispatch` | Creates dispatch request |
| Download CSV | `downloadReports` | Audit log |
| View Costs | `viewPricing` | None |

---

## 7. Database Schema Analysis

### 7.1 Existing Tables (Already Implemented ✅)

Based on code analysis, the following tables **already exist** in your Supabase database:

| Table | Purpose | Status |
|-------|---------|--------|
| `warehouses` | Warehouse entity (id, name, owner_store_id, is_active) | ✅ Complete |
| `warehouse_clients` | Client abstraction (id, warehouse_id, client_type, sellytics_store_id, client_name, business_name, email, phone, is_active) | ✅ Complete |
| `warehouse_products` | Product catalog (id, warehouse_id, warehouse_client_id, product_name, sku, product_type, unit_cost, metadata, created_by) | ✅ Complete |
| `warehouse_inventory` | Current stock levels (id, warehouse_id, warehouse_product_id, client_id, quantity, available_qty, damaged_qty, unit_cost) | ✅ Complete |
| `warehouse_ledger` | Immutable movement log (id, warehouse_id, warehouse_product_id, client_id, movement_type, movement_subtype, quantity, unique_identifiers, notes, item_condition, created_by) | ✅ Complete |
| `warehouse_scan_sessions` | Barcode scanning sessions (id, warehouse_id, client_id, created_by, status, session_type, closed_at) | ✅ Complete |
| `warehouse_scan_events` | Individual scan records (id, session_id, scanned_value, created_by, is_duplicate, detected_product_id, notes) | ✅ Complete |
| `warehouse_return_requests` | Return processing (id, warehouse_id, client_id, warehouse_product_id, quantity, reason, status, condition, inspection_notes, inspected_by, inspected_at) | ✅ Complete |
| `warehouse_transfers` | Transfer headers (id, warehouse_id, destination_store_id, status, total_items, created_by) | ✅ Complete |
| `warehouse_transfer_items` | Transfer line items (id, transfer_id, warehouse_product_id, quantity) | ✅ Complete |
| `warehouse_audit_logs` | Audit trail (id, warehouse_id, user_id, action, entity_type, entity_id, details) | ✅ Complete |

#### Existing Product Types (Already Supported)
```javascript
// From ProductForm.jsx and useProductModal.js
const PRODUCT_TYPES = [
  { value: "STANDARD", label: "Standard", desc: "Regular items – counted by quantity" },
  { value: "SERIALIZED", label: "Serialized", desc: "Each unit has a unique serial/barcode" },
  { value: "BATCH", label: "Batch", desc: "All units share the same barcode – scan to count" },
];
```

#### Existing Scan System (Already Supports Unique IDs)
```javascript
// From warehouse_ledger - already stores unique_identifiers as JSONB array
unique_identifiers: uniqueIdentifiers  // Array of scanned barcodes/serials

// From useBarcodeScanner.js - already handles:
// - Real-time scanning with Supabase subscriptions
// - Duplicate detection
// - Unique count vs total count
stats: { total: totalCount, unique: uniqueCount, duplicates: duplicateCount }
```

### 7.2 Gap Analysis - What's Missing

| Feature | Existing Support | Gap | New Table Required? |
|---------|-----------------|-----|---------------------|
| **Product Batching** | `unique_identifiers` in ledger | Need persistent identifier storage per product | ⚠️ **New table needed** |
| **ID Generation** | None | No auto-generated barcodes | ⚠️ **New table needed** |
| **Multi-Delete** | Single delete only | UI/logic only - no schema change | ❌ No |
| **CSV/Excel Import** | None | Need job tracking | ⚠️ **New table needed** |
| **Collaboration** | Scan sessions exist | Need multi-user presence | ⚠️ **New table needed** |
| **Client Portal** | None | Need auth tokens & permissions | ⚠️ **New table needed** |
| **Scheduled Reports** | None | Need scheduling system | ⚠️ **New table needed** |

### 7.3 New Tables Required (Following Your Conventions)

Using your existing naming conventions:
- Prefix: `warehouse_` for warehouse-related tables
- Column naming: `snake_case`
- Common columns: `created_by`, `created_at`, `is_active`
- ID references: `{table}_id` pattern (e.g., `warehouse_id`, `client_id`)

```sql
-- ============================================
-- 1. PRODUCT IDENTIFIERS (Extends existing scan system)
-- Links persistent barcodes/serials to products
-- ============================================
CREATE TABLE warehouse_product_identifiers (
  id BIGSERIAL PRIMARY KEY,
  warehouse_id BIGINT REFERENCES warehouses(id) NOT NULL,
  warehouse_product_id BIGINT REFERENCES warehouse_products(id) ON DELETE CASCADE,
  client_id BIGINT REFERENCES warehouse_clients(id),
  identifier_value VARCHAR(100) NOT NULL,
  identifier_type VARCHAR(20) NOT NULL DEFAULT 'BARCODE', -- BARCODE, SERIAL, IMEI, CUSTOM, GENERATED
  is_generated BOOLEAN DEFAULT false,
  status VARCHAR(20) DEFAULT 'ACTIVE', -- ACTIVE, VOID, SOLD
  scan_session_id BIGINT REFERENCES warehouse_scan_sessions(id),
  created_by VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  voided_at TIMESTAMPTZ,
  voided_by VARCHAR(255),
  UNIQUE(warehouse_id, identifier_value) -- No duplicate IDs within warehouse
);

-- ============================================
-- 2. GENERATED IDENTIFIERS (For products without barcodes)
-- Stores auto-generated IDs with QR/barcode images
-- ============================================
CREATE TABLE warehouse_generated_identifiers (
  id BIGSERIAL PRIMARY KEY,
  warehouse_id BIGINT REFERENCES warehouses(id) NOT NULL,
  warehouse_product_id BIGINT REFERENCES warehouse_products(id),
  identifier_value VARCHAR(100) UNIQUE NOT NULL,
  identifier_format VARCHAR(20) NOT NULL DEFAULT 'SLY-ID', -- SLY-ID, QR-UUID, EAN-13, CUSTOM
  qr_code_url TEXT,
  barcode_url TEXT,
  assigned_to_identifier_id BIGINT REFERENCES warehouse_product_identifiers(id),
  status VARCHAR(20) DEFAULT 'AVAILABLE', -- AVAILABLE, ASSIGNED, VOID
  generated_by VARCHAR(255),
  generated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 3. COLLABORATION SESSIONS (Extends existing scan_sessions)
-- Multi-user real-time collaboration
-- ============================================
CREATE TABLE warehouse_collaboration_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  warehouse_id BIGINT REFERENCES warehouses(id) NOT NULL,
  client_id BIGINT REFERENCES warehouse_clients(id),
  session_code VARCHAR(20) UNIQUE NOT NULL, -- Shareable code like SLY-A7B2C9
  session_type VARCHAR(20) NOT NULL DEFAULT 'co-edit', -- shared, co-edit, observer
  session_purpose VARCHAR(50), -- stock_in, dispatch, inventory_check
  created_by VARCHAR(255) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  metadata JSONB DEFAULT '{}'
);

CREATE TABLE warehouse_collaboration_participants (
  id BIGSERIAL PRIMARY KEY,
  session_id UUID REFERENCES warehouse_collaboration_sessions(id) ON DELETE CASCADE,
  user_email VARCHAR(255) NOT NULL,
  role VARCHAR(20) NOT NULL DEFAULT 'editor', -- owner, editor, viewer
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  last_activity TIMESTAMPTZ,
  status VARCHAR(20) DEFAULT 'active', -- active, idle, away, disconnected
  current_view VARCHAR(100), -- What screen they're on
  cursor_data JSONB, -- For cursor tracking (optional)
  UNIQUE(session_id, user_email)
);

-- ============================================
-- 4. CLIENT PORTAL ACCESS
-- Secure shareable dashboard links for clients
-- ============================================
CREATE TABLE warehouse_client_portal_access (
  id BIGSERIAL PRIMARY KEY,
  warehouse_id BIGINT REFERENCES warehouses(id) NOT NULL,
  client_id BIGINT REFERENCES warehouse_clients(id) ON DELETE CASCADE,
  access_token VARCHAR(100) UNIQUE NOT NULL, -- URL-safe token
  allowed_emails TEXT[] DEFAULT '{}',
  allowed_domains TEXT[] DEFAULT '{}', -- e.g., '@acme.com'
  permissions JSONB NOT NULL DEFAULT '{"view_inventory": true, "view_movements": true}',
  branding JSONB DEFAULT '{}', -- Custom logo, colors
  created_by VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true
);

CREATE TABLE warehouse_client_portal_sessions (
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

-- ============================================
-- 5. BATCH IMPORT JOBS
-- Track CSV/Excel upload progress
-- ============================================
CREATE TABLE warehouse_import_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  warehouse_id BIGINT REFERENCES warehouses(id) NOT NULL,
  client_id BIGINT REFERENCES warehouse_clients(id),
  file_name VARCHAR(255) NOT NULL,
  file_url TEXT,
  source_type VARCHAR(20) NOT NULL DEFAULT 'csv', -- csv, xlsx, google_sheets
  status VARCHAR(20) DEFAULT 'pending', -- pending, validating, processing, completed, failed
  total_rows INT,
  processed_rows INT DEFAULT 0,
  success_count INT DEFAULT 0,
  error_count INT DEFAULT 0,
  column_mapping JSONB, -- User's field mapping
  validation_errors JSONB DEFAULT '[]',
  created_by VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- ============================================
-- 6. SCHEDULED REPORTS
-- Automated report generation & delivery
-- ============================================
CREATE TABLE warehouse_scheduled_reports (
  id BIGSERIAL PRIMARY KEY,
  warehouse_id BIGINT REFERENCES warehouses(id) NOT NULL,
  client_id BIGINT REFERENCES warehouse_clients(id),
  report_name VARCHAR(100) NOT NULL,
  report_type VARCHAR(50) NOT NULL, -- inventory_summary, movements, returns, full
  schedule VARCHAR(20) NOT NULL, -- daily, weekly, monthly
  schedule_config JSONB DEFAULT '{}', -- day of week, time, etc.
  format VARCHAR(20) DEFAULT 'pdf', -- pdf, xlsx, both
  recipients TEXT[] NOT NULL,
  next_run_at TIMESTAMPTZ,
  last_run_at TIMESTAMPTZ,
  last_run_status VARCHAR(20),
  config JSONB DEFAULT '{}', -- Report-specific options
  is_active BOOLEAN DEFAULT true,
  created_by VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE warehouse_report_history (
  id BIGSERIAL PRIMARY KEY,
  scheduled_report_id BIGINT REFERENCES warehouse_scheduled_reports(id) ON DELETE SET NULL,
  warehouse_id BIGINT REFERENCES warehouses(id) NOT NULL,
  client_id BIGINT REFERENCES warehouse_clients(id),
  report_type VARCHAR(50) NOT NULL,
  file_url TEXT,
  file_size_bytes BIGINT,
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  sent_to TEXT[],
  status VARCHAR(20) DEFAULT 'generated' -- generated, sent, failed
);
```

### 7.4 Indexes for New Tables

```sql
-- Identifier lookups (critical for scanning)
CREATE INDEX idx_wpi_warehouse ON warehouse_product_identifiers(warehouse_id);
CREATE INDEX idx_wpi_product ON warehouse_product_identifiers(warehouse_product_id);
CREATE INDEX idx_wpi_value ON warehouse_product_identifiers(identifier_value);
CREATE INDEX idx_wpi_status ON warehouse_product_identifiers(status) WHERE status = 'ACTIVE';

-- Generated ID lookups
CREATE INDEX idx_wgi_value ON warehouse_generated_identifiers(identifier_value);
CREATE INDEX idx_wgi_product ON warehouse_generated_identifiers(warehouse_product_id);

-- Collaboration performance
CREATE INDEX idx_wcs_code ON warehouse_collaboration_sessions(session_code);
CREATE INDEX idx_wcs_active ON warehouse_collaboration_sessions(is_active) WHERE is_active = true;
CREATE INDEX idx_wcp_session ON warehouse_collaboration_participants(session_id);

-- Portal access
CREATE INDEX idx_wcpa_token ON warehouse_client_portal_access(access_token);
CREATE INDEX idx_wcpa_client ON warehouse_client_portal_access(client_id);
CREATE INDEX idx_wcps_token ON warehouse_client_portal_sessions(session_token);

-- Import jobs
CREATE INDEX idx_wij_status ON warehouse_import_jobs(status);
CREATE INDEX idx_wij_warehouse ON warehouse_import_jobs(warehouse_id);

-- Reports
CREATE INDEX idx_wsr_next_run ON warehouse_scheduled_reports(next_run_at) WHERE is_active = true;
CREATE INDEX idx_wrh_client ON warehouse_report_history(client_id);
```

### 7.5 Leveraging Existing Infrastructure

**What We Can Reuse (No Changes Needed):**

| Existing Feature | How It Helps New Features |
|-----------------|---------------------------|
| `warehouse_scan_sessions` | Can extend for collaboration tracking |
| `warehouse_scan_events` + Realtime | Already has Supabase subscriptions for real-time |
| `warehouse_ledger.unique_identifiers` | Already stores scanned IDs as JSONB array |
| `warehouse_products.product_type` | SERIALIZED/BATCH already distinguish ID handling |
| `warehouse_audit_logs` | Can log all new operations |
| `useSession.js` / `userEmail` | Auth pattern already established |
| `useBarcodeScanner.js` | Real-time scanning already working |

**What Needs Enhancement (Minor Schema Updates):**

```sql
-- Optional: Add to existing warehouse_scan_sessions
ALTER TABLE warehouse_scan_sessions 
  ADD COLUMN IF NOT EXISTS collaboration_session_id UUID REFERENCES warehouse_collaboration_sessions(id);

-- Optional: Add to existing warehouse_products for batch tracking  
ALTER TABLE warehouse_products
  ADD COLUMN IF NOT EXISTS identifier_count INT DEFAULT 0;
```

---

## 8. Security & Compliance

### 8.1 Data Protection

| Feature | Implementation |
|---------|----------------|
| **Encryption at Rest** | Supabase default (AES-256) |
| **Encryption in Transit** | TLS 1.3 |
| **Access Logging** | warehouse_audit_logs table |
| **Session Management** | JWT with 1-hour expiry |
| **Client Portal Auth** | Email OTP / PIN verification |

### 8.2 Row-Level Security Policies

```sql
-- Client can only view their own data
CREATE POLICY client_portal_inventory_policy ON warehouse_inventory
  FOR SELECT
  USING (
    client_id IN (
      SELECT client_id FROM client_portal_access 
      WHERE access_token = current_setting('app.client_token', true)
      AND is_active = true
    )
  );

-- Collaboration session isolation
CREATE POLICY collab_session_policy ON collaboration_sessions
  FOR ALL
  USING (
    warehouse_id IN (
      SELECT warehouse_id FROM user_warehouse_access 
      WHERE user_email = current_setting('app.user_email', true)
    )
  );
```

### 8.3 Audit Trail

All operations create audit entries:

```typescript
interface AuditEntry {
  id: string;
  warehouseId: number;
  userId: string;
  action: AuditAction;
  entityType: 'product' | 'inventory' | 'client' | 'session' | 'report';
  entityId: string;
  previousState?: object;
  newState?: object;
  ipAddress: string;
  userAgent: string;
  timestamp: string;
}

type AuditAction = 
  | 'CREATE' | 'UPDATE' | 'DELETE' 
  | 'BULK_DELETE' | 'BULK_UPDATE'
  | 'IMPORT' | 'EXPORT'
  | 'SESSION_START' | 'SESSION_END'
  | 'CLIENT_LOGIN' | 'REPORT_GENERATED';
```

---

## 9. Implementation Phases

### Phase 1: Foundation (Weeks 1-3)
- [ ] Database schema extensions
- [ ] Product batching core logic
- [ ] Multi-delete UI and service
- [ ] Basic barcode generation

### Phase 2: Import System (Weeks 4-5)
- [ ] CSV parser and validator
- [ ] Excel file support
- [ ] Column mapping interface
- [ ] Background job processing

### Phase 3: Collaboration (Weeks 6-8)
- [ ] Supabase Realtime integration
- [ ] Session management
- [ ] Presence tracking
- [ ] Conflict resolution

### Phase 4: Client Portal (Weeks 9-11)
- [ ] Portal authentication
- [ ] Dashboard rendering
- [ ] Permission system
- [ ] Report generation

### Phase 5: Polish & Security (Week 12)
- [ ] RLS policies
- [ ] Performance optimization
- [ ] Documentation
- [ ] User acceptance testing

---

## Appendix A: API Endpoints

```typescript
// Product Batching
POST   /api/products/batch
GET    /api/products/batch/:sessionId
DELETE /api/products/batch/:sessionId

// Identifier Generation
POST   /api/identifiers/generate
GET    /api/identifiers/:productId
POST   /api/identifiers/print

// Bulk Operations
POST   /api/products/bulk-delete
POST   /api/products/bulk-update
POST   /api/products/bulk-export

// Import
POST   /api/import/upload
POST   /api/import/validate
POST   /api/import/execute
GET    /api/import/jobs/:jobId

// Collaboration
POST   /api/collaboration/session
GET    /api/collaboration/session/:code
POST   /api/collaboration/session/:code/join
DELETE /api/collaboration/session/:code/leave

// Client Portal
POST   /api/client-portal/verify
GET    /api/client-portal/:token/dashboard
POST   /api/client-portal/:token/request

// Reports
POST   /api/reports/generate
POST   /api/reports/schedule
GET    /api/reports/:clientId
```

---

## Appendix B: Component Architecture

```
src/component/Sellytics/Hub/
├── enterprise/
│   ├── BatchProductEntry/
│   │   ├── BatchProductEntry.jsx
│   │   ├── BatchProductList.jsx
│   │   ├── IdentifierScanner.jsx
│   │   └── useBatchEntry.js
│   │
│   ├── BulkOperations/
│   │   ├── BulkDeleteModal.jsx
│   │   ├── BulkUpdateModal.jsx
│   │   └── useBulkOperations.js
│   │
│   ├── Import/
│   │   ├── ImportWizard.jsx
│   │   ├── ColumnMapper.jsx
│   │   ├── ValidationPreview.jsx
│   │   └── useImport.js
│   │
│   ├── Collaboration/
│   │   ├── CollaborationPanel.jsx
│   │   ├── PresenceIndicator.jsx
│   │   ├── ActivityFeed.jsx
│   │   └── useCollaboration.js
│   │
│   ├── ClientPortal/
│   │   ├── PortalDashboard.jsx
│   │   ├── PortalAuth.jsx
│   │   ├── ClientInventoryView.jsx
│   │   └── useClientPortal.js
│   │
│   ├── Reports/
│   │   ├── ReportGenerator.jsx
│   │   ├── ReportScheduler.jsx
│   │   └── useReports.js
│   │
│   └── BarcodeGenerator/
│       ├── BarcodeGenerator.jsx
│       ├── LabelPrinter.jsx
│       └── useBarcodeGenerator.js
│
├── services/
│   ├── batchService.js
│   ├── importService.js
│   ├── collaborationService.js
│   ├── clientPortalService.js
│   └── reportService.js
│
└── types/
    └── enterprise.d.ts
```

---

> **Document Status**: Ready for Review  
> **Next Steps**: Approval → Phase 1 Implementation
