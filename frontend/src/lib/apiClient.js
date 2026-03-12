// CENTRAL API CLIENT — All API calls route through here. No direct fetch/axios in components.
import axios from 'axios';

const BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:3001/api';
const TIMEOUT = parseInt(process.env.REACT_APP_API_TIMEOUT || '30000', 10);

export const apiClient = axios.create({
    baseURL: BASE_URL,
    timeout: TIMEOUT,
    headers: { 'Content-Type': 'application/json' },
});

const getTenantId = () => {
    try {
        // First try to get from user object
        const user = JSON.parse(localStorage.getItem('solar_user') || '{}');
        const userTenantId = user?.tenantId || user?.tenant?.id;
        if (userTenantId && userTenantId !== 'default') {
            return userTenantId;
        }
        // Fallback to tenantId stored separately (for pre-login requests)
        const storedTenantId = localStorage.getItem('tenantId');
        if (storedTenantId && storedTenantId !== 'default') {
            return storedTenantId;
        }
        return 'solarcorp';
    } catch {
        const storedTenantId = localStorage.getItem('tenantId');
        if (storedTenantId && storedTenantId !== 'default') {
            return storedTenantId;
        }
        return 'solarcorp';
    }
};

// ── Request Interceptor: attach auth token ──
apiClient.interceptors.request.use(
    (config) => {
        const token =
            localStorage.getItem('solar_token') ||
            localStorage.getItem('accessToken') ||
            localStorage.getItem('token');
        console.log(`[API Request] ${config.method?.toUpperCase()} ${config.url} - Token: ${token ? 'present' : 'missing'}`);
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

        console.log(`[API Error] Status: ${status}, Message: ${message}`, error?.response?.config?.url);
        
        if (status === 401) {
            console.warn('[API Error] 401 Unauthorized - clearing token and redirecting to login');
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
    post: (url, data, config = {}) => apiClient.post(url, data, config),
    put: (url, data, config = {}) => apiClient.put(url, data, config),
    patch: (url, data, config = {}) => apiClient.patch(url, data, config),
    delete: (url, config = {}) => apiClient.delete(url, config),
};

export default apiClient;
