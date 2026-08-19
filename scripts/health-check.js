import { exec, execFile, execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const reportPath = path.resolve(rootDir, 'health-report.md');
const reportJsonPath = path.resolve(rootDir, 'health-report.json');
const pkg = JSON.parse(fs.readFileSync(path.join(rootDir, 'package.json'), 'utf8'));

// True until `node .templateScripts/setup.cjs` scaffolds and (optionally) removes this directory.
const isBoilerplateMode = fs.existsSync(path.join(rootDir, '.templateScripts'));

const binDir = path.join(rootDir, 'node_modules', '.bin');
const bin = (name) => path.join(binDir, process.platform === 'win32' ? `${name}.cmd` : name);
const rel = (file) => path.relative(rootDir, file).split(path.sep).join('/');

const MAX_ISSUES_PER_CHECK = 50;
const MAX_BUFFER = 30 * 1024 * 1024;

// Built from a runtime char code (rather than a regex literal containing an escape) so the
// ANSI escape byte never sits in the source file next to the bracket that follows it.
const ESCAPE_CHAR = String.fromCharCode(27);
const ANSI_PATTERN = new RegExp(
  `${ESCAPE_CHAR}[[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]`,
  'g',
);

const stripAnsi = (str) => (str ? str.replace(ANSI_PATTERN, '') : '');

const cleanNpmBoilerplate = (str) => {
  if (!str) return '';
  const lines = str.split('\n');
  while (lines.length > 0 && (lines[0].trim().startsWith('>') || lines[0].trim() === '')) {
    lines.shift();
  }
  return lines.join('\n').trim();
};

// Only used by checks that still shell out to an npm script (currently just the build).
const runCommand = (command) => {
  return new Promise((resolve) => {
    exec(command, { cwd: rootDir }, (error, stdout, stderr) => {
      resolve({
        success: !error,
        stdout: stdout.trim(),
        stderr: stderr.trim(),
        error,
      });
    });
  });
};

// Invokes a binary directly (bypassing npm's script banner) so tool output can be
// parsed as clean JSON instead of scraped from decorated CLI text.
const execCapture = (command, args) =>
  new Promise((resolve) => {
    execFile(command, args, { cwd: rootDir, maxBuffer: MAX_BUFFER }, (error, stdout, stderr) => {
      resolve({ success: !error, stdout: stdout ?? '', stderr: stderr ?? '', error });
    });
  });

const renderBar = (value, max, width = 20) => {
  const ratio = Math.max(0, Math.min(value / max, 1));
  const filled = Math.round(ratio * width);
  return `${'█'.repeat(filled)}${'░'.repeat(width - filled)}`;
};

const runGitCommand = (args) => {
  try {
    return execSync(`git ${args}`, { cwd: rootDir, encoding: 'utf8' }).trim();
  } catch {
    return null;
  }
};

/**
 * Node/npm/OS versions plus boilerplate-vs-scaffolded state, since the latter changes
 * which other findings in this report are expected vs. real problems.
 */
const checkEnvironment = async () => {
  const lines = [];
  let count = 0;

  const nodeMajor = parseInt(process.version.slice(1), 10);
  const requiredNode = pkg.engines?.node ?? '>=20.0.0';
  const requiredNodeMajor = parseInt(requiredNode.replace(/[^\d.]/g, ''), 10);
  const nodeOk = nodeMajor >= requiredNodeMajor;
  if (!nodeOk) count += 1;
  lines.push(
    `Node.js: ${process.version} (requires ${requiredNode}) - ${nodeOk ? 'OK' : 'MISMATCH'}`,
  );

  let npmVersion = 'unknown';
  try {
    npmVersion = execSync('npm --version', { cwd: rootDir, encoding: 'utf8' }).trim();
  } catch {
    // npm not resolvable on PATH; leave as 'unknown'
  }
  const requiredNpm = pkg.engines?.npm ?? '>=10.0.0';
  const requiredNpmMajor = parseInt(requiredNpm.replace(/[^\d.]/g, ''), 10);
  const npmMajor = parseInt(npmVersion, 10);
  const npmOk = !Number.isNaN(npmMajor) && npmMajor >= requiredNpmMajor;
  if (!npmOk) count += 1;
  lines.push(`npm: v${npmVersion} (requires ${requiredNpm}) - ${npmOk ? 'OK' : 'MISMATCH'}`);

  lines.push(`Platform: ${process.platform} (${process.arch})`);
  lines.push('');

  if (isBoilerplateMode) {
    lines.push(
      'Boilerplate Mode: `.templateScripts/` is present — this project has not been scaffolded yet.',
    );
    lines.push(
      'Run `node .templateScripts/setup.cjs` to configure it for Project, Plugin, Electron, or Browser Extension development.',
    );
    lines.push(
      'Until then, the following are *expected* to be absent or contain placeholders (not bugs):',
    );
    lines.push('  - `.github/workflows/` (CI/CD workflows are copied in during setup)');
    lines.push('  - `plugins/**` and `csp.config.ts` referenced in tsconfig.json');
    lines.push('  - `{{PLACEHOLDER}}`-style tokens inside `.templateScripts/templates/**`');
  } else {
    lines.push(
      'Boilerplate Mode: `.templateScripts/` was not found — this project has already been scaffolded.',
    );
  }

  return { success: nodeOk && npmOk, stdout: lines.join('\n'), stderr: '', count };
};

/** Uncommitted changes and how far the current branch has drifted from its upstream. */
const checkGitStatus = async () => {
  const lines = [];
  const branch = runGitCommand('rev-parse --abbrev-ref HEAD') ?? 'unknown';
  const statusOutput = runGitCommand('status --porcelain') ?? '';
  const changedFiles = statusOutput ? statusOutput.split('\n').filter(Boolean) : [];
  const count = changedFiles.length;

  lines.push(`Branch: ${branch}`);
  lines.push(`Uncommitted changes: ${count}`);
  if (count > 0) {
    lines.push('', 'Changed files:', ...changedFiles.map((l) => `  ${l}`));
  }

  const upstreamCounts = runGitCommand(`rev-list --left-right --count origin/${branch}...HEAD`);
  if (upstreamCounts) {
    const [behind, ahead] = upstreamCounts.split(/\s+/);
    lines.push(
      '',
      `Ahead of origin/${branch}: ${ahead} commit(s)`,
      `Behind origin/${branch}: ${behind} commit(s)`,
    );
  } else {
    lines.push(
      '',
      `No upstream tracking branch found for '${branch}' (or 'origin' is unreachable).`,
    );
  }

  return { success: count === 0, stdout: lines.join('\n'), stderr: '', count };
};

/** Checks if all code files are consistently formatted, via Prettier's own file list. */
// Only matches the first line of each parse error (`[error] path.ext: message`) - Prettier
// follows it with several unprefixed/`[error]`-prefixed source-context lines per error, which
// would otherwise each get counted as a separate issue.
const PRETTIER_ERROR_LINE =
  /^\[error\]\s+(\S+\.(?:ts|tsx|js|jsx|mjs|cjs|vue|json|css|scss|less|html|md|yml|yaml)):\s*(.+)$/;

const checkFormatPrettier = async () => {
  const { stdout, stderr } = await execCapture(bin('prettier'), ['--list-different', '.']);
  const unformatted = stdout
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);
  const parseErrors = [...stderr.matchAll(new RegExp(PRETTIER_ERROR_LINE, 'gm'))];

  const issues = [
    ...unformatted.map((file) => ({ file, message: 'Not formatted with Prettier' })),
    ...parseErrors.map((m) => ({ file: m[1], message: m[2] })),
  ];

  return {
    success: issues.length === 0,
    count: issues.length,
    errorCount: issues.length,
    warningCount: 0,
    issues: issues.slice(0, MAX_ISSUES_PER_CHECK),
  };
};

