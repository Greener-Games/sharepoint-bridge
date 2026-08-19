const path = require('path');
const fs = require('fs');
const {
  templatesDir,
  projectRoot,
  IS_DEBUG,
  copyDirectoryRecursive,
  updateRootPackageScripts,
  setupReleaseWorkflow
} = require('../utils.cjs');

/**
 * Orchestrates the setup of a Browser Extension project.
 * Handles templates and workflows specific to browser extension releases.
 */
async function setupBrowserExtension() {
  console.log('\nSetting up for Browser Extension...');
  const extensionTemplateDir = path.join(templatesDir, 'browser-extension');
  copyDirectoryRecursive(
    path.join(extensionTemplateDir, 'public'),
    path.join(projectRoot, 'public'),
    {},
  );
  copyDirectoryRecursive(path.join(extensionTemplateDir, 'src'), path.join(projectRoot, 'src'), {});
  
  const workflowDestDir = path.join(projectRoot, '.github', 'workflows');
  if (!fs.existsSync(workflowDestDir)) {
    if (!IS_DEBUG) fs.mkdirSync(workflowDestDir, { recursive: true });
  }

  // Copy specialized release workflow
  const releaseWorkflowSrc = path.join(__dirname, '..', 'workflows', 'publish_extension.yml');
  const releaseWorkflowDest = path.join(workflowDestDir, 'publish_extension.yml');

  if (fs.existsSync(releaseWorkflowSrc)) {
    if (IS_DEBUG) {
      console.log(`[DEBUG] Would copy publish_extension.yml to ${releaseWorkflowDest}`);
    } else {
      fs.copyFileSync(releaseWorkflowSrc, releaseWorkflowDest);
      console.log('Copied Browser Extension GitHub Actions workflow.');
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
  await setupReleaseWorkflow('publish_extension.yml');

  // Ensure root build script handles standard builds
  updateRootPackageScripts({
    "build": "vue-tsc --noEmit && vite build"
  });

  const readmeSrc = path.join(extensionTemplateDir, 'README.md');
  const readmeDest = path.join(projectRoot, 'README.md');
  if (fs.existsSync(readmeSrc)) {
    if (IS_DEBUG) {
      console.log(`[DEBUG] Would copy Browser Extension README.md to ${readmeDest}`);
    } else {
      fs.copyFileSync(readmeSrc, readmeDest);
      console.log('Copied Browser Extension README.md to project root.');
    }
  }

  console.log('Browser Extension files copied.');
}

module.exports = setupBrowserExtension;