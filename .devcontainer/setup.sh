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

# Copy mcp.json from example if not present (workspace level)
if [ ! -f ".vscode/mcp.json" ]; then
    cp .vscode/mcp.json.example .vscode/mcp.json
    echo "✅ Created .vscode/mcp.json from example"
fi

# Also write to VS Code's machine-level config (where Codespaces actually reads it)
MACHINE_MCP_DIR="/home/codespace/.vscode-remote/data/Machine"
if [ -d "/home/codespace" ]; then
    mkdir -p "$MACHINE_MCP_DIR"
    cat > "$MACHINE_MCP_DIR/mcp.json" << 'MCPEOF'
{
  "servers": {
    "copilot-compass": {
      "type": "http",
      "url": "http://localhost:3001/mcp"
    }
  }
}
MCPEOF
    echo "✅ Created $MACHINE_MCP_DIR/mcp.json"
fi

echo ""
echo "📋 MCP config at: .vscode/mcp.json (uses localhost:3001 via port forwarding)"
echo ""

# Check for GH_TOKEN
if [ -z "$GH_TOKEN" ]; then
    echo "⚠️  GH_TOKEN not set - will use demo data"
    echo "   Set it in Codespaces secrets: https://github.com/settings/codespaces"
else
    echo "✅ GH_TOKEN is configured"
fi

echo ""
echo "🚀 Starting MCP server on http://localhost:3001..."
echo "======================================"

# Make port public (only in Codespaces) - run in background
if [ -n "$CODESPACE_NAME" ]; then
    (sleep 5 && gh codespace ports visibility 3001:public -c "$CODESPACE_NAME" 2>/dev/null) &
fi

# Start the server in background with proper logging
nohup node dist/server.js > /tmp/mcp-server.log 2>&1 &
SERVER_PID=$!
disown $SERVER_PID
echo "✅ MCP server started (PID: $SERVER_PID)"
echo "   Logs: tail -f /tmp/mcp-server.log"

# Wait for server to be ready (up to 30 seconds)
echo "⏳ Waiting for server to be ready..."
for i in {1..30}; do
    if curl -s http://localhost:3001/health > /dev/null 2>&1; then
        echo "✅ Server is ready and responding on port 3001"
        exit 0
    fi
    sleep 1
done

echo "❌ Server failed to start within 30 seconds. Logs:"
cat /tmp/mcp-server.log
exit 1