/** Analyzes JavaScript/TypeScript/Vue files for code quality issues, via ESLint's JSON formatter. */
const checkLintEslint = async () => {
  const { stdout } = await execCapture(bin('eslint'), ['.', '--format', 'json']);
  let files;
  try {
    files = JSON.parse(stdout);
  } catch {
    return {
      success: false,
      count: 1,
      errorCount: 1,
      warningCount: 0,
      issues: [{ file: null, message: 'ESLint did not return valid JSON output.' }],
    };
  }

  let errorCount = 0;
  let warningCount = 0;
  const issues = [];
  for (const f of files) {
    errorCount += f.errorCount;
    warningCount += f.warningCount;
    for (const m of f.messages) {
      issues.push({
        file: rel(f.filePath),
        line: m.line,
        rule: m.ruleId,
        message: m.message,
        severity: m.severity === 2 ? 'error' : 'warning',
      });
    }
  }

  return {
    success: errorCount === 0,
    count: errorCount + warningCount,
    errorCount,
    warningCount,
    issues: issues.slice(0, MAX_ISSUES_PER_CHECK),
  };
};

/** Analyzes CSS and Vue `<style>` blocks, via Stylelint's JSON formatter. */
const checkLintStylelint = async () => {
  // Stylelint writes its JSON report to stderr when it finds errors, stdout when clean.
  const { stdout, stderr } = await execCapture(bin('stylelint'), [
    '**/*.{css,vue}',
    '--formatter',
    'json',
  ]);
  let files;
  try {
    files = JSON.parse(stdout || stderr);
  } catch {
    return {
      success: false,
      count: 1,
      errorCount: 1,
      warningCount: 0,
      issues: [{ file: null, message: 'Stylelint did not return valid JSON output.' }],
    };
  }

  let errorCount = 0;
  let warningCount = 0;
  const issues = [];
  for (const f of files) {
    for (const w of f.warnings) {
      if (w.severity === 'error') errorCount += 1;
      else warningCount += 1;
      issues.push({
        file: rel(f.source),
        line: w.line,
        rule: w.rule,
        message: w.text,
        severity: w.severity,
      });
    }
  }

  return {
    success: errorCount === 0,
    count: errorCount + warningCount,
    errorCount,
    warningCount,
    issues: issues.slice(0, MAX_ISSUES_PER_CHECK),
  };
};

