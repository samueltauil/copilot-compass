/**
 * Copilot Compass - GitHub API Client
 *
 * Handles all communication with the GitHub Copilot Metrics API.
 * Implements in-memory caching to reduce API calls and improve response times.
 *
 * API Documentation:
 * - Enterprise: https://docs.github.com/en/rest/copilot/copilot-metrics#get-copilot-metrics-for-an-enterprise
 * - Organization: https://docs.github.com/en/rest/copilot/copilot-metrics#get-copilot-metrics-for-an-organization
 *
 * Required Token Scopes:
 * - manage_billing:copilot - Access enterprise Copilot metrics
 * - read:enterprise - Enterprise-level access
 * - read:org - Organization metrics access
 */

import type { DateRange, CopilotUsageMetrics, CacheEntry } from './types.js';
import { validateMetricsResponse, formatValidationErrors } from './schemas.js';

// =============================================================================
// Configuration
// =============================================================================

/** GitHub API base URL */
const GITHUB_API_BASE = "https://api.github.com";

/** Cache TTL in milliseconds (default: 5 minutes) */
const CACHE_TTL_MS = (parseInt(process.env.CACHE_TTL_SECONDS || "300", 10)) * 1000;

/** Enable runtime validation of API responses */
const VALIDATE_RESPONSES = process.env.VALIDATE_API_RESPONSES !== 'false';

// =============================================================================
// In-Memory Cache
// Simple Map-based cache for API responses
// =============================================================================

/**
 * Cache storage for API responses.
 * Key format: "{type}:{slug}:{from}:{to}"
 * Example: "enterprise:my-org:2024-01-01:2024-01-31"
 */
const cache = new Map<string, CacheEntry<CopilotUsageMetrics[]>>();

// =============================================================================
// GitHub API Client Class
// =============================================================================

/**
 * Client for fetching GitHub Copilot usage metrics.
 *
 * Features:
 * - Automatic caching with configurable TTL
 * - Support for both enterprise and organization endpoints
 * - Token validation deferred to API call time
 * - Proper GitHub API headers (version, accept type)
 *
 * Usage:
 * ```typescript
 * const client = new GitHubApiClient(process.env.GITHUB_TOKEN);
 * const metrics = await client.getEnterpriseMetrics("my-enterprise", {
 *   from: "2024-01-01",
 *   to: "2024-01-31"
 * });
 * ```
 */
export class GitHubApiClient {
    /** GitHub Personal Access Token */
    private token: string;

    /**
     * Creates a new GitHub API client.
     *
     * @param token - GitHub PAT (optional, can be set via GITHUB_TOKEN env var)
     *
     * Note: Token validation is deferred to API call time to allow
     * server startup without a token (useful for demo mode with mock data).
     */
    constructor(token?: string) {
        this.token = token || process.env.GITHUB_TOKEN || "";
    }

    // ===========================================================================
    // Token Validation
    // ===========================================================================

    /**
     * Validates that a token is present.
     * Called before each API request.
     *
     * @throws Error if token is not set
     */
    private validateToken(): void {
        if (!this.token) {
            throw new Error(
                "GitHub token is required. Set GITHUB_TOKEN environment variable or pass token to constructor."
            );
        }
    }

    // ===========================================================================
    // Cache Management
    // ===========================================================================

    /**
     * Generates a unique cache key for a metrics request.
     * Format: "{type}:{slug}:{from}:{to}"
     */
    private getCacheKey(type: string, slug: string, dateRange: DateRange): string {
        return `${type}:${slug}:${dateRange.from}:${dateRange.to}`;
    }

    /**
     * Retrieves data from cache if valid (not expired).
     * Automatically removes expired entries.
     *
     * @returns Cached data or null if not found/expired
     */
    private getFromCache(key: string): CopilotUsageMetrics[] | null {
        const entry = cache.get(key);
        if (!entry) return null;

        if (Date.now() > entry.expiresAt) {
            cache.delete(key);
            return null;
        }

        return entry.data;
    }

    /**
     * Stores data in cache with TTL.
     */
    private setCache(key: string, data: CopilotUsageMetrics[]): void {
        cache.set(key, {
            data,
            timestamp: Date.now(),
            expiresAt: Date.now() + CACHE_TTL_MS,
        });
    }

    // ===========================================================================
    // HTTP Request Helper
    // ===========================================================================

    /**
     * Makes an authenticated request to the GitHub API.
     *
     * Handles:
     * - Token validation
     * - Query parameter encoding
     * - Required GitHub headers
     * - Error response parsing
     *
     * @param endpoint - API path (e.g., "/enterprises/my-org/copilot/metrics")
     * @param params - Query parameters to append
     * @returns Parsed JSON response
     * @throws Error on non-2xx response
     */
    private async request<T>(
        endpoint: string,
        params: Record<string, string> = {}
    ): Promise<T> {
        // Validate token before making request
        this.validateToken();

        // Build URL with query parameters
        const url = new URL(`${GITHUB_API_BASE}${endpoint}`);
        Object.entries(params).forEach(([key, value]) => {
            if (value) url.searchParams.append(key, value);
        });

        // Make request with required GitHub API headers
        const response = await fetch(url.toString(), {
            headers: {
                Authorization: `Bearer ${this.token}`,
                Accept: "application/vnd.github+json", // GitHub JSON format
                "X-GitHub-Api-Version": "2022-11-28", // API version lock
            },
        });

        // Handle error responses
        if (!response.ok) {
            const error = await response.text();
            throw new Error(`GitHub API error (${response.status}): ${error}`);
        }

        return response.json() as Promise<T>;
    }

