/**
 * Copilot Compass - MCP Server
 *
 * This is the main entry point for the MCP (Model Context Protocol) server.
 * It uses the MCP Apps SDK pattern which consists of:
 *
 * 1. registerAppTool() - Registers tools that AI models can invoke
 *    - Tools include metadata linking them to UI resources via _meta.ui.resourceUri
 *    - When invoked, tool results are sent to both the model AND the connected UI
 *
 * 2. registerAppResource() - Registers UI resources (HTML bundles)
 *    - Serves the single-file React dashboard built by Vite
 *    - Uses ui:// protocol for resource identification
 *
 * Architecture:
 *   MCP Host (Claude, VS Code) -> MCP Server -> GitHub API
 *                                     |
 *                                     v
 *                             React Dashboard (UI resource)
 *
 * Transport: Streamable HTTP (stateless mode) - each request creates new server instance
 */

import "dotenv/config";

// =============================================================================
// MCP Apps SDK Imports
// These provide the core functionality for registering tools and resources
// =============================================================================
import {
    registerAppTool,
    registerAppResource,
    RESOURCE_MIME_TYPE,
} from "@modelcontextprotocol/ext-apps/server";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { createMcpExpressApp } from "@modelcontextprotocol/sdk/server/express.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";

// =============================================================================
// External Dependencies
// =============================================================================
import cors from "cors";
import fs from "node:fs/promises";
import path from "node:path";
import { z } from "zod"; // Schema validation for tool inputs

// =============================================================================
// Internal Modules
// =============================================================================
import { GitHubApiClient } from "./src/github-client.js";
import { ReportGenerator } from "./src/report-generator.js";
import type { ReportRequest } from "./src/types.js";

// =============================================================================
// Configuration
// =============================================================================

/**
 * Resolve the dist directory path.
 * Works both when running from source (tsx server.ts) and compiled (node dist/server.js)
 * - From source: server.ts -> look for ./dist/
 * - From compiled: dist/server.js -> look in same directory
 */
const DIST_DIR = import.meta.filename.endsWith(".ts")
    ? path.join(import.meta.dirname, "dist")
    : import.meta.dirname;

/** Server port - configurable via environment variable */
const PORT = parseInt(
    process.env.MCP_SERVER_PORT ?? process.env.PORT ?? "3001",
    10
);

// =============================================================================
// Schema Definitions
// =============================================================================

/**
 * Zod schema for tool input validation.
 * This schema is used by MCP to:
 * - Validate incoming tool arguments
 * - Generate JSON Schema for tool discovery (shown to AI models)
 * - Provide type safety in the handler
 */
const reportInputSchema = z.object({
    enterpriseSlug: z
        .string()
        .describe("The enterprise slug (e.g., 'my-enterprise')"),
    orgName: z
        .string()
        .optional()
        .describe("Optional organization name within the enterprise"),
    dateRange: z
        .object({
            from: z.string().describe("Start date (YYYY-MM-DD)"),
            to: z.string().describe("End date (YYYY-MM-DD)"),
        })
        .describe("Date range for the report"),
});

type ReportInput = z.infer<typeof reportInputSchema>;

// =============================================================================
// Shared Service Instances
// =============================================================================

/** GitHub API client with built-in caching (5 min TTL) */
const githubClient = new GitHubApiClient();

/** Report generator that aggregates and transforms GitHub metrics */
const reportGenerator = new ReportGenerator(githubClient);

// =============================================================================
// Server Factory
// =============================================================================

/**
 * Creates a new MCP server instance with tools and resources registered.
 *
 * This function is called for EACH incoming request because we use stateless mode.
 * Stateless mode means:
 * - No session persistence between requests
 * - Server instance is created fresh for each request
 * - Suitable for serverless/stateless deployments
 *
 * @returns Configured McpServer instance with tools and resources
 */
