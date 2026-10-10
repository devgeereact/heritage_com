export const currency = '₦';
export const currentYear = new Date().getFullYear();
export const developedByLink = 'https://heritclothing.com/';
export const developedBy = 'Herit Clothing';
export const contactUs = 'hello@heritclothing.com';
export const buyLink = '';
export const basePath = '';
export const DEFAULT_PAGE_TITLE = 'HeritOS | Herit Clothing Operations';

// Development talks to the LOCAL staging API by default (npm run staging:serve),
// never production. Set VITE_API_BASE in .env.local to point somewhere else; see
// .env.example. Production builds are same-origin (relative paths).
export const LOCAL_STAGING_API = 'http://127.0.0.1:8088';
export const API_BASE = import.meta.env.DEV ? (import.meta.env.VITE_API_BASE || LOCAL_STAGING_API) : '';
export const API_BASE_PATH = API_BASE;
export const colorVariants = ['primary', 'secondary', 'success', 'danger', 'warning', 'info', 'dark', 'purple', 'pink', 'orange', 'light', 'link'];