/**
 * HTML Report Generator - Creates a rich, interactive HTML report with charts
 */

import type { CopilotReport, DailyMetrics, LanguageBreakdown, EditorBreakdown } from './types.js';

export function generateHtmlReport(report: CopilotReport): string {
    const { metadata, summary, dailyMetrics, languageBreakdown, editorBreakdown } = report;

    // Prepare data for charts
    const dailyLabels = JSON.stringify(dailyMetrics.map((d: DailyMetrics) => d.date.slice(5))); // MM-DD
    const activeUsersData = JSON.stringify(dailyMetrics.map((d: DailyMetrics) => d.activeUsers));
    const suggestionsData = JSON.stringify(dailyMetrics.map((d: DailyMetrics) => d.codeSuggestions));
    const acceptancesData = JSON.stringify(dailyMetrics.map((d: DailyMetrics) => d.codeAcceptances));
    const acceptanceRateData = JSON.stringify(dailyMetrics.map((d: DailyMetrics) => d.acceptanceRate));
    const chatSessionsData = JSON.stringify(dailyMetrics.map((d: DailyMetrics) => d.chatSessions));

    const languageNames = JSON.stringify(languageBreakdown.slice(0, 10).map((l: LanguageBreakdown) => l.language));
    const languageSuggestions = JSON.stringify(languageBreakdown.slice(0, 10).map((l: LanguageBreakdown) => l.suggestions));
    const languageAcceptanceRates = JSON.stringify(languageBreakdown.slice(0, 10).map((l: LanguageBreakdown) => l.acceptanceRate));
    const languageUsers = JSON.stringify(languageBreakdown.slice(0, 10).map((l: LanguageBreakdown) => l.engagedUsers));

    const editorNames = JSON.stringify(editorBreakdown.map((e: EditorBreakdown) => e.editor));
    const editorUsers = JSON.stringify(editorBreakdown.map((e: EditorBreakdown) => e.engagedUsers));
    const editorChatSessions = JSON.stringify(editorBreakdown.map((e: EditorBreakdown) => e.chatSessions));

    // Calculate derived metrics
    const productivityGain = ((summary.totalCodeAcceptances / Math.max(1, summary.totalCodeSuggestions)) * 100 * 0.35).toFixed(1);
    const timeSaved = Math.round((summary.totalLinesOfCodeAccepted * 0.5) / 60); // Assume 0.5 min per line
    const avgDailyChats = Math.round(summary.totalChats / Math.max(1, metadata.totalDays));

    // Week-over-week calculations
    const recentWeek = dailyMetrics.slice(-7);
    const previousWeek = dailyMetrics.slice(-14, -7);

    const recentAvgUsers = recentWeek.length > 0 ? recentWeek.reduce((s: number, d: DailyMetrics) => s + d.activeUsers, 0) / recentWeek.length : 0;
    const prevAvgUsers = previousWeek.length > 0 ? previousWeek.reduce((s: number, d: DailyMetrics) => s + d.activeUsers, 0) / previousWeek.length : recentAvgUsers;
    const usersTrend = prevAvgUsers > 0 ? (((recentAvgUsers - prevAvgUsers) / prevAvgUsers) * 100).toFixed(1) : "0";
    const usersTrendDir = parseFloat(usersTrend) >= 0 ? "up" : "down";

    const recentAvgRate = recentWeek.length > 0 ? recentWeek.reduce((s: number, d: DailyMetrics) => s + d.acceptanceRate, 0) / recentWeek.length : 0;
    const prevAvgRate = previousWeek.length > 0 ? previousWeek.reduce((s: number, d: DailyMetrics) => s + d.acceptanceRate, 0) / previousWeek.length : recentAvgRate;
    const rateTrend = prevAvgRate > 0 ? (((recentAvgRate - prevAvgRate) / prevAvgRate) * 100).toFixed(1) : "0";
    const rateTrendDir = parseFloat(rateTrend) >= 0 ? "up" : "down";

    // Status indicators
    const acceptanceStatus = summary.acceptanceRate >= 30 ? "excellent" : summary.acceptanceRate >= 20 ? "good" : "needs-attention";
    const adoptionStatus = summary.totalActiveUsers >= 1000 ? "excellent" : summary.totalActiveUsers >= 500 ? "good" : "growing";

    // Report source warning
    const dataSourceBanner = report.dataSource === 'mock' ? `
    <div class="alert alert-warning">
      <div class="alert-icon">⚠️</div>
      <div class="alert-content">
        <strong>Demo Mode - Simulated Data</strong>
        <p>Unable to fetch live data from GitHub API. Displaying representative sample data.</p>
        ${report.apiError ? `<code>${report.apiError}</code>` : ''}
      </div>
    </div>
  ` : `
    <div class="alert alert-success">
      <div class="alert-icon">✓</div>
      <div class="alert-content">
        <strong>Live Data</strong>
        <p>This report reflects actual GitHub Copilot usage from your organization.</p>
      </div>
    </div>
  `;

    return `<!DOCTYPE html>
<html lang="en" data-theme="dark">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>GitHub Copilot Usage Report</title>
  <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js"></script>
  <style>
    :root {
      --bg-primary: #0d1117;
      --bg-secondary: #161b22;
      --bg-tertiary: #21262d;
      --bg-card: #1c2128;
      --border-color: #30363d;
      --text-primary: #e6edf3;
      --text-secondary: #8b949e;
      --text-muted: #6e7681;
      --accent-blue: #58a6ff;
      --accent-green: #3fb950;
      --accent-orange: #d29922;
      --accent-red: #f85149;
      --accent-purple: #a371f7;
      --accent-pink: #db61a2;
      --accent-cyan: #39d353;
      --gradient-1: linear-gradient(135deg, #58a6ff 0%, #a371f7 100%);
      --gradient-2: linear-gradient(135deg, #3fb950 0%, #58a6ff 100%);
      --gradient-3: linear-gradient(135deg, #d29922 0%, #f85149 100%);
      --shadow-sm: 0 1px 2px rgba(0,0,0,0.3);
      --shadow-md: 0 4px 12px rgba(0,0,0,0.4);
      --shadow-lg: 0 8px 24px rgba(0,0,0,0.5);
      --radius-sm: 6px;
      --radius-md: 12px;
      --radius-lg: 16px;
    }

    * { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
      background: var(--bg-primary);
      color: var(--text-primary);
      line-height: 1.6;
      min-height: 100vh;
    }

    .container {
      max-width: 1400px;
      margin: 0 auto;
      padding: 24px;
    }

    /* Header */
    .header {
      background: var(--bg-secondary);
      border-bottom: 1px solid var(--border-color);
      padding: 24px 0;
      margin-bottom: 24px;
    }

    .header-content {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 16px;
    }

    .logo {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .logo-icon {
      width: 48px;
      height: 48px;
      background: var(--gradient-1);
      border-radius: var(--radius-md);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 24px;
    }

    .logo-text h1 {
      font-size: 24px;
      font-weight: 600;
      background: var(--gradient-1);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }

    .logo-text p {
      color: var(--text-secondary);
      font-size: 14px;
    }

    .meta-info {
      display: flex;
      gap: 24px;
      flex-wrap: wrap;
    }

    .meta-item {
      text-align: right;
    }

    .meta-item label {
      display: block;
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: var(--text-muted);
      margin-bottom: 4px;
    }

    .meta-item span {
      font-weight: 500;
      color: var(--text-primary);
    }

    /* Alerts */
    .alert {
      display: flex;
      gap: 16px;
      padding: 16px 20px;
      border-radius: var(--radius-md);
      margin-bottom: 24px;
      border: 1px solid;
    }

    .alert-warning {
      background: rgba(210, 153, 34, 0.1);
      border-color: rgba(210, 153, 34, 0.3);
    }

    .alert-success {
      background: rgba(63, 185, 80, 0.1);
      border-color: rgba(63, 185, 80, 0.3);
    }

    .alert-icon {
      font-size: 24px;
    }

    .alert-content strong {
      display: block;
      margin-bottom: 4px;
    }

    .alert-content p {
      color: var(--text-secondary);
      font-size: 14px;
      margin-bottom: 8px;
    }

    .alert-content code {
      display: block;
      background: var(--bg-tertiary);
      padding: 8px 12px;
      border-radius: var(--radius-sm);
      font-size: 12px;
      color: var(--accent-orange);
      word-break: break-all;
    }

    /* Grid */
    .grid {
      display: grid;
      gap: 24px;
    }

    .grid-2 { grid-template-columns: repeat(2, 1fr); }
    .grid-3 { grid-template-columns: repeat(3, 1fr); }
    .grid-4 { grid-template-columns: repeat(4, 1fr); }

    @media (max-width: 1200px) {
      .grid-4 { grid-template-columns: repeat(2, 1fr); }
    }

    @media (max-width: 768px) {
      .grid-2, .grid-3, .grid-4 { grid-template-columns: 1fr; }
    }

    /* KPI Cards */
    .kpi-card {
      background: var(--bg-card);
      border: 1px solid var(--border-color);
      border-radius: var(--radius-lg);
      padding: 24px;
      position: relative;
      overflow: hidden;
      transition: transform 0.2s, box-shadow 0.2s;
    }

    .kpi-card:hover {
      transform: translateY(-2px);
      box-shadow: var(--shadow-lg);
    }

    .kpi-card::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 3px;
    }

    .kpi-card.accent-blue::before { background: var(--accent-blue); }
    .kpi-card.accent-green::before { background: var(--accent-green); }
    .kpi-card.accent-orange::before { background: var(--accent-orange); }
    .kpi-card.accent-purple::before { background: var(--accent-purple); }

    .kpi-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 12px;
    }

    .kpi-label {
      font-size: 13px;
      color: var(--text-secondary);
      font-weight: 500;
    }

    .kpi-badge {
      font-size: 11px;
      padding: 2px 8px;
      border-radius: 12px;
      font-weight: 600;
    }

    .kpi-badge.excellent { background: rgba(63, 185, 80, 0.2); color: var(--accent-green); }
    .kpi-badge.good { background: rgba(88, 166, 255, 0.2); color: var(--accent-blue); }
    .kpi-badge.growing { background: rgba(210, 153, 34, 0.2); color: var(--accent-orange); }
    .kpi-badge.needs-attention { background: rgba(248, 81, 73, 0.2); color: var(--accent-red); }

    .kpi-value {
      font-size: 36px;
      font-weight: 700;
      line-height: 1.1;
      margin-bottom: 8px;
    }

    .kpi-trend {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 13px;
    }

    .trend-up { color: var(--accent-green); }
    .trend-down { color: var(--accent-red); }
    .trend-neutral { color: var(--text-secondary); }

    .trend-icon {
      font-size: 16px;
    }

    .kpi-subtitle {
      color: var(--text-muted);
      font-size: 12px;
      margin-top: 4px;
    }

    /* Section */
    .section {
      margin-bottom: 32px;
    }

    .section-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
    }

    .section-title {
      font-size: 20px;
      font-weight: 600;
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .section-title-icon {
      width: 32px;
      height: 32px;
      background: var(--bg-tertiary);
      border-radius: var(--radius-sm);
      display: flex;
      align-items: center;
      justify-content: center;
    }

    /* Cards */
    .card {
      background: var(--bg-card);
      border: 1px solid var(--border-color);
      border-radius: var(--radius-lg);
      padding: 24px;
    }

    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
    }

    .card-title {
      font-size: 16px;
      font-weight: 600;
    }

    /* Charts */
    .chart-container {
      position: relative;
      height: 300px;
    }

    .chart-container-lg {
      height: 350px;
    }

    /* Stats List */
    .stats-list {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .stat-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px 16px;
      background: var(--bg-tertiary);
      border-radius: var(--radius-sm);
      transition: background 0.2s;
    }

    .stat-item:hover {
      background: var(--bg-secondary);
    }

    .stat-label {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .stat-icon {
      width: 36px;
      height: 36px;
      border-radius: var(--radius-sm);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 18px;
    }

    .stat-name {
      font-weight: 500;
    }

    .stat-description {
      font-size: 12px;
      color: var(--text-muted);
    }

    .stat-value {
      text-align: right;
    }

    .stat-number {
      font-size: 18px;
      font-weight: 600;
    }

    .stat-subtext {
      font-size: 12px;
      color: var(--text-muted);
    }

    /* Progress Bars */
    .progress-bar-container {
      margin-top: 12px;
    }

    .progress-bar {
      height: 8px;
      background: var(--bg-tertiary);
      border-radius: 4px;
      overflow: hidden;
    }

    .progress-bar-fill {
      height: 100%;
      border-radius: 4px;
      transition: width 0.5s ease-out;
    }

    .progress-label {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-top: 8px;
      font-size: 13px;
    }

    /* Language Bars */
    .language-item {
      margin-bottom: 16px;
    }

    .language-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 8px;
    }

    .language-name {
      display: flex;
      align-items: center;
      gap: 8px;
      font-weight: 500;
    }

    .language-dot {
      width: 10px;
      height: 10px;
      border-radius: 50%;
    }

    .language-stats {
      display: flex;
      gap: 16px;
      font-size: 13px;
      color: var(--text-secondary);
    }

    /* Table */
    .data-table {
      width: 100%;
      border-collapse: collapse;
    }

    .data-table th,
    .data-table td {
      padding: 12px 16px;
      text-align: left;
      border-bottom: 1px solid var(--border-color);
    }

    .data-table th {
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: var(--text-muted);
      font-weight: 600;
    }

    .data-table tbody tr:hover {
      background: var(--bg-tertiary);
    }

    .data-table .number {
      text-align: right;
      font-variant-numeric: tabular-nums;
    }

    /* Footer */
    .footer {
      text-align: center;
      padding: 24px;
      color: var(--text-muted);
      font-size: 13px;
      border-top: 1px solid var(--border-color);
      margin-top: 48px;
    }

    /* Highlight Numbers */
    .highlight-value {
      font-size: 48px;
      font-weight: 800;
      background: var(--gradient-1);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }

    /* Mini Stats Row */
    .mini-stats {
      display: flex;
      gap: 24px;
      flex-wrap: wrap;
    }

    .mini-stat {
      flex: 1;
      min-width: 120px;
      text-align: center;
      padding: 16px;
      background: var(--bg-tertiary);
      border-radius: var(--radius-sm);
    }

    .mini-stat-value {
      font-size: 24px;
      font-weight: 700;
      margin-bottom: 4px;
    }

    .mini-stat-label {
      font-size: 12px;
      color: var(--text-muted);
    }

    /* Animations */
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(10px); }
      to { opacity: 1; transform: translateY(0); }
    }

    .animate-in {
      animation: fadeIn 0.5s ease-out forwards;
    }

    .delay-1 { animation-delay: 0.1s; }
    .delay-2 { animation-delay: 0.2s; }
    .delay-3 { animation-delay: 0.3s; }
    .delay-4 { animation-delay: 0.4s; }
  </style>
</head>
<body>
  <header class="header">
    <div class="container">
      <div class="header-content">
        <div class="logo">
          <div class="logo-icon">🤖</div>
          <div class="logo-text">
            <h1>GitHub Copilot</h1>
            <p>Usage Analytics Report</p>
          </div>
        </div>
        <div class="meta-info">
          <div class="meta-item">
            <label>Report Period</label>
            <span>${metadata.dateRange.from} → ${metadata.dateRange.to}</span>
          </div>
          <div class="meta-item">
            <label>${metadata.orgName ? 'Organization' : 'Enterprise'}</label>
            <span>${metadata.orgName || metadata.enterpriseSlug}</span>
          </div>
          <div class="meta-item">
            <label>Generated</label>
            <span>${new Date(metadata.generatedAt).toLocaleDateString()}</span>
          </div>
        </div>
      </div>
    </div>
  </header>

  <main class="container">
    ${dataSourceBanner}

    <!-- KPI Overview -->
    <section class="section">
      <div class="grid grid-4">
        <div class="kpi-card accent-blue animate-in">
          <div class="kpi-header">
            <span class="kpi-label">Active Users</span>
            <span class="kpi-badge ${adoptionStatus}">${adoptionStatus.replace('-', ' ')}</span>
          </div>
          <div class="kpi-value">${summary.peakActiveUsers.toLocaleString()}</div>
          <div class="kpi-trend trend-${usersTrendDir}">
            <span class="trend-icon">${usersTrendDir === 'up' ? '↑' : '↓'}</span>
            <span>${Math.abs(parseFloat(usersTrend))}% vs last week</span>
          </div>
          <div class="kpi-subtitle">Peak: ${summary.peakActiveUsersDate}</div>
        </div>

        <div class="kpi-card accent-green animate-in delay-1">
          <div class="kpi-header">
            <span class="kpi-label">Acceptance Rate</span>
            <span class="kpi-badge ${acceptanceStatus}">${acceptanceStatus.replace('-', ' ')}</span>
          </div>
          <div class="kpi-value">${summary.acceptanceRate}%</div>
          <div class="kpi-trend trend-${rateTrendDir}">
            <span class="trend-icon">${rateTrendDir === 'up' ? '↑' : '↓'}</span>
            <span>${Math.abs(parseFloat(rateTrend))}% vs last week</span>
          </div>
          <div class="kpi-subtitle">${summary.totalCodeAcceptances.toLocaleString()} acceptances</div>
        </div>

        <div class="kpi-card accent-purple animate-in delay-2">
          <div class="kpi-header">
            <span class="kpi-label">Code Suggestions</span>
          </div>
          <div class="kpi-value">${(summary.totalCodeSuggestions / 1000000).toFixed(2)}M</div>
          <div class="kpi-trend trend-neutral">
            <span>${(summary.totalLinesOfCodeSuggested / 1000000).toFixed(1)}M lines suggested</span>
          </div>
          <div class="kpi-subtitle">${Math.round(summary.totalCodeSuggestions / metadata.totalDays).toLocaleString()} / day avg</div>
        </div>

        <div class="kpi-card accent-orange animate-in delay-3">
          <div class="kpi-header">
            <span class="kpi-label">Chat Sessions</span>
          </div>
          <div class="kpi-value">${summary.totalChats.toLocaleString()}</div>
          <div class="kpi-trend trend-neutral">
            <span>${summary.totalChatInsertions.toLocaleString()} code insertions</span>
          </div>
          <div class="kpi-subtitle">${avgDailyChats} sessions / day avg</div>
        </div>
      </div>
    </section>

    <!-- Productivity Impact -->
    <section class="section">
      <div class="section-header">
        <h2 class="section-title">
          <div class="section-title-icon">📈</div>
          Productivity Impact
        </h2>
      </div>
      <div class="card">
        <div class="mini-stats">
          <div class="mini-stat">
            <div class="mini-stat-value" style="color: var(--accent-green)">${timeSaved.toLocaleString()}</div>
            <div class="mini-stat-label">Developer Hours Saved</div>
          </div>
          <div class="mini-stat">
            <div class="mini-stat-value" style="color: var(--accent-blue)">${summary.totalLinesOfCodeAccepted.toLocaleString()}</div>
            <div class="mini-stat-label">Lines of Code Accepted</div>
          </div>
          <div class="mini-stat">
            <div class="mini-stat-value" style="color: var(--accent-purple)">${summary.totalPrSummaries.toLocaleString()}</div>
            <div class="mini-stat-label">PR Summaries Generated</div>
          </div>
          <div class="mini-stat">
            <div class="mini-stat-value" style="color: var(--accent-orange)">${productivityGain}%</div>
            <div class="mini-stat-label">Est. Productivity Gain</div>
          </div>
        </div>
      </div>
    </section>

    <!-- Charts Row -->
    <section class="section">
      <div class="grid grid-2">
        <!-- Usage Trend Chart -->
        <div class="card">
          <div class="card-header">
            <h3 class="card-title">Daily Active Users & Acceptance Rate</h3>
          </div>
          <div class="chart-container chart-container-lg">
            <canvas id="usageTrendChart"></canvas>
          </div>
        </div>

        <!-- Suggestions Chart -->
        <div class="card">
          <div class="card-header">
            <h3 class="card-title">Code Suggestions & Acceptances</h3>
          </div>
          <div class="chart-container chart-container-lg">
            <canvas id="suggestionsChart"></canvas>
          </div>
        </div>
      </div>
    </section>

    <!-- Language & Editor Distribution -->
    <section class="section">
      <div class="grid grid-2">
        <!-- Language Breakdown -->
        <div class="card">
          <div class="card-header">
            <h3 class="card-title">Language Distribution</h3>
          </div>
          <div class="chart-container">
            <canvas id="languageChart"></canvas>
          </div>
        </div>

        <!-- Editor Distribution -->
        <div class="card">
          <div class="card-header">
            <h3 class="card-title">Editor Usage</h3>
          </div>
          <div class="chart-container">
            <canvas id="editorChart"></canvas>
          </div>
        </div>
      </div>
    </section>

    <!-- Language Details Table -->
    <section class="section">
      <div class="card">
        <div class="card-header">
          <h3 class="card-title">Language Performance Details</h3>
        </div>
        <table class="data-table">
          <thead>
            <tr>
              <th>Language</th>
              <th class="number">Users</th>
              <th class="number">Suggestions</th>
              <th class="number">Acceptances</th>
              <th class="number">Acceptance Rate</th>
              <th class="number">Lines Accepted</th>
            </tr>
          </thead>
          <tbody>
            ${languageBreakdown.slice(0, 10).map((lang: LanguageBreakdown, i: number) => `
              <tr>
                <td>
                  <div class="language-name">
                    <span class="language-dot" style="background: ${getLanguageColor(i)}"></span>
                    ${lang.language}
                  </div>
                </td>
                <td class="number">${lang.engagedUsers.toLocaleString()}</td>
                <td class="number">${lang.suggestions.toLocaleString()}</td>
                <td class="number">${lang.acceptances.toLocaleString()}</td>
                <td class="number" style="color: ${lang.acceptanceRate >= 30 ? 'var(--accent-green)' : lang.acceptanceRate >= 20 ? 'var(--accent-orange)' : 'var(--accent-red)'}">
                  ${lang.acceptanceRate}%
                </td>
                <td class="number">${lang.linesAccepted.toLocaleString()}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </section>

    <!-- Chat Activity Chart -->
    <section class="section">
      <div class="card">
        <div class="card-header">
          <h3 class="card-title">Chat Activity Trend</h3>
        </div>
        <div class="chart-container">
          <canvas id="chatChart"></canvas>
        </div>
      </div>
    </section>
  </main>

  <footer class="footer">
    <p>Generated by GitHub Copilot Metrics Report Server • ${new Date(metadata.generatedAt).toLocaleString()}</p>
  </footer>

  <script>
    // Chart.js defaults
    Chart.defaults.color = '#8b949e';
    Chart.defaults.borderColor = '#30363d';
    Chart.defaults.font.family = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";

    const chartColors = {
      blue: '#58a6ff',
      green: '#3fb950',
      orange: '#d29922',
      purple: '#a371f7',
      red: '#f85149',
      pink: '#db61a2',
      cyan: '#39d353',
      gray: '#8b949e'
    };

    const languageColors = [
      '#3178c6', '#3572a5', '#f1e05a', '#178600', '#b07219',
      '#00add8', '#dea584', '#e34c26', '#563d7c', '#4f5d95'
    ];

    // Usage Trend Chart (Active Users + Acceptance Rate)
    new Chart(document.getElementById('usageTrendChart'), {
      type: 'line',
      data: {
        labels: ${dailyLabels},
        datasets: [
          {
            label: 'Active Users',
            data: ${activeUsersData},
            borderColor: chartColors.blue,
            backgroundColor: 'rgba(88, 166, 255, 0.1)',
            fill: true,
            tension: 0.4,
            yAxisID: 'y'
          },
          {
            label: 'Acceptance Rate %',
            data: ${acceptanceRateData},
            borderColor: chartColors.green,
            backgroundColor: 'transparent',
            borderDash: [5, 5],
            tension: 0.4,
            yAxisID: 'y1'
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { intersect: false, mode: 'index' },
        plugins: {
          legend: { position: 'top' }
        },
        scales: {
          y: {
            type: 'linear',
            position: 'left',
            title: { display: true, text: 'Active Users' },
            grid: { color: 'rgba(48, 54, 61, 0.5)' }
          },
          y1: {
            type: 'linear',
            position: 'right',
            title: { display: true, text: 'Acceptance Rate %' },
            min: 0,
            max: 50,
            grid: { display: false }
          },
          x: {
            grid: { color: 'rgba(48, 54, 61, 0.5)' }
          }
        }
      }
    });

    // Suggestions Chart
    new Chart(document.getElementById('suggestionsChart'), {
      type: 'bar',
      data: {
        labels: ${dailyLabels},
        datasets: [
          {
            label: 'Suggestions',
            data: ${suggestionsData},
            backgroundColor: 'rgba(163, 113, 247, 0.7)',
            borderRadius: 4
          },
          {
            label: 'Acceptances',
            data: ${acceptancesData},
            backgroundColor: 'rgba(63, 185, 80, 0.7)',
            borderRadius: 4
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'top' }
        },
        scales: {
          y: {
            grid: { color: 'rgba(48, 54, 61, 0.5)' },
            ticks: {
              callback: function(value) {
                return value >= 1000 ? (value / 1000) + 'k' : value;
              }
            }
          },
          x: {
            grid: { display: false }
          }
        }
      }
    });

    // Language Chart
    new Chart(document.getElementById('languageChart'), {
      type: 'doughnut',
      data: {
        labels: ${languageNames},
        datasets: [{
          data: ${languageSuggestions},
          backgroundColor: languageColors,
          borderWidth: 0,
          hoverOffset: 10
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '60%',
        plugins: {
          legend: {
            position: 'right',
            labels: { boxWidth: 12, padding: 12 }
          }
        }
      }
    });

    // Editor Chart
    new Chart(document.getElementById('editorChart'), {
      type: 'bar',
      data: {
        labels: ${editorNames},
        datasets: [
          {
            label: 'Users',
            data: ${editorUsers},
            backgroundColor: chartColors.blue,
            borderRadius: 4
          },
          {
            label: 'Chat Sessions',
            data: ${editorChatSessions},
            backgroundColor: chartColors.orange,
            borderRadius: 4
          }
        ]
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'top' }
        },
        scales: {
          x: {
            grid: { color: 'rgba(48, 54, 61, 0.5)' },
            ticks: {
              callback: function(value) {
                return value >= 1000 ? (value / 1000) + 'k' : value;
              }
            }
          },
          y: {
            grid: { display: false }
          }
        }
      }
    });

    // Chat Activity Chart
    new Chart(document.getElementById('chatChart'), {
      type: 'line',
      data: {
        labels: ${dailyLabels},
        datasets: [{
          label: 'Chat Sessions',
          data: ${chatSessionsData},
          borderColor: chartColors.orange,
          backgroundColor: 'rgba(210, 153, 34, 0.2)',
          fill: true,
          tension: 0.4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false }
        },
        scales: {
          y: {
            grid: { color: 'rgba(48, 54, 61, 0.5)' },
            ticks: {
              callback: function(value) {
                return value >= 1000 ? (value / 1000) + 'k' : value;
              }
            }
          },
          x: {
            grid: { display: false }
          }
        }
      }
    });
  </script>
</body>
</html>`;
}

function getLanguageColor(index: number): string {
    const colors = [
        '#3178c6', '#3572a5', '#f1e05a', '#178600', '#b07219',
        '#00add8', '#dea584', '#e34c26', '#563d7c', '#4f5d95'
    ];
    return colors[index % colors.length];
}
