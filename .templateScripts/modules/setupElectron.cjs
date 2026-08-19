const fs = require('fs');
const path = require('path');
const {
  templatesDir,
  projectRoot,
  IS_DEBUG,
  copyDirectoryRecursive,
  updateRootPackageScripts,
  setupReleaseWorkflow
} = require('../utils.cjs');

/**
 * Orchestrates the setup of an Electron desktop application.
 * Handles templates, scripts, and workflows specific to Electron releases.
 */
async function setupElectron() {
  console.log('\nSetting up for Electron App...');
  const electronTemplateDir = path.join(templatesDir, 'electron-app');
  copyDirectoryRecursive(
    path.join(electronTemplateDir, 'electron'),
    path.join(projectRoot, 'electron'),
    {},
  );

  const forgeConfigSrc = path.join(electronTemplateDir, 'forge.config.cjs');
  const forgeConfigDest = path.join(projectRoot, 'forge.config.cjs');

  if (IS_DEBUG) {
    console.log(`[DEBUG] Would copy forge.config.cjs to ${forgeConfigDest}`);
  } else {
    fs.copyFileSync(forgeConfigSrc, forgeConfigDest);
  }

  const workflowDestDir = path.join(projectRoot, '.github', 'workflows');
  if (!fs.existsSync(workflowDestDir)) {
    if (!IS_DEBUG) fs.mkdirSync(workflowDestDir, { recursive: true });
  }

  // Copy specialized release workflow
  const releaseWorkflowSrc = path.join(__dirname, '..', 'workflows', 'publish_electron.yml');
  const releaseWorkflowDest = path.join(workflowDestDir, 'publish_electron.yml');

  if (fs.existsSync(releaseWorkflowSrc)) {
    if (IS_DEBUG) {
      console.log(`[DEBUG] Would copy publish_electron.yml to ${releaseWorkflowDest}`);
    } else {
      fs.copyFileSync(releaseWorkflowSrc, releaseWorkflowDest);
      console.log('Copied Electron GitHub Actions workflow.');
    }
  }

  // Copy standard CI workflow
  const ciWorkflowSrc = path.join(__dirname, '..', 'workflows', 'ci.yml');
  const ciWorkflowDest = path.join(workflowDestDir, 'ci.yml');

  if (fs.existsSync(ciWorkflowSrc) && !fs.existsSync(ciWorkflowDest)) {
    try {
      if (IS_DEBUG) {
        console.log(`[DEBUG] Would copy ci.yml to ${ciWorkflowDest}`);
      } else {
        fs.copyFileSync(ciWorkflowSrc, ciWorkflowDest);
        console.log('Copied standard CI GitHub Actions workflow.');
      }
    } catch (e) {
      console.error('Failed to copy ci.yml:', e.message);
    }
  }

  // Copy standard release workflow
  await setupReleaseWorkflow('publish_electron.yml');

  // Update package.json scripts
  updateRootPackageScripts({
    "electron:start": "electron-forge start",
    "electron:package": "electron-forge package",
    "electron:make": "electron-forge make"
  });

  const packageJsonPath = path.join(projectRoot, 'package.json');
  if (fs.existsSync(packageJsonPath)) {
    try {
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
      packageJson.main = 'electron/main.cjs';
      
      packageJson.devDependencies = packageJson.devDependencies || {};
      packageJson.devDependencies['electron'] = '^34.0.0';
      packageJson.devDependencies['@electron-forge/cli'] = '^7.4.0';
      packageJson.devDependencies['@electron-forge/maker-deb'] = '^7.4.0';
      packageJson.devDependencies['@electron-forge/maker-rpm'] = '^7.4.0';
      packageJson.devDependencies['@electron-forge/maker-squirrel'] = '^7.4.0';
      packageJson.devDependencies['@electron-forge/maker-zip'] = '^7.4.0';
      packageJson.devDependencies['electron-squirrel-startup'] = '^1.0.0';

      if (IS_DEBUG) {
        console.log(`[DEBUG] Would update package.json with Electron main entry and dependencies`);
      } else {
        fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
        console.log('Updated package.json for Electron.');
      }
    } catch (e) {
      console.error('Failed to update package.json:', e.message);
    }
  }

  const readmeSrc = path.join(electronTemplateDir, 'README.md');
  const readmeDest = path.join(projectRoot, 'README.md');
  if (fs.existsSync(readmeSrc)) {
    if (IS_DEBUG) {
      console.log(`[DEBUG] Would copy Electron App README.md to ${readmeDest}`);
    } else {
      fs.copyFileSync(readmeSrc, readmeDest);
      console.log('Copied Electron App README.md to project root.');
    }
  }
}

module.exports = setupElectron;