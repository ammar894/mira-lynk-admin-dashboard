/**
 * Must match next.config.ts's `basePath`. Only needed for plain client-side
 * navigation (window.location) -- next/link and useRouter().push already
 * apply the configured basePath automatically and don't need this.
 */
export const BASE_PATH = '/admin';
