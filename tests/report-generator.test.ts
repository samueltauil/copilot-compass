/**
 * Report Generator Tests
 * Tests for the ReportGenerator class including report generation, mock data, and aggregation
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ReportGenerator } from '../src/report-generator.js';
import { GitHubApiClient } from '../src/github-client.js';
import type { CopilotUsageMetrics, CopilotReport } from '../src/types.js';

// Mock GitHub client
const createMockClient = () => ({
  getEnterpriseMetrics: vi.fn(),
  getOrganizationMetrics: vi.fn(),
  clearCache: vi.fn(),
  getCacheStats: vi.fn(),
});

// Sample API response data
const createMockApiResponse = (days: number): CopilotUsageMetrics[] => {
  const metrics: CopilotUsageMetrics[] = [];
  const startDate = new Date('2026-01-01');

  for (let i = 0; i < days; i++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + i);

    metrics.push({
      date: date.toISOString().split('T')[0],
      total_active_users: 100 + i * 5,
      total_engaged_users: 80 + i * 4,
      copilot_ide_code_completions: {
        total_engaged_users: 75 + i * 3,
        languages: [
          {
            name: 'TypeScript',
            total_engaged_users: 50,
            total_code_suggestions: 1000 + i * 100,
            total_code_acceptances: 330 + i * 33,
            total_code_lines_suggested: 3000 + i * 300,
            total_code_lines_accepted: 990 + i * 99,
          },
          {
            name: 'Python',
            total_engaged_users: 40,
            total_code_suggestions: 800 + i * 80,
            total_code_acceptances: 280 + i * 28,
            total_code_lines_suggested: 2400 + i * 240,
            total_code_lines_accepted: 840 + i * 84,
          },
        ],
        editors: [
          { name: 'VS Code', total_engaged_users: 60 },
          { name: 'JetBrains', total_engaged_users: 15 },
        ],
      },
      copilot_ide_chat: {
        total_engaged_users: 50 + i * 2,
        editors: [
          {
            name: 'VS Code',
            total_engaged_users: 45,
            models: [
              {
                name: 'gpt-4',
                is_custom_model: false,
                total_engaged_users: 45,
                total_chats: 200 + i * 20,
                total_chat_insertion_events: 80 + i * 8,
                total_chat_copy_events: 40 + i * 4,
              },
            ],
          },
        ],
      },
      copilot_dotcom_pull_requests: {
        total_engaged_users: 30 + i,
        repositories: [
          {
            name: 'main-repo',
            total_engaged_users: 25,
            models: [
              {
                name: 'gpt-4',
                is_custom_model: false,
                total_pr_summaries_created: 15 + i * 2,
                total_engaged_users: 25,
              },
            ],
          },
        ],
      },
    });
  }

  return metrics;
};

describe('ReportGenerator', () => {
  let mockClient: ReturnType<typeof createMockClient>;
  let generator: ReportGenerator;

  beforeEach(() => {
    mockClient = createMockClient();
    generator = new ReportGenerator(mockClient as unknown as GitHubApiClient);
  });

  describe('generateReport', () => {
    it('should generate a report from live API data', async () => {
      const mockMetrics = createMockApiResponse(7);
      mockClient.getEnterpriseMetrics.mockResolvedValue(mockMetrics);

      const report = await generator.generateReport({
        enterpriseSlug: 'test-enterprise',
        dateRange: { from: '2026-01-01', to: '2026-01-07' },
      });

      expect(report.dataSource).toBe('live');
      expect(report.metadata.enterpriseSlug).toBe('test-enterprise');
      expect(report.metadata.totalDays).toBe(7);
      expect(mockClient.getEnterpriseMetrics).toHaveBeenCalledWith(
        'test-enterprise',
        { from: '2026-01-01', to: '2026-01-07' }
      );
    });

    it('should use organization endpoint when orgName is provided', async () => {
      const mockMetrics = createMockApiResponse(3);
      mockClient.getOrganizationMetrics.mockResolvedValue(mockMetrics);

      const report = await generator.generateReport({
        enterpriseSlug: 'test-enterprise',
        orgName: 'test-org',
        dateRange: { from: '2026-01-01', to: '2026-01-03' },
      });

      expect(report.dataSource).toBe('live');
      expect(report.metadata.orgName).toBe('test-org');
      expect(mockClient.getOrganizationMetrics).toHaveBeenCalledWith(
        'test-org',
        { from: '2026-01-01', to: '2026-01-03' }
      );
      expect(mockClient.getEnterpriseMetrics).not.toHaveBeenCalled();
    });

    it('should fall back to mock data when API fails', async () => {
      mockClient.getEnterpriseMetrics.mockRejectedValue(
        new Error('API rate limit exceeded')
      );

      const report = await generator.generateReport({
        enterpriseSlug: 'test-enterprise',
        dateRange: { from: '2026-01-01', to: '2026-01-07' },
      });

      expect(report.dataSource).toBe('mock');
      expect(report.apiError).toBe('API rate limit exceeded');
      expect(report.dailyMetrics.length).toBe(7);
    });

    it('should correctly aggregate summary statistics', async () => {
      const mockMetrics = createMockApiResponse(5);
      mockClient.getEnterpriseMetrics.mockResolvedValue(mockMetrics);

      const report = await generator.generateReport({
        enterpriseSlug: 'test',
        dateRange: { from: '2026-01-01', to: '2026-01-05' },
      });

      // Check that summary stats are calculated
      expect(report.summary.totalActiveUsers).toBeGreaterThan(0);
      expect(report.summary.totalEngagedUsers).toBeGreaterThan(0);
      expect(report.summary.totalCodeSuggestions).toBeGreaterThan(0);
      expect(report.summary.totalCodeAcceptances).toBeGreaterThan(0);
      expect(report.summary.acceptanceRate).toBeGreaterThan(0);
      expect(report.summary.acceptanceRate).toBeLessThan(100);
    });

    it('should calculate peak active users correctly', async () => {
      const mockMetrics = createMockApiResponse(5);
      // The last day should have the highest active users (100 + 4*5 = 120)
      mockClient.getEnterpriseMetrics.mockResolvedValue(mockMetrics);

      const report = await generator.generateReport({
        enterpriseSlug: 'test',
        dateRange: { from: '2026-01-01', to: '2026-01-05' },
      });

      expect(report.summary.peakActiveUsers).toBe(120);
      expect(report.summary.peakActiveUsersDate).toBe('2026-01-05');
    });
  });

  describe('generateMockReport', () => {
    it('should generate mock data for the specified date range', () => {
      const report = generator.generateMockReport({
        enterpriseSlug: 'demo-enterprise',
        dateRange: { from: '2026-01-01', to: '2026-01-31' },
      });

      expect(report.dataSource).toBe('mock');
      expect(report.metadata.enterpriseSlug).toBe('demo-enterprise');
      expect(report.metadata.totalDays).toBe(31);
      expect(report.dailyMetrics.length).toBe(31);
    });

    it('should include API error when provided', () => {
      const report = generator.generateMockReport(
        {
          enterpriseSlug: 'test',
          dateRange: { from: '2026-01-01', to: '2026-01-07' },
        },
        'Token expired'
      );

      expect(report.apiError).toBe('Token expired');
    });

    it('should generate weekend dips in activity', () => {
      const report = generator.generateMockReport({
        enterpriseSlug: 'test',
        dateRange: { from: '2026-01-01', to: '2026-01-14' }, // Two weeks
      });

      // Find a weekday and weekend day
      const weekdayMetrics = report.dailyMetrics.filter((d) => {
        const day = new Date(d.date).getDay();
        return day !== 0 && day !== 6;
      });
      const weekendMetrics = report.dailyMetrics.filter((d) => {
        const day = new Date(d.date).getDay();
        return day === 0 || day === 6;
      });

      const avgWeekday =
        weekdayMetrics.reduce((sum, d) => sum + d.activeUsers, 0) /
        weekdayMetrics.length;
      const avgWeekend =
        weekendMetrics.reduce((sum, d) => sum + d.activeUsers, 0) /
        weekendMetrics.length;

      // Weekend should have lower activity
      expect(avgWeekend).toBeLessThan(avgWeekday);
    });

    it('should generate language breakdown in correct order', () => {
      const report = generator.generateMockReport({
        enterpriseSlug: 'test',
        dateRange: { from: '2026-01-01', to: '2026-01-07' },
      });

      // Languages should be sorted by suggestions (descending)
      for (let i = 1; i < report.languageBreakdown.length; i++) {
        expect(report.languageBreakdown[i - 1].suggestions).toBeGreaterThanOrEqual(
          report.languageBreakdown[i].suggestions
        );
      }

      // Should include common languages
      const languages = report.languageBreakdown.map((l) => l.language);
      expect(languages).toContain('TypeScript');
      expect(languages).toContain('Python');
      expect(languages).toContain('JavaScript');
    });

    it('should generate editor breakdown with VS Code dominant', () => {
      const report = generator.generateMockReport({
        enterpriseSlug: 'test',
        dateRange: { from: '2026-01-01', to: '2026-01-07' },
      });

      // Editors should be sorted by engaged users (descending)
      expect(report.editorBreakdown[0].editor).toBe('VS Code');

      // VS Code should have the most users
      const vsCodeUsers = report.editorBreakdown.find(
        (e) => e.editor === 'VS Code'
      )?.engagedUsers;
      const totalUsers = report.editorBreakdown.reduce(
        (sum, e) => sum + e.engagedUsers,
        0
      );

      // VS Code should be >50% of users
      expect(vsCodeUsers).toBeGreaterThan(totalUsers * 0.5);
    });

    it('should generate trend data matching daily metrics', () => {
      const report = generator.generateMockReport({
        enterpriseSlug: 'test',
        dateRange: { from: '2026-01-01', to: '2026-01-07' },
      });

      expect(report.trends.activeUsersTrend.length).toBe(7);
      expect(report.trends.acceptanceRateTrend.length).toBe(7);
      expect(report.trends.suggestionsVolumeTrend.length).toBe(7);

      // Verify trend data matches daily metrics
      report.dailyMetrics.forEach((daily, i) => {
        expect(report.trends.activeUsersTrend[i].date).toBe(daily.date);
        expect(report.trends.activeUsersTrend[i].value).toBe(daily.activeUsers);
        expect(report.trends.acceptanceRateTrend[i].value).toBe(
          daily.acceptanceRate
        );
        expect(report.trends.suggestionsVolumeTrend[i].value).toBe(
          daily.codeSuggestions
        );
      });
    });
  });

  describe('report structure', () => {
    it('should have all required fields in metadata', async () => {
      mockClient.getEnterpriseMetrics.mockResolvedValue(createMockApiResponse(3));

      const report = await generator.generateReport({
        enterpriseSlug: 'test',
        dateRange: { from: '2026-01-01', to: '2026-01-03' },
      });

      expect(report.metadata).toHaveProperty('enterpriseSlug');
      expect(report.metadata).toHaveProperty('dateRange');
      expect(report.metadata).toHaveProperty('generatedAt');
      expect(report.metadata).toHaveProperty('totalDays');
    });

    it('should have all required fields in summary', async () => {
      mockClient.getEnterpriseMetrics.mockResolvedValue(createMockApiResponse(3));

      const report = await generator.generateReport({
        enterpriseSlug: 'test',
        dateRange: { from: '2026-01-01', to: '2026-01-03' },
      });

      expect(report.summary).toHaveProperty('totalActiveUsers');
      expect(report.summary).toHaveProperty('totalEngagedUsers');
      expect(report.summary).toHaveProperty('peakActiveUsers');
      expect(report.summary).toHaveProperty('peakActiveUsersDate');
      expect(report.summary).toHaveProperty('avgDailyActiveUsers');
      expect(report.summary).toHaveProperty('totalCodeSuggestions');
      expect(report.summary).toHaveProperty('totalCodeAcceptances');
      expect(report.summary).toHaveProperty('acceptanceRate');
      expect(report.summary).toHaveProperty('totalLinesOfCodeSuggested');
      expect(report.summary).toHaveProperty('totalLinesOfCodeAccepted');
      expect(report.summary).toHaveProperty('totalChats');
      expect(report.summary).toHaveProperty('totalChatInsertions');
      expect(report.summary).toHaveProperty('totalChatCopyEvents');
      expect(report.summary).toHaveProperty('totalPrSummaries');
    });

    it('should have all required fields in daily metrics', async () => {
      mockClient.getEnterpriseMetrics.mockResolvedValue(createMockApiResponse(1));

      const report = await generator.generateReport({
        enterpriseSlug: 'test',
        dateRange: { from: '2026-01-01', to: '2026-01-01' },
      });

      const dailyMetric = report.dailyMetrics[0];
      expect(dailyMetric).toHaveProperty('date');
      expect(dailyMetric).toHaveProperty('activeUsers');
      expect(dailyMetric).toHaveProperty('engagedUsers');
      expect(dailyMetric).toHaveProperty('codeSuggestions');
      expect(dailyMetric).toHaveProperty('codeAcceptances');
      expect(dailyMetric).toHaveProperty('acceptanceRate');
      expect(dailyMetric).toHaveProperty('linesOfCodeSuggested');
      expect(dailyMetric).toHaveProperty('linesOfCodeAccepted');
      expect(dailyMetric).toHaveProperty('chatSessions');
      expect(dailyMetric).toHaveProperty('chatInsertions');
      expect(dailyMetric).toHaveProperty('prSummaries');
    });

    it('should have all required fields in language breakdown', async () => {
      mockClient.getEnterpriseMetrics.mockResolvedValue(createMockApiResponse(3));

      const report = await generator.generateReport({
        enterpriseSlug: 'test',
        dateRange: { from: '2026-01-01', to: '2026-01-03' },
      });

      const langBreakdown = report.languageBreakdown[0];
      expect(langBreakdown).toHaveProperty('language');
      expect(langBreakdown).toHaveProperty('engagedUsers');
      expect(langBreakdown).toHaveProperty('suggestions');
      expect(langBreakdown).toHaveProperty('acceptances');
      expect(langBreakdown).toHaveProperty('acceptanceRate');
      expect(langBreakdown).toHaveProperty('linesSuggested');
      expect(langBreakdown).toHaveProperty('linesAccepted');
    });
  });

  describe('edge cases', () => {
    it('should handle empty metrics array', async () => {
      mockClient.getEnterpriseMetrics.mockResolvedValue([]);

      const report = await generator.generateReport({
        enterpriseSlug: 'test',
        dateRange: { from: '2026-01-01', to: '2026-01-01' },
      });

      expect(report.dailyMetrics.length).toBe(0);
      expect(report.summary.totalActiveUsers).toBe(0);
      expect(report.summary.totalCodeSuggestions).toBe(0);
    });

    it('should handle metrics without optional fields', async () => {
      const minimalMetrics: CopilotUsageMetrics[] = [
        {
          date: '2026-01-01',
          total_active_users: 50,
          total_engaged_users: 40,
        },
      ];
      mockClient.getEnterpriseMetrics.mockResolvedValue(minimalMetrics);

      const report = await generator.generateReport({
        enterpriseSlug: 'test',
        dateRange: { from: '2026-01-01', to: '2026-01-01' },
      });

      expect(report.dailyMetrics[0].codeSuggestions).toBe(0);
      expect(report.dailyMetrics[0].chatSessions).toBe(0);
      expect(report.dailyMetrics[0].prSummaries).toBe(0);
    });

    it('should handle single day report', () => {
      const report = generator.generateMockReport({
        enterpriseSlug: 'test',
        dateRange: { from: '2026-01-15', to: '2026-01-15' },
      });

      expect(report.metadata.totalDays).toBe(1);
      expect(report.dailyMetrics.length).toBe(1);
    });
  });
});
