export const APP_NAME = "HealthProof";

export const QR_EXPIRY_MINUTES = 15;

export const PERMISSION_TYPES = {
  RESULT: "RESULT",
  ORDER: "ORDER",
  DOCUMENT: "DOCUMENT",
} as const;

export const API_ROUTES = {
  AUTH: {
    LOGIN: "/auth/login",
    SIGNUP: "/auth/signup",
    REFRESH: "/auth/refresh",
    ME: "/auth/me",
  },
  PERMISSIONS: {
    VERIFY: "/permissions/verify",
    REVOKE: "/permissions/revoke",
    LIST: "/permissions",
  },
  DOCUMENTS: {
    UPLOAD: "/documents/upload",
    GET: (id: string) => `/documents/${id}`,
    LIST: "/documents",
  },
  ORDERS: {
    CREATE: "/orders",
    GET: (id: string) => `/orders/${id}`,
    LIST: "/orders",
  },
  RESULTS: {
    UPLOAD: "/exam-results/upload",
    GET: (id: string) => `/exam-results/${id}`,
    LIST: "/exam-results",
  },
} as const;
