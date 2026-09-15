import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { auth } from './auth';
import { BASE_PATH } from './basePath';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'https://d1glhclb7uoptr.cloudfront.net/api/v1';

export const api = axios.create({
  baseURL: API_BASE,
  timeout: 15000,
});

api.interceptors.request.use((config) => {
  const token = auth.getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Single-flight refresh -- several concurrent 401s (e.g. a page firing multiple
// queries at once) must trigger exactly one refresh call, not one each.
let refreshing: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = auth.getRefreshToken();
  if (!refreshToken) return null;
  try {
    // Bare axios call, not `api` -- going through `api`'s own interceptors
    // would recurse into this same refresh logic if the call itself 401s.
    const res = await axios.post(`${API_BASE}/auth/refresh`, { refreshToken });
    auth.setToken(res.data.accessToken, res.data.refreshToken);
    return res.data.accessToken as string;
  } catch {
    return null;
  }
}

api.interceptors.response.use(
  (res) => res,
  async (err: AxiosError) => {
    const original = err.config as (InternalAxiosRequestConfig & { _retried?: boolean }) | undefined;
    const status = err.response?.status;
    const isAuthCall = original?.url?.includes('/auth/refresh') || original?.url?.includes('/auth/login');

    // Previously: ANY 401 hard-logged-out immediately, even though a valid
    // 30-day refresh token was sitting unused in a cookie -- every admin was
    // forced back to /login the moment the 15-minute access token expired.
    if (
      status === 401 &&
      typeof window !== 'undefined' &&
      original &&
      !original._retried &&
      !isAuthCall &&
      auth.getRefreshToken()
    ) {
      original._retried = true;
      if (!refreshing) refreshing = refreshAccessToken();
      const newToken = await refreshing;
      refreshing = null;
      if (newToken) {
        original.headers = original.headers ?? ({} as InternalAxiosRequestConfig['headers']);
        original.headers.Authorization = `Bearer ${newToken}`;
        return api(original);
      }
    }

    if (status === 401 && typeof window !== 'undefined') {
      auth.clear();
      // Plain browser navigation, not next/link or router.push -- those apply
      // the configured basePath automatically, this does not.
      window.location.href = `${BASE_PATH}/login`;
    }
    return Promise.reject(err);
  },
);

export function apiError(err: unknown): string {
  if (axios.isAxiosError(err)) {
    const errObj = err.response?.data?.error ?? err.response?.data;
    if (Array.isArray(errObj?.details) && errObj.details.length) return errObj.details.join(', ');
    return errObj?.message ?? err.message;
  }
  return 'An unexpected error occurred';
}
