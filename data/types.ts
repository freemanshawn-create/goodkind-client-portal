export interface User {
  id: string;
  email: string;
  name: string;
  company: string;
  avatar?: string;
  role: "client" | "admin";
  brands?: string[];
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

export interface BatchEntry {
  id: string;
  compoundDate: Date;
  fillDate: Date;
  yield: number;
  brand: string;
  productType: string;
  productName: string;
  batchNumber: string;
  salesOrder?: string;
  purchaseOrder?: string;
  dueDate?: Date;
  status: BatchStatus;
  lockDate?: Date;
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

export interface PurchaseOrder {
  id: string;
  poNumber: string;
  soNumber: string;
  brand: string;
  productName: string;
  dueDate?: Date;
  totalQuantity: number;
  deliveredQuantity: number;
  remainingQuantity: number;
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
