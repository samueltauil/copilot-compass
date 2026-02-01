/**
 * API Response Fixtures
 * 
 * These fixtures represent realistic GitHub Copilot Metrics API responses
 * for testing the validation and parsing pipeline. Each fixture is based
 * on the documented API schema from GitHub.
 * 
 * Sources:
 * - https://docs.github.com/en/rest/copilot/copilot-metrics
 * - Real API responses (anonymized)
 */

import type { CopilotUsageMetrics } from '../../src/types.js';

// =============================================================================
// Complete Valid Response
// Full structure with all nested objects populated
// =============================================================================

export const completeValidResponse: CopilotUsageMetrics[] = [
  {
    date: '2026-01-15',
    total_active_users: 150,
    total_engaged_users: 125,
    copilot_ide_code_completions: {
      total_engaged_users: 115,
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
          total_code_suggestions: 3500,
          total_code_acceptances: 1225,
          total_code_lines_suggested: 10500,
          total_code_lines_accepted: 3675,
        },
        {
          name: 'JavaScript',
          total_engaged_users: 45,
          total_code_suggestions: 2000,
          total_code_acceptances: 600,
          total_code_lines_suggested: 6000,
          total_code_lines_accepted: 1800,
        },
      ],
      editors: [
        {
          name: 'VS Code',
          total_engaged_users: 95,
          models: [
            {
              name: 'gpt-4o',
              is_custom_model: false,
              total_engaged_users: 85,
              total_code_suggestions: 8000,
              total_code_acceptances: 2640,
              total_code_lines_suggested: 24000,
              total_code_lines_accepted: 7920,
            },
          ],
        },
        {
          name: 'JetBrains',
          total_engaged_users: 20,
          models: [
            {
              name: 'gpt-4o',
              is_custom_model: false,
              total_engaged_users: 18,
              total_code_suggestions: 1500,
              total_code_acceptances: 450,
              total_code_lines_suggested: 4500,
              total_code_lines_accepted: 1350,
            },
          ],
        },
      ],
    },
    copilot_ide_chat: {
      total_engaged_users: 90,
      editors: [
        {
          name: 'VS Code',
          total_engaged_users: 75,
          models: [
            {
              name: 'gpt-4o',
              is_custom_model: false,
              total_engaged_users: 75,
              total_chats: 450,
              total_chat_insertion_events: 180,
              total_chat_copy_events: 90,
            },
          ],
        },
        {
          name: 'JetBrains',
          total_engaged_users: 15,
          models: [
            {
              name: 'gpt-4o',
              is_custom_model: false,
              total_engaged_users: 15,
              total_chats: 75,
              total_chat_insertion_events: 30,
              total_chat_copy_events: 15,
            },
          ],
        },
      ],
    },
    copilot_dotcom_chat: {
      total_engaged_users: 30,
      models: [
        {
          name: 'gpt-4o',
          is_custom_model: false,
          total_engaged_users: 30,
          total_chats: 120,
          total_chat_insertion_events: 25,
          total_chat_copy_events: 40,
        },
      ],
    },
    copilot_dotcom_pull_requests: {
      total_engaged_users: 45,
      repositories: [
        {
          name: 'org/main-app',
          total_engaged_users: 30,
          models: [
            {
              name: 'gpt-4o',
              is_custom_model: false,
              total_pr_summaries_created: 28,
              total_engaged_users: 30,
            },
          ],
        },
        {
          name: 'org/api-service',
          total_engaged_users: 20,
          models: [
            {
              name: 'gpt-4o',
              is_custom_model: false,
              total_pr_summaries_created: 15,
              total_engaged_users: 20,
            },
          ],
        },
      ],
    },
  },
  {
    date: '2026-01-16',
    total_active_users: 162,
    total_engaged_users: 138,
    copilot_ide_code_completions: {
      total_engaged_users: 125,
      languages: [
        {
          name: 'TypeScript',
          total_engaged_users: 88,
          total_code_suggestions: 5500,
          total_code_acceptances: 1870,
          total_code_lines_suggested: 16500,
          total_code_lines_accepted: 5610,
        },
        {
          name: 'Python',
          total_engaged_users: 55,
          total_code_suggestions: 3200,
          total_code_acceptances: 1088,
          total_code_lines_suggested: 9600,
          total_code_lines_accepted: 3264,
        },
      ],
      editors: [
        {
          name: 'VS Code',
          total_engaged_users: 105,
        },
      ],
    },
    copilot_ide_chat: {
      total_engaged_users: 95,
      editors: [
        {
          name: 'VS Code',
          total_engaged_users: 80,
          models: [
            {
              name: 'gpt-4o',
              is_custom_model: false,
              total_engaged_users: 80,
              total_chats: 480,
              total_chat_insertion_events: 192,
              total_chat_copy_events: 96,
            },
          ],
        },
      ],
    },
  },
];

