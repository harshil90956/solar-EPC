// CENTRAL API CLIENT — All API calls route through here. No direct fetch/axios in components.
import axios from 'axios';

const BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:3000/api';
const TIMEOUT = parseInt(process.env.REACT_APP_API_TIMEOUT || '30000', 10);

export const apiClient = axios.create({
    baseURL: BASE_URL,
    timeout: TIMEOUT,
    headers: { 'Content-Type': 'application/json' },
});

const getTenantId = () => {
    try {
        // TenantId stored separately (for pre-login requests)
        const storedTenantId = localStorage.getItem('tenantId');
        if (storedTenantId && storedTenantId !== 'default') {
            return storedTenantId;
        }
        // Return null for superadmin or not logged in
        return null;
    } catch {
        const storedTenantId = localStorage.getItem('tenantId');
        if (storedTenantId && storedTenantId !== 'default') {
            return storedTenantId;
        }
        return null;
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
        // Only add tenant header if tenantId exists (not for superadmin)
        if (tenantId) {
            config.headers['x-tenant-id'] = tenantId;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// ── Response Interceptor: normalize errors ──
apiClient.interceptors.response.use(
    (response) => response.data,
    (error) => {
        const status = error?.response?.status;
        const responseData = error?.response?.data;
        const message =
            responseData?.message ||
            responseData?.error?.message ||
            error?.message ||
            'An unexpected error occurred';

        const url = error?.response?.config?.url;
        const method = error?.response?.config?.method?.toUpperCase();
        console.log(`[API Error] ${method || ''} ${url || ''} Status: ${status}, Message: ${message}`, responseData);
        
        if (status === 401) {
            console.warn('[API Error] 401 Unauthorized - clearing token and redirecting to login');
            localStorage.removeItem('solar_token');
            // Only redirect if not already on login page to avoid loops
            if (window.location.pathname !== '/login') {
                window.location.href = '/login';
            }
        }

        return Promise.reject({ status, message, data: responseData, raw: error });
    }
);

// ── Generic CRUD helpers ──
export const api = {
    get: (url, paramsOrConfig = {}) => {
        const cfg = paramsOrConfig || {};
        // Backwards compatible:
        // - api.get('/path', { a: 1 }) => treated as params
        // - api.get('/path', { params: {...}, headers: {...} }) => treated as full axios config
        const isAxiosConfig =
            typeof cfg === 'object' &&
            (Object.prototype.hasOwnProperty.call(cfg, 'params') ||
                Object.prototype.hasOwnProperty.call(cfg, 'headers') ||
                Object.prototype.hasOwnProperty.call(cfg, 'responseType') ||
                Object.prototype.hasOwnProperty.call(cfg, 'timeout'));

        return isAxiosConfig ? apiClient.get(url, cfg) : apiClient.get(url, { params: cfg });
    },
    post: (url, data, config = {}) => apiClient.post(url, data, config),
    put: (url, data, config = {}) => apiClient.put(url, data, config),
    patch: (url, data, config = {}) => apiClient.patch(url, data, config),
    delete: (url, config = {}) => apiClient.delete(url, config),
};

export default apiClient;
