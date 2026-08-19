const fs = require('fs');
const path = require('path');
const {
  pluginsDir,
  templatesDir,
  projectRoot,
  IS_DEBUG,
  askQuestion,
  selectOption,
  toPascalCase,
  toCamelCase,
  copyDirectoryRecursive,
  updateRootPackageScripts,
  setupReleaseWorkflow
} = require('../utils.cjs');

/**
 * Updates the workspaces array in the root package.json to include the plugins directory.
 */
function updateWorkspaces() {
  const packageJsonPath = path.join(projectRoot, 'package.json');
  if (fs.existsSync(packageJsonPath)) {
    try {
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));

      if (!packageJson.workspaces) {
        packageJson.workspaces = [];
      }

      const pluginPattern = 'plugins/**/*';

      if (!packageJson.workspaces.includes(pluginPattern)) {
        packageJson.workspaces.push(pluginPattern);

        if (IS_DEBUG) {
          console.log(`[DEBUG] Would add "${pluginPattern}" to workspaces in package.json`);
        } else {
          fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
          console.log(`Updated package.json workspaces to include plugins.`);
        }
      }
    } catch (e) {
      console.error('Failed to update package.json workspaces:', e.message);
    }
  }
}

/**
 * Automatically injects the new plugin into the main Vue application's main.ts file.
 * @param {string} pluginName The package name of the plugin
 * @param {string} importName The variable name to import the plugin as
 * @param {boolean} defaultExport Whether the plugin uses a default export
 */
function addPluginToMainTs(pluginName, importName, defaultExport = true) {
  const mainTsPath = path.join(projectRoot, 'src', 'main.ts');
  if (!fs.existsSync(mainTsPath)) return;

  let content = fs.readFileSync(mainTsPath, 'utf-8');

  // If standard plugin or component library, we might use default import
  const importStatement = defaultExport 
    ? `import ${importName} from '${pluginName}'\n`
    : `import { ${importName} } from '${pluginName}'\n`;

  const lastImportIndex = content.lastIndexOf('import ');
  const endOfLastImport = content.indexOf('\n', lastImportIndex);

  content =
    content.slice(0, endOfLastImport + 1) + importStatement + content.slice(endOfLastImport + 1);

  const mountIndex = content.indexOf('app.mount');
  content = content.slice(0, mountIndex) + `app.use(${importName})\n` + content.slice(mountIndex);

  if (IS_DEBUG) {
    console.log(`[DEBUG] Would update src/main.ts to include plugin: ${pluginName}`);
  } else {
    fs.writeFileSync(mainTsPath, content);
    console.log(`Added ${pluginName} to src/main.ts`);
  }
}

/**
 * Orchestrates the creation of a new plugin, components library, or utility package.
 * Handles templating, workflows, and workspace injection.
 */