/** Strictly type-checks Vue templates and TypeScript files. vue-tsc has no JSON output mode, so this parses its `--pretty false` text format (both the `file(l,c): error TSxxxx:` and `file(l,c) - error TSxxxx:` variants show up across TS versions). */
const checkTypeCheck = async () => {
  const { stdout, stderr } = await execCapture(bin('vue-tsc'), ['--noEmit', '--pretty', 'false']);
  const combined = `${stdout}\n${stderr}`;

  let errorCount = 0;
  let warningCount = 0;
  const issues = [];

  for (const line of combined.split('\n')) {
    const m =
      line.match(/^(.+?)\((\d+),(\d+)\)\s*:\s*(error|warning)\s+(TS\d+):\s*(.+)$/) ??
      line.match(/^(.+?)\((\d+),(\d+)\)\s*-\s*(error|warning)\s+(TS\d+):\s*(.+)$/);
    if (!m) continue;
    const [, file, lineNo, , severity, code, message] = m;
    if (severity === 'error') errorCount += 1;
    else warningCount += 1;
    issues.push({
      file: rel(path.resolve(rootDir, file)),
      line: Number(lineNo),
      rule: code,
      message,
      severity,
    });
  }

  return {
    success: errorCount === 0,
    count: errorCount + warningCount,
    errorCount,
    warningCount,
    issues: issues.slice(0, MAX_ISSUES_PER_CHECK),
  };
};

const SEVERITY_RANK = { critical: 4, high: 3, moderate: 2, low: 1, info: 0 };

/** Scans dependencies for known security vulnerabilities via `npm audit --json`, ranked by severity. */
const checkNpmAudit = async () => {
  const { stdout } = await execCapture('npm', ['audit', '--json']);
  let report;
  try {
    report = JSON.parse(stdout);
  } catch {
    return {
      success: true,
      count: 0,
      errorCount: 0,
      warningCount: 0,
      issues: [],
      stdout: 'Could not parse `npm audit` output.',
    };
  }

  const bySeverity = report.metadata?.vulnerabilities ?? {};
  const criticalOrHigh = (bySeverity.critical ?? 0) + (bySeverity.high ?? 0);
  const moderateOrLow = (bySeverity.moderate ?? 0) + (bySeverity.low ?? 0);

  const issues = Object.values(report.vulnerabilities ?? {})
    .sort((a, b) => (SEVERITY_RANK[b.severity] ?? 0) - (SEVERITY_RANK[a.severity] ?? 0))
    .map((v) => {
      const advisory = v.via.find((entry) => typeof entry === 'object');
      return {
        file: v.name,
        rule: v.severity,
        message: advisory ? advisory.title : `Vulnerable dependency (${v.severity})`,
      };
    });

  return {
    success: criticalOrHigh === 0,
    count: criticalOrHigh + moderateOrLow,
    errorCount: criticalOrHigh,
    warningCount: moderateOrLow,
    issues: issues.slice(0, MAX_ISSUES_PER_CHECK),
    severityBreakdown: bySeverity,
  };
};

