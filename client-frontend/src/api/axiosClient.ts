import axios from 'axios';

const axiosClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? 'https://moodflow-production.up.railway.app',
  headers: {
    'Content-Type': 'application/json',
  },
  // Wymagane do wysyłania httpOnly cookies z auth
  withCredentials: true,
});

// Backward compat: jeżeli mamy token w localStorage (np. wynik
// starszego flow), nadal dokładamy go do nagłówka. Backend wybierze
// najpierw cookie, więc to nie szkodzi a daje miękką migrację.
axiosClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auto-refresh przy 401 — pobranie nowych tokenów z /auth/refresh,
// retry oryginalnego żądania.
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
      const refreshToken = localStorage.getItem('refreshToken') ?? undefined;
      const { data } = await axiosClient.post('/auth/refresh', refreshToken ? { refreshToken } : {});
      // K6: ZAPISZ nowe tokeny — bez tego retry szedł ze starym, wygasłym tokenem
      // i w produkcji (cookie SameSite=Strict cross-site) sesja padała po ~15 min.
      if (data?.accessToken) localStorage.setItem('accessToken', data.accessToken);
      if (data?.refreshToken) localStorage.setItem('refreshToken', data.refreshToken);
      pendingQueue.forEach((cb) => cb());
      pendingQueue = [];
      return axiosClient(originalRequest);
    } catch (refreshError) {
      // H11: odblokuj żądania czekające w kolejce zanim wyczyścimy stan (inaczej wiszą)
      pendingQueue.forEach((cb) => cb());
      pendingQueue = [];
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
        window.location.href = '/login';
      }
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  },
);

export default axiosClient;
