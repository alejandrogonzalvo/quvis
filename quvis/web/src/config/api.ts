/**
 * API Configuration
 *
 * This module provides environment-based API URL configuration.
 *
 * Usage:
 * - Development with Vite middleware: Leave VITE_API_URL empty (uses relative URLs)
 * - Development with FastAPI: Set VITE_API_URL=http://localhost:8000
 * - Production: Set VITE_API_URL to your deployed backend URL
 */

/**
 * Get the base API URL based on environment configuration
 */
export function getApiUrl(): string {
    const envApiUrl = import.meta.env.VITE_API_URL;

    // If VITE_API_URL is set, use it (remove trailing slash)
    if (envApiUrl && envApiUrl.trim() !== '') {
        return envApiUrl.replace(/\/$/, '');
    }

    // Otherwise, use relative URL (for Vite middleware)
    return '';
}

/**
 * Get the full URL for the circuit generation endpoint
 */
export function getCircuitGenerationUrl(): string {
    const baseUrl = getApiUrl();
    return `${baseUrl}/api/generate-circuit`;
}

/**
 * Get the full URL for the health check endpoint
 */
export function getHealthCheckUrl(): string {
    const baseUrl = getApiUrl();
    return `${baseUrl}/api/health`;
}

// Export the base URL for convenience
export const API_BASE_URL = getApiUrl();
