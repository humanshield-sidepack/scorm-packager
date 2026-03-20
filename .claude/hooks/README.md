# Claude Code Hooks

These hooks run automatically during Claude Code sessions to enforce code quality and protect project configuration. They are registered in [`.claude/settings.local.json`](../settings.local.json).

---

## Hooks overview

| File | Trigger | Purpose |
| --- | --- | --- |
| `lint-loop.mjs` | `PostToolUse` → `Edit\|Write` | Runs ESLint after every file edit and blocks Claude if errors are found |
| `lint-hints.mjs` | *(imported by lint-loop)* | Maps ESLint rule names to actionable fix guidance |
| `protect-eslint.mjs` | `PreToolUse` → `Edit\|Write` | Blocks Claude from writing to ESLint config files |
| `protect-eslint-bash.mjs` | `PreToolUse` → `Bash` | Blocks Claude from running shell commands that target ESLint config files |

---

## Hook details

### `lint-loop.mjs`

Runs after every `Edit` or `Write` tool call on a JS/TS/Svelte source file.

**What it does:**

1. Skips non-source files (generated paths, `node_modules`, `dist`, `.svelte-kit`)
2. Detects which monorepo package the edited file belongs to
3. Runs `pnpm exec eslint <file>` from that package's directory
4. On **success** — approves silently and resets the attempt counter
5. On **failure** — blocks Claude with the raw ESLint output plus a `--- Hints ---` section explaining how to correctly fix each rule violation
6. After **3 consecutive failures** on the same file — escalates with a `CRITICAL` message telling Claude to stop retrying and report to the user

The attempt counter is stored in a temp file keyed by a hash of the file path, so it resets automatically when linting passes.

---

### `lint-hints.mjs`

A pure data module — no logic, just a map of ESLint rule names to hint strings.

**To add a hint for a new rule:**

```js
// In lint-hints.mjs, add an entry to ruleHints:
'your-plugin/rule-name': 'Explain what the rule enforces and how to fix it correctly — not how to work around it.',
```

The key is the exact rule name as it appears in ESLint output (e.g. `max-lines`, `security/detect-object-injection`).

If a rule has no entry, the `genericHint` is used as a fallback:
> "Refactor the code to comply with this rule — do not suppress, disable, or work around it. If the fix is unclear, stop and ask the user."

**Currently covered rules:**

| Rule | Guidance summary |
| --- | --- |
| `max-lines` | Extract into modules — blank lines don't count, use them freely for readability |
| `max-lines-per-function` | Extract helper functions — don't compress or inline |
| `no-comments/disallowComments` | Make code self-documenting — rename, extract, clarify |
| `better-max-params/better-max-params` | Use an options object |
| `no-magic-numbers` | Extract named constants |
| `security/detect-object-injection` | Use `Map` or validate keys |
| `security/detect-non-literal-fs-filename` | Ensure path is from a trusted source |
| `security/detect-unsafe-regex` | Simplify the regex |
| `unicorn/filename-case` | Rename file to `kebab-case` or `PascalCase` |
| `sonarjs/no-commented-code` | Delete or restore as live code |

---

### `protect-eslint.mjs`

Runs before every `Edit` or `Write` tool call.

Blocks any write to:
- `eslint.config.{js,mjs,cjs,ts}` in any directory
- Any file inside `packages/eslint-config/`

This prevents Claude from suppressing lint errors by weakening the rules instead of fixing the code. If a rule genuinely makes a task impossible, Claude is instructed to report that to the user.

---

### `protect-eslint-bash.mjs`

Same protection as `protect-eslint.mjs`, but for `Bash` tool calls. Blocks any shell command whose text matches an ESLint config file path (e.g. `sed` or `echo` redirected at `eslint.config.js`).

---

## Registration

Hooks are registered in `.claude/settings.local.json`:

```json
{
  "hooks": {
    "PostToolUse": [
      { "matcher": "Edit|Write", "hooks": [{ "type": "command", "command": "node .claude/hooks/lint-loop.mjs" }] }
    ],
    "PreToolUse": [
      { "matcher": "Edit|Write", "hooks": [{ "type": "command", "command": "node .claude/hooks/protect-eslint.mjs" }] },
      { "matcher": "Bash",       "hooks": [{ "type": "command", "command": "node .claude/hooks/protect-eslint-bash.mjs" }] }
    ]
  }
}
```

To add a new hook, add an entry under the appropriate lifecycle key (`PreToolUse` or `PostToolUse`) with a `matcher` (tool name pattern) and a `command`.

---

## Design principles

- **Hooks never modify files** — they only approve or block Claude's actions.
- **Hints explain intent, not workarounds** — every hint tells Claude *why* a rule exists and guides toward the correct fix (refactor, rename, extract) rather than suppression.
- **ESLint config is immutable to Claude** — rule changes must be made by a human. If a rule is wrong, that's a conversation, not a code edit.
