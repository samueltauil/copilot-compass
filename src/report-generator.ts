/**
 * Copilot Compass - Report Generator
 *
 * Transforms raw GitHub Copilot API data into a structured report format.
 * Handles data aggregation, normalization, and provides mock data for demos.
 *
 * Data Flow:
 *   GitHubApiClient.getEnterpriseMetrics()
 *           ↓
 *   Raw CopilotUsageMetrics[] (daily API responses)
 *           ↓
 *   ReportGenerator.generateReport()
 *           ↓  Aggregates and transforms
 *   CopilotReport (structured report with summaries, trends, breakdowns)
 */

import type { GitHubApiClient } from './github-client.js';
import type {
    ReportRequest,
    CopilotUsageMetrics,
    CopilotReport,
    ReportMetadata,
    ReportSummary,
    DailyMetrics,
    LanguageBreakdown,
    EditorBreakdown,
    TrendData,
    LanguageMetrics,
    ChatModelMetrics,
} from './types.js';

// =============================================================================
// Report Generator Class
// =============================================================================

/**
 * Generates comprehensive Copilot usage reports from GitHub API data.
 *
 * Responsibilities:
 * - Fetch metrics from GitHub API via client
 * - Aggregate daily metrics into summaries
 * - Calculate language and editor breakdowns
 * - Compute trend data for visualizations
 * - Provide mock data when API is unavailable
 */
export class ReportGenerator {
    /** GitHub API client for fetching metrics */
    private client: GitHubApiClient;

    constructor(client: GitHubApiClient) {
        this.client = client;
    }

    // ===========================================================================
    // Main Report Generation
    // ===========================================================================

    /**
     * Generate a comprehensive Copilot usage report.
     *
     * @param request - Report parameters (enterprise, org, date range)
     * @returns Complete report with all metrics and visualizations data
     *
     * Workflow:
     * 1. Fetch raw metrics from GitHub API (enterprise or org level)
     * 2. If API fails, fallback to mock data for demo purposes
     * 3. Build report sections: metadata, summary, daily, language, editor, trends
     * 4. Return unified report object
     */
    async generateReport(request: ReportRequest): Promise<CopilotReport> {
        // -------------------------------------------------------------------------
        // Step 1: Fetch metrics from GitHub API
        // -------------------------------------------------------------------------
        let metrics: CopilotUsageMetrics[];

        try {
            if (request.orgName) {
                // Organization-level metrics (more specific)
                metrics = await this.client.getOrganizationMetrics(
                    request.orgName,
                    request.dateRange
                );
            } else {
                // Enterprise-level metrics (aggregated across all orgs)
                metrics = await this.client.getEnterpriseMetrics(
                    request.enterpriseSlug,
                    request.dateRange
                );
            }
        } catch (error) {
            // -----------------------------------------------------------------------
            // Fallback: Use mock data if API fails
            // This allows the app to demo functionality without valid credentials
            // -----------------------------------------------------------------------
            const errorMessage =
                error instanceof Error ? error.message : String(error);
            console.log(
                `[ReportGenerator] API failed: ${errorMessage}. Using mock data for demo.`
            );
            return this.generateMockReport(request, errorMessage);
        }

        // -------------------------------------------------------------------------
        // Step 2: Build report sections from raw metrics
        // -------------------------------------------------------------------------
        const metadata = this.buildMetadata(request, metrics);
        const summary = this.buildSummary(metrics);
        const dailyMetrics = this.buildDailyMetrics(metrics);
        const languageBreakdown = this.buildLanguageBreakdown(metrics);
        const editorBreakdown = this.buildEditorBreakdown(metrics);
        const trends = this.buildTrends(dailyMetrics);

        // Return complete report with 'live' data source indicator
        return {
            metadata,
            summary,
            dailyMetrics,
            languageBreakdown,
            editorBreakdown,
            trends,
            dataSource: 'live',
        };
    }

    // ===========================================================================
    // Mock Data Generation
    // ===========================================================================