/** Checks for outdated NPM packages via `npm outdated --json`. */
const checkNpmOutdated = async () => {
  const { stdout } = await execCapture('npm', ['outdated', '--json']);
  let packages = {};
  if (stdout.trim()) {
    try {
      packages = JSON.parse(stdout);
    } catch {
      packages = {};
    }
  }

  const entries = Object.entries(packages);
  const issues = entries.map(([name, info]) => ({
    file: name,
    message: `${info.current ?? 'missing'} → latest ${info.latest}`,
  }));

  return {
    success: entries.length === 0,
    count: entries.length,
    errorCount: 0,
    warningCount: entries.length,
    issues: issues.slice(0, MAX_ISSUES_PER_CHECK),
  };
};

// Packages only ever referenced by name inside JSON/CSS config (no JS/TS import for depcheck to see).
const DEPCHECK_IGNORES = [
  // Tailwind v4 CSS-first plugins, loaded via `@plugin` in src/assets/main.css
  '@tailwindcss/forms',
  '@tailwindcss/typography',
  'tailwindcss-animate',
  'tailwindcss',
  // semantic-release plugins, referenced by name only in .releaserc.json
  '@semantic-release/changelog',
  '@semantic-release/exec',
  '@semantic-release/git',
  '@semantic-release/npm',
  // stylelint presets, referenced by name only in stylelint.config.js
  'stylelint-config-recommended-vue',
  'stylelint-config-standard',
  'stylelint-config-tailwindcss',
  'stylelint-order',
  'postcss-html',
  // prettier plugin, referenced by name only in .prettierrc.json
  'prettier-plugin-tailwindcss',
  // only used by the Plugin/Library template variants under .templateScripts/templates
  'vite-plugin-dts',
];

/** Flags dependencies that are declared-but-unused or used-but-undeclared. */
const checkDependencyUsage = async () => {
  const depcheck = (await import('depcheck')).default;
  const result = await depcheck(rootDir, {
    ignorePatterns: ['dist', '.templateScripts', 'node_modules'],
    ignoreMatches: DEPCHECK_IGNORES,
  });

  const missingEntries = Object.entries(result.missing);
  const issues = [
    ...result.dependencies.map((d) => ({
      file: d,
      message: 'Declared in package.json but unused',
    })),
    ...result.devDependencies.map((d) => ({
      file: d,
      message: 'Declared in package.json but unused',
    })),
    ...missingEntries.map(([d, files]) => ({
      file: d,
      message: `Used in code but not declared: ${files.map((f) => rel(f)).join(', ')}`,
    })),
  ];

  return {
    success: issues.length === 0,
    count: issues.length,
    errorCount: 0,
    warningCount: issues.length,
    issues: issues.slice(0, MAX_ISSUES_PER_CHECK),
  };
};

/** Runs the production build and flags any output chunk over Vite's 500 kB warning threshold. */
const checkBuildBundleSize = async () => {
  const result = await runCommand('npx vite build');
  const output = `${result.stdout}\n${result.stderr}`;
  const chunkMatches = [
    ...output.matchAll(/^(dist\/\S+)\s+([\d.]+)\s*kB(?:[^\d]*gzip:\s*([\d.]+)\s*kB)?/gm),
  ];
  const chunks = chunkMatches.map((m) => ({
    file: m[1],
    kb: parseFloat(m[2]),
    gzipKb: m[3] ? parseFloat(m[3]) : null,
  }));
  const oversized = chunks.filter((c) => c.file.endsWith('.js') && c.kb > 500);

  const lines = [];
  if (result.success && chunks.length) {
    lines.push('Build output:');
    chunks.forEach((c) => {
      const pct = Math.round((c.kb / 500) * 100);
      lines.push(`  ${c.file} — ${c.kb} kB${c.gzipKb !== null ? ` (gzip: ${c.gzipKb} kB)` : ''}`);
      lines.push(`    ${renderBar(c.kb, 500)} ${pct}% of 500 kB warning threshold`);
    });
    if (oversized.length) {
      lines.push(
        '',
        `${oversized.length} chunk(s) exceed the 500 kB warning threshold:`,
        ...oversized.map((c) => `  - ${c.file} (${c.kb} kB)`),
      );
    }
  } else if (!result.success) {
    lines.push('Build failed:', cleanNpmBoilerplate(stripAnsi(result.stderr || result.stdout)));
  }

  // The build check's only job is to validate the build; don't leave its output on disk.
  fs.rmSync(path.join(rootDir, 'dist'), { recursive: true, force: true });

  return { success: result.success, stdout: lines.join('\n'), stderr: '', count: oversized.length };
};

