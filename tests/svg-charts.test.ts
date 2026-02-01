/**
 * SVG Charts Tests
 * Tests for the SVG chart generation functions
 */

import { describe, it, expect } from 'vitest';
import {
  generateBarChart,
  generateLineChart,
  generateDonutChart,
  generateHorizontalBarChart,
  generateSparkline,
} from '../src/svg-charts.js';

describe('generateBarChart', () => {
  const testData = {
    labels: ['TypeScript', 'Python', 'JavaScript'],
    values: [500, 400, 300],
    colors: ['#58a6ff', '#3fb950', '#a371f7'],
    title: 'Language Usage',
  };

  it('should generate valid SVG markup', () => {
    const svg = generateBarChart(testData);

    expect(svg).toContain('<svg');
    expect(svg).toContain('</svg>');
    expect(svg).toContain('xmlns="http://www.w3.org/2000/svg"');
  });

  it('should include title when provided', () => {
    const svg = generateBarChart(testData);
    expect(svg).toContain('Language Usage');
  });

  it('should generate bars for each data point', () => {
    const svg = generateBarChart(testData);

    // Should have rect elements for bars
    const rectMatches = svg.match(/<rect/g);
    expect(rectMatches).not.toBeNull();
    expect(rectMatches!.length).toBeGreaterThanOrEqual(3);
  });

  it('should include x-axis labels', () => {
    const svg = generateBarChart(testData);

    expect(svg).toContain('TypeScript');
    expect(svg).toContain('Python');
    expect(svg).toContain('JavaScript');
  });

  it('should use provided colors', () => {
    const svg = generateBarChart(testData);

    expect(svg).toContain('#58a6ff');
    expect(svg).toContain('#3fb950');
    expect(svg).toContain('#a371f7');
  });

  it('should respect custom dimensions', () => {
    const svg = generateBarChart(testData, 800, 400);

    expect(svg).toContain('viewBox="0 0 800 400"');
  });

  it('should work without title', () => {
    const dataNoTitle = {
      labels: ['A', 'B'],
      values: [100, 200],
    };
    const svg = generateBarChart(dataNoTitle);

    expect(svg).toContain('<svg');
    expect(svg).toContain('</svg>');
  });

  it('should use default colors when not provided', () => {
    const dataNoColors = {
      labels: ['A', 'B'],
      values: [100, 200],
    };
    const svg = generateBarChart(dataNoColors);

    expect(svg).toContain('#58a6ff'); // Default color
  });
});

describe('generateLineChart', () => {
  const testData = {
    labels: ['Jan 1', 'Jan 2', 'Jan 3', 'Jan 4', 'Jan 5'],
    values: [100, 150, 120, 180, 160],
    color: '#3fb950',
    title: 'Active Users',
    showArea: true,
  };

  it('should generate valid SVG markup', () => {
    const svg = generateLineChart(testData);

    expect(svg).toContain('<svg');
    expect(svg).toContain('</svg>');
  });

  it('should include title when provided', () => {
    const svg = generateLineChart(testData);
    expect(svg).toContain('Active Users');
  });

  it('should draw polyline for data', () => {
    const svg = generateLineChart(testData);
    expect(svg).toContain('<polyline');
    expect(svg).toContain('points=');
  });

  it('should include area fill when showArea is true', () => {
    const svg = generateLineChart(testData);
    expect(svg).toContain('fill-opacity="0.15"');
  });

  it('should not include area fill when showArea is false', () => {
    const dataNoArea = { ...testData, showArea: false };
    const svg = generateLineChart(dataNoArea);

    // Should not have the area path with fill-opacity
    expect(svg).not.toContain('fill-opacity="0.15"');
  });

  it('should include data point circles', () => {
    const svg = generateLineChart(testData);

    const circleMatches = svg.match(/<circle/g);
    expect(circleMatches).not.toBeNull();
    expect(circleMatches!.length).toBe(5);
  });

  it('should use specified color', () => {
    const svg = generateLineChart(testData);
    expect(svg).toContain('#3fb950');
  });

  it('should show some x-axis labels', () => {
    const svg = generateLineChart(testData);

    // Should include at least first and last labels
    expect(svg).toContain('Jan 1');
    expect(svg).toContain('Jan 5');
  });
});

