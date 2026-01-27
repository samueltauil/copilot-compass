/**
 * Visual Report Generator - Creates markdown report with inline SVG charts
 */

import {
    generateLineChart,
    generateHorizontalBarChart,
    generateDonutChart,
    generateSparkline,
} from './svg-charts.js';

import type { CopilotReport, DailyMetrics, LanguageBreakdown, EditorBreakdown } from './types.js';

export function generateVisualReport(report: CopilotReport): string {
    const { metadata, summary, dailyMetrics, languageBreakdown, editorBreakdown } = report;

    // Prepare chart data
    const last14Days = dailyMetrics.slice(-14);

    const userTrendData = {
        labels: last14Days.map((d: DailyMetrics) => d.date.slice(5)),
        values: last14Days.map((d: DailyMetrics) => d.activeUsers),
        title: "Daily Active Users (14-day Trend)",
        color: "#58a6ff",
        showArea: true,
    };

    const acceptanceData = {
        labels: last14Days.map((d: DailyMetrics) => d.date.slice(5)),
        values: last14Days.map((d: DailyMetrics) => d.acceptanceRate),
        title: "Acceptance Rate % Trend",
        color: "#3fb950",
        showArea: true,
    };

    const topLanguages = languageBreakdown.slice(0, 6);
    const languageData = {
        labels: topLanguages.map((l: LanguageBreakdown) => l.language),
        values: topLanguages.map((l: LanguageBreakdown) => l.suggestions),
        colors: ['#3178c6', '#3572a5', '#f1e05a', '#178600', '#b07219', '#00add8'],
        title: "Top Languages by Suggestions",
    };

    const editorData = {
        labels: editorBreakdown.slice(0, 5).map((e: EditorBreakdown) => e.editor),
        values: editorBreakdown.slice(0, 5).map((e: EditorBreakdown) => e.engagedUsers),
        colors: ['#58a6ff', '#a371f7', '#d29922', '#3fb950', '#f85149'],
        title: "Editor Distribution",
    };

    // Calculate metrics
    const recentWeek = dailyMetrics.slice(-7);
    const previousWeek = dailyMetrics.slice(-14, -7);
    const recentAvg = recentWeek.reduce((s: number, d: DailyMetrics) => s + d.activeUsers, 0) / Math.max(recentWeek.length, 1);
    const prevAvg = previousWeek.length > 0 ? previousWeek.reduce((s: number, d: DailyMetrics) => s + d.activeUsers, 0) / previousWeek.length : recentAvg;
    const usersTrend = prevAvg > 0 ? ((recentAvg - prevAvg) / prevAvg * 100).toFixed(1) : "0";
    const trendEmoji = parseFloat(usersTrend) >= 0 ? "📈" : "📉";

    const acceptanceStatus = summary.acceptanceRate >= 30 ? "🟢 Excellent" : summary.acceptanceRate >= 20 ? "🟡 Good" : "🔴 Needs Attention";
    const timeSaved = Math.round((summary.totalLinesOfCodeAccepted * 0.5) / 60);

    // Generate SVG charts
    const userTrendChart = generateLineChart(userTrendData, 550, 160);
    const acceptanceChart = generateLineChart(acceptanceData, 550, 160);
    const languageChart = generateHorizontalBarChart(languageData, 500, 180);
    const editorChart = generateDonutChart(editorData, 280, 180);

    // Mini sparklines for KPIs
    const usersSparkline = generateSparkline(last14Days.map((d: DailyMetrics) => d.activeUsers), 100, 24, '#58a6ff');
    const acceptSparkline = generateSparkline(last14Days.map((d: DailyMetrics) => d.acceptanceRate), 100, 24, '#3fb950');

    // Data source warning
    let dataSourceNote = '';
    if (report.dataSource === 'mock') {
        dataSourceNote = `
> ⚠️ **Demo Mode** - Displaying simulated data
> ${report.apiError ? `API Error: ${report.apiError}` : ''}

`;
    }

    return `${dataSourceNote}# 📊 GitHub Copilot Usage Report

**${metadata.orgName || metadata.enterpriseSlug}** | ${metadata.dateRange.from} → ${metadata.dateRange.to} | ${metadata.totalDays} days

---

## 🎯 Key Performance Indicators

| Metric | Value | Trend |
|--------|-------|-------|
| **Peak Active Users** | **${summary.peakActiveUsers.toLocaleString()}** | ${trendEmoji} ${usersTrend}% vs prior week |
| **Acceptance Rate** | **${summary.acceptanceRate}%** | ${acceptanceStatus} |
| **Total Suggestions** | **${(summary.totalCodeSuggestions / 1000000).toFixed(2)}M** | ${(summary.totalCodeAcceptances / 1000).toFixed(0)}K accepted |
| **Chat Sessions** | **${summary.totalChats.toLocaleString()}** | ${summary.totalChatInsertions.toLocaleString()} insertions |
| **Dev Hours Saved** | **~${timeSaved.toLocaleString()}** | Based on accepted code |

---

## 📈 Active Users Trend

${userTrendChart}

---

## ✅ Acceptance Rate Trend  

${acceptanceChart}

---

## 🔤 Language Breakdown

${languageChart}

| Language | Suggestions | Acceptance Rate | Users |
|----------|-------------|-----------------|-------|
${topLanguages.map((l: LanguageBreakdown) => `| ${l.language} | ${l.suggestions.toLocaleString()} | ${l.acceptanceRate}% | ${l.engagedUsers} |`).join('\n')}

---

## 🖥️ Editor Distribution

${editorChart}

| Editor | Users | Chat Sessions |
|--------|-------|---------------|
${editorBreakdown.slice(0, 5).map((e: EditorBreakdown) => `| ${e.editor} | ${e.engagedUsers.toLocaleString()} | ${e.chatSessions.toLocaleString()} |`).join('\n')}

---

## 💬 Chat & Assistance

| Metric | Value |
|--------|-------|
| Total Chat Sessions | ${summary.totalChats.toLocaleString()} |
| Code Insertions | ${summary.totalChatInsertions.toLocaleString()} |
| Code Copied | ${summary.totalChatCopyEvents.toLocaleString()} |
| PR Summaries | ${summary.totalPrSummaries.toLocaleString()} |

---

## 📅 Daily Breakdown (Last 7 Days)

| Date | Users | Suggestions | Accepted | Rate | Chats |
|------|-------|-------------|----------|------|-------|
${dailyMetrics.slice(-7).map((d: DailyMetrics) => `| ${d.date.slice(5)} | ${d.activeUsers} | ${d.codeSuggestions.toLocaleString()} | ${d.codeAcceptances.toLocaleString()} | ${d.acceptanceRate}% | ${d.chatSessions} |`).join('\n')}

---

*Generated ${new Date(metadata.generatedAt).toLocaleString()} by Copilot Metrics MCP Server*
`;
}
