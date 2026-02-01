/**
 * Zod Schemas for GitHub Copilot Metrics API Validation
 * 
 * These schemas validate the raw API response from GitHub to ensure
 * the data structure matches our expectations before processing.
 * 
 * Benefits:
 * - Runtime type safety for external data
 * - Detailed error messages when API responses change
 * - Automatic coercion of edge cases (null -> undefined)
 * - Documentation of the expected API contract
 */

import { z } from 'zod';

// =============================================================================
// Language Metrics Schema
// =============================================================================

export const LanguageMetricsSchema = z.object({
  name: z.string(),
  total_engaged_users: z.number().default(0),
  total_code_suggestions: z.number().default(0),
  total_code_acceptances: z.number().default(0),
  total_code_lines_suggested: z.number().default(0),
  total_code_lines_accepted: z.number().default(0),
}).passthrough(); // Allow additional fields we don't use

// =============================================================================
// Editor Metrics Schema
// =============================================================================

export const ModelMetricsSchema = z.object({
  name: z.string(),
  is_custom_model: z.boolean().default(false),
  custom_model_training_date: z.string().nullish(),
  total_engaged_users: z.number().default(0),
  languages: z.array(LanguageMetricsSchema).optional(),
  total_code_suggestions: z.number().optional(),
  total_code_acceptances: z.number().optional(),
  total_code_lines_suggested: z.number().optional(),
  total_code_lines_accepted: z.number().optional(),
}).passthrough();

export const EditorMetricsSchema = z.object({
  name: z.string(),
  total_engaged_users: z.number().default(0),
  models: z.array(ModelMetricsSchema).optional(),
}).passthrough();

// =============================================================================
// IDE Code Completions Schema
// =============================================================================

export const IdeCodeCompletionsSchema = z.object({
  total_engaged_users: z.number().default(0),
  languages: z.array(LanguageMetricsSchema).optional(),
  editors: z.array(EditorMetricsSchema).optional(),
  models: z.array(ModelMetricsSchema).optional(),
}).passthrough();

// =============================================================================
// Chat Metrics Schemas
// =============================================================================

export const ChatModelMetricsSchema = z.object({
  name: z.string(),
  is_custom_model: z.boolean().default(false),
  custom_model_training_date: z.string().nullish(),
  total_engaged_users: z.number().default(0),
  total_chats: z.number().default(0),
  total_chat_insertion_events: z.number().default(0),
  total_chat_copy_events: z.number().default(0),
}).passthrough();

export const EditorChatMetricsSchema = z.object({
  name: z.string(),
  total_engaged_users: z.number().default(0),
  models: z.array(ChatModelMetricsSchema).optional(),
}).passthrough();

export const IdeChatMetricsSchema = z.object({
  total_engaged_users: z.number().default(0),
  editors: z.array(EditorChatMetricsSchema).optional(),
}).passthrough();

export const DotcomChatMetricsSchema = z.object({
  total_engaged_users: z.number().default(0),
  models: z.array(ChatModelMetricsSchema).optional(),
}).passthrough();

// =============================================================================
// Pull Request Metrics Schemas
// =============================================================================

export const PullRequestModelMetricsSchema = z.object({
  name: z.string(),
  is_custom_model: z.boolean().default(false),
  custom_model_training_date: z.string().nullish(),
  total_pr_summaries_created: z.number().default(0),
  total_engaged_users: z.number().default(0),
}).passthrough();

export const RepositoryMetricsSchema = z.object({
  name: z.string(),
  total_engaged_users: z.number().default(0),
  models: z.array(PullRequestModelMetricsSchema).optional(),
}).passthrough();

export const PullRequestMetricsSchema = z.object({
  total_engaged_users: z.number().default(0),
  repositories: z.array(RepositoryMetricsSchema).optional(),
}).passthrough();

// =============================================================================
// Main Daily Metrics Schema
// =============================================================================

export const CopilotUsageMetricsSchema = z.object({
  date: z.string(),
  total_active_users: z.number().default(0),
  total_engaged_users: z.number().default(0),
  copilot_ide_code_completions: IdeCodeCompletionsSchema.optional(),
  copilot_ide_chat: IdeChatMetricsSchema.optional(),
  copilot_dotcom_chat: DotcomChatMetricsSchema.optional(),
  copilot_dotcom_pull_requests: PullRequestMetricsSchema.optional(),
}).passthrough();

// =============================================================================
// API Response Schema (array of daily metrics)
// =============================================================================

export const CopilotMetricsApiResponseSchema = z.array(CopilotUsageMetricsSchema);

// =============================================================================
// Validation Result Types
// =============================================================================

export interface ValidationResult<T> {
  success: boolean;
  data?: T;
  errors?: z.ZodError;
  warnings?: string[];
}

// =============================================================================
// Validation Functions
// =============================================================================

/**
 * Validate and parse GitHub Copilot metrics API response.
 * 
 * This function:
 * 1. Validates the response structure against our schema
 * 2. Applies default values for missing optional fields
 * 3. Returns parsed data or detailed errors
 * 
 * @param data - Raw API response (unknown type)
 * @returns ValidationResult with parsed data or errors
 */
export function validateMetricsResponse(data: unknown): ValidationResult<z.infer<typeof CopilotMetricsApiResponseSchema>> {
  const result = CopilotMetricsApiResponseSchema.safeParse(data);
  
  if (result.success) {
    // Check for any potential issues worth warning about
    const warnings: string[] = [];
    
    if (result.data.length === 0) {
      warnings.push('API returned empty metrics array - date range may have no data');
    }
    
    // Check for days with zero activity
    const zeroDays = result.data.filter(d => d.total_active_users === 0);
    if (zeroDays.length > 0 && zeroDays.length < result.data.length) {
      warnings.push(`${zeroDays.length} day(s) have zero active users`);
    }
    
    return {
      success: true,
      data: result.data,
      warnings: warnings.length > 0 ? warnings : undefined,
    };
  }
  
  return {
    success: false,
    errors: result.error,
  };
}

/**
 * Validate a single day's metrics.
 * Useful for streaming or incremental validation.
 */
export function validateSingleDayMetrics(data: unknown): ValidationResult<z.infer<typeof CopilotUsageMetricsSchema>> {
  const result = CopilotUsageMetricsSchema.safeParse(data);
  
  if (result.success) {
    return { success: true, data: result.data };
  }
  
  return { success: false, errors: result.error };
}

/**
 * Format Zod validation errors into human-readable messages.
 */
export function formatValidationErrors(error: z.ZodError): string[] {
  return error.errors.map(err => {
    const path = err.path.join('.');
    return `${path}: ${err.message}`;
  });
}

// =============================================================================
// Type Exports (inferred from schemas)
// =============================================================================

export type ValidatedMetrics = z.infer<typeof CopilotUsageMetricsSchema>;
export type ValidatedMetricsArray = z.infer<typeof CopilotMetricsApiResponseSchema>;
