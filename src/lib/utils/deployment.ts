/**
 * Deployment environment utilities
 */

/**
 * Check if the app is deployed to a static host (without API support)
 */
export const isStaticDeployment = __DEPLOY_ENV__ === 'static';

/**
 * Check if API endpoints are available
 */
// export const hasApiEndpoints = !isStaticDeployment;
export const hasApiEndpoints = !isStaticDeployment;
