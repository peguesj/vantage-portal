#!/bin/bash
# Vantage Portal - Session End Hook
PROJECT_ROOT="/Users/jeremiah/Developer/vantage-portal"
APM_URL="http://localhost:3032"
CONFIG_FILE="$PROJECT_ROOT/apm/apm_config.json"

SESSION_ID=""
if [ -f "$CONFIG_FILE" ]; then
  SESSION_ID=$(python3 -c "import json; d=json.load(open('$CONFIG_FILE')); print(d.get('session_id',''))" 2>/dev/null || echo "")
fi

if [ -n "$SESSION_ID" ]; then
  curl -s -X POST "$APM_URL/api/notify" \
    -H "Content-Type: application/json" \
    -d "{\"agent_id\":\"$SESSION_ID\",\"status\":\"stopped\",\"message\":\"Session ended — vantage-portal\",\"context\":{\"project\":\"vantage-portal\"}}" \
    2>/dev/null || true
fi

echo "[vantage-portal] Session ended. Remember to /plane-pm align if issues were worked on."
exit 0