const CONSOLE_CALL_REGEX = /console\.(log|warn|error|debug|info)\(/g;

const walkFiles = (dir, exts, results = []) => {
  if (!fs.existsSync(dir)) return results;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkFiles(fullPath, exts, results);
    } else if (exts.includes(path.extname(entry.name))) {
      results.push(fullPath);
    }
  }
  return results;
};

/** Checks the project's own conventions from gemini.md: store/service naming and no raw console.*. */
const checkProjectConventions = async () => {
  const issues = [];

  const storesDir = path.join(rootDir, 'src', 'stores');
  for (const file of fs.existsSync(storesDir) ? fs.readdirSync(storesDir) : []) {
    if (file.endsWith('.ts') && !file.endsWith('.store.ts') && file !== 'index.ts') {
      issues.push({ file: `src/stores/${file}`, message: 'Expected `*.store.ts` naming' });
    }
  }

  const servicesDir = path.join(rootDir, 'src', 'services');
  for (const file of fs.existsSync(servicesDir) ? fs.readdirSync(servicesDir) : []) {
    if (file.endsWith('.ts') && !file.endsWith('.service.ts') && file !== 'index.ts') {
      issues.push({ file: `src/services/${file}`, message: 'Expected `*.service.ts` naming' });
    }
  }

  const loggerPath = path.resolve(rootDir, 'src', 'utils', 'logger.ts');
  for (const file of walkFiles(path.join(rootDir, 'src'), ['.ts', '.vue'])) {
    if (path.resolve(file) === loggerPath) continue;
    const content = fs.readFileSync(file, 'utf8');
    const matches = content.match(CONSOLE_CALL_REGEX);
    if (matches) {
      issues.push({
        file: rel(file),
        message: `${matches.length} raw \`console.*\` call(s); use \`logger\` from \`src/utils/logger.ts\` instead`,
      });
    }
  }

  return {
    success: issues.length === 0,
    count: issues.length,
    errorCount: 0,
    warningCount: issues.length,
    issues: issues.slice(0, MAX_ISSUES_PER_CHECK),
  };
};