// =============================================================================
// Minimal Valid Response
// Only required fields, tests default value handling
// =============================================================================

export const minimalValidResponse: CopilotUsageMetrics[] = [
  {
    date: '2026-01-15',
    total_active_users: 50,
    total_engaged_users: 40,
  },
  {
    date: '2026-01-16',
    total_active_users: 55,
    total_engaged_users: 42,
  },
];

// =============================================================================
// Empty Response
// Valid but no data (e.g., new enterprise with no usage)
// =============================================================================

export const emptyResponse: CopilotUsageMetrics[] = [];

// =============================================================================
// Single Day Response
// Edge case with just one day of data
// =============================================================================

export const singleDayResponse: CopilotUsageMetrics[] = [
  {
    date: '2026-01-31',
    total_active_users: 1,
    total_engaged_users: 1,
    copilot_ide_code_completions: {
      total_engaged_users: 1,
      languages: [
        {
          name: 'Python',
          total_engaged_users: 1,
          total_code_suggestions: 10,
          total_code_acceptances: 5,
          total_code_lines_suggested: 25,
          total_code_lines_accepted: 12,
        },
      ],
    },
  },
];

// =============================================================================
// Response with Zero Activity Days
// Mix of active and inactive days
// =============================================================================

export const mixedActivityResponse: CopilotUsageMetrics[] = [
  {
    date: '2026-01-18', // Saturday
    total_active_users: 0,
    total_engaged_users: 0,
  },
  {
    date: '2026-01-19', // Sunday
    total_active_users: 0,
    total_engaged_users: 0,
  },
  {
    date: '2026-01-20', // Monday
    total_active_users: 120,
    total_engaged_users: 100,
    copilot_ide_code_completions: {
      total_engaged_users: 90,
      languages: [
        {
          name: 'TypeScript',
          total_engaged_users: 60,
          total_code_suggestions: 4000,
          total_code_acceptances: 1320,
          total_code_lines_suggested: 12000,
          total_code_lines_accepted: 3960,
        },
      ],
    },
  },
];

// =============================================================================
// Response with Custom Model
// Tests custom model flag handling
// =============================================================================

export const customModelResponse: CopilotUsageMetrics[] = [
  {
    date: '2026-01-15',
    total_active_users: 80,
    total_engaged_users: 70,
    copilot_ide_code_completions: {
      total_engaged_users: 65,
      editors: [
        {
          name: 'VS Code',
          total_engaged_users: 65,
          models: [
            {
              name: 'custom-acme-model',
              is_custom_model: true,
              custom_model_training_date: '2025-12-01',
              total_engaged_users: 40,
              total_code_suggestions: 2500,
              total_code_acceptances: 1000,
            },
            {
              name: 'gpt-4o',
              is_custom_model: false,
              total_engaged_users: 25,
              total_code_suggestions: 1500,
              total_code_acceptances: 525,
            },
          ],
        },
      ],
    },
  },
];

// =============================================================================
// Response with Extra Fields (API Evolution)
// Tests .passthrough() allowing unknown fields
// =============================================================================

