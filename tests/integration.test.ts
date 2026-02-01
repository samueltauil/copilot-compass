/**
 * Integration Tests
 * 
 * These tests verify the complete data pipeline:
 * 1. API response validation (Zod schemas)
 * 2. Data transformation (ReportGenerator)
 * 3. Report structure completeness
 * 
 * Uses fixtures that represent real-world API responses to ensure
 * the system handles all expected data shapes correctly.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  validateMetricsResponse,
  validateSingleDayMetrics,
  formatValidationErrors,
  CopilotMetricsApiResponseSchema,
} from '../src/schemas.js';
import { ReportGenerator } from '../src/report-generator.js';
import type { GitHubApiClient } from '../src/github-client.js';
import {
  completeValidResponse,
  minimalValidResponse,
  emptyResponse,
  singleDayResponse,
  mixedActivityResponse,
  customModelResponse,
  responseWithExtraFields,
  invalidResponses,
  generateLargeResponse,
} from './fixtures/api-responses.js';

// =============================================================================
// Schema Validation Tests
// =============================================================================

describe('Schema Validation', () => {
  describe('validateMetricsResponse', () => {
    it('should validate complete valid response', () => {
      const result = validateMetricsResponse(completeValidResponse);
      
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data!.length).toBe(2);
      expect(result.errors).toBeUndefined();
    });

    it('should validate minimal valid response', () => {
      const result = validateMetricsResponse(minimalValidResponse);
      
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data![0].total_active_users).toBe(50);
    });

    it('should validate empty response with warning', () => {
      const result = validateMetricsResponse(emptyResponse);
      
      expect(result.success).toBe(true);
      expect(result.data).toEqual([]);
      expect(result.warnings).toBeDefined();
      expect(result.warnings).toContain('API returned empty metrics array - date range may have no data');
    });

    it('should validate single day response', () => {
      const result = validateMetricsResponse(singleDayResponse);
      
      expect(result.success).toBe(true);
      expect(result.data!.length).toBe(1);
    });

    it('should validate mixed activity response with warning', () => {
      const result = validateMetricsResponse(mixedActivityResponse);
      
      expect(result.success).toBe(true);
      expect(result.warnings).toBeDefined();
      expect(result.warnings![0]).toContain('zero active users');
    });

    it('should validate custom model response', () => {
      const result = validateMetricsResponse(customModelResponse);
      
      expect(result.success).toBe(true);
      const model = result.data![0].copilot_ide_code_completions?.editors?.[0].models?.[0];
      expect(model?.is_custom_model).toBe(true);
      expect(model?.custom_model_training_date).toBe('2025-12-01');
    });

    it('should allow extra fields (forward compatibility)', () => {
      const result = validateMetricsResponse(responseWithExtraFields);
      
      expect(result.success).toBe(true);
      // Extra fields should be preserved due to .passthrough()
      expect((result.data![0] as any).copilot_workspace).toBeDefined();
    });

    it('should reject missing required date field', () => {
      const result = validateMetricsResponse(invalidResponses.missingDate);
      
      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
    });

    it('should coerce string numbers when possible', () => {
      // Zod with numbers won't auto-coerce strings by default
      const result = validateMetricsResponse(invalidResponses.wrongTypeUsers);
      
      // This should fail because '100' is a string, not number
      expect(result.success).toBe(false);
    });

    it('should reject null response', () => {
      const result = validateMetricsResponse(invalidResponses.nullResponse);
      
      expect(result.success).toBe(false);
    });

    it('should reject object instead of array', () => {
      const result = validateMetricsResponse(invalidResponses.objectInsteadOfArray);
      
      expect(result.success).toBe(false);
    });
  });

  describe('validateSingleDayMetrics', () => {
    it('should validate a single day', () => {
      const result = validateSingleDayMetrics(completeValidResponse[0]);
      
      expect(result.success).toBe(true);
      expect(result.data?.date).toBe('2026-01-15');
    });

    it('should apply default values for missing optional numbers', () => {
      const minimalDay = {
        date: '2026-01-15',
        total_active_users: 10,
        total_engaged_users: 8,
      };
      
      const result = validateSingleDayMetrics(minimalDay);
      
      expect(result.success).toBe(true);
    });
  });

  describe('formatValidationErrors', () => {
    it('should format errors into readable messages', () => {
      const result = CopilotMetricsApiResponseSchema.safeParse(invalidResponses.missingDate);
      
      if (!result.success) {
        const messages = formatValidationErrors(result.error);
        expect(messages.length).toBeGreaterThan(0);
        expect(messages[0]).toContain('date');
      }
    });
  });
});

// =============================================================================
// Full Pipeline Integration Tests
// =============================================================================

describe('Full Pipeline Integration', () => {
  let mockClient: { getEnterpriseMetrics: ReturnType<typeof vi.fn> };
  let generator: ReportGenerator;

  beforeEach(() => {
    mockClient = {
      getEnterpriseMetrics: vi.fn(),
      getOrganizationMetrics: vi.fn(),
    } as any;
    generator = new ReportGenerator(mockClient as unknown as GitHubApiClient);
  });

  describe('with complete valid response', () => {
    beforeEach(() => {
      mockClient.getEnterpriseMetrics.mockResolvedValue(completeValidResponse);
    });

    it('should generate report without errors', async () => {
      const report = await generator.generateReport({
        enterpriseSlug: 'test-enterprise',
        dateRange: { from: '2026-01-15', to: '2026-01-16' },
      });

      expect(report.dataSource).toBe('live');
      expect(report.apiError).toBeUndefined();
    });

    it('should correctly aggregate language breakdown', async () => {
      const report = await generator.generateReport({
        enterpriseSlug: 'test-enterprise',
        dateRange: { from: '2026-01-15', to: '2026-01-16' },
      });

      expect(report.languageBreakdown.length).toBeGreaterThan(0);
      
      const typescript = report.languageBreakdown.find(l => l.language === 'TypeScript');
      expect(typescript).toBeDefined();
      expect(typescript!.suggestions).toBeGreaterThan(0);
    });

    it('should correctly calculate chat metrics', async () => {
      const report = await generator.generateReport({
        enterpriseSlug: 'test-enterprise',
        dateRange: { from: '2026-01-15', to: '2026-01-16' },
      });

      expect(report.summary.totalChats).toBeGreaterThan(0);
      expect(report.summary.totalChatInsertions).toBeGreaterThan(0);
    });

    it('should correctly calculate PR summaries', async () => {
      const report = await generator.generateReport({
        enterpriseSlug: 'test-enterprise',
        dateRange: { from: '2026-01-15', to: '2026-01-16' },
      });

      expect(report.summary.totalPrSummaries).toBe(43); // 28 + 15 from day 1
    });
  });

  describe('with minimal valid response', () => {
    beforeEach(() => {
      mockClient.getEnterpriseMetrics.mockResolvedValue(minimalValidResponse);
    });

    it('should handle missing optional fields gracefully', async () => {
      const report = await generator.generateReport({
        enterpriseSlug: 'test-enterprise',
        dateRange: { from: '2026-01-15', to: '2026-01-16' },
      });

      expect(report.dataSource).toBe('live');
      expect(report.summary.totalCodeSuggestions).toBe(0);
      expect(report.summary.totalChats).toBe(0);
      expect(report.languageBreakdown).toEqual([]);
    });
  });

  describe('with empty response', () => {
    beforeEach(() => {
      mockClient.getEnterpriseMetrics.mockResolvedValue(emptyResponse);
    });

    it('should generate report with zero values', async () => {
      const report = await generator.generateReport({
        enterpriseSlug: 'test-enterprise',
        dateRange: { from: '2026-01-15', to: '2026-01-16' },
      });

      expect(report.dataSource).toBe('live');
      expect(report.dailyMetrics.length).toBe(0);
      expect(report.summary.totalActiveUsers).toBe(0);
      expect(report.summary.peakActiveUsersDate).toBe('');
    });
  });

  describe('with mixed activity response', () => {
    beforeEach(() => {
      mockClient.getEnterpriseMetrics.mockResolvedValue(mixedActivityResponse);
    });

    it('should correctly identify peak on active day, not zero day', async () => {
      const report = await generator.generateReport({
        enterpriseSlug: 'test-enterprise',
        dateRange: { from: '2026-01-18', to: '2026-01-20' },
      });

      expect(report.summary.peakActiveUsers).toBe(120);
      expect(report.summary.peakActiveUsersDate).toBe('2026-01-20');
    });

    it('should calculate average including zero days', async () => {
      const report = await generator.generateReport({
        enterpriseSlug: 'test-enterprise',
        dateRange: { from: '2026-01-18', to: '2026-01-20' },
      });

      // Average of 0, 0, 120 = 40
      expect(report.summary.avgDailyActiveUsers).toBe(40);
    });
  });

  describe('with large response (performance)', () => {
    it('should handle 90 days of data efficiently', async () => {
      const largeResponse = generateLargeResponse(90);
      mockClient.getEnterpriseMetrics.mockResolvedValue(largeResponse);

      const startTime = performance.now();
      
      const report = await generator.generateReport({
        enterpriseSlug: 'test-enterprise',
        dateRange: { from: '2025-11-01', to: '2026-01-31' },
      });
      
      const duration = performance.now() - startTime;

      expect(report.dailyMetrics.length).toBe(90);
      expect(duration).toBeLessThan(500); // Should complete in under 500ms
    });
  });
});

// =============================================================================
// Report Structure Completeness Tests
// =============================================================================

describe('Report Structure Completeness', () => {
  let mockClient: any;
  let generator: ReportGenerator;

  beforeEach(() => {
    mockClient = {
      getEnterpriseMetrics: vi.fn().mockResolvedValue(completeValidResponse),
      getOrganizationMetrics: vi.fn(),
    };
    generator = new ReportGenerator(mockClient as unknown as GitHubApiClient);
  });

  it('should have all metadata fields', async () => {
    const report = await generator.generateReport({
      enterpriseSlug: 'test',
      dateRange: { from: '2026-01-15', to: '2026-01-16' },
    });

    expect(report.metadata).toMatchObject({
      enterpriseSlug: 'test',
      dateRange: { from: '2026-01-15', to: '2026-01-16' },
    });
    expect(report.metadata.generatedAt).toBeDefined();
    expect(report.metadata.totalDays).toBe(2);
  });

  it('should have all summary fields with correct types', async () => {
    const report = await generator.generateReport({
      enterpriseSlug: 'test',
      dateRange: { from: '2026-01-15', to: '2026-01-16' },
    });

    // Check all fields exist and are numbers
    const summary = report.summary;
    expect(typeof summary.totalActiveUsers).toBe('number');
    expect(typeof summary.totalEngagedUsers).toBe('number');
    expect(typeof summary.peakActiveUsers).toBe('number');
    expect(typeof summary.peakActiveUsersDate).toBe('string');
    expect(typeof summary.avgDailyActiveUsers).toBe('number');
    expect(typeof summary.totalCodeSuggestions).toBe('number');
    expect(typeof summary.totalCodeAcceptances).toBe('number');
    expect(typeof summary.acceptanceRate).toBe('number');
    expect(typeof summary.totalLinesOfCodeSuggested).toBe('number');
    expect(typeof summary.totalLinesOfCodeAccepted).toBe('number');
    expect(typeof summary.totalChats).toBe('number');
    expect(typeof summary.totalChatInsertions).toBe('number');
    expect(typeof summary.totalChatCopyEvents).toBe('number');
    expect(typeof summary.totalPrSummaries).toBe('number');
  });

  it('should have trend data matching daily metrics length', async () => {
    const report = await generator.generateReport({
      enterpriseSlug: 'test',
      dateRange: { from: '2026-01-15', to: '2026-01-16' },
    });

    expect(report.trends.activeUsersTrend.length).toBe(2);
    expect(report.trends.acceptanceRateTrend.length).toBe(2);
    expect(report.trends.suggestionsVolumeTrend.length).toBe(2);
  });

  it('should not have NaN or Infinity values', async () => {
    // Use empty response which could cause division by zero
    mockClient.getEnterpriseMetrics.mockResolvedValue(emptyResponse);
    
    const report = await generator.generateReport({
      enterpriseSlug: 'test',
      dateRange: { from: '2026-01-15', to: '2026-01-16' },
    });

    // Check that acceptance rate doesn't become NaN (0/0)
    expect(Number.isFinite(report.summary.acceptanceRate)).toBe(true);
    
    // Check daily metrics don't have NaN
    for (const daily of report.dailyMetrics) {
      expect(Number.isFinite(daily.acceptanceRate)).toBe(true);
    }
  });
});

// =============================================================================
// Organization Metrics Integration Tests
// =============================================================================

describe('Organization Metrics Integration', () => {
  let mockClient: any;
  let generator: ReportGenerator;

  beforeEach(() => {
    mockClient = {
      getEnterpriseMetrics: vi.fn(),
      getOrganizationMetrics: vi.fn(),
    };
    generator = new ReportGenerator(mockClient as unknown as GitHubApiClient);
  });

  describe('with complete valid response', () => {
    beforeEach(() => {
      mockClient.getOrganizationMetrics.mockResolvedValue(completeValidResponse);
    });

    it('should generate org report without errors', async () => {
      const report = await generator.generateReport({
        enterpriseSlug: 'test-enterprise',
        orgName: 'test-org',
        dateRange: { from: '2026-01-15', to: '2026-01-16' },
      });

      expect(report.dataSource).toBe('live');
      expect(report.apiError).toBeUndefined();
    });

    it('should correctly aggregate language breakdown for org', async () => {
      const report = await generator.generateReport({
        enterpriseSlug: 'test-enterprise',
        orgName: 'test-org',
        dateRange: { from: '2026-01-15', to: '2026-01-16' },
      });

      expect(report.languageBreakdown.length).toBeGreaterThan(0);
      
      const typescript = report.languageBreakdown.find(l => l.language === 'TypeScript');
      expect(typescript).toBeDefined();
      expect(typescript!.suggestions).toBeGreaterThan(0);
    });

    it('should correctly calculate chat metrics for org', async () => {
      const report = await generator.generateReport({
        enterpriseSlug: 'test-enterprise',
        orgName: 'test-org',
        dateRange: { from: '2026-01-15', to: '2026-01-16' },
      });

      expect(report.summary.totalChats).toBeGreaterThan(0);
      expect(report.summary.totalChatInsertions).toBeGreaterThan(0);
    });
  });

  describe('with minimal valid response', () => {
    beforeEach(() => {
      mockClient.getOrganizationMetrics.mockResolvedValue(minimalValidResponse);
    });

    it('should handle missing optional fields gracefully for org', async () => {
      const report = await generator.generateReport({
        enterpriseSlug: 'test-enterprise',
        orgName: 'test-org',
        dateRange: { from: '2026-01-15', to: '2026-01-16' },
      });

      expect(report.dataSource).toBe('live');
      expect(report.summary.totalCodeSuggestions).toBe(0);
      expect(report.summary.totalChats).toBe(0);
      expect(report.languageBreakdown).toEqual([]);
    });
  });

  describe('with empty response', () => {
    beforeEach(() => {
      mockClient.getOrganizationMetrics.mockResolvedValue(emptyResponse);
    });

    it('should generate org report with zero values', async () => {
      const report = await generator.generateReport({
        enterpriseSlug: 'test-enterprise',
        orgName: 'test-org',
        dateRange: { from: '2026-01-15', to: '2026-01-16' },
      });

      expect(report.dataSource).toBe('live');
      expect(report.dailyMetrics.length).toBe(0);
      expect(report.summary.totalActiveUsers).toBe(0);
    });
  });

  describe('with large response (performance)', () => {
    it('should handle 90 days of org data efficiently', async () => {
      const largeResponse = generateLargeResponse(90);
      mockClient.getOrganizationMetrics.mockResolvedValue(largeResponse);

      const startTime = performance.now();
      
      const report = await generator.generateReport({
        enterpriseSlug: 'test-enterprise',
        orgName: 'test-org',
        dateRange: { from: '2025-11-01', to: '2026-01-31' },
      });
      
      const duration = performance.now() - startTime;

      expect(report.dailyMetrics.length).toBe(90);
      expect(duration).toBeLessThan(500);
    });
  });

  it('should use getOrganizationMetrics not getEnterpriseMetrics for org', async () => {
    mockClient.getOrganizationMetrics.mockResolvedValue(completeValidResponse);

    await generator.generateReport({
      enterpriseSlug: 'my-enterprise',
      orgName: 'my-org',
      dateRange: { from: '2026-01-15', to: '2026-01-16' },
    });

    expect(mockClient.getOrganizationMetrics).toHaveBeenCalledWith(
      'my-org',
      { from: '2026-01-15', to: '2026-01-16' }
    );
    expect(mockClient.getEnterpriseMetrics).not.toHaveBeenCalled();
  });
});

// =============================================================================
// Error Handling Tests
// =============================================================================

describe('Error Handling', () => {
  let mockClient: any;
  let generator: ReportGenerator;

  beforeEach(() => {
    mockClient = {
      getEnterpriseMetrics: vi.fn(),
      getOrganizationMetrics: vi.fn(),
    };
    generator = new ReportGenerator(mockClient as unknown as GitHubApiClient);
  });

  it('should fall back to mock on enterprise API error', async () => {
    mockClient.getEnterpriseMetrics.mockRejectedValue(new Error('API rate limited'));

    const report = await generator.generateReport({
      enterpriseSlug: 'test',
      dateRange: { from: '2026-01-15', to: '2026-01-16' },
    });

    expect(report.dataSource).toBe('mock');
    expect(report.apiError).toBe('API rate limited');
  });

  it('should fall back to mock on org API error', async () => {
    mockClient.getOrganizationMetrics.mockRejectedValue(new Error('API rate limited'));

    const report = await generator.generateReport({
      enterpriseSlug: 'test-enterprise',
      orgName: 'test-org',
      dateRange: { from: '2026-01-15', to: '2026-01-16' },
    });

    expect(report.dataSource).toBe('mock');
    expect(report.apiError).toBe('API rate limited');
  });

  it('should fall back to mock on network error', async () => {
    mockClient.getEnterpriseMetrics.mockRejectedValue(new Error('fetch failed'));

    const report = await generator.generateReport({
      enterpriseSlug: 'test',
      dateRange: { from: '2026-01-15', to: '2026-01-16' },
    });

    expect(report.dataSource).toBe('mock');
    expect(report.apiError).toContain('fetch failed');
  });
});
