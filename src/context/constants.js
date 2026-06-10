export const currency = '₦';
export const currentYear = new Date().getFullYear();
export const developedByLink = 'https://heritclothing.com/';
export const developedBy = 'Herit Clothing';
export const contactUs = 'hello@heritclothing.com';
export const buyLink = '';
export const basePath = '';
export const DEFAULT_PAGE_TITLE = 'HeritOS | Herit Clothing Operations';

// Dev hits the live API (CORS enabled in api.php); production is relative (same domain).
export const API_BASE = import.meta.env.DEV ? 'https://heritclothing.com' : '';
export const API_BASE_PATH = API_BASE;
export const colorVariants = ['primary', 'secondary', 'success', 'danger', 'warning', 'info', 'dark', 'purple', 'pink', 'orange', 'light', 'link'];