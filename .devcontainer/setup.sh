#!/bin/bash
# Setup script for GitHub Codespaces
# Configures MCP client settings and starts the server

echo "🧭 Copilot Compass - Codespaces Setup"
echo "======================================"

# Get the workspace directory (where the repo is cloned)
WORKSPACE_DIR="${CODESPACE_VSCODE_FOLDER:-/workspaces/${GITHUB_REPOSITORY##*/}}"

# Fallback if both env vars are empty
if [ -z "$WORKSPACE_DIR" ] || [ "$WORKSPACE_DIR" = "/workspaces/" ]; then
    WORKSPACE_DIR="/workspaces/copilot-compass"
fi

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

# Function to write MCP config
write_mcp_config() {
    local config_file="$1"
    local config_dir=$(dirname "$config_file")
    
    mkdir -p "$config_dir"
    
    cat > "$config_file" << MCPEOF
{
  "servers": {
    "copilot-compass": {
      "type": "http",
      "url": "$MCP_URL"
    }
  }
}
MCPEOF
    echo "✅ MCP config written to: $config_file"
}

# Write to workspace-level config
WORKSPACE_MCP="$WORKSPACE_DIR/.vscode/mcp.json"
write_mcp_config "$WORKSPACE_MCP"

# Also write to user-level config as fallback
USER_MCP="$HOME/.vscode-remote/data/Machine/mcp.json"
write_mcp_config "$USER_MCP"
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

# Rewrite MCP config after a delay (VS Code may overwrite it)
(sleep 10 && write_mcp_config "$WORKSPACE_MCP" && write_mcp_config "$USER_MCP") &

# Make port public (only in Codespaces)
if [ -n "$CODESPACE_NAME" ]; then
    echo "🔓 Making port 3001 public..."
    (sleep 5 && gh codespace ports visibility 3001:public -c "$CODESPACE_NAME" 2>/dev/null && echo "✅ Port 3001 is now public" || echo "⚠️  Could not set port visibility") &
fi

# Start the server (runs in foreground since this script is backgrounded)
exec node dist/server.js
