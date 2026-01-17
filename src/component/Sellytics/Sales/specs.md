# Offline Sales Component - Engineering Specifications
**Version**: 2.1.0-proposal
**Status**: Draft
**Target**: Production-Grade Reliability & Performance

## 1. Overview
This document outlines the technical specifications for refactoring and optimizing the `src/component/Sellytics/Sales` module. The primary goals are to fix critical offline-mode logical flaws, improve write performance via bulk operations, and decouple the monolithic `Sales.jsx` component.

---

## 2. Phase 1: Critical Reliability & Data Integrity (High Priority)

### 2.1 Enable Offline Deletion
**Problem/Context**: Currently, `handleDeleteOfflineSale` allows deletion only when `isOnline` is true. This traps users with incorrect pending sales if they lose connection.
**Target File**: `src/component/Sellytics/Sales/Sales.jsx`, `src/component/Sellytics/db/offlineCache.js` (if needed)

**Implementation Specs**:
1.  **Modify `handleDeleteOfflineSale` logic**:
    -   Remove the guard clause `if (!isOnline)`.
    -   **Condition**: Allow deletion if the sale is **locally pending** (i.e., `_synced` is false).
    -   **Action**: Call `offlineCache.deleteOfflineSale(saleId)`.
2.  **Verify `deleteOfflineSale` in `offlineCache.js`**:
    -   Ensure it correctly removes the entry from `dynamic_sales` (Dexie).
    -   Ensure it removes any associated `offline_queue` items to prevent "ghost" syncs.
    -   **Constraint**: If the sale was already synced (`_synced: true`), deletion *must* remain online-only (or queue a "delete" operation, but for phase 1 we focus on *unsynced* deletion).

### 2.2 Bulk Insert Optimization
**Problem/Context**: `createSale` iterates through lines and awaits `salesService.createSaleLine` one by one. This causes N+1 network requests (Online) and N+1 storage transactions (Offline).

**Target File**: `src/component/Sellytics/Sales/services/salesService.js`, `src/component/Sellytics/db/salesCache.js`

**Implementation Specs**:
1.  **Update `salesService.js`**:
    -   Create new method: `createSaleLinesBulk(linesData)`.
    -   Use `supabase.from('dynamic_sales').insert(linesData)` (pass the array).
2.  **Update `offlineCache.js` / `salesCache.js`**:
    -   Create new method: `createOfflineSaleLinesBulk(linesData)`.
    -   Use `db.dynamic_sales.bulkAdd(linesData)`.
    -   Create a SINGLE `offline_queue` entry for the batch if possible, or bulk add queue items. *Recommendation*: Bulk add queue items to maintain granular tracking, but inside a single `db.transaction`.
3.  **Refactor `Sales.jsx` -> `createSale`**:
    -   Prepare all line data objects into an array `allLinesPayload`.
    -   Call `createSaleLinesBulk(allLinesPayload)`.

---

## 3. Phase 2: Architecture Refactoring (Maintainability)

### 3.1 Deconstruct `Sales.jsx`
**Problem/Context**: `Sales.jsx` is ~700 lines. It mixes layout, state, and effects.
**New Component Structure**:

#### `src/component/Sellytics/Sales/components/SalesHeader.jsx`
*   **Props**: `isOnline`, `queueCount`, `isSyncing`, `syncPaused`, `onSync`, `onPause`, `onResume`.
*   **Responsibility**: Render the status badges and sync controls.

#### `src/component/Sellytics/Sales/components/SalesTabs.jsx`
*   **Props**: `activeTab`, `onTabChange`.
*   **Responsibility**: Render the "Checkout" vs "History" tab switcher.

#### `src/component/Sellytics/Sales/components/SalesQuickActions.jsx`
*   **Props**: `onScanClick`, `onRefreshClick`.
*   **Responsibility**: Render the "Quick Scan" and "Refresh" cards.

#### `src/component/Sellytics/Sales/Sales.jsx` (Refactored)
*   **Role**: Main Container (smart component).
*   **Responsibility**: 
    -   Hold the `useDataLoader`, `useOfflineSync` hooks.
    -   Pass state down to the new sub-components.
    -   Manage the Modal visibility state (`showCheckoutForm`, etc).

### 3.2 Refactor `useCheckoutState`
**Problem/Context**: `applyBarcode` is overly complex and handles too many responsibilities (finding logic + state update logic).
**Target File**: `src/component/Sellytics/Sales/hooks/useCheckoutState.js`

**Implementation Specs**:
1.  **Extract Helper Functions** (outside the hook or in a utils file):
    -   `findDuplicateLine(lines, barcode)`: Returns matching line or null.
    -   `createLineFromProduct(product)`: Returns a clean new line object.
2.  **Simplify `applyBarcode`**:
    -   Ideally, this function should just be a reducer dispatch or a simple compose of the helpers above.

---

## 4. Phase 3: Performance & UX (10X Experience)

### 4.1 List Virtualization
**Target**: `SalesHistory.jsx` and `PendingSalesList.jsx`.
**Tech**: `react-window`.
**Specs**:
-   Replace the standard `.map()` render with `<FixedSizeList>` (for history) or `<VariableSizeList>` (if heights vary).
-   **Requirement**: Items must have a reliable height. If mostly uniform, use FixedSize.
-   **Why**: Supports 10,000+ sales without UI thread blocking.

### 4.2 Optimistic UI
**Target**: `Sales.jsx` (Sale creation flow).
**Specs**:
-   Start using `react-query` or `SWR` pattern for the sales list, OR manually manage the optimistic update.
-   **Manual Approach**:
    -   On `createSale` success:
        -   Construct a "fake" sale object from the form data.
        -   Immediately `setSales(prev => [fakeSale, ...prev])`.
        -   Then trigger the background refresh.

---

## 5. Testing & Verification

### 5.1 Manual Test Cases
1.  **Offline Deletion**:
    -   Go Offline.
    -   Create a Sale.
    -   Delete it immediately from "Pending Sales".
    -   Verify it disappears.
    -   Go Online. Verify NO sync error occurs (since it was deleted).
2.  **Bulk Performance**:
    -   Add 20 items to cart.
    -   Checkout.
    -   Monitor Network tab: Should see **1** request to `sale_groups` and **1** request to `dynamic_sales` (or very few), NOT 21 requests.

### 5.2 Code Quality Checks
-   Ensure all new components have PropType definitions or JSDoc.
-   Ensure no `console.logs` are left in critical paths.