const checks = [
  {
    name: 'Environment & Runtime',
    category: 'Project Status',
    description:
      'Confirms Node.js/npm versions and whether this repo is still in boilerplate mode.',
    fixCommand: null,
    allowFail: false,
    alwaysShowOutput: true,
    run: checkEnvironment,
  },
  {
    name: 'Git Working Tree',
    category: 'Project Status',
    description:
      'Reports uncommitted changes and how far the current branch has drifted from origin.',
    fixCommand: null,
    allowFail: true,
    alwaysShowOutput: true,
    run: checkGitStatus,
  },
  {
    name: 'Format Check (Prettier)',
    category: 'Code Quality',
    description: 'Checks if all code files are consistently formatted.',
    fixCommand: 'npm run lint:prettier:fix',
    allowFail: false,
    run: checkFormatPrettier,
  },
  {
    name: 'Lint JS/TS (ESLint)',
    category: 'Code Quality',
    description: 'Analyzes JavaScript and TypeScript files for code quality issues.',
    fixCommand: 'npm run lint:eslint:fix',
    allowFail: false,
    run: checkLintEslint,
  },
  {
    name: 'Lint Styles (Stylelint)',
    category: 'Code Quality',
    description: 'Analyzes CSS and Vue files for styling quality issues.',
    fixCommand: 'npm run lint:styles:fix',
    allowFail: false,
    run: checkLintStylelint,
  },
  {
    name: 'Type Check (Vue TSC)',
    category: 'Code Quality',
    description: 'Strictly type-checks Vue templates and TypeScript files.',
    fixCommand: null,
    allowFail: false,
    run: checkTypeCheck,
  },
  {
    name: 'Project Conventions',
    category: 'Code Quality',
    description:
      "Checks store/service file naming and raw console statement usage against the project's own coding standards.",
    fixCommand: null,
    allowFail: true,
    run: checkProjectConventions,
  },
  {
    name: 'Build & Bundle Size',
    category: 'Build',
    description:
      'Runs the production build and flags output chunks over the 500 kB warning threshold.',
    fixCommand: null,
    allowFail: false,
    alwaysShowOutput: true,
    run: checkBuildBundleSize,
  },
  {
    name: 'NPM Audit',
    category: 'Dependencies',
    description: 'Scans project dependencies for known security vulnerabilities.',
    fixCommand: 'npm audit fix',
    allowFail: true,
    run: checkNpmAudit,
  },
  {
    name: 'NPM Outdated',
    category: 'Dependencies',
    description: 'Checks for outdated NPM packages in the project.',
    fixCommand: 'npm update',
    allowFail: true,
    run: checkNpmOutdated,
  },
  {
    name: 'Dependency Usage',
    category: 'Dependencies',
    description:
      'Flags dependencies that are declared but unused, or used but not declared (via depcheck).',
    fixCommand: null,
    allowFail: true,
    run: checkDependencyUsage,
  },
];

const CATEGORY_ORDER = ['Project Status', 'Code Quality', 'Build', 'Dependencies'];
const CATEGORY_EMOJI = {
  'Project Status': '🖥️',
  'Code Quality': '🎨',
  Build: '🏗️',
  Dependencies: '📦',
};

// Shields.io escaping: literal `-` becomes `--` and spaces become `_`, then URL-encode the rest.
// `(`/`)` are also encoded so the badge URL is unambiguous inside a Markdown link destination.
const shieldEncode = (str) =>
  encodeURIComponent(String(str).replace(/-/g, '--').replace(/ /g, '_'))
    .replace(/\(/g, '%28')
    .replace(/\)/g, '%29');

const badgeColorForCount = (count) => {
  if (count === 0) return 'brightgreen';
  if (count <= 5) return 'yellow';
  return 'red';
};

const badgeMessageForResult = (res) => {
  if (res.name === 'Environment & Runtime') return res.success ? 'OK' : 'Version Mismatch';
  if (res.name === 'Git Working Tree') {
    return res.count === 0 ? 'Clean' : `${res.count} Uncommitted`;
  }
  if (res.name === 'Build & Bundle Size' && !res.success) return 'Build Failed';
  return res.count === 0 ? 'Passing' : `${res.count} Issue${res.count === 1 ? '' : 's'}`;
};

const badgeColorForResult = (res) => {
  if (res.name === 'Build & Bundle Size' && !res.success) return 'red';
  if (res.name === 'Environment & Runtime') return res.success ? 'brightgreen' : 'red';
  return badgeColorForCount(res.count);
};

const buildBadge = (label, message, color) =>
  `![${label}: ${message}](https://img.shields.io/badge/${shieldEncode(label)}-${shieldEncode(message)}-${color})`;

const buildResultBadge = (res) =>
  buildBadge(res.name, badgeMessageForResult(res), badgeColorForResult(res));

// A-F grade summarizing only the blocking (allowFail: false) checks, since advisory
// checks (audit/outdated/conventions/dependency usage/git) are tracked in their own
// rows but shouldn't by themselves tank the headline grade - except a critical/high
// vulnerability still caps it, since "clean lint, exploitable dependency" isn't an A.
const GRADE_ICON = { A: '🟢', B: '🟢', C: '🟡', D: '🟠', F: '🔴' };
const GRADE_BADGE_COLOR = {
  A: 'brightgreen',
  B: 'brightgreen',
  C: 'yellow',
  D: 'orange',
  F: 'red',
};
const GRADE_RANK = { A: 0, B: 1, C: 2, D: 3, F: 4 };
// "A minimal passing grade" per project policy: A-C continue (warnings only), D-F block CI
// once this template's own CI is scaffolded to check the doctor script's exit code.
const MIN_PASSING_GRADE = 'C';

