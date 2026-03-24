export interface User {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  role: 'employee' | 'hr' | 'admin';
  status: 'pending' | 'active' | 'rejected';
  organizationId?: number;
  organization?: { id: number; name: string } | null;
}

export interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isLoading: boolean;
  error: string | null;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  department?: string;
  organizationId?: number;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}