    /**
     * Generate realistic mock report data for demos and testing.
     *
     * Creates believable data patterns including:
     * - Weekend dips in activity (~35% reduction)
     * - Gradual growth trends (~0.5% daily)
     * - Realistic language distribution (TypeScript > Python > JS > etc.)
     * - VS Code dominant editor share (~60%)
     *
     * @param request - Original report request params
     * @param apiError - Optional error message to include
     * @returns Mock report that looks like real data
     */
    generateMockReport(request: ReportRequest, apiError?: string): CopilotReport {
        // Calculate date range
        const startDate = new Date(request.dateRange.from);
        const endDate = new Date(request.dateRange.to);
        const days =
            Math.ceil(
                (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
            ) + 1;

        // Seed for deterministic but varied data based on input
        // This ensures same inputs produce consistent outputs for demos
        const seed =
            request.enterpriseSlug.length + (request.orgName?.length || 0);
        const seededRandom = (base: number, variance: number, offset = 0): number => {
            return Math.floor(
                base +
                    (Math.sin(seed + offset) * 0.5 + 0.5) * variance +
                    Math.random() * variance * 0.3
            );
        };

        // -------------------------------------------------------------------------
        // Generate Daily Metrics with Realistic Patterns
        // -------------------------------------------------------------------------
        const dailyMetrics: DailyMetrics[] = [];
        const baseUsers = 1180;
        const baseSuggestions = 42000;

        for (let i = 0; i < days; i++) {
            const date = new Date(startDate);
            date.setDate(date.getDate() + i);
            const dateStr = date.toISOString().split('T')[0];
            const dayOfWeek = date.getDay();

            // Weekend dip (30-40% reduction)
            const weekendMultiplier =
                dayOfWeek === 0 || dayOfWeek === 6 ? 0.65 : 1;

            // Gradual growth trend (0.5% daily)
            const growthMultiplier = 1 + i * 0.005;

            // Random daily variation
            const dailyVariation = 0.9 + Math.random() * 0.2;

            const activeUsers = Math.floor(
                baseUsers * weekendMultiplier * growthMultiplier * dailyVariation
            );
            const suggestions = Math.floor(
                baseSuggestions *
                    weekendMultiplier *
                    growthMultiplier *
                    dailyVariation
            );

            // Acceptance rate varies between 28-36%
            const acceptanceRate = 28 + Math.random() * 8;

            // Chat sessions correlate with active users
            const chatMultiplier = 2.2 + Math.random() * 0.6;

            dailyMetrics.push({
                date: dateStr,
                activeUsers,
                engagedUsers: Math.floor(
                    activeUsers * (0.82 + Math.random() * 0.08)
                ),
                codeSuggestions: suggestions,
                codeAcceptances: Math.floor(
                    (suggestions * acceptanceRate) / 100
                ),
                acceptanceRate: Math.round(acceptanceRate * 100) / 100,
                linesOfCodeSuggested: Math.floor(
                    suggestions * (2.8 + Math.random() * 0.8)
                ),
                linesOfCodeAccepted: Math.floor(
                    ((suggestions * (2.8 + Math.random() * 0.8) * acceptanceRate) /
                        100)
                ),
                chatSessions: Math.floor(activeUsers * chatMultiplier),
                chatInsertions: Math.floor(
                    activeUsers * chatMultiplier * (0.35 + Math.random() * 0.15)
                ),
                prSummaries: Math.floor(
                    activeUsers * (0.12 + Math.random() * 0.06)
                ),
            });
        }

        // -------------------------------------------------------------------------
        // Calculate Summary Statistics
        // -------------------------------------------------------------------------
        const totalSuggestions = dailyMetrics.reduce(
            (sum, d) => sum + d.codeSuggestions,
            0
        );
        const totalAcceptances = dailyMetrics.reduce(
            (sum, d) => sum + d.codeAcceptances,
            0
        );
        const peakDay = dailyMetrics.reduce(
            (max, d) => (d.activeUsers > max.activeUsers ? d : max),
            dailyMetrics[0]
        );
        const totalLinesAccepted = dailyMetrics.reduce(
            (sum, d) => sum + d.linesOfCodeAccepted,
            0
        );
        const totalLinesSuggested = dailyMetrics.reduce(
            (sum, d) => sum + d.linesOfCodeSuggested,
            0
        );

        const summary: ReportSummary = {
            totalActiveUsers: Math.max(...dailyMetrics.map((d) => d.activeUsers)),
            totalEngagedUsers: Math.max(
                ...dailyMetrics.map((d) => d.engagedUsers)
            ),
            peakActiveUsers: peakDay.activeUsers,
            peakActiveUsersDate: peakDay.date,
            avgDailyActiveUsers: Math.round(
                dailyMetrics.reduce((sum, d) => sum + d.activeUsers, 0) / days
            ),
            totalCodeSuggestions: totalSuggestions,
            totalCodeAcceptances: totalAcceptances,
            acceptanceRate:
                Math.round((totalAcceptances / totalSuggestions) * 10000) / 100,
            totalLinesOfCodeSuggested: totalLinesSuggested,
            totalLinesOfCodeAccepted: totalLinesAccepted,
            totalChats: dailyMetrics.reduce((sum, d) => sum + d.chatSessions, 0),
            totalChatInsertions: dailyMetrics.reduce(
                (sum, d) => sum + d.chatInsertions,
                0
            ),
            totalChatCopyEvents: Math.floor(
                dailyMetrics.reduce((sum, d) => sum + d.chatInsertions, 0) * 0.42
            ),
            totalPrSummaries: dailyMetrics.reduce(
                (sum, d) => sum + d.prSummaries,
                0
            ),
        };

        // -------------------------------------------------------------------------
        // Language Breakdown with Realistic Distribution
        // TypeScript and Python lead, followed by JS, C#, Java, etc.
        // -------------------------------------------------------------------------
        const languageBreakdown: LanguageBreakdown[] = [
            {
                language: 'TypeScript',
                engagedUsers: seededRandom(920, 100, 1),
                suggestions: seededRandom(485000, 50000, 1),
                acceptances: 0,
                acceptanceRate: 33.5,
                linesSuggested: 0,
                linesAccepted: 0,
            },
            {
                language: 'Python',
                engagedUsers: seededRandom(780, 80, 2),
                suggestions: seededRandom(425000, 40000, 2),
                acceptances: 0,
                acceptanceRate: 35.2,
                linesSuggested: 0,
                linesAccepted: 0,
            },
            {
                language: 'JavaScript',
                engagedUsers: seededRandom(690, 70, 3),
                suggestions: seededRandom(320000, 30000, 3),
                acceptances: 0,
                acceptanceRate: 30.8,
                linesSuggested: 0,
                linesAccepted: 0,
            },
            {
                language: 'C#',
                engagedUsers: seededRandom(450, 50, 4),
                suggestions: seededRandom(215000, 20000, 4),
                acceptances: 0,
                acceptanceRate: 29.4,
                linesSuggested: 0,
                linesAccepted: 0,
            },
            {
                language: 'Java',
                engagedUsers: seededRandom(420, 45, 5),
                suggestions: seededRandom(185000, 18000, 5),
                acceptances: 0,
                acceptanceRate: 28.2,
                linesSuggested: 0,
                linesAccepted: 0,
            },
            {
                language: 'Go',
                engagedUsers: seededRandom(245, 30, 6),
                suggestions: seededRandom(102000, 12000, 6),
                acceptances: 0,
                acceptanceRate: 33.8,
                linesSuggested: 0,
                linesAccepted: 0,
            },
            {
                language: 'Ruby',
                engagedUsers: seededRandom(180, 25, 7),
                suggestions: seededRandom(76000, 8000, 7),
                acceptances: 0,
                acceptanceRate: 31.2,
                linesSuggested: 0,
                linesAccepted: 0,
            },
            {
                language: 'Rust',
                engagedUsers: seededRandom(125, 20, 8),
                suggestions: seededRandom(58000, 7000, 8),
                acceptances: 0,
                acceptanceRate: 34.5,
                linesSuggested: 0,
                linesAccepted: 0,
            },
            {
                language: 'PHP',
                engagedUsers: seededRandom(165, 20, 9),
                suggestions: seededRandom(68000, 7000, 9),
                acceptances: 0,
                acceptanceRate: 27.8,
                linesSuggested: 0,
                linesAccepted: 0,
            },
            {
                language: 'SQL',
                engagedUsers: seededRandom(385, 40, 10),
                suggestions: seededRandom(92000, 10000, 10),
                acceptances: 0,
                acceptanceRate: 29.6,
                linesSuggested: 0,
                linesAccepted: 0,
            },
            {
                language: 'Kotlin',
                engagedUsers: seededRandom(195, 25, 11),
                suggestions: seededRandom(82000, 9000, 11),
                acceptances: 0,
                acceptanceRate: 31.4,
                linesSuggested: 0,
                linesAccepted: 0,
            },
            {
                language: 'Swift',
                engagedUsers: seededRandom(140, 18, 12),
                suggestions: seededRandom(62000, 7000, 12),
                acceptances: 0,
                acceptanceRate: 30.1,
                linesSuggested: 0,
                linesAccepted: 0,
            },
        ]
            .map((lang) => ({
                ...lang,
                acceptances: Math.floor(
                    (lang.suggestions * lang.acceptanceRate) / 100
                ),
                linesSuggested: Math.floor(lang.suggestions * 3.2),
                linesAccepted: Math.floor(
                    ((lang.suggestions * 3.2 * lang.acceptanceRate) / 100)
                ),
            }))
            .sort((a, b) => b.suggestions - a.suggestions);

        // -------------------------------------------------------------------------
        // Editor Distribution
        // VS Code dominates (~60%), followed by Visual Studio, JetBrains, etc.
        // -------------------------------------------------------------------------
        const editorBreakdown: EditorBreakdown[] = [
            {
                editor: 'VS Code',
                engagedUsers: seededRandom(1050, 100, 20),
                chatSessions: seededRandom(58000, 5000, 20),
            },
            {
                editor: 'Visual Studio',
                engagedUsers: seededRandom(340, 40, 21),
                chatSessions: seededRandom(14500, 1500, 21),
            },
            {
                editor: 'JetBrains IDEs',
                engagedUsers: seededRandom(295, 35, 22),
                chatSessions: seededRandom(12800, 1200, 22),
            },
            {
                editor: 'Neovim',
                engagedUsers: seededRandom(95, 15, 23),
                chatSessions: seededRandom(4200, 500, 23),
            },
            {
                editor: 'Xcode',
                engagedUsers: seededRandom(52, 10, 24),
                chatSessions: seededRandom(2100, 300, 24),
            },
            {
                editor: 'Eclipse',
                engagedUsers: seededRandom(38, 8, 25),
                chatSessions: seededRandom(1600, 200, 25),
            },
        ].sort((a, b) => b.engagedUsers - a.engagedUsers);

        // Trend data for charts
        const trends: TrendData = {
            activeUsersTrend: dailyMetrics.map((d) => ({
                date: d.date,
                value: d.activeUsers,
            })),
            acceptanceRateTrend: dailyMetrics.map((d) => ({
                date: d.date,
                value: d.acceptanceRate,
            })),
            suggestionsVolumeTrend: dailyMetrics.map((d) => ({
                date: d.date,
                value: d.codeSuggestions,
            })),
        };

        // Return mock report with 'mock' data source indicator
        return {
            metadata: {
                enterpriseSlug: request.enterpriseSlug,
                orgName: request.orgName,
                dateRange: request.dateRange,
                generatedAt: new Date().toISOString(),
                totalDays: days,
            },
            summary,
            dailyMetrics,
            languageBreakdown,
            editorBreakdown,
            trends,
            dataSource: 'mock',
            apiError,
        };
    }

    // ===========================================================================
    // Report Section Builders
    // These methods transform raw API data into report-ready structures
    // ===========================================================================

    /**
     * Build report metadata from request and metrics.
     */
    private buildMetadata(
        request: ReportRequest,
        metrics: CopilotUsageMetrics[]
    ): ReportMetadata {
        return {
            enterpriseSlug: request.enterpriseSlug,
            orgName: request.orgName,
            dateRange: request.dateRange,
            generatedAt: new Date().toISOString(),
            totalDays: metrics.length,
        };
    }

    /**
     * Build summary statistics by aggregating all daily metrics.
     *
     * Iterates through each day's data to:
     * - Find peak/max values (active users, engaged users)
     * - Sum totals (suggestions, acceptances, chats, PRs)
     * - Calculate derived metrics (acceptance rate)
     */
    private buildSummary(metrics: CopilotUsageMetrics[]): ReportSummary {
        // -------------------------------------------------------------------------
        // Initialize accumulators
        // -------------------------------------------------------------------------

        // User metrics
        let totalActiveUsers = 0;
        let totalEngagedUsers = 0;
        let peakActiveUsers = 0;
        let peakActiveUsersDate = '';

        // Code completion metrics
        let totalCodeSuggestions = 0;
        let totalCodeAcceptances = 0;
        let totalLinesOfCodeSuggested = 0;
        let totalLinesOfCodeAccepted = 0;

        // Chat metrics
        let totalChats = 0;
        let totalChatInsertions = 0;
        let totalChatCopyEvents = 0;

        // PR metrics
        let totalPrSummaries = 0;

        // -------------------------------------------------------------------------
        // Iterate through each day and aggregate
        // -------------------------------------------------------------------------
        for (const day of metrics) {
            // Track max active/engaged users across all days
            totalActiveUsers = Math.max(totalActiveUsers, day.total_active_users);
            totalEngagedUsers = Math.max(
                totalEngagedUsers,
                day.total_engaged_users
            );

            // Track peak active users and when it occurred
            if (day.total_active_users > peakActiveUsers) {
                peakActiveUsers = day.total_active_users;
                peakActiveUsersDate = day.date;
            }

            // Aggregate code completions (nested in languages array)
            if (day.copilot_ide_code_completions?.languages) {
                for (const lang of day.copilot_ide_code_completions.languages) {
                    totalCodeSuggestions += lang.total_code_suggestions || 0;
                    totalCodeAcceptances += lang.total_code_acceptances || 0;
                    totalLinesOfCodeSuggested +=
                        lang.total_code_lines_suggested || 0;
                    totalLinesOfCodeAccepted +=
                        lang.total_code_lines_accepted || 0;
                }
            }

            // Aggregate IDE Chat metrics (nested in editors -> models)
            if (day.copilot_ide_chat?.editors) {
                for (const editor of day.copilot_ide_chat.editors) {
                    if (editor.models) {
                        for (const model of editor.models) {
                            totalChats += model.total_chats || 0;
                            totalChatInsertions +=
                                model.total_chat_insertion_events || 0;
                            totalChatCopyEvents +=
                                model.total_chat_copy_events || 0;
                        }
                    }
                }
            }

            // Aggregate Dotcom Chat metrics (web-based chat)
            if (day.copilot_dotcom_chat?.models) {
                for (const model of day.copilot_dotcom_chat.models) {
                    totalChats += model.total_chats || 0;
                    totalChatInsertions += model.total_chat_insertion_events || 0;
                    totalChatCopyEvents += model.total_chat_copy_events || 0;
                }
            }

            // Aggregate Pull Request summaries (nested in repositories -> models)
            if (day.copilot_dotcom_pull_requests?.repositories) {
                for (const repo of day.copilot_dotcom_pull_requests.repositories) {
                    if (repo.models) {
                        for (const model of repo.models) {
                            totalPrSummaries +=
                                model.total_pr_summaries_created || 0;
                        }
                    }
                }
            }
        }

        // -------------------------------------------------------------------------
        // Calculate derived metrics
        // -------------------------------------------------------------------------

        // Average daily active users
        const avgDailyActiveUsers =
            metrics.length > 0
                ? metrics.reduce((sum, m) => sum + m.total_active_users, 0) /
                  metrics.length
                : 0;

        // Overall acceptance rate = total acceptances / total suggestions
        const acceptanceRate =
            totalCodeSuggestions > 0
                ? (totalCodeAcceptances / totalCodeSuggestions) * 100
                : 0;

        return {
            totalActiveUsers,
            totalEngagedUsers,
            peakActiveUsers,
            peakActiveUsersDate,
            avgDailyActiveUsers: Math.round(avgDailyActiveUsers * 100) / 100,
            totalCodeSuggestions,
            totalCodeAcceptances,
            acceptanceRate: Math.round(acceptanceRate * 100) / 100,
            totalLinesOfCodeSuggested,
            totalLinesOfCodeAccepted,
            totalChats,
            totalChatInsertions,
            totalChatCopyEvents,
            totalPrSummaries,
        };
    }

    /**
     * Build daily metrics array from raw API data.
     * Transforms each day's nested structure into flat DailyMetrics objects.
     */
    private buildDailyMetrics(metrics: CopilotUsageMetrics[]): DailyMetrics[] {
        return metrics.map((day) => {
            let codeSuggestions = 0;
            let codeAcceptances = 0;
            let linesOfCodeSuggested = 0;
            let linesOfCodeAccepted = 0;
            let chatSessions = 0;
            let chatInsertions = 0;
            let prSummaries = 0;

            // Aggregate code completions
            if (day.copilot_ide_code_completions?.languages) {
                for (const lang of day.copilot_ide_code_completions.languages) {
                    codeSuggestions += lang.total_code_suggestions || 0;
                    codeAcceptances += lang.total_code_acceptances || 0;
                    linesOfCodeSuggested += lang.total_code_lines_suggested || 0;
                    linesOfCodeAccepted += lang.total_code_lines_accepted || 0;
                }
            }

            // Aggregate chat
            if (day.copilot_ide_chat?.editors) {
                for (const editor of day.copilot_ide_chat.editors) {
                    if (editor.models) {
                        for (const model of editor.models) {
                            chatSessions += model.total_chats || 0;
                            chatInsertions +=
                                model.total_chat_insertion_events || 0;
                        }
                    }
                }
            }
            if (day.copilot_dotcom_chat?.models) {
                for (const model of day.copilot_dotcom_chat.models) {
                    chatSessions += model.total_chats || 0;
                    chatInsertions += model.total_chat_insertion_events || 0;
                }
            }

            // Aggregate PR summaries
            if (day.copilot_dotcom_pull_requests?.repositories) {
                for (const repo of day.copilot_dotcom_pull_requests.repositories) {
                    if (repo.models) {
                        for (const model of repo.models) {
                            prSummaries += model.total_pr_summaries_created || 0;
                        }
                    }
                }
            }

            const acceptanceRate =
                codeSuggestions > 0
                    ? (codeAcceptances / codeSuggestions) * 100
                    : 0;

            return {
                date: day.date,
                activeUsers: day.total_active_users,
                engagedUsers: day.total_engaged_users,
                codeSuggestions,
                codeAcceptances,
                acceptanceRate: Math.round(acceptanceRate * 100) / 100,
                linesOfCodeSuggested,
                linesOfCodeAccepted,
                chatSessions,
                chatInsertions,
                prSummaries,
            };
        });
    }

    /**
     * Build language breakdown by aggregating across all days.
     * Uses a Map to accumulate metrics per language, then sorts by suggestions.
     */
    private buildLanguageBreakdown(
        metrics: CopilotUsageMetrics[]
    ): LanguageBreakdown[] {
        const languageMap = new Map<string, LanguageMetrics>();

        for (const day of metrics) {
            if (day.copilot_ide_code_completions?.languages) {
                for (const lang of day.copilot_ide_code_completions.languages) {
                    const existing = languageMap.get(lang.name);
                    if (existing) {
                        existing.total_engaged_users = Math.max(
                            existing.total_engaged_users,
                            lang.total_engaged_users
                        );
                        existing.total_code_suggestions +=
                            lang.total_code_suggestions || 0;
                        existing.total_code_acceptances +=
                            lang.total_code_acceptances || 0;
                        existing.total_code_lines_suggested +=
                            lang.total_code_lines_suggested || 0;
                        existing.total_code_lines_accepted +=
                            lang.total_code_lines_accepted || 0;
                    } else {
                        languageMap.set(lang.name, { ...lang });
                    }
                }
            }
        }

        return Array.from(languageMap.values())
            .map((lang) => {
                const acceptanceRate =
                    lang.total_code_suggestions > 0
                        ? (lang.total_code_acceptances /
                              lang.total_code_suggestions) *
                          100
                        : 0;

                return {
                    language: lang.name,
                    engagedUsers: lang.total_engaged_users,
                    suggestions: lang.total_code_suggestions,
                    acceptances: lang.total_code_acceptances,
                    acceptanceRate: Math.round(acceptanceRate * 100) / 100,
                    linesSuggested: lang.total_code_lines_suggested,
                    linesAccepted: lang.total_code_lines_accepted,
                };
            })
            .sort((a, b) => b.suggestions - a.suggestions);
    }

    /**
     * Build editor breakdown by aggregating across all days.
     * Combines data from code completions and IDE chat endpoints.
     */
    private buildEditorBreakdown(
        metrics: CopilotUsageMetrics[]
    ): EditorBreakdown[] {
        const editorMap = new Map<
            string,
            { engagedUsers: number; chatSessions: number }
        >();

        for (const day of metrics) {
            // From code completions
            if (day.copilot_ide_code_completions?.editors) {
                for (const editor of day.copilot_ide_code_completions.editors) {
                    const existing = editorMap.get(editor.name);
                    if (existing) {
                        existing.engagedUsers = Math.max(
                            existing.engagedUsers,
                            editor.total_engaged_users
                        );
                    } else {
                        editorMap.set(editor.name, {
                            engagedUsers: editor.total_engaged_users,
                            chatSessions: 0,
                        });
                    }
                }
            }

            // From IDE chat
            if (day.copilot_ide_chat?.editors) {
                for (const editor of day.copilot_ide_chat.editors) {
                    const existing = editorMap.get(editor.name);
                    let chatSessions = 0;
                    if (editor.models) {
                        chatSessions = editor.models.reduce(
                            (sum: number, m: ChatModelMetrics) => sum + (m.total_chats || 0),
                            0
                        );
                    }

                    if (existing) {
                        existing.engagedUsers = Math.max(
                            existing.engagedUsers,
                            editor.total_engaged_users
                        );
                        existing.chatSessions += chatSessions;
                    } else {
                        editorMap.set(editor.name, {
                            engagedUsers: editor.total_engaged_users,
                            chatSessions,
                        });
                    }
                }
            }
        }

        return Array.from(editorMap.entries())
            .map(([editor, data]) => ({
                editor,
                engagedUsers: data.engagedUsers,
                chatSessions: data.chatSessions,
            }))
            .sort((a, b) => b.engagedUsers - a.engagedUsers);
    }

    /**
     * Build trend data for chart visualizations.
     * Extracts time-series data for common metrics.
     */
    private buildTrends(dailyMetrics: DailyMetrics[]): TrendData {
        return {
            activeUsersTrend: dailyMetrics.map((d) => ({
                date: d.date,
                value: d.activeUsers,
            })),
            acceptanceRateTrend: dailyMetrics.map((d) => ({
                date: d.date,
                value: d.acceptanceRate,
            })),
            suggestionsVolumeTrend: dailyMetrics.map((d) => ({
                date: d.date,
                value: d.codeSuggestions,
            })),
        };
    }
}
