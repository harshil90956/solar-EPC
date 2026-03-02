// Solar OS – EPC Edition
// CONFIG LAYER: All app-level constants driven from env — NO hardcoding

export const APP_CONFIG = {
    name: process.env.REACT_APP_APP_NAME || 'Solar OS',
    edition: process.env.REACT_APP_APP_EDITION || 'EPC Edition',
    company: process.env.REACT_APP_COMPANY || 'SolarCorp India Pvt. Ltd.',
    version: process.env.REACT_APP_VERSION || '1.0.0',
    defaultPageSize: parseInt(process.env.REACT_APP_DEFAULT_PAGE_SIZE || '20', 10),
    maxPageSize: parseInt(process.env.REACT_APP_MAX_PAGE_SIZE || '100', 10),
    enableMock: process.env.REACT_APP_ENABLE_MOCK === 'true',
};

export const CURRENCY = {
    symbol: '₹',
    locale: 'en-IN',
    format: (n) => {
        if (n >= 10000000) return `₹${(n / 10000000).toFixed(2)}Cr`;
        if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`;
        if (n >= 1000) return `₹${(n / 1000).toFixed(1)}K`;
        return `₹${n?.toLocaleString('en-IN') ?? 0}`;
    },
};

export const DATE_FORMAT = {
    display: 'DD MMM YYYY',
    api: 'YYYY-MM-DD',
    time: 'HH:mm',
};