const computeGrade = (results) => {
  const blocking = results.filter((r) => !r.allowFail);
  const blockingErrors = blocking.reduce((sum, r) => sum + (r.errorCount ?? r.count), 0);
  const blockingWarnings = blocking.reduce((sum, r) => sum + (r.warningCount ?? 0), 0);
  const buildFailed = results.some((r) => r.name === 'Build & Bundle Size' && !r.success);

  const auditResult = results.find((r) => r.name === 'NPM Audit');
  const criticalOrHigh =
    (auditResult?.severityBreakdown?.critical ?? 0) + (auditResult?.severityBreakdown?.high ?? 0);

  let grade;
  if (buildFailed) grade = 'F';
  else if (blockingErrors === 0 && blockingWarnings === 0) grade = 'A';
  else if (blockingErrors === 0 && blockingWarnings <= 5) grade = 'B';
  else if (blockingErrors <= 5) grade = 'C';
  else if (blockingErrors <= 20) grade = 'D';
  else grade = 'F';

  if (criticalOrHigh > 0 && (grade === 'A' || grade === 'B')) grade = 'C';

  return { grade, blockingErrors, blockingWarnings, criticalOrHigh, buildFailed };
};

const groupByCategory = (results) => {
  const groups = new Map();
  for (const res of results) {
    const category = res.category ?? 'Other';
    if (!groups.has(category)) groups.set(category, []);
    groups.get(category).push(res);
  }
  return CATEGORY_ORDER.filter((category) => groups.has(category)).map((category) => ({
    category,
    emoji: CATEGORY_EMOJI[category] ?? '📁',
    items: groups.get(category),
  }));
};

const renderIssuesList = (issues, totalCount) => {
  const truncated = totalCount > issues.length;
  let md = `<details>\n<summary>View ${issues.length} issue${issues.length === 1 ? '' : 's'}${truncated ? ' (truncated)' : ''}</summary>\n\n`;
  issues.forEach((issue) => {
    const location = issue.file
      ? issue.line
        ? `\`${issue.file}:${issue.line}\``
        : `\`${issue.file}\``
      : '';
    const rule = issue.rule ? ` _(${issue.rule})_` : '';
    md += `- ${location} — ${issue.message}${rule}\n`;
  });
  md += `\n</details>\n\n`;
  return md;
};