export const responseWithExtraFields = [
  {
    date: '2026-01-15',
    total_active_users: 100,
    total_engaged_users: 85,
    // Future API addition - should be ignored gracefully
    copilot_workspace: {
      total_engaged_users: 15,
      total_sessions: 45,
    },
    copilot_ide_code_completions: {
      total_engaged_users: 80,
      languages: [
        {
          name: 'TypeScript',
          total_engaged_users: 50,
          total_code_suggestions: 3000,
          total_code_acceptances: 1050,
          total_code_lines_suggested: 9000,
          total_code_lines_accepted: 3150,
          // Future addition
          total_rejected_suggestions: 500,
        },
      ],
    },
  },
];

// =============================================================================
// Invalid Responses (for negative testing)
// =============================================================================

export const invalidResponses = {
  // Missing required date field
  missingDate: [
    {
      total_active_users: 100,
      total_engaged_users: 85,
    },
  ],

  // Invalid date format
  invalidDateFormat: [
    {
      date: 'January 15, 2026',
      total_active_users: 100,
      total_engaged_users: 85,
    },
  ],

  // Wrong type for total_active_users
  wrongTypeUsers: [
    {
      date: '2026-01-15',
      total_active_users: '100', // Should be number
      total_engaged_users: 85,
    },
  ],

  // Null instead of array
  nullResponse: null,

  // Object instead of array
  objectInsteadOfArray: {
    date: '2026-01-15',
    total_active_users: 100,
  },

  // Array with null elements
  arrayWithNull: [
    {
      date: '2026-01-15',
      total_active_users: 100,
      total_engaged_users: 85,
    },
    null,
  ],
};

// =============================================================================
// Large Response (Performance Testing)
// 90 days of data with full structure
// =============================================================================

export function generateLargeResponse(days: number): CopilotUsageMetrics[] {
  const response: CopilotUsageMetrics[] = [];
  const startDate = new Date('2025-11-01');

  for (let i = 0; i < days; i++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + i);
    const dayOfWeek = date.getDay();

    // Weekend reduction
    const weekendFactor = dayOfWeek === 0 || dayOfWeek === 6 ? 0.3 : 1;
    const baseUsers = Math.floor(150 * weekendFactor + Math.random() * 50);

    response.push({
      date: date.toISOString().split('T')[0],
      total_active_users: baseUsers,
      total_engaged_users: Math.floor(baseUsers * 0.85),
      copilot_ide_code_completions: {
        total_engaged_users: Math.floor(baseUsers * 0.75),
        languages: [
          {
            name: 'TypeScript',
            total_engaged_users: Math.floor(baseUsers * 0.4),
            total_code_suggestions: Math.floor(baseUsers * 30),
            total_code_acceptances: Math.floor(baseUsers * 10),
            total_code_lines_suggested: Math.floor(baseUsers * 90),
            total_code_lines_accepted: Math.floor(baseUsers * 30),
          },
          {
            name: 'Python',
            total_engaged_users: Math.floor(baseUsers * 0.35),
            total_code_suggestions: Math.floor(baseUsers * 25),
            total_code_acceptances: Math.floor(baseUsers * 9),
            total_code_lines_suggested: Math.floor(baseUsers * 75),
            total_code_lines_accepted: Math.floor(baseUsers * 27),
          },
        ],
      },
      copilot_ide_chat: {
        total_engaged_users: Math.floor(baseUsers * 0.5),
        editors: [
          {
            name: 'VS Code',
            total_engaged_users: Math.floor(baseUsers * 0.45),
            models: [
              {
                name: 'gpt-4o',
                is_custom_model: false,
                total_engaged_users: Math.floor(baseUsers * 0.45),
                total_chats: Math.floor(baseUsers * 3),
                total_chat_insertion_events: Math.floor(baseUsers * 1.2),
                total_chat_copy_events: Math.floor(baseUsers * 0.6),
              },
            ],
          },
        ],
      },
    });
  }

  return response;
}
