#!/bin/bash
# Setup script for GitHub Codespaces
# Configures MCP client settings and starts the server

set -e

echo "🧭 Copilot Compass - Codespaces Setup"
echo "======================================"

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
WORKSPACE_VSCODE_DIR="/workspaces/copilot-compass/.vscode"
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

# Start the server in background, then make port public
node dist/server.js &
SERVER_PID=$!

# Wait for server to start and port to be forwarded
sleep 3

# Make port public (only in Codespaces)
if [ -n "$CODESPACE_NAME" ]; then
    echo "🔓 Making port 3001 public..."
    gh codespace ports visibility 3001:public -c "$CODESPACE_NAME" 2>/dev/null && echo "✅ Port 3001 is now public" || echo "⚠️  Could not set port visibility (may need manual setup)"
fi

# Wait for server process
wait $SERVER_PID