describe('generateDonutChart', () => {
  const testData = {
    labels: ['VS Code', 'Visual Studio', 'JetBrains'],
    values: [600, 200, 150],
    colors: ['#58a6ff', '#3fb950', '#a371f7'],
    title: 'Editor Distribution',
  };

  it('should generate valid SVG markup', () => {
    const svg = generateDonutChart(testData);

    expect(svg).toContain('<svg');
    expect(svg).toContain('</svg>');
  });

  it('should include title when provided', () => {
    const svg = generateDonutChart(testData);
    expect(svg).toContain('Editor Distribution');
  });

  it('should draw path segments for each slice', () => {
    const svg = generateDonutChart(testData);

    const pathMatches = svg.match(/<path/g);
    expect(pathMatches).not.toBeNull();
    expect(pathMatches!.length).toBe(3);
  });

  it('should show total in center', () => {
    const svg = generateDonutChart(testData);

    // Total is 950, but it gets formatted - should show something
    expect(svg).toContain('Total');
  });

  it('should use provided colors', () => {
    const svg = generateDonutChart(testData);

    expect(svg).toContain('#58a6ff');
    expect(svg).toContain('#3fb950');
    expect(svg).toContain('#a371f7');
  });

  it('should handle single value', () => {
    const singleData = {
      labels: ['Only One'],
      values: [100],
    };
    const svg = generateDonutChart(singleData);

    expect(svg).toContain('<svg');
    expect(svg).toContain('</svg>');
    expect(svg).toContain('<path');
  });
});

describe('generateHorizontalBarChart', () => {
  const testData = {
    labels: ['TypeScript', 'Python', 'JavaScript', 'Go', 'Rust'],
    values: [1000, 800, 600, 300, 200],
    title: 'Top Languages',
  };

  it('should generate valid SVG markup', () => {
    const svg = generateHorizontalBarChart(testData);

    expect(svg).toContain('<svg');
    expect(svg).toContain('</svg>');
  });

  it('should include title when provided', () => {
    const svg = generateHorizontalBarChart(testData);
    expect(svg).toContain('Top Languages');
  });

  it('should include labels on the left', () => {
    const svg = generateHorizontalBarChart(testData);

    expect(svg).toContain('TypeScript');
    expect(svg).toContain('Python');
    expect(svg).toContain('JavaScript');
  });

  it('should display values after bars', () => {
    const svg = generateHorizontalBarChart(testData);

    // Values should be formatted (1K for 1000, etc.)
    expect(svg).toContain('1K');
    expect(svg).toContain('800');
    expect(svg).toContain('600');
  });

  it('should generate correct number of bars', () => {
    const svg = generateHorizontalBarChart(testData);

    // Each bar has a background and fill rect
    const rectMatches = svg.match(/<rect/g);
    expect(rectMatches).not.toBeNull();
    expect(rectMatches!.length).toBe(10); // 5 backgrounds + 5 fills
  });
});

describe('generateSparkline', () => {
  const testValues = [10, 15, 12, 18, 14, 20, 16];

  it('should generate valid SVG markup', () => {
    const svg = generateSparkline(testValues);

    expect(svg).toContain('<svg');
    expect(svg).toContain('</svg>');
  });

  it('should draw polyline for data', () => {
    const svg = generateSparkline(testValues);

    expect(svg).toContain('<polyline');
    expect(svg).toContain('points=');
  });

  it('should use specified color', () => {
    const svg = generateSparkline(testValues, 120, 30, '#f85149');
    expect(svg).toContain('#f85149');
  });

  it('should use default color when not specified', () => {
    const svg = generateSparkline(testValues);
    expect(svg).toContain('#58a6ff');
  });

  it('should respect custom dimensions', () => {
    const svg = generateSparkline(testValues, 200, 50);
    expect(svg).toContain('viewBox="0 0 200 50"');
  });

  it('should handle flat data (all same values)', () => {
    const flatValues = [10, 10, 10, 10];
    const svg = generateSparkline(flatValues);

    expect(svg).toContain('<svg');
    expect(svg).toContain('</svg>');
    expect(svg).toContain('<polyline');
  });

  it('should handle single data point', () => {
    const singleValue = [50];
    const svg = generateSparkline(singleValue);

    expect(svg).toContain('<svg');
  });
});

describe('number formatting', () => {
  it('should format large numbers with K suffix', () => {
    const data = {
      labels: ['A'],
      values: [5000],
    };
    const svg = generateBarChart(data);
    expect(svg).toContain('5K');
  });

  it('should format very large numbers with M suffix', () => {
    const data = {
      labels: ['A'],
      values: [2500000],
    };
    const svg = generateBarChart(data);
    expect(svg).toContain('M');
  });

  it('should show raw numbers for small values', () => {
    const data = {
      labels: ['A'],
      values: [500],
    };
    const svg = generateHorizontalBarChart(data);
    expect(svg).toContain('500');
  });
});

describe('SVG styling', () => {
  it('should include GitHub dark theme background', () => {
    const svg = generateBarChart({
      labels: ['A'],
      values: [100],
    });
    expect(svg).toContain('background:#0d1117');
  });

  it('should include rounded corners', () => {
    const svg = generateDonutChart({
      labels: ['A'],
      values: [100],
    });
    expect(svg).toContain('border-radius:8px');
  });

  it('should use consistent font family', () => {
    const svg = generateLineChart({
      labels: ['A', 'B'],
      values: [100, 200],
      title: 'Test',
    });
    expect(svg).toContain('font-family="system-ui"');
  });
});
