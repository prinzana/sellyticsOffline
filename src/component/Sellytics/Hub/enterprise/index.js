// enterprise/index.js
// Central export for all enterprise features

// Hooks
export { useScannerIntegration } from "./hooks/useScannerIntegration";
export { useEnhancedStockIn } from "./hooks/useEnhancedStockIn";
export { useEnhancedDispatch } from "./hooks/useEnhancedDispatch";

// Components
export { ScannerPanel } from "./components/ScannerPanel";

// Batch Product Entry
export { default as BatchProductEntry } from "./BatchProductEntry/BatchProductEntry";
export { useBatchProductEntry } from "./BatchProductEntry/useBatchProductEntry";

// Bulk Operations
export { default as BulkDeleteModal } from "./BulkOperations/BulkDeleteModal";
export { useBulkOperations } from "./BulkOperations/useBulkOperations";

// Import
export { default as ImportWizard } from "./Import/ImportWizard";

// Collaboration
export { default as CollaborationPanel } from "./Collaboration/CollaborationPanel";
export { useCollaboration } from "./Collaboration/useCollaboration";

// Client Portal
export { default as ClientPortalDashboard } from "./ClientPortal/ClientPortalDashboard";
export { useClientPortal } from "./ClientPortal/useClientPortal";
