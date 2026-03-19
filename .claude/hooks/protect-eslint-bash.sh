#!/bin/bash
# Guards against Bash commands that touch ESLint config files
INPUT=$(cat)
COMMAND=$(echo "$INPUT" | jq -r '.tool_input.command // ""')

BLOCK=false

# Detect references to eslint.config.{js,mjs,cjs,ts}
if echo "$COMMAND" | grep -qE 'eslint\.config\.(js|mjs|cjs|ts)'; then
  BLOCK=true
fi

# Detect references to files inside packages/eslint-config/
if echo "$COMMAND" | grep -qE 'packages/eslint-config/'; then
  BLOCK=true
fi

if [[ "$BLOCK" == "true" ]]; then
  jq -n '{
    decision: "block",
    reason: "Running commands that modify ESLint config files is forbidden. This includes eslint.config.{js,mjs,cjs,ts} and all files in packages/eslint-config/.\n\nIf you believe a rule makes your task impossible, report this to the user and explain why."
  }'
  exit 0
fi
echo '{"decision": "approve"}'