const generateMarkdown = (results, grade) => {
  const date = new Date().toLocaleString();
  const categories = groupByCategory(results);

  let md = `# 🏥 Project Health Dashboard\n`;
  md += `*Generated on: ${date}*\n\n`;
  md += `## ${GRADE_ICON[grade.grade]} Overall Grade: ${grade.grade}\n\n`;
  md += `${buildBadge('Project Health', `Grade ${grade.grade}`, GRADE_BADGE_COLOR[grade.grade])}\n\n`;
  md += `| Blocking Errors | Blocking Warnings | Critical/High Vulnerabilities |\n`;
  md += `| :---: | :---: | :---: |\n`;
  md += `| ${grade.blockingErrors} | ${grade.blockingWarnings} | ${grade.criticalOrHigh} |\n\n`;

  if (isBoilerplateMode) {
    md += `> ⚠️ **Boilerplate Mode Detected** — \`.templateScripts/\` is still present, so this project hasn't been scaffolded yet. `;
    md += `Run \`node .templateScripts/setup.cjs\` to configure it for Project, Plugin, Electron, or Browser Extension development. `;
    md += `Some paths referenced in config/docs (e.g. \`.github/workflows\`, \`plugins/**\`) are expected to be absent or templated until then — see the **Environment & Runtime** check below for details.\n\n`;
  }

  // Summary, grouped by category so related checks are easy to scan together.
  md += `## 📊 Summary\n\n`;

  categories.forEach(({ category, emoji, items }) => {
    md += `#### ${emoji} ${category}\n\n`;
    md += `| Check | Status | Count |\n`;
    md += `| :--- | :--- | :---: |\n`;
    items.forEach((res) => {
      md += `| **${res.name}** | ${buildResultBadge(res)} | ${res.count} |\n`;
    });
    md += `\n`;
  });

  md += `---\n\n`;
  md += `## 📋 Detailed Logs\n\n`;

  categories.forEach(({ category, emoji, items }) => {
    md += `## ${emoji} ${category}\n\n`;

    items.forEach((res) => {
      const icon = res.success ? '✅' : res.allowFail ? '⚠️' : '❌';
      md += `### ${icon} ${res.name}\n\n`;
      md += `*${res.description}*\n\n`;

      if (res.success && res.count === 0 && !res.alwaysShowOutput) {
        md += `*Completed successfully with no issues.*\n\n`;
        return;
      }

      if (!res.success && res.fixCommand) {
        md += `> 💡 **Recommendation:** Run \`${res.fixCommand}\` to attempt an auto-fix for some of these issues.\n`;
        md += `> *(Note: This command may not be able to automatically fix all errors. Manual intervention may still be required).* \n\n`;
      }

      if (res.name === 'NPM Audit' && res.severityBreakdown) {
        const parts = Object.entries(res.severityBreakdown)
          .filter(([severity, severityCount]) => severity !== 'total' && severityCount > 0)
          .map(([severity, severityCount]) => `**${severity}**: ${severityCount}`);
        md += `Vulnerabilities by severity: ${parts.length ? parts.join(', ') : 'none'}\n\n`;
      }

      if (res.issues) {
        if (res.issues.length > 0) {
          md += renderIssuesList(res.issues, res.count);
        }
      } else {
        md += `<details>\n<summary>View Output Log</summary>\n\n`;

        const cleanStdout = cleanNpmBoilerplate(stripAnsi(res.stdout));
        const cleanStderr = cleanNpmBoilerplate(stripAnsi(res.stderr));

        if (cleanStdout) {
          md += `#### Output\n`;
          md += `\`\`\`text\n${cleanStdout}\n\`\`\`\n\n`;
        }

        if (cleanStderr) {
          md += `#### Error Log\n`;
          md += `\`\`\`text\n${cleanStderr}\n\`\`\`\n\n`;
        }

        md += `</details>\n\n`;
      }
    });
  });

  return md;
};

const main = async () => {
  console.log('🏥 Starting Local Health Checks...\n');
  const results = [];

  for (const check of checks) {
    console.log(`⏳ Running: ${check.name}...`);
    const result = await check.run();
    results.push({ ...check, ...result });

    if (result.success) {
      console.log(`  ✅ Passed (Found ${result.count} issues)\n`);
    } else {
      console.log(
        `  ${check.allowFail ? '⚠️ Warned' : '❌ Failed'} (Found ${result.count} issues)\n`,
      );
    }
  }

  const grade = computeGrade(results);

  console.log('📝 Generating health-report.md and health-report.json...');
  const mdContent = generateMarkdown(results, grade);
  fs.writeFileSync(reportPath, mdContent, 'utf8');

  const jsonReport = {
    generatedAt: new Date().toISOString(),
    boilerplateMode: isBoilerplateMode,
    grade: grade.grade,
    blockingErrors: grade.blockingErrors,
    blockingWarnings: grade.blockingWarnings,
    criticalOrHighVulnerabilities: grade.criticalOrHigh,
    checks: results.map((r) => ({
      name: r.name,
      category: r.category,
      allowFail: r.allowFail,
      success: r.success,
      count: r.count,
      errorCount: r.errorCount ?? r.count,
      warningCount: r.warningCount ?? 0,
    })),
  };
  fs.writeFileSync(reportJsonPath, JSON.stringify(jsonReport, null, 2), 'utf8');

  console.log(`\n${GRADE_ICON[grade.grade]} Overall grade: ${grade.grade}`);

  if (GRADE_RANK[grade.grade] > GRADE_RANK[MIN_PASSING_GRADE]) {
    console.log(
      `❌ Grade ${grade.grade} is below the minimum passing grade (${MIN_PASSING_GRADE}).`,
    );
    process.exitCode = 1;
  } else {
    console.log(`✅ Grade ${grade.grade} meets the minimum passing grade (${MIN_PASSING_GRADE}).`);
  }

  console.log(`\n🎉 Done! Open 'health-report.md' in your IDE to view the dashboard.`);
};

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
