const fs = require("node:fs");
const path = require("node:path");
const parser = require("../frontend/node_modules/@babel/parser");

const root = path.resolve(__dirname, "..");
const sourceRoots = [
  path.join(root, "backend"),
  path.join(root, "frontend", "src"),
  path.join(root, "frontend", "public"),
  path.join(root, ".github", "workflows"),
  path.join(root, "scripts"),
];
const checkOnly = process.argv.includes("--check");
const extensions = /\.(js|jsx|mjs|cjs|css|scss|html|handlebars|svg|yml|yaml)$/i;
const ignoredDirectories = new Set(["node_modules", "build", "dist", ".git", "coverage"]);

const preserveLines = (value, keepSpaces = true) =>
  value.replace(/[\s\S]/g, (character) => {
    if (character === "\n" || character === "\r") return character;
    return keepSpaces ? " " : "";
  });

const collectFiles = (directory) => {
  if (!fs.existsSync(directory)) return [];

  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const absolutePath = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      return ignoredDirectories.has(entry.name) ? [] : collectFiles(absolutePath);
    }

    return extensions.test(entry.name) ? [absolutePath] : [];
  });
};

const collectJsxCommentContainers = (node, containers = []) => {
  if (!node || typeof node !== "object") return containers;

  if (
    node.type === "JSXExpressionContainer" &&
    node.expression?.type === "JSXEmptyExpression" &&
    Number.isInteger(node.start) &&
    Number.isInteger(node.end)
  ) {
    containers.push({ start: node.start, end: node.end });
  }

  for (const [key, value] of Object.entries(node)) {
    if (["loc", "start", "end", "comments", "tokens", "errors"].includes(key)) {
      continue;
    }

    if (Array.isArray(value)) {
      for (const item of value) collectJsxCommentContainers(item, containers);
    } else if (value && typeof value === "object") {
      collectJsxCommentContainers(value, containers);
    }
  }

  return containers;
};

const stripJavaScriptComments = (source, filePath) => {
  const ast = parser.parse(source, {
    sourceType: "unambiguous",
    plugins: ["jsx"],
  });
  const jsxContainers = collectJsxCommentContainers(ast);
  const edits = [];

  for (const container of jsxContainers) {
    const value = source.slice(container.start, container.end);

    if (value.includes("/*") || value.includes("//")) {
      edits.push({
        start: container.start,
        end: container.end,
        replacement: preserveLines(value, false),
      });
    }
  }

  for (const comment of ast.comments || []) {
    const insideJsxContainer = jsxContainers.some(
      (container) =>
        comment.start >= container.start && comment.end <= container.end
    );

    if (insideJsxContainer) continue;

    const value = source.slice(comment.start, comment.end);
    const lineStart = source.lastIndexOf("\n", comment.start - 1) + 1;
    const beforeComment = source.slice(lineStart, comment.start);
    const isStandaloneLine = beforeComment.trim() === "";

    if (comment.type === "CommentLine" && isStandaloneLine) {
      edits.push({
        start: lineStart,
        end: comment.end,
        replacement: preserveLines(source.slice(lineStart, comment.end)),
      });
    } else {
      edits.push({
        start: comment.start,
        end: comment.end,
        replacement: preserveLines(value),
      });
    }
  }

  let output = source;

  for (const edit of edits.sort((left, right) => right.start - left.start)) {
    output =
      output.slice(0, edit.start) +
      edit.replacement +
      output.slice(edit.end);
  }

  return output;
};

const stripStyleComments = (source) => {
  let output = "";
  let index = 0;
  let quote = null;

  while (index < source.length) {
    const character = source[index];
    const next = source[index + 1];

    if (quote) {
      output += character;

      if (character === "\\" && index + 1 < source.length) {
        output += source[index + 1];
        index += 2;
        continue;
      }

      if (character === quote) quote = null;
      index += 1;
      continue;
    }

    if (character === "'" || character === '"') {
      quote = character;
      output += character;
      index += 1;
      continue;
    }

    if (character === "/" && next === "*") {
      const end = source.indexOf("*/", index + 2);
      const commentEnd = end < 0 ? source.length : end + 2;
      output += preserveLines(source.slice(index, commentEnd), false);
      index = commentEnd;
      continue;
    }

    if (character === "/" && next === "/") {
      const prefix = source.slice(Math.max(0, index - 24), index);
      const previous = source[index - 1] || "";
      const isProtocolSeparator = previous === ":";
      const isUrlStart = /url\(\s*$/i.test(prefix);
      const canStartLineComment =
        index === 0 ||
        /\s/.test(previous) ||
        /[{};]/.test(previous);

      if (canStartLineComment && !isProtocolSeparator && !isUrlStart) {
        let end = index;

        while (end < source.length && source[end] !== "\n" && source[end] !== "\r") {
          end += 1;
        }

        output += preserveLines(source.slice(index, end), false);
        index = end;
        continue;
      }
    }

    output += character;
    index += 1;
  }

  return output;
};

const stripMarkupComments = (source) => {
  let output = source.replace(/<!--[\s\S]*?-->/g, (comment) =>
    preserveLines(comment, false)
  );

  output = output.replace(/\{\{!--[\s\S]*?--\}\}/g, (comment) =>
    preserveLines(comment, false)
  );

  output = output.replace(/\{\![\s\S]*?\}\}/g, (comment) =>
    preserveLines(comment, false)
  );

  return output;
};

const stripYamlComments = (source) =>
  source
    .split(/(?<=\n)/)
    .map((line) => {
      let quote = null;
      let escaped = false;

      for (let index = 0; index < line.length; index += 1) {
        const character = line[index];

        if (quote === '"') {
          if (escaped) {
            escaped = false;
          } else if (character === "\\") {
            escaped = true;
          } else if (character === '"') {
            quote = null;
          }
          continue;
        }

        if (quote === "'") {
          if (character === "'" && line[index + 1] === "'") {
            index += 1;
          } else if (character === "'") {
            quote = null;
          }
          continue;
        }

        if (character === '"' || character === "'") {
          quote = character;
          continue;
        }

        if (character === "#" && (index === 0 || /\s/.test(line[index - 1]))) {
          return preserveLines(line.slice(index), false);
        }
      }

      return line;
    })
    .join("");

const stripComments = (filePath, source) => {
  const extension = path.extname(filePath).toLowerCase();

  if ([".js", ".jsx", ".mjs", ".cjs"].includes(extension)) {
    return stripJavaScriptComments(source, filePath);
  }

  if ([".css", ".scss"].includes(extension)) {
    return stripStyleComments(source);
  }

  if ([".yml", ".yaml"].includes(extension)) {
    return stripYamlComments(source);
  }

  return stripMarkupComments(source);
};

const files = sourceRoots.flatMap(collectFiles);
const changedFiles = [];

for (const filePath of files) {
  const source = fs.readFileSync(filePath, "utf8");
  const output = stripComments(filePath, source);

  if (output !== source) {
    changedFiles.push(path.relative(root, filePath));

    if (!checkOnly) {
      fs.writeFileSync(filePath, output);
    }
  }
}

if (checkOnly && changedFiles.length > 0) {
  process.stderr.write(
    "Comments remain in source files:\n" + changedFiles.join("\n") + "\n"
  );
  process.exit(1);
}

if (checkOnly) {
  process.stdout.write("No source comments found.\n");
} else {
  process.stdout.write(
    "Removed comments from " + changedFiles.length + " source files.\n"
  );
}
