const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const pluginsDir = path.join(__dirname, '..', 'plugins');
const templatesDir = path.join(__dirname, 'templates');
const templateScriptsDir = __dirname;
const projectRoot = path.join(__dirname, '..');

// Check for debug flag in command line arguments
const IS_DEBUG = process.argv.includes('--debug');

/**
 * Prompts the user with a question and waits for input.
 * @param {string} query The question to display
 * @returns {Promise<string>} User's response
 */
function askQuestion(query) {
  return new Promise((resolve) => rl.question(query, resolve));
}

/**
 * Prompts the user with a list of options using an interactive selector.
 * @param {string} message The prompt message
 * @param {Array<{label: string, value: string}>} options Array of options to select
 * @returns {Promise<string>} The value of the selected option
 */
async function selectOption(message, options) {
  return new Promise((resolve) => {
    let selectedIndex = 0;

    // Use bold for the prompt message
    console.log(`\x1b[1m? ${message}\x1b[0m`);
    options.forEach(() => console.log());

    const render = () => {
      process.stdout.write(`\x1B[${options.length}A`);

      options.forEach((opt, idx) => {
        process.stdout.write('\x1B[2K\x1B[G');
        if (idx === selectedIndex) {
          // Cyan pointer and bold text for selected option
          console.log(`  \x1b[36m❯ ${opt.label}\x1b[0m`);
        } else {
          // Dim text for unselected option
          console.log(`    \x1b[2m${opt.label}\x1b[0m`);
        }
      });
    };

    render();

    const onKeypress = (str, key) => {
      if (key.name === 'up') {
        selectedIndex = selectedIndex > 0 ? selectedIndex - 1 : options.length - 1;
        render();
      } else if (key.name === 'down') {
        selectedIndex = selectedIndex < options.length - 1 ? selectedIndex + 1 : 0;
        render();
      } else if (key.name === 'return' || key.name === 'enter') {
        cleanup();
        resolve(options[selectedIndex].value);
      } else if (key.name === 'c' && key.ctrl) {
        cleanup();
        process.exit(1);
      }
    };

    const cleanup = () => {
      process.stdin.removeListener('keypress', onKeypress);
      if (process.stdin.isTTY) {
        process.stdin.setRawMode(false);
      }
    };

    readline.emitKeypressEvents(process.stdin);
    if (process.stdin.isTTY) {
      process.stdin.setRawMode(true);
    }
    process.stdin.resume();
    process.stdin.on('keypress', onKeypress);
  });
}

/**
 * Extracts the base name from a package name, ignoring scopes.
 * @param {string} str The full package name
 * @returns {string} The base name
 */
function getBaseName(str) {
  // If scoped package (e.g. @scope/name), take only the 'name' part
  const parts = str.split('/');
  const name = parts[parts.length - 1];
  // Remove @ if it's there (should be handled by split, but just in case)
  return name.replace(/^@/, '');
}

/**
 * Converts a string to PascalCase (e.g. my-plugin -> MyPlugin).
 * @param {string} str Input string
 * @returns {string} PascalCase string
 */
function toPascalCase(str) {
  const base = getBaseName(str);
  return base
    .split(/[-_]/)
    .filter(Boolean)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join('');
}

/**
 * Converts a string to camelCase (e.g. my-plugin -> myPlugin).
 * @param {string} str Input string
 * @returns {string} camelCase string
 */
function toCamelCase(str) {
  const pascal = toPascalCase(str);
  return pascal.charAt(0).toLowerCase() + pascal.slice(1);
}

/**
 * Recursively copies a directory, applying string replacements to file contents and specific filenames.
 * @param {string} source Source directory path
 * @param {string} target Target directory path
 * @param {Record<string, string>} replacements Key-value pairs for string replacements
 */
