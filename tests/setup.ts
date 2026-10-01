/**
 * Test Setup File
 * Configure global test utilities and mocks
 */

import { vi } from 'vitest';

// Mock environment variables for tests
process.env.GITHUB_TOKEN = 'test-token-12345';
// GH_TOKEN takes precedence over GITHUB_TOKEN; keep a developer's real token out of tests
delete process.env.GH_TOKEN;
process.env.CACHE_TTL_SECONDS = '300';

// Mock fetch globally
global.fetch = vi.fn();

// Reset mocks after each test
afterEach(() => {
  vi.clearAllMocks();
});
