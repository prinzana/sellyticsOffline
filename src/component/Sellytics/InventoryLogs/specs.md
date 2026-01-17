# InventoryLogs Component - Engineering Specifications
**Version**: 1.0.0
**Target**: Production-Grade Reliability & 10X UX
**Status**: Approved for Implementation

## 1. Executive Summary
The `InventoryLogs` module requires a significant refactor to reach production standards. Current critical issues include a broken entry point (`index.js`), redundant files (`Inventory.jsx` vs `InventoryManager.jsx`), and lack of bulk operation capabilities. The goal is to implement a robust **Bulk Restock** feature, fix the entry point, and polish the UI/UX to a premium standard, while ensuring offline-first reliability.

---

## 2. Critical Fixes (P0)

### 2.1 Fix Entry Point
**Context**: `index.js` currently exports `InventoryTracker`, which does not exist.
**Action**:
- Update `src/component/Sellytics/InventoryLogs/index.js` to default export `InventoryManager`.
- Ensure named exports align with the actual component names.

### 2.2 Consolidate Main Component
**Context**: `Inventory.jsx` and `InventoryManager.jsx` are near-duplicates, leading to maintenance confusion.
**Action**:
- Designate `InventoryManager.jsx` as the **Single Source of Truth**.
- Deprecate/Delete `Inventory.jsx` (or turn it into a re-export if needed for legacy, but preferably delete).

---

## 3. New Feature: Bulk Restock (P1)

### 3.1 Requirement
Allow users to select multiple products and restock them in a single flow, rather than opening a modal for each item.

### 3.2 Data Structure
**Payload Interface**:
```javascript
interface RestockItem {
  productId: string;
  productName: string;
  quantity: number;
  reason: string;
  isUnique: boolean;
  imeis: string[]; // Only if isUnique is true
}
```

### 3.3 UI Component: `BulkRestockModal.jsx`
**Specs**:
- **State**: `items` (Array of `RestockItem`).
- **Layout**:
    -   **Header**: "Bulk Restock" with a clear "Add Product" button.
    -   **List Area**: clear table/card list of added items.
        -   Each row has: Name, Quantity Input, Delete Button.
        -   If `isUnique`, show an "Add IMEIs" button/badge count instead of a raw number input (qty is derived from IMEI count).
    -   **Footer**: "Submit All" button (shows total items).
-   **Interaction**:
    -   "Add Product" opens a mini-search or scan interface.
    -   Scanning a barcode adds the item to the list (incubates quantity if already exists).

### 3.4 Service Layer: `inventoryServices.js`
**New Method**: `restockProductsBulk(items, storeId, userEmail)`
**Logic**:
1.  **Iterate** through items.
2.  **Parallelize** requests where possible.
    -   *Note*: Supabase free tier might not support heavy constrained batch inserts for different tables.
    -   *Strategy*: Use `Promise.all` for non-dependent updates.
3.  **Unique Items**: Calls `addImei` loop internally or a new `addImeisBulk` RPC if created (for now, parallel `addImei` is acceptable if batched reasonably).

### 3.5 Offline Strategy
**Logic**:
-   If `!isOnline`, iterate through `items` and call `queueInventoryUpdate` for each.
-   **Optimization**: Support a `bulk_restock` action in `offlineCache` to prevent 50+ individual sync entries clogging the queue UI.
-   *Fallback*: If complex, queuing individually is acceptable for V1, provided the UI shows a "Batch Syncing..." status.

---

## 4. UI/UX Polishing (P2)

### 4.1 "Price Tag" Aesthetics
-   Refine `InventoryCard.jsx`.
-   Use **Inter** font (or system sans).
-   **Numbers**: Monospaced digits for prices/quantities to ensure alignment.
-   **Badges**: Use subtle backgrounds (`bg-blue-50 text-blue-700`) instead of harsh solid colors.

### 4.2 Animations
-   Use `framer-motion` for:
    -   **List Entrance**: Staggered fade-in for inventory items.
    -   **Modal**: Smooth scale/fade in.
    -   **Action**: "Pulse" effect on the Sync button when new items are queued.

---

## 5. Technical Implementation Steps

1.  **Refactor `index.js`**: Re-point exports.
2.  **Create `BulkRestockModal.jsx`**: Scaffold the UI.
3.  **Update `InventoryManager.jsx`**:
    -   Import `BulkRestockModal`.
    -   Add `handleBulkRestock` function.
    -   Connect "Bulk Restock" button in UI (near "Scan").
4.  **Update `inventoryServices.js`**: Implement `restockProductsBulk`.
5.  **Verify & Polish**: Test online/offline toggling.

## 6. Edge Cases & Handling
-   **Partial Failure (Online)**: If 5 of 10 items fail, what happens?
    -   *Spec*: `Promise.allSettled`. Report successes to user, keep failed items in the modal (don't clear form completely) so user can retry.
-   **Duplicate IMEIs in Batch**:
    -   Frontend validation: Prevent adding same IMEI twice in the current batch.
