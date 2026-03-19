import type { ESLint, Rule, AST } from "eslint";

type CommentOptions = {
  allow?: string[];
  allowJSDoc?: boolean;
  allowTODO?: boolean;
  allowFIXME?: boolean;
  allowSvelteHTMLComments?: boolean;
};

function isCommentForbidden(
  value: string,
  options: CommentOptions,
  isBlock: boolean,
): boolean {
  const allowJSDoc = options.allowJSDoc ?? true;
  const allowTODO = options.allowTODO ?? true;
  const allowFIXME = options.allowFIXME ?? true;

  if (allowJSDoc && isBlock && value.startsWith("*")) return false;
  if (allowTODO && /^\s*TODO[\s:]/i.test(value)) return false;
  if (allowFIXME && /^\s*FIXME[\s:]/i.test(value)) return false;

  const allow = options.allow ?? [];
  let re = /^\s?(global|eslint)/;
  if (allow.length > 0) {
    re = new RegExp(`^\\s?(${allow.join("|")})`);
  }
  return !re.test(value);
}

const disallowComments: Rule.RuleModule = {
  meta: {
    type: "problem",
    docs: {
      description:
        "Comments are not allowed in this project as they can cause unnecessary noise or leak into production code. Check configuration to see the exceptions from this rule.",
    },
    fixable: "code",
    schema: [
      {
        type: "object",
        properties: {
          allow: {
            type: "array",
            items: { type: "string" },
          },
          allowJSDoc: { type: "boolean" },
          allowTODO: { type: "boolean" },
          allowFIXME: { type: "boolean" },
          allowSvelteHTMLComments: { type: "boolean" },
        },
        additionalProperties: false,
      },
    ],
  },
  create(context) {
    const sourceCode = context.sourceCode;
    const options = (context.options[0] as CommentOptions | undefined) ?? {};

    function processJSComment(comment: AST.Token): void {
      const isBlock = (comment.type as string) === "Block";
      if (!isCommentForbidden(comment.value, options, isBlock)) return;
      context.report({
        fix: (fixer) => fixer.remove(comment),
        loc: comment.loc ?? { line: 0, column: 0 },
        message: "Comments are forbidden",
      });
    }

    function processSvelteHTMLComment(node: Rule.Node): void {
      if (options.allowSvelteHTMLComments ?? true) return;
      const value = (node as unknown as { value: string }).value;
      if (!isCommentForbidden(value, options, false)) return;
      context.report({
        fix: (fixer) => fixer.remove(node),
        node,
        message: "Comments are forbidden",
      });
    }

    return {
      Program() {
        const ast = sourceCode.ast as typeof sourceCode.ast & {
          comments?: AST.Token[];
        };
        (ast.comments ?? []).forEach(processJSComment);
      },
      SvelteHTMLComment: processSvelteHTMLComment,
    };
  },
};

const plugin: ESLint.Plugin = {
  rules: {
    disallowComments,
  },
};

export default plugin;
