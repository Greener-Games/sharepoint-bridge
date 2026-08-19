const fs = require('fs');
const path = require('path');
const {
  templatesDir,
  projectRoot,
  IS_DEBUG,
  updateRootPackageScripts,
  setupReleaseWorkflow
} = require('../utils.cjs');

const { askQuestion, selectOption } = require('../utils.cjs');

/**
 * Orchestrates the setup of a main web app project.
 * Handles copying specific workflow files (CI, Deployment) depending on the selected hosting platform.
 */
async function setupProject() {
  console.log('\nSetting up for Project Development...');

  const workflowDestDir = path.join(projectRoot, '.github', 'workflows');
  if (!fs.existsSync(workflowDestDir)) {
    if (!IS_DEBUG) fs.mkdirSync(workflowDestDir, { recursive: true });
  }

  const actionsDestDir = path.join(projectRoot, '.github', 'actions', 'setup-node-build');
  if (!fs.existsSync(actionsDestDir)) {
    if (!IS_DEBUG) fs.mkdirSync(actionsDestDir, { recursive: true });
  }

  // Copy Reusable Setup Node Build action
  const actionSrc = path.join(__dirname, '..', 'workflows', 'actions', 'setup-node-build', 'action.yml');
  const actionDest = path.join(actionsDestDir, 'action.yml');
  if (fs.existsSync(actionSrc)) {
    if (IS_DEBUG) {
      console.log(`[DEBUG] Would copy action.yml to ${actionDest}`);
    } else {
      fs.copyFileSync(actionSrc, actionDest);
      console.log('Copied setup-node-build composite action.');
    }
  }

  // Ask for Hosting Platform
  console.log('');
  let hostingPlatform = await selectOption('Which hosting platform would you like to use for deployment?', [
    { label: 'GitHub Pages', value: 'github-pages' },
    { label: 'Firebase Hosting', value: 'firebase' },
    { label: 'Azure Static Web Apps', value: 'azure' },
    { label: 'None / Skip', value: 'none' },
  ]);

  if (hostingPlatform !== 'none') {
    const hostingWorkflowsDir = path.join(__dirname, '..', 'workflows', 'hosting');
    let workflowsToCopy = [];

    if (hostingPlatform === 'github-pages') {
      workflowsToCopy.push({ src: 'github-pages.yml', dest: 'deploy-webapp.yml' });
    } else if (hostingPlatform === 'firebase') {
      workflowsToCopy.push({ src: 'firebase.yml', dest: 'deploy-webapp.yml' });
    } else if (hostingPlatform === 'azure') {
      workflowsToCopy.push({ src: 'azure.yml', dest: 'deploy-webapp.yml' });
    }

    for (const wf of workflowsToCopy) {
      const srcPath = path.join(hostingWorkflowsDir, wf.src);
      const destPath = path.join(workflowDestDir, wf.dest);
      if (fs.existsSync(srcPath)) {
        try {
          if (IS_DEBUG) {
            console.log(`[DEBUG] Would copy ${wf.src} to ${destPath}`);
          } else {
            fs.copyFileSync(srcPath, destPath);
            console.log(`Copied ${hostingPlatform} workflow as ${wf.dest}`);
          }
        } catch (e) {
          console.error(`Failed to copy workflow ${wf.src}:`, e.message);
        }
      }
    }
  }

  // Copy standard CI workflow
  const ciWorkflowSrc = path.join(__dirname, '..', 'workflows', 'ci.yml');
  const ciWorkflowDest = path.join(workflowDestDir, 'ci.yml');

  if (fs.existsSync(ciWorkflowSrc)) {
    if (IS_DEBUG) {
      console.log(`[DEBUG] Would copy ci.yml to ${ciWorkflowDest}`);
    } else {
      fs.copyFileSync(ciWorkflowSrc, ciWorkflowDest);
      console.log('Copied standard CI GitHub Actions workflow.');
    }
  }

  // Copy standard release workflow
  if (hostingPlatform !== 'none') {
    await setupReleaseWorkflow('deploy-webapp.yml');
  } else {
    await setupReleaseWorkflow(); // Won't link to a publish job
  }

  // Ensure root build script can handle workspaces, building workspaces FIRST
  updateRootPackageScripts({
    "build": "vue-tsc --noEmit && vite build"
  });

  // Copy root README.md for the web app
  const readmeSrc = path.join(templatesDir, 'web-app', 'README.md');
  const readmeDest = path.join(projectRoot, 'README.md');
  try {
    if (fs.existsSync(readmeSrc)) {
      if (IS_DEBUG) {
        console.log(`[DEBUG] Would copy Web App README.md to ${readmeDest}`);
      } else {
        fs.copyFileSync(readmeSrc, readmeDest);
        console.log('Copied Web App README.md to project root.');
      }
    }
  } catch (e) {
    console.error('Failed to copy Web App README.md:', e.message);
  }

  console.log('Project setup complete.');
}

module.exports = setupProject;