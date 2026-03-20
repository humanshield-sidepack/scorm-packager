export const ruleHints = {
	'max-lines':
		'File is too large — refactor by extracting related logic, types, constants, or helpers into new modules. Do NOT delete code or remove blank lines to hit the limit. Blank lines do not count toward the limit and should be used freely for readability.',

	'max-lines-per-function':
		'Function is too long — extract sub-steps into well-named helper functions. Each helper should do one thing. Do NOT inline or compress code.',

	'no-comments/disallowComments':
		'Comments are forbidden — make the code self-documenting instead: rename variables/functions to describe intent, extract complex expressions into named helpers. Only remove the comment after the code is clear without it.',

	'better-max-params/better-max-params':
		'Too many parameters — group related arguments into a single options object (e.g. `options: { foo, bar, baz }`).',

	'no-magic-numbers':
		'Magic numbers must be named constants — extract the value into a `const` with a descriptive name at module or function scope.',

	'security/detect-object-injection':
		'Dynamic property access flagged as potential injection — use `Map` for dynamic key/value storage instead of plain objects, or validate the key against a known-safe set before access.',

	'security/detect-non-literal-fs-filename':
		'`fs` called with a non-literal path — ensure the path comes from a trusted, internal source (not user input). In plugin/build code this is often unavoidable; no change needed if the path is safe.',

	'security/detect-unsafe-regex':
		'Potentially catastrophic regex — simplify by removing nested quantifiers or alternation that could cause exponential backtracking.',

	'unicorn/filename-case':
		'Filename must be `kebab-case` or `PascalCase` — rename the file accordingly and update all imports.',

	'sonarjs/no-commented-code':
		'Commented-out code must be removed — either delete it or restore it as live code.',
};

export const genericHint =
	'Refactor the code to comply with this rule — do not suppress, disable, or work around it. If the fix is unclear, stop and ask the user.';
