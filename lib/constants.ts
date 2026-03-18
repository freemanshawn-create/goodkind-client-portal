export const APP_NAME = "Goodkind Portal";

export const ROUTES = {
  LOGIN: "/login",
  DASHBOARD: "/dashboard",
  PURCHASE_ORDERS: "/purchase-orders",
  SCHEDULE: "/schedule",
  DOCUMENTS: "/documents",
  REPORTS: "/reports",
  SETTINGS: "/settings",
} as const;

export const MOCK_CREDENTIALS = {
  email: "amanda@goodkindco.com",
  password: "password123",
} as const;

export const SESSION_COOKIE_NAME = "goodkind-session";