function copyDirectoryRecursive(source, target, replacements) {
  if (!fs.existsSync(target)) {
    if (IS_DEBUG) {
      console.log(`[DEBUG] Would create directory: ${target}`);
    } else {
      fs.mkdirSync(target, { recursive: true });
    }
  }

  const entries = fs.readdirSync(source, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(source, entry.name);

    let destName = entry.name;
    if (destName === 'Component.vue' && replacements['{{PASCAL_PLUGIN_NAME}}']) {
      destName = `${replacements['{{PASCAL_PLUGIN_NAME}}']}Component.vue`;
    }

    const destPath = path.join(target, destName);

    if (entry.isDirectory()) {
      copyDirectoryRecursive(srcPath, destPath, replacements);
    } else {
      let content = fs.readFileSync(srcPath, 'utf-8');

      for (const [key, value] of Object.entries(replacements)) {
        content = content.split(key).join(value);
      }

      if (IS_DEBUG) {
        console.log(`[DEBUG] Would write file: ${destPath}`);
      } else {
        fs.writeFileSync(destPath, content);
      }
    }
  }
}

function closeReadline() {
  rl.close();
}

/**
 * Safely updates the scripts section of the root package.json file.
 * @param {Record<string, string>} newScripts Scripts to merge or overwrite
 */
function updateRootPackageScripts(newScripts) {
  const packageJsonPath = path.join(projectRoot, 'package.json');
  if (fs.existsSync(packageJsonPath)) {
    try {
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
      packageJson.scripts = packageJson.scripts || {};
      
      let changed = false;
      for (const [key, value] of Object.entries(newScripts)) {
        if (packageJson.scripts[key] !== value) {
          packageJson.scripts[key] = value;
          changed = true;
        }
      }

      if (changed) {
        if (IS_DEBUG) {
          console.log(`[DEBUG] Would update root package.json scripts with:`, newScripts);
        } else {
          fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
          console.log('Updated root package.json scripts.');
        }
      }
    } catch (e) {
      console.error('Failed to update root package.json scripts:', e.message);
    }
  }
}

/**
 * Copies and configures the standard release.yml workflow, optionally linking a targeted publish job.
 * @param {string} [targetWorkflowName] The filename of the workflow to link to (e.g. publish_package.yml)
 */
async function setupReleaseWorkflow(targetWorkflowName) {
  const workflowDestDir = path.join(projectRoot, '.github', 'workflows');
  if (!fs.existsSync(workflowDestDir)) {
    if (!IS_DEBUG) fs.mkdirSync(workflowDestDir, { recursive: true });
  }

  const releaseWorkflowSrc = path.join(templateScriptsDir, 'workflows', 'release.yml');
  const releaseWorkflowDest = path.join(workflowDestDir, 'release.yml');

  // If a pluginName is provided, we might be setting up a secondary release logic,
  // or overwriting the root release.yml. In a monorepo, a unified release.yml is often used.
  // We'll update the placeholder if it exists.
  let content = '';
  if (fs.existsSync(releaseWorkflowDest)) {
     content = fs.readFileSync(releaseWorkflowDest, 'utf-8');
  } else if (fs.existsSync(releaseWorkflowSrc)) {
     content = fs.readFileSync(releaseWorkflowSrc, 'utf-8');
  }

  if (content) {
    // Replace the publish workflow placeholder if a targetWorkflowName is provided
    if (targetWorkflowName) {
      if (content.includes('publish-placeholder.yml')) {
          content = content.replace(
            'uses: ./.github/workflows/publish-placeholder.yml',
            `uses: ./.github/workflows/${targetWorkflowName}`
          );
      } else {
          console.log(`Note: You may need to manually add ${targetWorkflowName} to your root release.yml if you have multiple setups.`);
      }
      console.log(`Linked release workflow to ${targetWorkflowName}`);
    }

    if (IS_DEBUG) {
      console.log(`[DEBUG] Would write release.yml to ${releaseWorkflowDest}`);
    } else {
      fs.writeFileSync(releaseWorkflowDest, content);
      console.log('Copied and configured release.yml GitHub Actions workflow.');
    }
  }
}

module.exports = {
  pluginsDir,
  templatesDir,
  templateScriptsDir,
  projectRoot,
  IS_DEBUG,
  askQuestion,
  selectOption,
  closeReadline,
  toPascalCase,
  toCamelCase,
  copyDirectoryRecursive,
  updateRootPackageScripts,
  setupReleaseWorkflow
};