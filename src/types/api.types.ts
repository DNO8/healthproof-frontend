// ─── API Response Types ──────────────────────────────────

export interface ApiResponse<T = unknown> {
  data: T;
  message?: string;
  status: number;
}

export interface ApiError {
  message: string;
  status: number;
  code?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

// ─── Auth API ────────────────────────────────────────────

export interface LoginRequest {
  email: string;
  password: string;
}

export interface SignupRequest {
  email: string;
  password: string;
  role: string;
}

export interface AuthResponse {
  access_token: string;
  refresh_token: string;
  user: {
    id: string;
    email: string;
    role: string;
    wallet_address: string | null;
  };
}

// ─── Permissions API ─────────────────────────────────────

export interface VerifyPermissionRequest {
  payload: {
    patient_id: string;
    granted_to_role: string;
    resource_type: string;
    resource_id: string;
    expires_at: number;
    nonce: string;
  };
  signature: string;
  wallet: string;
}

export interface VerifyPermissionResponse {
  valid: boolean;
  permission_id: string;
  access_granted: boolean;
}

export interface RevokePermissionRequest {
  permission_id: string;
}

// ─── Documents API ───────────────────────────────────────

export interface UploadDocumentRequest {
  title: string;
  file: File;
  patient_id: string;
}

export interface UploadDocumentResponse {
  document_id: string;
  document_hash: string;
  encrypted_url: string;
}

// ─── Medical Orders API ──────────────────────────────────

export interface CreateOrderRequest {
  patient_id: string;
  laboratory_id?: string;
  description: string;
}

export interface UploadResultRequest {
  order_id: string;
  file: File;
}

export interface UploadResultResponse {
  result_id: string;
  result_hash: string;
  encrypted_url: string;
}
