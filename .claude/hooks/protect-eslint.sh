#!/bin/bash
INPUT=$(cat)
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // ""')
FILENAME=$(basename "$FILE_PATH")

# Match any eslint config file or any file in the eslint-config package
IS_ESLINT_CONFIG=false

# eslint.config.{js,mjs,cjs,ts} at any level
if [[ "$FILENAME" =~ ^eslint\.config\.(js|mjs|cjs|ts)$ ]]; then
  IS_ESLINT_CONFIG=true
fi

# Any file inside packages/eslint-config/
if [[ "$FILE_PATH" =~ packages/eslint-config/ && "$FILENAME" =~ \.(js|mjs|cjs|ts|json)$ ]]; then
  IS_ESLINT_CONFIG=true
fi

if [[ "$IS_ESLINT_CONFIG" == "true" ]]; then
  jq -n '{
    decision: "block",
    reason: "Modifying ESLint config files is forbidden. This includes eslint.config.{js,mjs,cjs,ts} and all files in packages/eslint-config/.\n\nIf you believe a rule makes your task impossible, report this to the user and explain why."
  }'
  exit 0
fi
echo '{"decision": "approve"}'