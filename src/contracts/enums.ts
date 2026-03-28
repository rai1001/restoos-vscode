// =============================================================================
// src/contracts/enums.ts — Estados y tipos del dominio RestoOS
// =============================================================================
// Fuente única de verdad para todos los estados del sistema.
// Estos enums se usan en schemas Zod, tipos TS, RPCs y UI.
// =============================================================================

// --- RESERVAS ---
export const RESERVATION_STATUS = {
  PENDING: "pending",
  CONFIRMED: "confirmed",
  SEATED: "seated",
  COMPLETED: "completed",
  NO_SHOW: "no_show",
  CANCELLED: "cancelled",
} as const;
export type ReservationStatus = (typeof RESERVATION_STATUS)[keyof typeof RESERVATION_STATUS];

// Transiciones válidas
export const RESERVATION_TRANSITIONS: Record<ReservationStatus, ReservationStatus[]> = {
  pending: ["confirmed", "cancelled"],
  confirmed: ["seated", "no_show", "cancelled"],
  seated: ["completed"],
  completed: [],
  no_show: [],
  cancelled: [],
};

// --- RECETAS ---
export const RECIPE_STATUS = {
  DRAFT: "draft",
  REVIEW_PENDING: "review_pending",
  APPROVED: "approved",
  DEPRECATED: "deprecated",
  ARCHIVED: "archived",
} as const;
export type RecipeStatus = (typeof RECIPE_STATUS)[keyof typeof RECIPE_STATUS];

export const RECIPE_TRANSITIONS: Record<RecipeStatus, RecipeStatus[]> = {
  draft: ["review_pending"],
  review_pending: ["approved", "draft"],
  approved: ["deprecated"],
  deprecated: ["archived"],
  archived: [],
};

// --- PEDIDOS DE COMPRA ---
export const PURCHASE_ORDER_STATUS = {
  DRAFT: "draft",
  PENDING_APPROVAL: "pending_approval",
  APPROVED: "approved",
  SENT: "sent",
  CONFIRMED_BY_SUPPLIER: "confirmed_by_supplier",
  PARTIALLY_RECEIVED: "partially_received",
  RECEIVED: "received",
  CANCELLED: "cancelled",
  // FSM statuses (Spanish)
  BORRADOR: "borrador",
  ENVIADA: "enviada",
  RECIBIDA: "recibida",
  CANCELADA: "cancelada",
} as const;
export type PurchaseOrderStatus =
  (typeof PURCHASE_ORDER_STATUS)[keyof typeof PURCHASE_ORDER_STATUS];

// --- SOLICITUDES DE COMPRA ---
export const PURCHASE_REQUEST_STATUS = {
  DRAFT: "draft",
  PENDING_APPROVAL: "pending_approval",
  APPROVED: "approved",
  CONSOLIDATED: "consolidated",
  CANCELLED: "cancelled",
} as const;
export type PurchaseRequestStatus =
  (typeof PURCHASE_REQUEST_STATUS)[keyof typeof PURCHASE_REQUEST_STATUS];

// --- RESERVAS DE STOCK ---
export const STOCK_RESERVATION_STATUS = {
  RESERVED: "reserved",
  PARTIALLY_RELEASED: "partially_released",
  RELEASED: "released",
  CONSUMED: "consumed",
} as const;
export type StockReservationStatus =
  (typeof STOCK_RESERVATION_STATUS)[keyof typeof STOCK_RESERVATION_STATUS];

// --- TIPOS DE MOVIMIENTO DE STOCK ---
export const STOCK_MOVEMENT_TYPE = {
  RECEPTION: "reception",
  RESERVATION: "reservation",
  RELEASE: "release",
  CONSUMPTION: "consumption",
  WASTE: "waste",
  ADJUSTMENT: "adjustment",
  TRANSFER: "transfer",
} as const;
export type StockMovementType =
  (typeof STOCK_MOVEMENT_TYPE)[keyof typeof STOCK_MOVEMENT_TYPE];

// --- TIPOS DE DOMAIN EVENT ---
export const DOMAIN_EVENT_TYPE = {
  RESERVATION_CONFIRMED: "reservation.confirmed",
  RESERVATION_UPDATED: "reservation.updated",
  RESERVATION_CANCELLED: "reservation.cancelled",
  RECIPE_APPROVED: "recipe.approved",
  PURCHASE_ORDER_SENT: "purchase_order.sent",
  GOODS_RECEIPT_APPLIED: "goods_receipt.applied",
  STOCK_RESERVED: "stock.reserved",
  STOCK_LOW_ALERT: "stock.low_alert",
} as const;

// --- ROLES ---
export const ROLE = {
  SUPERADMIN: "superadmin",
  DIRECTION: "direction",
  COMMERCIAL: "commercial",
  HEAD_CHEF: "head_chef",
  COOK: "cook",
  PROCUREMENT: "procurement",
  ROOM: "room",
  RECEPTION: "reception",
  ADMIN: "admin",
} as const;
export type Role = (typeof ROLE)[keyof typeof ROLE];

// --- ERRORES ESTÁNDAR ---
export const ERROR_CODE = {
  ACCESS_DENIED: "ACCESS_DENIED",
  NOT_FOUND: "NOT_FOUND",
  INVALID_STATE: "INVALID_STATE",
  ALREADY_APPLIED: "ALREADY_APPLIED",
  MISSING_REQUIRED_DATA: "MISSING_REQUIRED_DATA",
  CONFLICT: "CONFLICT",
  INSUFFICIENT_STOCK: "INSUFFICIENT_STOCK",
  LOW_CONFIDENCE_REVIEW_REQUIRED: "LOW_CONFIDENCE_REVIEW_REQUIRED",
  EXTERNAL_ERROR: "EXTERNAL_ERROR",
  VALIDATION_ERROR: "VALIDATION_ERROR",
} as const;
export type ErrorCode = (typeof ERROR_CODE)[keyof typeof ERROR_CODE];
