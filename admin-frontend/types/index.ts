export interface User {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  role: 'employee' | 'hr' | 'admin';
  status: 'pending' | 'active' | 'rejected';
  department?: string;
  organizationId?: number;
  organization?: { id: number; name: string };
  isOnline: boolean;
  lastSeenAt?: string;
  createdAt: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}
