/**
 * GitHub Copilot Metrics Types
 * Based on GitHub Copilot Metrics API response structures
 */

export interface DateRange {
    from: string;
    to: string;
}

export interface ReportRequest {
    enterpriseSlug: string;
    orgName?: string;
    dateRange: DateRange;
}

export interface CopilotUsageMetrics {
    date: string;
    total_active_users: number;
    total_engaged_users: number;
    copilot_ide_code_completions?: IdeCodeCompletions;
    copilot_ide_chat?: IdeChatMetrics;
    copilot_dotcom_chat?: DotcomChatMetrics;
    copilot_dotcom_pull_requests?: PullRequestMetrics;
}

export interface IdeCodeCompletions {
    total_engaged_users: number;
    languages?: LanguageMetrics[];
    editors?: EditorMetrics[];
    models?: ModelMetrics[];
}

export interface LanguageMetrics {
    name: string;
    total_engaged_users: number;
    total_code_suggestions: number;
    total_code_acceptances: number;
    total_code_lines_suggested: number;
    total_code_lines_accepted: number;
}

export interface EditorMetrics {
    name: string;
    total_engaged_users: number;
    models?: ModelMetrics[];
}

export interface ModelMetrics {
    name: string;
    is_custom_model: boolean;
    custom_model_training_date?: string;
    total_engaged_users: number;
    languages?: LanguageMetrics[];
    total_code_suggestions?: number;
    total_code_acceptances?: number;
    total_code_lines_suggested?: number;
    total_code_lines_accepted?: number;
}

export interface IdeChatMetrics {
    total_engaged_users: number;
    editors?: EditorChatMetrics[];
}

export interface EditorChatMetrics {
    name: string;
    total_engaged_users: number;
    models?: ChatModelMetrics[];
}

export interface ChatModelMetrics {
    name: string;
    is_custom_model: boolean;
    custom_model_training_date?: string;
    total_engaged_users: number;
    total_chats: number;
    total_chat_insertion_events: number;
    total_chat_copy_events: number;
}

export interface DotcomChatMetrics {
    total_engaged_users: number;
    models?: ChatModelMetrics[];
}

export interface PullRequestMetrics {
    total_engaged_users: number;
    repositories?: RepositoryMetrics[];
}

export interface RepositoryMetrics {
    name: string;
    total_engaged_users: number;
    models?: PullRequestModelMetrics[];
}

export interface PullRequestModelMetrics {
    name: string;
    is_custom_model: boolean;
    custom_model_training_date?: string;
    total_pr_summaries_created: number;
    total_engaged_users: number;
}

export interface CopilotReport {
    metadata: ReportMetadata;
    summary: ReportSummary;
    dailyMetrics: DailyMetrics[];
    languageBreakdown: LanguageBreakdown[];
    editorBreakdown: EditorBreakdown[];
    trends: TrendData;
    dataSource: 'live' | 'mock';
    apiError?: string;
}

export interface ReportMetadata {
    enterpriseSlug: string;
    orgName?: string;
    dateRange: DateRange;
    generatedAt: string;
    totalDays: number;
}

export interface ReportSummary {
    totalActiveUsers: number;
    totalEngagedUsers: number;
    peakActiveUsers: number;
    peakActiveUsersDate: string;
    avgDailyActiveUsers: number;
    totalCodeSuggestions: number;
    totalCodeAcceptances: number;
    acceptanceRate: number;
    totalLinesOfCodeSuggested: number;
    totalLinesOfCodeAccepted: number;
    totalChats: number;
    totalChatInsertions: number;
    totalChatCopyEvents: number;
    totalPrSummaries: number;
}

export interface DailyMetrics {
    date: string;
    activeUsers: number;
    engagedUsers: number;
    codeSuggestions: number;
    codeAcceptances: number;
    acceptanceRate: number;
    linesOfCodeSuggested: number;
    linesOfCodeAccepted: number;
    chatSessions: number;
    chatInsertions: number;
    prSummaries: number;
}

export interface LanguageBreakdown {
    language: string;
    engagedUsers: number;
    suggestions: number;
    acceptances: number;
    acceptanceRate: number;
    linesSuggested: number;
    linesAccepted: number;
}

export interface EditorBreakdown {
    editor: string;
    engagedUsers: number;
    chatSessions: number;
}

export interface TrendData {
    activeUsersTrend: TrendDataPoint[];
    acceptanceRateTrend: TrendDataPoint[];
    suggestionsVolumeTrend: TrendDataPoint[];
}

export interface TrendDataPoint {
    date: string;
    value: number;
}

export interface CacheEntry<T> {
    data: T;
    timestamp: number;
    expiresAt: number;
}
