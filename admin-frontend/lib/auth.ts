export const saveTokens = (accessToken: string, refreshToken: string) => {
  localStorage.setItem('admin_access_token', accessToken);
  localStorage.setItem('admin_refresh_token', refreshToken);
};

export const clearTokens = () => {
  localStorage.removeItem('admin_access_token');
  localStorage.removeItem('admin_refresh_token');
};

export const getAccessToken = (): string | null => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('admin_access_token');
};

export const getSessionTimeout = (): number => {
  if (typeof window === 'undefined') return 15;
  return Number(localStorage.getItem('admin_session_timeout') ?? 15);
};

export const setSessionTimeout = (minutes: number): void => {
  localStorage.setItem('admin_session_timeout', String(minutes));
};