    // ===========================================================================
    // Public API Methods
    // ===========================================================================

    /**
     * Fetch Copilot metrics for an enterprise.
     *
     * API: GET /enterprises/{enterprise}/copilot/metrics
     * Docs: https://docs.github.com/en/rest/copilot/copilot-metrics
     *
     * @param enterpriseSlug - Enterprise identifier (e.g., "microsoft")
     * @param dateRange - Date range with from/to in YYYY-MM-DD format
     * @returns Array of daily metrics data
     */
    async getEnterpriseMetrics(
        enterpriseSlug: string,
        dateRange: DateRange
    ): Promise<CopilotUsageMetrics[]> {
        const cacheKey = this.getCacheKey("enterprise", enterpriseSlug, dateRange);
        const cached = this.getFromCache(cacheKey);

        if (cached) {
            console.log(`[Cache Hit] Enterprise metrics for ${enterpriseSlug}`);
            return cached;
        }

        console.log(`[API Call] Fetching enterprise metrics for ${enterpriseSlug}`);

        // GitHub API uses 'since' and 'until' parameters for date range
        const rawData = await this.request<unknown>(
            `/enterprises/${enterpriseSlug}/copilot/metrics`,
            {
                since: dateRange.from,
                until: dateRange.to,
            }
        );

        // Validate and transform the response
        const metrics = this.validateResponse(rawData, enterpriseSlug);

        this.setCache(cacheKey, metrics);
        return metrics;
    }

    /**
     * Fetch Copilot metrics for an organization.
     *
     * API: GET /orgs/{org}/copilot/metrics
     * Docs: https://docs.github.com/en/rest/copilot/copilot-metrics
     *
     * @param orgName - Organization name (e.g., "my-org")
     * @param dateRange - Date range with from/to in YYYY-MM-DD format
     * @returns Array of daily metrics data
     */
    async getOrganizationMetrics(
        orgName: string,
        dateRange: DateRange
    ): Promise<CopilotUsageMetrics[]> {
        const cacheKey = this.getCacheKey("org", orgName, dateRange);
        const cached = this.getFromCache(cacheKey);

        if (cached) {
            console.log(`[Cache Hit] Organization metrics for ${orgName}`);
            return cached;
        }

        console.log(`[API Call] Fetching organization metrics for ${orgName}`);

        const rawData = await this.request<unknown>(
            `/orgs/${orgName}/copilot/metrics`,
            {
                since: dateRange.from,
                until: dateRange.to,
            }
        );

        // Validate and transform the response
        const metrics = this.validateResponse(rawData, orgName);

        this.setCache(cacheKey, metrics);
        return metrics;
    }

    // ===========================================================================
    // Response Validation
    // ===========================================================================

    /**
     * Validate API response against Zod schema.
     * 
     * This ensures the response matches our expected structure and
     * provides clear error messages if the API contract changes.
     * 
     * @param data - Raw API response
     * @param context - Context for error messages (enterprise/org name)
     * @returns Validated metrics array
     * @throws Error if validation fails
     */
    private validateResponse(data: unknown, context: string): CopilotUsageMetrics[] {
        if (!VALIDATE_RESPONSES) {
            // Skip validation if disabled (e.g., for performance)
            return data as CopilotUsageMetrics[];
        }

        const result = validateMetricsResponse(data);

        if (!result.success) {
            const errors = formatValidationErrors(result.errors!);
            console.error(`[Validation Error] Invalid API response for ${context}:`, errors);
            throw new Error(
                `GitHub API response validation failed for ${context}: ${errors.slice(0, 3).join('; ')}${errors.length > 3 ? ` (and ${errors.length - 3} more errors)` : ''}`
            );
        }

        // Log warnings if any
        if (result.warnings && result.warnings.length > 0) {
            console.warn(`[Validation Warning] ${context}:`, result.warnings);
        }

        // Cast to our TypeScript types (validated by Zod schema)
        return result.data! as unknown as CopilotUsageMetrics[];
    }

    // ===========================================================================
    // Cache Utilities
    // ===========================================================================

    /**
     * Clears all cached data.
     * Useful for testing or forcing fresh API calls.
     */
    clearCache(): void {
        cache.clear();
    }

    /**
     * Get cache statistics for monitoring.
     *
     * @returns Object with cache size and list of cached keys
     */
    getCacheStats(): { size: number; keys: string[] } {
        return {
            size: cache.size,
            keys: Array.from(cache.keys()),
        };
    }
}

// =============================================================================
// Singleton Factory
// =============================================================================

/**
 * Singleton instance for convenience.
 * Allows importing and using without explicit instantiation.
 */
let defaultClient: GitHubApiClient | null = null;

/**
 * Get or create a GitHubApiClient instance.
 *
 * @param token - Optional token (creates new instance if provided)
 * @returns GitHubApiClient instance
 *
 * Usage:
 * ```typescript
 * const client = getGitHubClient();
 * // or with explicit token:
 * const client = getGitHubClient("ghp_xxx...");
 * ```
 */
export function getGitHubClient(token?: string): GitHubApiClient {
    if (!defaultClient || token) {
        defaultClient = new GitHubApiClient(token);
    }
    return defaultClient;
}
