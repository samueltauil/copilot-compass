/**
 * GitHub API Client Tests
 * Tests for the GitHubApiClient class including caching, API calls, and error handling
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { GitHubApiClient, getGitHubClient } from '../src/github-client.js';
import type { CopilotUsageMetrics } from '../src/types.js';

// Mock API response data
const mockMetricsResponse: CopilotUsageMetrics[] = [
  {
    date: '2026-01-15',
    total_active_users: 150,
    total_engaged_users: 120,
    copilot_ide_code_completions: {
      total_engaged_users: 110,
      languages: [
        {
          name: 'TypeScript',
          total_engaged_users: 80,
          total_code_suggestions: 5000,
          total_code_acceptances: 1650,
          total_code_lines_suggested: 15000,
          total_code_lines_accepted: 4950,
        },
        {
          name: 'Python',
          total_engaged_users: 60,
          total_code_suggestions: 3000,
          total_code_acceptances: 1050,
          total_code_lines_suggested: 9000,
          total_code_lines_accepted: 3150,
        },
      ],
      editors: [
        { name: 'VS Code', total_engaged_users: 90 },
        { name: 'JetBrains', total_engaged_users: 20 },
      ],
    },
    copilot_ide_chat: {
      total_engaged_users: 85,
      editors: [
        {
          name: 'VS Code',
          total_engaged_users: 70,
          models: [
            {
              name: 'gpt-4',
              is_custom_model: false,
              total_engaged_users: 70,
              total_chats: 350,
              total_chat_insertion_events: 120,
              total_chat_copy_events: 80,
            },
          ],
        },
      ],
    },
    copilot_dotcom_pull_requests: {
      total_engaged_users: 45,
      repositories: [
        {
          name: 'main-app',
          total_engaged_users: 30,
          models: [
            {
              name: 'gpt-4',
              is_custom_model: false,
              total_pr_summaries_created: 25,
              total_engaged_users: 30,
            },
          ],
        },
      ],
    },
  },
  {
    date: '2026-01-16',
    total_active_users: 160,
    total_engaged_users: 130,
    copilot_ide_code_completions: {
      total_engaged_users: 120,
      languages: [
        {
          name: 'TypeScript',
          total_engaged_users: 85,
          total_code_suggestions: 5500,
          total_code_acceptances: 1815,
          total_code_lines_suggested: 16500,
          total_code_lines_accepted: 5445,
        },
      ],
    },
  },
];

describe('GitHubApiClient', () => {
  let client: GitHubApiClient;

  beforeEach(() => {
    client = new GitHubApiClient('test-token');
    client.clearCache();
    vi.mocked(global.fetch).mockReset();
  });

  afterEach(() => {
    client.clearCache();
  });

  describe('constructor', () => {
    it('should create client with provided token', () => {
      const clientWithToken = new GitHubApiClient('my-token');
      expect(clientWithToken).toBeDefined();
    });

    it('should create client without token (for demo mode)', () => {
      const originalToken = process.env.GITHUB_TOKEN;
      delete process.env.GITHUB_TOKEN;
      
      const clientNoToken = new GitHubApiClient();
      expect(clientNoToken).toBeDefined();
      
      process.env.GITHUB_TOKEN = originalToken;
    });

    it('should use environment token if no token provided', () => {
      process.env.GITHUB_TOKEN = 'env-token';
      const clientEnv = new GitHubApiClient();
      expect(clientEnv).toBeDefined();
    });
  });

  describe('getEnterpriseMetrics', () => {
    it('should fetch enterprise metrics from GitHub API', async () => {
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockMetricsResponse),
      } as Response);

      const metrics = await client.getEnterpriseMetrics('my-enterprise', {
        from: '2026-01-15',
        to: '2026-01-16',
      });

      expect(metrics).toEqual(mockMetricsResponse);
      expect(global.fetch).toHaveBeenCalledTimes(1);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/enterprises/my-enterprise/copilot/metrics'),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer test-token',
            Accept: 'application/vnd.github+json',
            'X-GitHub-Api-Version': '2022-11-28',
          }),
        })
      );
    });

    it('should include date range parameters in URL', async () => {
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([]),
      } as Response);

      await client.getEnterpriseMetrics('test-enterprise', {
        from: '2026-01-01',
        to: '2026-01-31',
      });

      const callUrl = vi.mocked(global.fetch).mock.calls[0][0] as string;
      expect(callUrl).toContain('since=2026-01-01');
      expect(callUrl).toContain('until=2026-01-31');
    });

    it('should throw error on API failure', async () => {
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: false,
        status: 404,
        text: () => Promise.resolve('Not Found'),
      } as Response);

      await expect(
        client.getEnterpriseMetrics('invalid-enterprise', {
          from: '2026-01-15',
          to: '2026-01-16',
        })
      ).rejects.toThrow('GitHub API error (404): Not Found');
    });

    it('should throw error when token is not set', async () => {
      // Save and clear environment token to test empty token case
      const originalToken = process.env.GITHUB_TOKEN;
      delete process.env.GITHUB_TOKEN;
      
      const clientNoToken = new GitHubApiClient('');
      
      await expect(
        clientNoToken.getEnterpriseMetrics('test', {
          from: '2026-01-15',
          to: '2026-01-16',
        })
      ).rejects.toThrow('GitHub token is required');
      
      // Restore environment token
      process.env.GITHUB_TOKEN = originalToken;
    });
  });

  describe('getOrganizationMetrics', () => {
    it('should fetch organization metrics from GitHub API', async () => {
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockMetricsResponse),
      } as Response);

      const metrics = await client.getOrganizationMetrics('my-org', {
        from: '2026-01-15',
        to: '2026-01-16',
      });

      expect(metrics).toEqual(mockMetricsResponse);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/orgs/my-org/copilot/metrics'),
        expect.any(Object)
      );
    });
  });

  describe('caching', () => {
    it('should cache API responses', async () => {
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockMetricsResponse),
      } as Response);

      // First call - should hit API
      const metrics1 = await client.getEnterpriseMetrics('cached-enterprise', {
        from: '2026-01-15',
        to: '2026-01-16',
      });

      // Second call - should use cache
      const metrics2 = await client.getEnterpriseMetrics('cached-enterprise', {
        from: '2026-01-15',
        to: '2026-01-16',
      });

      expect(metrics1).toEqual(metrics2);
      expect(global.fetch).toHaveBeenCalledTimes(1); // Only one API call
    });

    it('should use different cache keys for different date ranges', async () => {
      vi.mocked(global.fetch)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockMetricsResponse),
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve([]),
        } as Response);

      await client.getEnterpriseMetrics('test', {
        from: '2026-01-15',
        to: '2026-01-16',
      });

      await client.getEnterpriseMetrics('test', {
        from: '2026-01-17',
        to: '2026-01-18',
      });

      expect(global.fetch).toHaveBeenCalledTimes(2);
    });

    it('should clear cache when clearCache is called', async () => {
      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockMetricsResponse),
      } as Response);

      await client.getEnterpriseMetrics('test', {
        from: '2026-01-15',
        to: '2026-01-16',
      });

      client.clearCache();

      await client.getEnterpriseMetrics('test', {
        from: '2026-01-15',
        to: '2026-01-16',
      });

      expect(global.fetch).toHaveBeenCalledTimes(2);
    });

    it('should report cache stats correctly', async () => {
      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockMetricsResponse),
      } as Response);

      await client.getEnterpriseMetrics('enterprise1', {
        from: '2026-01-15',
        to: '2026-01-16',
      });

      await client.getOrganizationMetrics('org1', {
        from: '2026-01-15',
        to: '2026-01-16',
      });

      const stats = client.getCacheStats();
      expect(stats.size).toBe(2);
      expect(stats.keys).toHaveLength(2);
      expect(stats.keys).toContain('enterprise:enterprise1:2026-01-15:2026-01-16');
      expect(stats.keys).toContain('org:org1:2026-01-15:2026-01-16');
    });
  });
});

describe('getGitHubClient', () => {
  it('should return a GitHubApiClient instance', () => {
    const client = getGitHubClient();
    expect(client).toBeInstanceOf(GitHubApiClient);
  });

  it('should return the same instance when called multiple times without token', () => {
    const client1 = getGitHubClient();
    const client2 = getGitHubClient();
    expect(client1).toBe(client2);
  });

  it('should create new instance when token is provided', () => {
    const client1 = getGitHubClient();
    const client2 = getGitHubClient('new-token');
    expect(client1).not.toBe(client2);
  });
});
