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

# Configure VS Code MCP settings
MCP_CONFIG_DIR="$HOME/.vscode-server/data/User"
MCP_CONFIG_FILE="$MCP_CONFIG_DIR/mcp.json"

mkdir -p "$MCP_CONFIG_DIR"

cat > "$MCP_CONFIG_FILE" << EOF
{
  "mcpServers": {
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

# Start the server (runs in foreground, use nohup in devcontainer.json to background it)
node dist/server.js
