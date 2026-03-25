#!/bin/bash
# Vantage Portal — CCEM APM Session Init Hook
# Registers this session with CCEM APM at localhost:3032 and refreshes apm_config.json

PROJECT_ROOT="/Users/jeremiah/Developer/vantage-portal"
APM_URL="http://localhost:3032"
SESSION_ID="${CLAUDE_SESSION_ID:-$(python3 -c "import uuid; print(uuid.uuid4())" 2>/dev/null || uuidgen | tr '[:upper:]' '[:lower:]')}"
PROJECT_NAME="vantage-portal"

# Capture live git context
GIT_BRANCH=$(git -C "$PROJECT_ROOT" rev-parse --abbrev-ref HEAD 2>/dev/null || echo "unknown")
GIT_COMMIT=$(git -C "$PROJECT_ROOT" rev-parse --short HEAD 2>/dev/null || echo "unknown")

# Merge with existing config — preserve sprint/gate fields, update session/git fields
python3 - <<PYEOF
import json, datetime, os

config_path = "$PROJECT_ROOT/apm/apm_config.json"

# Load existing config to preserve sprint-level fields
existing = {}
try:
    with open(config_path) as f:
        existing = json.load(f)
except Exception:
    pass

# Fields written fresh every session (identity + live git state)
fresh = {
    "session_id": "$SESSION_ID",
    "created_at": datetime.datetime.utcnow().isoformat() + "Z",
    "project_name": "$PROJECT_NAME",
    "project_root": "$PROJECT_ROOT",
    "apm_port": 3032,
    "apm_url": "$APM_URL",
    "skills_path": "~/.claude/skills",
    "current_branch": "$GIT_BRANCH",
    "last_commit": "$GIT_COMMIT",
}

# Merge: existing fields survive unless overridden by fresh
merged = {**existing, **fresh}

with open(config_path, "w") as f:
    json.dump(merged, f, indent=2)
PYEOF

# Register with APM (non-blocking, failure is non-fatal)
curl -s -X POST "$APM_URL/api/register" \
  -H "Content-Type: application/json" \
  -d "{
    \"agent_id\": \"session-$SESSION_ID\",
    \"project\": \"$PROJECT_NAME\",
    \"project_root\": \"$PROJECT_ROOT\",
    \"role\": \"session\",
    \"status\": \"active\",
    \"session_id\": \"$SESSION_ID\",
    \"branch\": \"$GIT_BRANCH\",
    \"commit\": \"$GIT_COMMIT\"
  }" >/dev/null 2>&1 &

echo "Vantage Portal session initialized: $SESSION_ID"
