/**
 * Test Setup File
 * Configure global test utilities and mocks
 */

import { vi } from 'vitest';

// Mock environment variables for tests
process.env.GITHUB_TOKEN = 'test-token-12345';
process.env.CACHE_TTL_SECONDS = '300';

// Mock fetch globally
global.fetch = vi.fn();

// Reset mocks after each test
afterEach(() => {
  vi.clearAllMocks();
});
