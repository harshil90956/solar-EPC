// CENTRAL API CLIENT — All API calls route through here. No direct fetch/axios in components.
import axios from 'axios';

const BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:3000/api/v1';
const TIMEOUT = parseInt(process.env.REACT_APP_API_TIMEOUT || '30000', 10);

const apiClient = axios.create({
    baseURL: BASE_URL,
    timeout: TIMEOUT,
    headers: { 'Content-Type': 'application/json' },
});

const getTenantId = () => {
    try {
        // First try to get from user object
        const user = JSON.parse(localStorage.getItem('solar_user') || '{}');
        if (user?.tenantId || user?.tenant?.id) {
            return user?.tenantId || user?.tenant?.id;
        }
        // Fallback to tenantId stored separately (for pre-login requests)
        return localStorage.getItem('tenantId') || null;
    } catch {
        return localStorage.getItem('tenantId') || null;
    }
};

// ── Request Interceptor: attach auth token ──
apiClient.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('solar_token');
        if (token) config.headers.Authorization = `Bearer ${token}`;
        const tenantId = getTenantId();
        if (tenantId) config.headers['x-tenant-id'] = tenantId;
        return config;
    },
    (error) => Promise.reject(error)
);

// ── Response Interceptor: normalize errors ──
apiClient.interceptors.response.use(
    (response) => response.data,
    (error) => {
        const status = error?.response?.status;
        const message =
            error?.response?.data?.message ||
            error?.message ||
            'An unexpected error occurred';

        if (status === 401) {
            localStorage.removeItem('solar_token');
            // Only redirect if not already on login page to avoid loops
            if (window.location.pathname !== '/login') {
                window.location.href = '/login';
            }
        }

        return Promise.reject({ status, message, raw: error });
    }
);

// ── Generic CRUD helpers ──
export const api = {
    get: (url, params = {}) => apiClient.get(url, { params }),
    post: (url, data) => apiClient.post(url, data),
    put: (url, data) => apiClient.put(url, data),
    patch: (url, data) => apiClient.patch(url, data),
    delete: (url) => apiClient.delete(url),
};

export default apiClient;
