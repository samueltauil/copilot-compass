/**
 * SVG Chart Generator - Creates inline SVG charts for markdown rendering
 */

// Chart data interfaces
interface BarChartData {
    labels: string[];
    values: number[];
    colors?: string[];
    title?: string;
}

interface LineChartData {
    labels: string[];
    values: number[];
    color?: string;
    title?: string;
    showArea?: boolean;
}

interface DonutChartData {
    labels: string[];
    values: number[];
    colors?: string[];
    title?: string;
}

const DEFAULT_COLORS = [
    '#58a6ff', '#3fb950', '#a371f7', '#d29922', '#f85149',
    '#db61a2', '#39d353', '#8b949e', '#6e7681', '#388bfd'
];

/**
 * Generate an inline SVG bar chart
 */
export function generateBarChart(
    data: BarChartData,
    width = 600,
    height = 200
): string {
    const { labels, values, colors = DEFAULT_COLORS, title } = data;
    const maxValue = Math.max(...values);
    const padding = { top: title ? 40 : 20, right: 20, bottom: 40, left: 60 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;
    const barWidth = (chartWidth / labels.length) * 0.7;
    const barGap = (chartWidth / labels.length) * 0.3;

    let svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" style="background:#0d1117;border-radius:8px;">`;

    // Title
    if (title) {
        svg += `<text x="${width / 2}" y="24" text-anchor="middle" fill="#e6edf3" font-family="system-ui" font-size="14" font-weight="600">${title}</text>`;
    }

    // Y-axis labels
    for (let i = 0; i <= 4; i++) {
        const y = padding.top + (chartHeight * i / 4);
        const value = Math.round(maxValue * (4 - i) / 4);
        svg += `<text x="${padding.left - 8}" y="${y + 4}" text-anchor="end" fill="#8b949e" font-family="system-ui" font-size="10">${formatNumber(value)}</text>`;
        svg += `<line x1="${padding.left}" y1="${y}" x2="${width - padding.right}" y2="${y}" stroke="#30363d" stroke-dasharray="2,2"/>`;
    }

    // Bars
    values.forEach((value, i) => {
        const barHeight = (value / maxValue) * chartHeight;
        const x = padding.left + (i * (barWidth + barGap)) + barGap / 2;
        const y = padding.top + chartHeight - barHeight;
        const color = colors[i % colors.length];

        svg += `<rect x="${x}" y="${y}" width="${barWidth}" height="${barHeight}" fill="${color}" rx="4"/>`;

        // X-axis label
        svg += `<text x="${x + barWidth / 2}" y="${height - 8}" text-anchor="middle" fill="#8b949e" font-family="system-ui" font-size="9">${labels[i]}</text>`;
    });

    svg += '</svg>';
    return svg;
}

/**
 * Generate an inline SVG line/area chart
 */
export function generateLineChart(
    data: LineChartData,
    width = 600,
    height = 180
): string {
    const { labels, values, color = '#58a6ff', title, showArea = true } = data;
    const maxValue = Math.max(...values) * 1.1;
    const minValue = Math.min(...values) * 0.9;
    const range = maxValue - minValue;
    const padding = { top: title ? 40 : 20, right: 20, bottom: 35, left: 50 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    let svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" style="background:#0d1117;border-radius:8px;">`;

    // Title
    if (title) {
        svg += `<text x="${width / 2}" y="24" text-anchor="middle" fill="#e6edf3" font-family="system-ui" font-size="14" font-weight="600">${title}</text>`;
    }

    // Grid lines
    for (let i = 0; i <= 4; i++) {
        const y = padding.top + (chartHeight * i / 4);
        const value = Math.round(maxValue - (range * i / 4));
        svg += `<text x="${padding.left - 8}" y="${y + 4}" text-anchor="end" fill="#8b949e" font-family="system-ui" font-size="9">${formatNumber(value)}</text>`;
        svg += `<line x1="${padding.left}" y1="${y}" x2="${width - padding.right}" y2="${y}" stroke="#30363d" stroke-dasharray="2,2"/>`;
    }

    // Build path
    const points: string[] = [];
    const stepX = chartWidth / (values.length - 1);

    values.forEach((value, i) => {
        const x = padding.left + (i * stepX);
        const y = padding.top + chartHeight - ((value - minValue) / range * chartHeight);
        points.push(`${x},${y}`);
    });

    // Area fill
    if (showArea) {
        const areaPath = `M${padding.left},${padding.top + chartHeight} L${points.join(' L')} L${padding.left + chartWidth},${padding.top + chartHeight} Z`;
        svg += `<path d="${areaPath}" fill="${color}" fill-opacity="0.15"/>`;
    }

    // Line
    svg += `<polyline points="${points.join(' ')}" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>`;

    // Data points
    values.forEach((value, i) => {
        const x = padding.left + (i * stepX);
        const y = padding.top + chartHeight - ((value - minValue) / range * chartHeight);
        svg += `<circle cx="${x}" cy="${y}" r="3" fill="${color}"/>`;
    });

    // X-axis labels (show every few)
    const labelStep = Math.ceil(labels.length / 7);
    labels.forEach((label, i) => {
        if (i % labelStep === 0 || i === labels.length - 1) {
            const x = padding.left + (i * stepX);
            svg += `<text x="${x}" y="${height - 8}" text-anchor="middle" fill="#8b949e" font-family="system-ui" font-size="9">${label}</text>`;
        }
    });

    svg += '</svg>';
    return svg;
}

/**
 * Generate an inline SVG donut chart
 */
export function generateDonutChart(
    data: DonutChartData,
    width = 300,
    height = 200
): string {
    const { labels, values, colors = DEFAULT_COLORS, title } = data;
    const total = values.reduce((sum, v) => sum + v, 0);
    const cx = width / 2;
    const cy = (height / 2) + (title ? 10 : 0);
    const outerRadius = Math.min(width, height) / 2 - 40;
    const innerRadius = outerRadius * 0.6;

    let svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" style="background:#0d1117;border-radius:8px;">`;

    // Title
    if (title) {
        svg += `<text x="${width / 2}" y="20" text-anchor="middle" fill="#e6edf3" font-family="system-ui" font-size="14" font-weight="600">${title}</text>`;
    }

    let currentAngle = -90; // Start from top

    values.forEach((value, i) => {
        const percentage = value / total;
        const angle = percentage * 360;
        const startAngle = currentAngle;
        const endAngle = currentAngle + angle;

        const startOuter = polarToCartesian(cx, cy, outerRadius, startAngle);
        const endOuter = polarToCartesian(cx, cy, outerRadius, endAngle);
        const startInner = polarToCartesian(cx, cy, innerRadius, endAngle);
        const endInner = polarToCartesian(cx, cy, innerRadius, startAngle);

        const largeArc = angle > 180 ? 1 : 0;

        const path = [
            `M ${startOuter.x} ${startOuter.y}`,
            `A ${outerRadius} ${outerRadius} 0 ${largeArc} 1 ${endOuter.x} ${endOuter.y}`,
            `L ${startInner.x} ${startInner.y}`,
            `A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${endInner.x} ${endInner.y}`,
            'Z'
        ].join(' ');

        svg += `<path d="${path}" fill="${colors[i % colors.length]}"/>`;

        currentAngle = endAngle;
    });

    // Center text
    svg += `<text x="${cx}" y="${cy - 5}" text-anchor="middle" fill="#e6edf3" font-family="system-ui" font-size="20" font-weight="700">${formatNumber(total)}</text>`;
    svg += `<text x="${cx}" y="${cy + 12}" text-anchor="middle" fill="#8b949e" font-family="system-ui" font-size="10">Total</text>`;

    svg += '</svg>';
    return svg;
}

/**
 * Generate horizontal bar chart (for language/editor breakdown)
 */
export function generateHorizontalBarChart(
    data: BarChartData,
    width = 500,
    height = 200
): string {
    const { labels, values, colors = DEFAULT_COLORS, title } = data;
    const maxValue = Math.max(...values);
    const padding = { top: title ? 35 : 15, right: 60, bottom: 10, left: 90 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;
    const barHeight = Math.min(25, (chartHeight / labels.length) * 0.7);
    const barGap = (chartHeight / labels.length) - barHeight;

    let svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" style="background:#0d1117;border-radius:8px;">`;

    if (title) {
        svg += `<text x="${width / 2}" y="22" text-anchor="middle" fill="#e6edf3" font-family="system-ui" font-size="13" font-weight="600">${title}</text>`;
    }

    labels.forEach((label, i) => {
        const barW = (values[i] / maxValue) * chartWidth;
        const y = padding.top + (i * (barHeight + barGap));
        const color = colors[i % colors.length];

        // Label
        svg += `<text x="${padding.left - 8}" y="${y + barHeight / 2 + 4}" text-anchor="end" fill="#e6edf3" font-family="system-ui" font-size="11">${label}</text>`;

        // Bar background
        svg += `<rect x="${padding.left}" y="${y}" width="${chartWidth}" height="${barHeight}" fill="#21262d" rx="4"/>`;

        // Bar fill
        svg += `<rect x="${padding.left}" y="${y}" width="${barW}" height="${barHeight}" fill="${color}" rx="4"/>`;

        // Value
        svg += `<text x="${padding.left + barW + 8}" y="${y + barHeight / 2 + 4}" fill="#8b949e" font-family="system-ui" font-size="10">${formatNumber(values[i])}</text>`;
    });

    svg += '</svg>';
    return svg;
}

/**
 * Generate a mini sparkline
 */
export function generateSparkline(
    values: number[],
    width = 120,
    height = 30,
    color = '#58a6ff'
): string {
    const maxValue = Math.max(...values);
    const minValue = Math.min(...values);
    const range = maxValue - minValue || 1;
    const padding = 4;
    const chartWidth = width - padding * 2;
    const chartHeight = height - padding * 2;
    const stepX = chartWidth / (values.length - 1);

    const points = values.map((v, i) => {
        const x = padding + (i * stepX);
        const y = padding + chartHeight - ((v - minValue) / range * chartHeight);
        return `${x},${y}`;
    }).join(' ');

    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" style="display:inline-block;vertical-align:middle;">
    <polyline points="${points}" fill="none" stroke="${color}" stroke-width="1.5" stroke-linecap="round"/>
  </svg>`;
}

// Helper functions
function polarToCartesian(
    cx: number,
    cy: number,
    radius: number,
    angle: number
): { x: number; y: number } {
    const rad = (angle * Math.PI) / 180;
    return {
        x: cx + radius * Math.cos(rad),
        y: cy + radius * Math.sin(rad)
    };
}

function formatNumber(num: number): string {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(0) + 'K';
    return num.toString();
}
