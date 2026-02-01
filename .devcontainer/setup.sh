#!/bin/bash
# Setup script for GitHub Codespaces
# Starts the MCP server

echo "🧭 Copilot Compass - Codespaces Setup"
echo "======================================"

# Get the workspace directory
WORKSPACE_DIR="${CODESPACE_VSCODE_FOLDER:-/workspaces/copilot-compass}"
cd "$WORKSPACE_DIR" || { echo "❌ Could not cd to $WORKSPACE_DIR"; exit 1; }

echo "📂 Working directory: $WORKSPACE_DIR"

# Build if not already built
if [ ! -f "dist/server.js" ]; then
    echo "📦 Building project..."
    npm run build
fi

echo ""
echo "📋 MCP config at: .vscode/mcp.json (uses localhost:3001 via port forwarding)"
echo ""

# Check for GITHUB_TOKEN
if [ -z "$GITHUB_TOKEN" ]; then
    echo "⚠️  GITHUB_TOKEN not set - will use demo data"
    echo "   Set it in Codespaces secrets: https://github.com/settings/codespaces"
else
    echo "✅ GITHUB_TOKEN is configured"
fi

echo ""
echo "🚀 Starting MCP server on http://localhost:3001..."
echo "   Logs: /tmp/mcp-server.log"
echo "======================================"

# Make port public (only in Codespaces) - run in background
if [ -n "$CODESPACE_NAME" ]; then
    (sleep 5 && gh codespace ports visibility 3001:public -c "$CODESPACE_NAME" 2>/dev/null) &
fi

# Start the server
exec node dist/server.js
