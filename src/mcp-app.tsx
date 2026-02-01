/**
 * MCP Copilot Metrics Report App - Interactive Dashboard using Chart.js
 */

import {
    useApp,
    useHostStyles,
    type App,
    type McpUiHostContext,
} from "@modelcontextprotocol/ext-apps/react";

import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    LineElement,
    PointElement,
    ArcElement,
    Title,
    Tooltip,
    Legend,
    Filler,
} from "chart.js";
import { StrictMode, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { Bar, Line, Doughnut } from "react-chartjs-2";

import type { CopilotReport } from "./types";
import "./global.css";

// Compass Logo SVG Component
const CompassLogo = ({ size = 32 }: { size?: number }) => (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="50" cy="50" r="45" stroke="#58a6ff" strokeWidth="3" fill="none" />
        <circle cx="50" cy="50" r="38" stroke="#58a6ff" strokeWidth="1.5" fill="none" opacity="0.5" />
        <polygon points="50,12 56,44 50,50 44,44" fill="#f85149" />
        <polygon points="50,88 44,56 50,50 56,56" fill="#e6edf3" />
        <polygon points="12,50 44,44 50,50 44,56" fill="#7d8590" />
        <polygon points="88,50 56,56 50,50 56,44" fill="#7d8590" />
        <circle cx="50" cy="50" r="6" fill="#58a6ff" />
        <circle cx="50" cy="50" r="3" fill="#0d1117" />
        <text x="50" y="8" textAnchor="middle" fill="#e6edf3" fontSize="8" fontWeight="bold">N</text>
        <text x="50" y="98" textAnchor="middle" fill="#7d8590" fontSize="8">S</text>
        <text x="6" y="53" textAnchor="middle" fill="#7d8590" fontSize="8">W</text>
        <text x="94" y="53" textAnchor="middle" fill="#7d8590" fontSize="8">E</text>
    </svg>
);

// Register Chart.js components
ChartJS.register(
    CategoryScale,
    LinearScale,
    BarElement,
    LineElement,
    PointElement,
    ArcElement,
    Title,
    Tooltip,
    Legend,
    Filler
);

interface CallToolResult {
    content?: Array<{ type: string; text?: string }>;
}

function extractReportData(callToolResult: CallToolResult): CopilotReport | null {
    const textContent = callToolResult.content?.find(
        (c) => c.type === "text"
    );
    if (!textContent || textContent.type !== "text") return null;
    try {
        return JSON.parse(textContent.text!) as CopilotReport;
    } catch {
        return null;
    }
}

function formatNumber(num: number): string {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toLocaleString();
}

function CopilotApp() {
    const [reportData, setReportData] = useState<CopilotReport | null>(null);
    const [hostContext, setHostContext] = useState<McpUiHostContext | undefined>();
    const [error, setError] = useState<string | null>(null);

    const { app, isConnected, error: appError } = useApp({
        appInfo: { name: "Copilot Metrics Report", version: "1.0.0" },
        capabilities: {},
        onAppCreated: (app: App) => {
            app.onteardown = async () => {
                console.info("Copilot App is being torn down");
                return {};
            };

            app.ontoolinput = (input) => {
                console.info("Received tool input:", input);
            };

            app.ontoolresult = (result) => {
                console.info("Received tool result:", result);
                const data = extractReportData(result as CallToolResult);
                if (data) {
                    setReportData(data);
                    setError(null);
                } else {
                    setError("Failed to parse report data");
                }
            };

            app.ontoolcancelled = (params) => {
                console.info("Tool call cancelled:", params.reason);
                setError("Report generation was cancelled");
            };

            app.onerror = (err) => {
                console.error("App error:", err);
                setError(err.message);
            };

            app.onhostcontextchanged = (params) => {
                setHostContext((prev: McpUiHostContext | undefined) => ({ ...prev, ...params }));
            };
        },
    });

    // Apply host styles for theme integration
    useHostStyles(app, app?.getHostContext());

    useEffect(() => {
        if (app) {
            setHostContext(app.getHostContext());
        }
    }, [app]);

    if (appError) {
        return (
            <div className="error">
                <strong>Error:</strong> {appError.message}
            </div>
        );
    }

    if (!isConnected) {
        return <div className="loading">Connecting...</div>;
    }

    return (
        <ReportDashboard
            reportData={reportData}
            hostContext={hostContext}
            error={error}
        />
    );
}

interface ReportDashboardProps {
    reportData: CopilotReport | null;
    hostContext?: McpUiHostContext;
    error: string | null;
}

function ReportDashboard({ reportData, hostContext, error }: ReportDashboardProps) {
    if (error) {
        return (
            <main
                className="main"
                style={{
                    paddingTop: hostContext?.safeAreaInsets?.top ?? 16,
                    paddingRight: hostContext?.safeAreaInsets?.right ?? 16,
                    paddingBottom: hostContext?.safeAreaInsets?.bottom ?? 16,
                    paddingLeft: hostContext?.safeAreaInsets?.left ?? 16,
                }}
            >
                <div className="error">
                    <strong>Error:</strong> {error}
                </div>
            </main>
        );
    }

    if (!reportData) {
        return (
            <main
                className="main"
                style={{
                    paddingTop: hostContext?.safeAreaInsets?.top ?? 16,
                    paddingRight: hostContext?.safeAreaInsets?.right ?? 16,
                    paddingBottom: hostContext?.safeAreaInsets?.bottom ?? 16,
                    paddingLeft: hostContext?.safeAreaInsets?.left ?? 16,
                }}
            >
                <div className="placeholder">
                    <div className="placeholder-icon"><CompassLogo size={64} /></div>
                    <h2>Copilot Metrics Dashboard</h2>
                    <p>
                        Waiting for report data. Use the{" "}
                        <code>generate_copilot_report</code> tool to generate a report,
                        and it will be displayed here with interactive charts.
                    </p>
                </div>
            </main>
        );
    }

    const { metadata, summary, dailyMetrics, languageBreakdown, editorBreakdown } =
        reportData;

    // Prepare chart data for active users trend
    const activeUsersTrendData = {
        labels: dailyMetrics.slice(-14).map((d) => d.date.slice(5)), // MM-DD format
        datasets: [
            {
                label: "Active Users",
                data: dailyMetrics.slice(-14).map((d) => d.activeUsers),
                borderColor: "#3b82f6",
                backgroundColor: "rgba(59, 130, 246, 0.1)",
                fill: true,
                tension: 0.4,
            },
        ],
    };

    // Prepare chart data for acceptance rate trend
    const acceptanceRateTrendData = {
        labels: dailyMetrics.slice(-14).map((d) => d.date.slice(5)),
        datasets: [
            {
                label: "Acceptance Rate (%)",
                data: dailyMetrics.slice(-14).map((d) => d.acceptanceRate),
                borderColor: "#22c55e",
                backgroundColor: "rgba(34, 197, 94, 0.1)",
                fill: true,
                tension: 0.4,
            },
        ],
    };

    // Prepare language breakdown chart data
    const top8Languages = languageBreakdown.slice(0, 8);
    const languageChartData = {
        labels: top8Languages.map((l) => l.language),
        datasets: [
            {
                label: "Suggestions",
                data: top8Languages.map((l) => l.suggestions),
                backgroundColor: [
                    "#3b82f6", "#22c55e", "#f59e0b", "#ef4444",
                    "#8b5cf6", "#06b6d4", "#ec4899", "#84cc16"
                ],
            },
        ],
    };

    // Prepare editor distribution chart data
    const editorChartData = {
        labels: editorBreakdown.map((e) => e.editor),
        datasets: [
            {
                data: editorBreakdown.map((e) => e.engagedUsers),
                backgroundColor: [
                    "#3b82f6", "#22c55e", "#f59e0b", "#ef4444",
                    "#8b5cf6", "#06b6d4", "#ec4899", "#84cc16"
                ],
                borderColor: "#0d1117",
                borderWidth: 2,
            },
        ],
    };

    const lineChartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { display: false },
            tooltip: { mode: "index" as const, intersect: false },
        },
        scales: {
            x: {
                grid: { color: "rgba(255, 255, 255, 0.1)" },
                ticks: { color: "#7d8590" },
            },
            y: {
                grid: { color: "rgba(255, 255, 255, 0.1)" },
                ticks: { color: "#7d8590" },
            },
        },
    };

    const barChartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        indexAxis: "y" as const,
        plugins: {
            legend: { display: false },
        },
        scales: {
            x: {
                grid: { color: "rgba(255, 255, 255, 0.1)" },
                ticks: { color: "#7d8590" },
            },
            y: {
                grid: { display: false },
                ticks: { color: "#e6edf3" },
            },
        },
    };

    const doughnutOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: "right" as const,
                labels: { color: "#e6edf3", padding: 12 },
            },
        },
    };

    // Calculate additional metrics
    const linesAcceptedRate =
        summary.totalLinesOfCodeSuggested > 0
            ? (
                  (summary.totalLinesOfCodeAccepted /
                      summary.totalLinesOfCodeSuggested) *
                  100
              ).toFixed(1)
            : "0";

    const devHoursSaved = Math.round(
        (summary.totalLinesOfCodeAccepted / 30) * 0.25
    );

    return (
        <main
            className="main"
            style={{
                paddingTop: hostContext?.safeAreaInsets?.top ?? 16,
                paddingRight: hostContext?.safeAreaInsets?.right ?? 16,
                paddingBottom: hostContext?.safeAreaInsets?.bottom ?? 16,
                paddingLeft: hostContext?.safeAreaInsets?.left ?? 16,
            }}
        >
            {/* Header */}
            <div className="header">
                <div className="header-title">
                    <CompassLogo size={40} />
                    <h1>GitHub Copilot Usage Report</h1>
                </div>
                <div className="header-meta">
                    <span className="meta-item">{metadata.dateRange.from} → {metadata.dateRange.to}</span>
                    <span className="meta-item">{metadata.orgName || metadata.enterpriseSlug}</span>
                    <span className="meta-item">{metadata.totalDays} days</span>
                    <span className={`meta-item ${reportData.dataSource === 'live' ? 'status-live' : 'status-demo'}`}>
                        {reportData.dataSource === 'live' ? 'Live Data' : 'Demo Data'}
                    </span>
                </div>
            </div>

            {/* Mock Data Warning */}
            {reportData.dataSource === 'mock' && (
                <div className="mock-warning">
                    <h3>Demo Mode - Using Sample Data</h3>
                    <p>
                        {reportData.apiError || 'Unable to fetch live data.'}
                        Ensure your GITHUB_TOKEN has manage_billing:copilot and read:enterprise scopes.
                    </p>
                </div>
            )}

            {/* KPI Cards */}
            <div className="kpi-grid">
                <div className="kpi-card highlight">
                    <div className="kpi-label">Peak Active Users</div>
                    <div className="kpi-value">{formatNumber(summary.peakActiveUsers)}</div>
                    <div className="kpi-context">on {summary.peakActiveUsersDate}</div>
                </div>
                <div className="kpi-card">
                    <div className="kpi-label">Acceptance Rate</div>
                    <div className="kpi-value text-green">{summary.acceptanceRate}%</div>
                    <div className="kpi-context">{linesAcceptedRate}% of lines kept</div>
                </div>
                <div className="kpi-card">
                    <div className="kpi-label">Code Suggestions</div>
                    <div className="kpi-value text-blue">
                        {formatNumber(summary.totalCodeSuggestions)}
                    </div>
                    <div className="kpi-context">
                        {formatNumber(summary.totalCodeAcceptances)} accepted
                    </div>
                </div>
                <div className="kpi-card">
                    <div className="kpi-label">Dev Hours Saved</div>
                    <div className="kpi-value text-purple">~{formatNumber(devHoursSaved)}</div>
                    <div className="kpi-context">estimated from accepted code</div>
                </div>
            </div>

            {/* Charts Grid */}
            <div className="charts-grid">
                <div className="section">
                    <h2>Active Users Trend (14 days)</h2>
                    <div className="chart-container">
                        <Line data={activeUsersTrendData} options={lineChartOptions} />
                    </div>
                </div>
                <div className="section">
                    <h2>Acceptance Rate Trend (14 days)</h2>
                    <div className="chart-container">
                        <Line data={acceptanceRateTrendData} options={lineChartOptions} />
                    </div>
                </div>
            </div>

            <div className="charts-grid">
                <div className="section">
                    <h2>Top Languages by Suggestions</h2>
                    <div className="chart-container">
                        <Bar data={languageChartData} options={barChartOptions} />
                    </div>
                </div>
                <div className="section">
                    <h2>Editor Distribution</h2>
                    <div className="chart-container">
                        <Doughnut data={editorChartData} options={doughnutOptions} />
                    </div>
                </div>
            </div>

            {/* Chat & Assistance */}
            <div className="section">
                <h2>Chat & Assistance</h2>
                <div className="kpi-grid">
                    <div className="kpi-card">
                        <div className="kpi-label">Chat Sessions</div>
                        <div className="kpi-value">{formatNumber(summary.totalChats)}</div>
                    </div>
                    <div className="kpi-card">
                        <div className="kpi-label">Code Insertions</div>
                        <div className="kpi-value">
                            {formatNumber(summary.totalChatInsertions)}
                        </div>
                    </div>
                    <div className="kpi-card">
                        <div className="kpi-label">Code Copied</div>
                        <div className="kpi-value">
                            {formatNumber(summary.totalChatCopyEvents)}
                        </div>
                    </div>
                    <div className="kpi-card">
                        <div className="kpi-label">PR Summaries</div>
                        <div className="kpi-value">
                            {formatNumber(summary.totalPrSummaries)}
                        </div>
                    </div>
                </div>
            </div>

            {/* Language Breakdown Table */}
            <div className="section">
                <h2>Language Breakdown</h2>
                <table className="data-table">
                    <thead>
                        <tr>
                            <th className="rank">#</th>
                            <th>Language</th>
                            <th className="number">Suggestions</th>
                            <th className="number">Acceptances</th>
                            <th className="number">Rate</th>
                            <th className="number">Users</th>
                        </tr>
                    </thead>
                    <tbody>
                        {languageBreakdown.slice(0, 10).map((lang, i) => (
                            <tr key={lang.language}>
                                <td className={`rank ${i < 3 ? 'rank-' + (i + 1) : ''}`}>
                                    {i + 1}
                                </td>
                                <td>{lang.language}</td>
                                <td className="number">{formatNumber(lang.suggestions)}</td>
                                <td className="number">{formatNumber(lang.acceptances)}</td>
                                <td className="number text-green">{lang.acceptanceRate}%</td>
                                <td className="number">{formatNumber(lang.engagedUsers)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Editor Breakdown Table */}
            <div className="section">
                <h2>Editor Breakdown</h2>
                <table className="data-table">
                    <thead>
                        <tr>
                            <th>Editor</th>
                            <th className="number">Engaged Users</th>
                            <th className="number">Chat Sessions</th>
                            <th>Share</th>
                        </tr>
                    </thead>
                    <tbody>
                        {editorBreakdown.map((ed) => {
                            const share =
                                summary.totalEngagedUsers > 0
                                    ? (
                                          (ed.engagedUsers / summary.totalEngagedUsers) *
                                          100
                                      ).toFixed(0)
                                    : 0;
                            return (
                                <tr key={ed.editor}>
                                    <td>{ed.editor}</td>
                                    <td className="number">{formatNumber(ed.engagedUsers)}</td>
                                    <td className="number">{formatNumber(ed.chatSessions)}</td>
                                    <td>
                                        <div className="progress-bar">
                                            <div
                                                className="progress-bar-fill bg-blue"
                                                style={{ width: `${share}%` }}
                                            />
                                        </div>
                                        <span style={{ fontSize: '0.75rem' }}>{share}%</span>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {/* Raw Data */}
            <details className="data-details">
                <summary>View Raw Data (JSON)</summary>
                <pre className="data-preview">
                    {JSON.stringify(reportData, null, 2)}
                </pre>
            </details>
        </main>
    );
}

createRoot(document.getElementById("root")!).render(
    <StrictMode>
        <CopilotApp />
    </StrictMode>
);
