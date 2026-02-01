#!/bin/bash
# Setup script for GitHub Codespaces
# Configures MCP client settings and starts the server

echo "🧭 Copilot Compass - Codespaces Setup"
echo "======================================"

# Get the workspace directory (where the repo is cloned)
WORKSPACE_DIR="${CODESPACE_VSCODE_FOLDER:-/workspaces/${GITHUB_REPOSITORY##*/}}"
cd "$WORKSPACE_DIR" || { echo "❌ Could not cd to $WORKSPACE_DIR"; exit 1; }

echo "📂 Working directory: $WORKSPACE_DIR"

# Build if not already built
if [ ! -f "dist/server.js" ]; then
    echo "📦 Building project..."
    npm run build
fi

# Get the Codespaces URL
if [ -n "$CODESPACE_NAME" ]; then
    MCP_URL="https://${CODESPACE_NAME}-3001.app.github.dev/mcp"
    echo "✅ Codespaces detected: $CODESPACE_NAME"
else
    MCP_URL="http://localhost:3001/mcp"
    echo "⚠️  Not running in Codespaces, using localhost"
fi

# Configure VS Code MCP settings (workspace-level for auto-trust)
WORKSPACE_VSCODE_DIR="$WORKSPACE_DIR/.vscode"
MCP_CONFIG_FILE="$WORKSPACE_VSCODE_DIR/mcp.json"

mkdir -p "$WORKSPACE_VSCODE_DIR"

cat > "$MCP_CONFIG_FILE" << EOF
{
  "servers": {
    "copilot-compass": {
      "type": "http",
      "url": "$MCP_URL"
    }
  }
}
EOF

echo "✅ MCP config written to: $MCP_CONFIG_FILE"
echo ""
echo "📋 MCP Server URL: $MCP_URL"
echo ""

# Check for GITHUB_TOKEN
if [ -z "$GITHUB_TOKEN" ]; then
    echo "⚠️  GITHUB_TOKEN not set - will use demo data"
    echo "   Set it in Codespaces secrets: https://github.com/settings/codespaces"
else
    echo "✅ GITHUB_TOKEN is configured"
fi

echo ""
echo "🚀 Starting MCP server..."
echo "   Logs: /tmp/mcp-server.log"
echo "======================================"

# Make port public first (only in Codespaces)
if [ -n "$CODESPACE_NAME" ]; then
    echo "🔓 Making port 3001 public..."
    # Run in background since port isn't forwarded yet
    (sleep 5 && gh codespace ports visibility 3001:public -c "$CODESPACE_NAME" 2>/dev/null && echo "✅ Port 3001 is now public" || echo "⚠️  Could not set port visibility") &
fi

# Start the server (runs in foreground since this script is backgrounded)
exec node dist/server.js