export function createServer(): McpServer {
    const server = new McpServer({
        name: "Copilot Compass Server",
        version: "1.0.0",
    });

    /**
     * Resource URI for the UI bundle.
     * This URI is used to:
     * - Link tools to their UI via _meta.ui.resourceUri
     * - Identify the resource when hosts request it
     *
     * Format: ui://{namespace}/{filename}
     */
    const resourceUri = "ui://copilot-metrics/mcp-app.html";

    // ===========================================================================
    // Tool Registration: generate_copilot_report
    // ===========================================================================

    /**
     * Main tool for generating Copilot metrics reports.
     *
     * The _meta.ui.resourceUri links this tool to the dashboard UI.
     * When the tool is invoked:
     * 1. Handler executes and returns JSON report
     * 2. Result is sent to the AI model for summarization
     * 3. Result is ALSO sent to the UI (if connected) via ontoolresult callback
     */
    registerAppTool(
        server,
        "generate_copilot_report",
        {
            title: "Generate Copilot Report",
            description:
                "Generate a comprehensive GitHub Copilot usage report for an enterprise or organization. Returns usage metrics including active users, code completions, chat activity, and displays an interactive dashboard with charts.",
            inputSchema: reportInputSchema.shape,
            _meta: { ui: { resourceUri } },
        },
        async (args) => {
            const input = args as ReportInput;

            console.log(
                `[Tool] Generating report for ${input.enterpriseSlug}${input.orgName ? `/${input.orgName}` : ""}`
            );
            console.log(
                `[Tool] Date range: ${input.dateRange.from} to ${input.dateRange.to}`
            );

            try {
                const reportRequest: ReportRequest = {
                    enterpriseSlug: input.enterpriseSlug,
                    orgName: input.orgName,
                    dateRange: input.dateRange,
                };

                const report = await reportGenerator.generateReport(reportRequest);

                console.log(
                    `[Tool] Generated report with ${report.dailyMetrics.length} days of data`
                );

                // Return the report as JSON - the UI will parse and display it
                return {
                    content: [
                        {
                            type: "text",
                            text: JSON.stringify(report),
                        },
                    ],
                };
            } catch (error) {
                const errorMessage =
                    error instanceof Error ? error.message : "Unknown error";
                console.error(`[Tool Error] ${errorMessage}`);
                return {
                    content: [
                        {
                            type: "text",
                            text: JSON.stringify({ error: errorMessage }),
                        },
                    ],
                    isError: true,
                };
            }
        }
    );

    // ===========================================================================
    // Tool Registration: refresh_report (App-Only)
    // ===========================================================================

    /**
     * Secondary tool for UI-initiated refreshes.
     *
     * Key difference from generate_copilot_report:
     * - visibility: ["app"] means this tool is HIDDEN from AI models
     * - Only the UI can invoke this tool (e.g., via a refresh button)
     * - Useful for UI interactions that shouldn't appear in model's tool list
     */
    registerAppTool(
        server,
        "refresh_report",
        {
            title: "Refresh Report",
            description: "Refresh the Copilot metrics report with new parameters",
            inputSchema: reportInputSchema.shape,
            _meta: {
                ui: {
                    resourceUri,
                    visibility: ["app"], // Hidden from model, only visible to app UI
                },
            },
        },
        async (args) => {
            const input = args as ReportInput;

            try {
                const reportRequest: ReportRequest = {
                    enterpriseSlug: input.enterpriseSlug,
                    orgName: input.orgName,
                    dateRange: input.dateRange,
                };

                const report = await reportGenerator.generateReport(reportRequest);

                return {
                    content: [
                        {
                            type: "text",
                            text: JSON.stringify(report),
                        },
                    ],
                };
            } catch (error) {
                const errorMessage =
                    error instanceof Error ? error.message : "Unknown error";
                return {
                    content: [
                        {
                            type: "text",
                            text: JSON.stringify({ error: errorMessage }),
                        },
                    ],
                    isError: true,
                };
            }
        }
    );

    // ===========================================================================
    // Resource Registration: Dashboard UI
    // ===========================================================================

    /**
     * Registers the interactive dashboard as an MCP resource.
     *
     * When an MCP host requests this resource:
     * 1. Server reads the pre-built mcp-app.html from dist/
     * 2. Returns it with RESOURCE_MIME_TYPE (application/vnd.mcp.app+html)
     * 3. Host renders the HTML in a sandboxed iframe/webview
     *
     * The bundled HTML is a single file containing:
     * - React application code
     * - Chart.js library and components
     * - MCP Apps SDK client code (useApp hook, etc.)
     * - All CSS styles inlined
     */
    registerAppResource(
        server,
        resourceUri, // Resource identifier (ui://copilot-metrics/mcp-app.html)
        resourceUri, // Resource name (same as identifier)
        { mimeType: RESOURCE_MIME_TYPE }, // application/vnd.mcp.app+html
        async () => {
            try {
                const html = await fs.readFile(
                    path.join(DIST_DIR, "mcp-app.html"),
                    "utf-8"
                );
                return {
                    contents: [{ uri: resourceUri, mimeType: RESOURCE_MIME_TYPE, text: html }],
                };
            } catch (error) {
                console.error("[Resource] Failed to read mcp-app.html:", error);
                return {
                    contents: [
                        {
                            uri: resourceUri,
                            mimeType: RESOURCE_MIME_TYPE,
                            text: `
                <!DOCTYPE html>
                <html>
                  <head><title>Copilot Metrics Report</title></head>
                  <body style="font-family: system-ui; padding: 2rem; background: #0d1117; color: #e6edf3;">
                    <h1>UI Not Built</h1>
                    <p>Run <code>npm run build</code> to build the UI.</p>
                  </body>
                </html>
              `,
                        },
                    ],
                };
            }
        }
    );

    return server;
}

