import axios from 'axios';

const axiosClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL ?? 'https://moodflow-production.up.railway.app',
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
});

axiosClient.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('admin_access_token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

let isRefreshing = false;
let pendingQueue: Array<() => void> = [];

axiosClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const status = error.response?.status;

    if (status !== 401 || !originalRequest || originalRequest._retry || originalRequest.url?.includes('/auth/')) {
      return Promise.reject(error);
    }

    originalRequest._retry = true;
    if (isRefreshing) {
      await new Promise<void>((resolve) => pendingQueue.push(resolve));
      return axiosClient(originalRequest);
    }

    isRefreshing = true;
    try {
      const refreshToken = typeof window !== 'undefined'
        ? localStorage.getItem('admin_refresh_token') ?? undefined
        : undefined;
      const { data } = await axiosClient.post('/auth/refresh', refreshToken ? { refreshToken } : {});
      // K6: ZAPISZ nowe tokeny — bez tego retry szedł ze starym, wygasłym tokenem
      // i w produkcji (cookie SameSite=Strict cross-site) sesja padała po ~15 min.
      if (typeof window !== 'undefined' && data?.accessToken) {
        localStorage.setItem('admin_access_token', data.accessToken);
        if (data.refreshToken) localStorage.setItem('admin_refresh_token', data.refreshToken);
      }
      pendingQueue.forEach((cb) => cb());
      pendingQueue = [];
      return axiosClient(originalRequest);
    } catch (refreshError) {
      pendingQueue = [];
      if (typeof window !== 'undefined') {
        localStorage.removeItem('admin_access_token');
        localStorage.removeItem('admin_refresh_token');
        if (!window.location.pathname.includes('/login')) {
          window.location.href = '/login';
        }
      }
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  },
);

export default axiosClient;
