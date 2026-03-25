#!/bin/bash
# Vantage Portal — CCEM APM Post-Tool-Use Hook
# Reports tool completion to APM heartbeat at localhost:3032

AGENT_ID="${CLAUDE_AGENT_ID:-session-unknown}"
TOOL_NAME="${CLAUDE_TOOL_NAME:-unknown}"
TOOL_STATUS="${CLAUDE_TOOL_STATUS:-completed}"

curl -s -X POST http://localhost:3032/api/heartbeat \
  -H "Content-Type: application/json" \
  -d "{
    \"agent_id\": \"$AGENT_ID\",
    \"status\": \"$TOOL_STATUS\",
    \"message\": \"Tool done: $TOOL_NAME\",
    \"context\": {\"project\": \"vantage-portal\", \"cwd\": \"/Users/jeremiah/Developer/vantage-portal\"}
  }" >/dev/null 2>&1 &
