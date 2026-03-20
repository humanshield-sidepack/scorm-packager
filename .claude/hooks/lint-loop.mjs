#!/usr/bin/env node
import { readFileSync, writeFileSync, rmSync, existsSync } from "node:fs";
import { execSync } from "node:child_process";
import { createHash } from "node:crypto";
import { tmpdir } from "node:os";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";

const MAX_ATTEMPTS = 10;

const hooksDir = path.dirname(fileURLToPath(import.meta.url));
const { ruleHints, genericHint } = await import(
	pathToFileURL(path.join(hooksDir, "lint-hints.mjs")).href
);

const approve = () => {
	process.stdout.write(JSON.stringify({ decision: "approve" }) + "\n");
	process.exit(0);
};

let raw = "";
try {
	raw = readFileSync(0, "utf8");
} catch {
	approve();
}

const input = JSON.parse(raw);
const filePath = (input?.tool_input?.file_path ?? "").replaceAll("\\", "/");

if (!/\.(js|mjs|cjs|ts|tsx|svelte)$/.test(filePath)) approve();

if (/(node_modules|\.pnpm|\/dist\/|\.svelte-kit)/.test(filePath)) approve();

const pkgMatch = filePath.match(/^(.*?\/(?:packages|apps)\/[^/]+)/);
if (!pkgMatch) approve();

const packageDir = pkgMatch[1];
let packageName = "";
try {
	const pkg = JSON.parse(readFileSync(packageDir + "/package.json", "utf8"));
	packageName = pkg.name ?? "";
} catch {
	approve();
}
if (!packageName) approve();

const hash = createHash("md5").update(filePath).digest("hex");
const counterFile = tmpdir().replaceAll("\\", "/") + `/lint_attempts_${hash}`;
const attempt = existsSync(counterFile)
	? Number(readFileSync(counterFile, "utf8").trim()) + 1
	: 1;
writeFileSync(counterFile, String(attempt));

let lintOutput = "";
let lintFailed = false;
try {
	execSync(`pnpm exec eslint "${filePath.replace(/"/g, '\\"')}"`, {
		cwd: packageDir,
		encoding: "utf8",
		stdio: ["ignore", "pipe", "pipe"],
	});
} catch (error) {
	lintFailed = true;
	lintOutput = (error.stdout ?? "") + (error.stderr ?? "");
}

if (!lintFailed) {
	rmSync(counterFile, { force: true });
	approve();
}

function buildHintsSection(output) {
	const seenRules = new Set();
	for (const line of output.split("\n")) {
		const match = line.match(/\s+(?:error|warning)\s+.+\s+([\w@/-]+)$/);
		if (match) seenRules.add(match[1]);
	}
	if (seenRules.size === 0) return "";
	const lines = ["", "--- Hints ---"];
	for (const rule of seenRules) {
		const hint = ruleHints[rule] ?? genericHint;
		lines.push(`[${rule}] ${hint}`);
	}
	return lines.join("\n");
}

if (attempt >= MAX_ATTEMPTS) {
	rmSync(counterFile, { force: true });
	process.stdout.write(
		JSON.stringify({
			decision: "block",
			reason: `CRITICAL: Linting has failed ${MAX_ATTEMPTS} times on this file. STOP and report the following errors to the user instead of retrying:\n${lintOutput}`,
		}) + "\n",
	);
} else {
	const hints = buildHintsSection(lintOutput);
	process.stdout.write(
		JSON.stringify({
			decision: "block",
			reason: `Linting failed. Fix these errors before continuing:\n${lintOutput}${hints}\nSplit up into smaller tasks and a todo list if more than 5 errors.`,
		}) + "\n",
	);
}
