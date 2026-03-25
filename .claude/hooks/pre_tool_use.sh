#!/bin/bash
# Vantage Portal — CCEM APM Pre-Tool-Use Hook
# Reports tool invocation to APM heartbeat at localhost:3032

AGENT_ID="${CLAUDE_AGENT_ID:-session-unknown}"
TOOL_NAME="${CLAUDE_TOOL_NAME:-unknown}"

curl -s -X POST http://localhost:3032/api/heartbeat \
  -H "Content-Type: application/json" \
  -d "{
    \"agent_id\": \"$AGENT_ID\",
    \"status\": \"working\",
    \"message\": \"Tool: $TOOL_NAME\",
    \"context\": {\"project\": \"vantage-portal\", \"cwd\": \"/Users/jeremiah/Developer/vantage-portal\"}
  }" >/dev/null 2>&1 &