async function setupPlugin() {
  console.log('\nSetting up for Plugin Development...');

  const pluginName = await askQuestion('Enter the name of your new plugin (kebab-case): ');

  if (!pluginName) {
    console.log('Plugin name is required.');
    return;
  }

  // Ask for plugin type
  console.log('');
  let pluginType = await selectOption('What type of package are you creating?', [
    { label: 'Vue Component Library (UI Components)', value: 'component-library' },
    { label: 'Vue App Plugin (Provides app.use() install hook)', value: 'vue-plugin' },
    { label: 'Standard Code/Utils Library (No Vue dependency)', value: 'utils-library' },
    { label: 'Vite Plugin (Build tool extension)', value: 'vite-plugin' },
  ]);

  let templateName = pluginType;

  console.log('');
  const deployDocs = await selectOption(
    'Do you want to deploy documentation to GitHub Pages when publishing this plugin?',
    [
      { label: 'Yes', value: 'y' },
      { label: 'No', value: 'n' },
    ],
  );

  const newPluginDir = path.join(pluginsDir, pluginName);

  if (fs.existsSync(newPluginDir)) {
    console.log(`Plugin "${pluginName}" already exists.`);
    return;
  }

  console.log(`Creating plugin from template: ${templateName}`);

  const selectedTemplateDir = path.join(templatesDir, templateName);

  if (!fs.existsSync(selectedTemplateDir)) {
    console.error(`Error: Template "${templateName}" not found at ${selectedTemplateDir}`);
    return;
  }

  // Variables for replacement
  const replacements = {
    '{{PLUGIN_NAME}}': pluginName,
    '{{PASCAL_PLUGIN_NAME}}': toPascalCase(pluginName),
    '{{CAMEL_PLUGIN_NAME}}': toCamelCase(pluginName),
  };

  copyDirectoryRecursive(selectedTemplateDir, newPluginDir, replacements);
  
  // Inject shared docs if the user wants them
  if (deployDocs === 'y') {
    const sharedDocsSrc = path.join(__dirname, '..', 'shared', 'docs');
    const pluginDocsDest = path.join(newPluginDir, 'docs');
    
    if (fs.existsSync(sharedDocsSrc)) {
      copyDirectoryRecursive(sharedDocsSrc, pluginDocsDest, replacements);
      console.log('Injected shared VitePress documentation setup.');
      
      const pluginPkgPath = path.join(newPluginDir, 'package.json');
      if (fs.existsSync(pluginPkgPath)) {
        try {
          const pkg = JSON.parse(fs.readFileSync(pluginPkgPath, 'utf-8'));
          pkg.devDependencies = pkg.devDependencies || {};
          pkg.devDependencies['vitepress'] = '^3.5.0';
          
          pkg.scripts = pkg.scripts || {};
          pkg.scripts['docs:dev'] = 'vitepress dev docs';
          pkg.scripts['docs:build'] = 'vitepress build docs';
          
          fs.writeFileSync(pluginPkgPath, JSON.stringify(pkg, null, 2));
          console.log('Updated plugin package.json with VitePress scripts and dependencies.');
        } catch (e) {
          console.error('Failed to update plugin package.json for docs:', e.message);
        }
      }
    }
  }

  // Handle workflow copying for non-NPM plugins (e.g., Browser Extensions, Electron)
  const workflowSrcDir = path.join(newPluginDir, '.github', 'workflows');
  const rootWorkflowDestDir = path.join(projectRoot, '.github', 'workflows');

  if (fs.existsSync(workflowSrcDir)) {
      if (!fs.existsSync(rootWorkflowDestDir)) {
         if (!IS_DEBUG) fs.mkdirSync(rootWorkflowDestDir, { recursive: true });
      }

      const files = fs.readdirSync(workflowSrcDir);
      for (const file of files) {
          const srcFile = path.join(workflowSrcDir, file);
          const destFile = path.join(rootWorkflowDestDir, file);
          
          if (!fs.existsSync(destFile)) {
              try {
                  if (IS_DEBUG) {
                      console.log(`[DEBUG] Would copy ${file} to ${destFile}`);
                  } else {
                      fs.copyFileSync(srcFile, destFile);
                      console.log(`Copied ${file} GitHub Actions workflow.`);
                  }
              } catch (e) {
                  console.error(`Failed to copy workflow ${file}:`, e.message);
              }
          } else {
              console.log(`Workflow ${file} already exists at root, skipping copy.`);
          }
      }
      
      // Remove the .github directory from the plugin folder since it doesn't belong there
      if (!IS_DEBUG) {
          fs.rmSync(path.join(newPluginDir, '.github'), { recursive: true, force: true });
      } else {
           console.log(`[DEBUG] Would remove .github from plugin directory ${newPluginDir}`);
      }
  }

  // We now use publish_package.yml directly. `setupReleaseWorkflow` will link it.

  // Ensure standard CI workflow is copied if setting up the first plugin
  const ciWorkflowSrc = path.join(__dirname, '..', 'workflows', 'ci.yml');
  const ciWorkflowDest = path.join(rootWorkflowDestDir, 'ci.yml');

  if (!fs.existsSync(rootWorkflowDestDir)) {
    if (!IS_DEBUG) fs.mkdirSync(rootWorkflowDestDir, { recursive: true });
  }

  if (fs.existsSync(ciWorkflowSrc) && !fs.existsSync(ciWorkflowDest)) {
    if (IS_DEBUG) {
      console.log(`[DEBUG] Would copy ci.yml to ${ciWorkflowDest}`);
    } else {
      fs.copyFileSync(ciWorkflowSrc, ciWorkflowDest);
      console.log('Copied standard CI GitHub Actions workflow.');
    }
  }

  // Ensure the publish_package workflow is copied for this plugin
  const publishWorkflowSrc = path.join(__dirname, '..', 'workflows', 'publish_package.yml');
  const publishWorkflowDest = path.join(rootWorkflowDestDir, 'publish_package.yml');
  if (fs.existsSync(publishWorkflowSrc)) {
    try {
      if (IS_DEBUG) {
        console.log(`[DEBUG] Would configure publish_package.yml to ${publishWorkflowDest}`);
      } else {
        let publishContent = fs.readFileSync(publishWorkflowSrc, 'utf-8');
        publishContent = publishContent.replace(/\{\{PLUGIN_NAME\}\}/g, pluginName);
        publishContent = publishContent.replace(/\{\{DEPLOY_DOCS\}\}/g, deployDocs === 'y' ? 'true' : 'false');
        fs.writeFileSync(publishWorkflowDest, publishContent);
        console.log(`Copied and configured publish_package.yml workflow for ${pluginName}.`);
      }
    } catch (e) {
      console.error('Failed to configure publish_package.yml:', e.message);
    }
  }

  // Ensure all composite actions are copied to .github/actions
  const actionsSrcDir = path.join(__dirname, '..', 'workflows', 'actions');
  const actionsDestDir = path.join(projectRoot, '.github', 'actions');
  if (fs.existsSync(actionsSrcDir)) {
    try {
      if (IS_DEBUG) {
        console.log(`[DEBUG] Would copy composite actions from ${actionsSrcDir} to ${actionsDestDir}`);
      } else {
        copyDirectoryRecursive(actionsSrcDir, actionsDestDir, {});
        console.log('Copied all composite actions to .github/actions.');
      }
    } catch (e) {
      console.error('Failed to copy composite actions:', e.message);
    }
  }

  // Copy standard release workflow and link it to publish_package.yml
  await setupReleaseWorkflow('publish_package.yml');

  // Removed separate deployDocs workflow copying in favor of consolidated publish_package.yml

  console.log(`Plugin "${pluginName}" created at plugins/${pluginName}`);

  // Automatically update workspaces in package.json
  updateWorkspaces();

  // Ensure root build script can handle workspaces, building workspaces FIRST
  updateRootPackageScripts({
    "build:app": "vue-tsc --noEmit && vite build",
    "build:workspaces": "npm run build --workspaces --if-present",
    "build": "npm run build:workspaces && npm run build:app",
    "publish:test": "npm run publish:test --workspaces --if-present"
  });

  if (pluginType === 'component-library' || pluginType === 'vue-plugin') {
    console.log('');
    const addToMain = await selectOption(
      'Do you want to automatically add this plugin to main.ts using app.use()?',
      [
        { label: 'Yes', value: 'y' },
        { label: 'No', 'value': 'n' },
      ],
    );
    if (addToMain === 'y') {
      const pascalName = toPascalCase(pluginName);
      if (pluginType === 'vue-plugin') {
        // Vue plugins might export a specific named object or default
        addPluginToMainTs(pluginName, `${pascalName}Plugin`, true);
      } else {
        addPluginToMainTs(pluginName, `${pascalName}Plugin`, true);
      }
    }
  }

  console.log(
    '\n\x1b[32m%s\x1b[0m',
    'Setup complete! Please run `npm install` to link the new workspace.',
  );
}

module.exports = setupPlugin;