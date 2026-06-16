export interface User {
  id: string;
  email: string;
  name: string;
  company: string;
  /** Active org's logo (Clerk organization image), shown in the header. */
  companyLogoUrl?: string;
  avatar?: string;
  role: "client" | "admin";
  brands?: string[];
  /**
   * SAP item-code brand prefixes (e.g. ["DRS"]) used to scope finished-goods
   * queries to this client's own brand(s). Empty/undefined → all finished
   * goods for the cardCode.
   */
  brandCodes?: string[];
  /** SAP B1 customer CardCode used to filter live Azure SQL queries. */
  cardCode?: string;
  /** Google Drive folder ID containing the client's shared documents. */
  driveFolderId?: string;
  /** Upcoming-schedule window in days for this client (default 45). */
  scheduleWindowDays?: number;
  /** Per-client yield adjustment %, set by platform admin (display calc TBD). */
  yieldAdjustmentPct?: number;
  asanaUserId?: string;
  createdAt: Date;
}

export type ProjectStatus =
  | "planning"
  | "in-progress"
  | "review"
  | "completed"
  | "on-hold";

export interface Project {
  id: string;
  name: string;
  clientId: string;
  description: string;
  status: ProjectStatus;
  progress: number;
  startDate: Date;
  targetDate: Date;
  milestones: Milestone[];
  createdAt: Date;
  updatedAt: Date;
}

export type MilestoneStatus = "pending" | "in-progress" | "completed";

export interface Milestone {
  id: string;
  projectId: string;
  title: string;
  description: string;
  status: MilestoneStatus;
  dueDate: Date;
  completedDate?: Date;
  order: number;
}

export type DocumentType =
  | "spec"
  | "artwork"
  | "certificate"
  | "invoice"
  | "report"
  | "other";

export interface Document {
  id: string;
  name: string;
  type: DocumentType;
  size: number;
  mimeType: string;
  projectId?: string;
  folderId?: string;
  uploadedBy: string;
  url: string;
  createdAt: Date;
}

export interface Folder {
  id: string;
  name: string;
  parentId?: string;
  projectId?: string;
}

export interface Message {
  id: string;
  threadId: string;
  senderId: string;
  senderName?: string;
  content: string;
  attachments: MessageAttachment[];
  readBy: string[];
  createdAt: Date;
}

export interface MessageThread {
  id: string;
  subject: string;
  participants: string[];
  projectId?: string;
  projectName?: string;
  lastMessageAt: Date;
  unreadCount: number;
  createdAt: Date;
}

export interface MessageAttachment {
  id: string;
  name: string;
  size: number;
  url: string;
}

export type OrderStatus =
  | "confirmed"
  | "in-production"
  | "quality-check"
  | "shipped"
  | "delivered";

export interface Order {
  id: string;
  orderNumber: string;
  projectId: string;
  clientId: string;
  status: OrderStatus;
  items: OrderItem[];
  trackingSteps: TrackingStep[];
  shippingInfo?: ShippingInfo;
  estimatedDelivery?: Date;
  totalAmount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface OrderItem {
  id: string;
  name: string;
  sku: string;
  quantity: number;
  unitPrice: number;
}

export type TrackingStepStatus = "completed" | "current" | "upcoming";

export interface TrackingStep {
  id: string;
  label: string;
  description: string;
  status: TrackingStepStatus;
  date?: Date;
  location?: string;
}

export interface ShippingInfo {
  carrier: string;
  trackingNumber: string;
  trackingUrl: string;
  origin: string;
  destination: string;
}

// -- Schedule / Batch Schedule --

export type BatchStatus = "locked" | "pending-lock" | "scheduled" | "completed";

/**
 * One OUTPUT line of a production batch step (SAP @BMM_PNMAST/@BMM_PNITEM,
 * U_LINETYPE=7). The schedule shows the full production view: finished-good
 * fill steps and the bulk/compound (WIP) steps that feed them.
 */
export interface BatchEntry {
  id: string;
  /** Scheduled start date of this step (U_SCHEDULEDSTARTDATE). */
  scheduledDate: Date;
  /** Super batch number tying the steps of one run together (U_SUPERBATCHNO). */
  superBatchNo: string;
  /** This step's batch number (U_BATCHNO). */
  batchNumber: string;
  /** Client part code (OITM.U_BPREF). */
  productCode: string;
  /** Cleaned item description (OITM.ItemName). */
  productName: string;
  /** Theoretical output / yield for this step (U_STDQTY). */
  yield: number;
  /** Finished-good fill step vs bulk/compound (WIP) step. */
  stepType: "fill" | "bulk";
  /** GKC sales order number (U_SONUMBER), when tied to one. */
  salesOrder?: string;
  /** Client PO number from the linked sales order (ORDR.NumAtCard). */
  clientPO?: string;
  status: BatchStatus;
  /** SAP item code — used for live BOM lookups (FG steps). */
  itemKey?: string;
}

// -- BOM / Inventory --

export type BomInventoryStatus = "on-hand" | "inbound" | "none";

export interface BomItem {
  id: string;
  batchId: string;
  partName: string;
  quantityRequired: number;
  quantityOnHand: number;
  quantityInbound: number;
  inventoryStatus: BomInventoryStatus;
  poNumber?: string;
  expectedDate?: Date;
}

export type BomSummaryStatus = "all-clear" | "partial-risk" | "at-risk";

// -- Purchase Orders --

export type PurchaseOrderStatus = "open" | "completed";

/**
 * One LINE of a client order (SAP Sales Order line). The "Purchase Orders" tab
 * lists order lines, mirroring the canonical semantic-layer query.
 */
export interface PurchaseOrder {
  id: string;
  /** Client's PO number (ORDR.NumAtCard / "Customer PO"). */
  poNumber: string;
  /** GKC sales order number (ORDR.DocNum). */
  soNumber: string;
  /** Client part code (OITM.U_BPREF). */
  productCode: string;
  /** Cleaned item description (OITM.ItemName). */
  productName: string;
  /** Order posting date (ORDR.DocDate). */
  postingDate?: Date;
  /** Line ship/due date (RDR1.ShipDate). */
  dueDate?: Date;
  /** Ordered quantity for this line (RDR1.Quantity). */
  orderedQuantity: number;
  /** Remaining/open quantity for this line (RDR1.OpenQty). */
  remainingQuantity: number;
  /** Sales unit, normalized to "CASE" or "EACH" (RDR1.unitMsr). */
  salesUnit: string;
  status: PurchaseOrderStatus;
  completedDate?: Date;
}

export type ActivityType =
  | "project_update"
  | "document_uploaded"
  | "message_received"
  | "order_status"
  | "milestone_completed";

export interface ActivityItem {
  id: string;
  type: ActivityType;
  title: string;
  description: string;
  entityId: string;
  entityType: "project" | "document" | "message" | "order";
  createdAt: Date;
}