// =============================================================================
// HTTP Server Setup
// =============================================================================

/**
 * Starts an MCP server with Streamable HTTP transport in stateless mode.
 *
 * Stateless Mode (sessionIdGenerator: undefined):
 * - Each HTTP request creates a new server instance
 * - No session state is preserved between requests
 * - Ideal for: serverless, load-balanced, or simple deployments
 *
 * Stateful Mode (sessionIdGenerator: () => uuid()):
 * - Sessions persist across requests
 * - Requires session storage management
 * - Ideal for: long-running conversations, complex state
 *
 * @param createServerFn - Factory function that creates configured MCP server
 */
export async function startStreamableHTTPServer(
    createServerFn: () => McpServer
): Promise<void> {
    // Create Express app with MCP middleware
    const app = createMcpExpressApp({ host: "0.0.0.0" });

    // Enable CORS for cross-origin requests (needed for browser-based hosts)
    app.use(cors());

    /**
     * Main MCP endpoint - handles all MCP protocol messages.
     *
     * Supports multiple HTTP methods:
     * - POST: Primary method for tool calls, resource reads
     * - GET: Used for SSE streaming (if enabled)
     * - DELETE: Session termination (in stateful mode)
     */
    app.all("/mcp", async (req, res) => {
        // Create fresh server instance for this request (stateless mode)
        const server = createServerFn();

        // Create transport - undefined sessionIdGenerator = stateless
        const transport = new StreamableHTTPServerTransport({
            sessionIdGenerator: undefined, // Stateless mode
        });

        // Cleanup when connection closes
        res.on("close", () => {
            transport.close().catch(() => {}); // Close transport gracefully
            server.close().catch(() => {}); // Close server instance
        });

        try {
            // Connect server to transport and handle the incoming request
            await server.connect(transport);
            await transport.handleRequest(req, res, req.body);
        } catch (error) {
            console.error("MCP error:", error);
            // Return JSON-RPC error if headers not yet sent
            if (!res.headersSent) {
                res.status(500).json({
                    jsonrpc: "2.0",
                    error: { code: -32603, message: "Internal server error" },
                    id: null,
                });
            }
        }
    });

    /**
     * Health check endpoint for monitoring and load balancers.
     * Returns simple JSON with status and timestamp.
     */
    app.get("/health", (req, res) => {
        res.json({ status: "ok", timestamp: new Date().toISOString() });
    });

    // Start HTTP server
    const httpServer = app.listen(PORT, () => {
        console.log(`
Copilot Compass - MCP Server
-----------------------------
Server running at: http://localhost:${PORT}
MCP endpoint:      http://localhost:${PORT}/mcp
Health check:      http://localhost:${PORT}/health
    `);
    });

    // ==========================================================================
    // Graceful Shutdown
    // ==========================================================================

    /**
     * Handle process termination signals.
     * Ensures clean shutdown of HTTP server before exiting.
     */
    const shutdown = () => {
        console.log("\nShutting down...");
        httpServer.close(() => process.exit(0));
    };

    process.on("SIGINT", shutdown); // Ctrl+C
    process.on("SIGTERM", shutdown); // Docker/K8s termination
}

// =============================================================================
// Application Entry Point
// =============================================================================

async function main() {
    await startStreamableHTTPServer(createServer);
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});
