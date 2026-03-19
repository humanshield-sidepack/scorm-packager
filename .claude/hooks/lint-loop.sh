#!/bin/bash
INPUT=$(cat)
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // ""')

# Only lint JS/TS/Svelte source files
if [[ ! "$FILE_PATH" =~ \.(js|mjs|cjs|ts|tsx|svelte)$ ]]; then
  echo '{"decision": "approve"}'
  exit 0
fi

# Skip generated/vendor paths
if echo "$FILE_PATH" | grep -qE '(node_modules|\.pnpm|/dist/|\.svelte-kit)'; then
  echo '{"decision": "approve"}'
  exit 0
fi

# Attempt counter persisted via temp file (hash of path)
HASH=$(echo -n "$FILE_PATH" | md5sum | cut -d' ' -f1)
COUNTER_FILE="/tmp/lint_attempts_$HASH"
ATTEMPT=$(cat "$COUNTER_FILE" 2>/dev/null || echo 0)
ATTEMPT=$((ATTEMPT + 1))
echo "$ATTEMPT" > "$COUNTER_FILE"

# Resolve project root (directory containing pnpm-workspace.yaml)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

# Run lint
LINT_OUTPUT=$(cd "$PROJECT_ROOT" && pnpm eslint --max-warnings=0 "$FILE_PATH" 2>&1)
LINT_EXIT_CODE=$?

if [ $LINT_EXIT_CODE -eq 0 ]; then
  rm -f "$COUNTER_FILE"
  echo '{"decision": "approve"}'
  exit 0
fi

if [ "$ATTEMPT" -ge 3 ]; then
  rm -f "$COUNTER_FILE"
  jq -n --arg out "$LINT_OUTPUT" '{
    decision: "block",
    reason: "CRITICAL: Linting has failed 3 times on this file. STOP and report the following errors to the user instead of retrying:\n\($out)"
  }'
else
  jq -n --arg out "$LINT_OUTPUT" '{
    decision: "block",
    reason: "Linting failed. Fix these errors before continuing:\n\($out)"
  }'
fi
