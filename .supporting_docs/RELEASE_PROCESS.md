# Unified Release Process

This project uses a highly automated, sequential release pipeline powered by `semantic-release` and GitHub Actions. This ensures a consistent, secure, and fully hands-off workflow for versioning, publishing, and documenting every package.

## How It Works

The release process relies on a tightly coupled architecture using `workflow_call` rather than disconnected, tag-based triggers.

### 1. The Versioning Engine (`release.yml`)

The primary orchestrator is `.github/workflows/release.yml`.

- **Trigger:** Pushing commits or merging pull requests into `master`, `main`, `dev`, or `development`.
- **Process:**
  1. The workflow spins up and runs `semantic-release`.
  2. `semantic-release` parses your commit history looking for [Conventional Commits](https://www.conventionalcommits.org/) (e.g., `feat:`, `fix:`, `BREAKING CHANGE:`).
  3. It calculates the correct next semantic version.
  4. It bumps the `version` field in your `package.json`, generates a new `CHANGELOG.md` entry, creates a Git tag, and publishes a GitHub Release.
  5. Finally, if a new release was created, it strictly passes the new version number to the deployment workflow.

### 2. The Deployment Execution

Once `semantic-release` finishes, `release.yml` triggers the secondary publish workflow natively configured for your project type (e.g., `publish_package.yml` for NPM plugins, or `release-electron.yml` for Electron apps).

#### NPM Packages (`publish_package.yml`)

- Runs a build of the workspace (`npm run build`).
- **Dry Run:** On a Pull Request, it runs `npm publish --dry-run` to validate package integrity safely.
- **Production Publish:** On a successful push to your main branches, it runs `npm publish --access public` using the `NPM_TOKEN` to push the package to the NPM registry.

#### Application Deployments (`deploy-webapp.yml`, `release-electron.yml`, etc.)

- Depending on the architecture scaffolded by the setup script, the pipeline will build and upload your compiled application (e.g., to Firebase, Azure, or as a GitHub Release binary artifact).

### 3. The Documentation Stage (VitePress)

If you elected to deploy documentation to GitHub Pages when scaffolding your plugin:

- A `DEPLOY_DOCS` flag is permanently embedded in your `publish_package.yml`.
- Immediately after your NPM publish succeeds, a composite action (`deploy-github-pages`) natively triggers within the same runner.
- It builds your VitePress site (`npm run docs:build`) and securely pushes the artifacts to GitHub Pages without requiring separate orchestration.

---

## Developer & Agent Responsibilities

> [!IMPORTANT]  
> **For AI Agents & Developers:** Because this system is completely automated and sequential, your primary responsibility is to **write meaningful commit messages** following the [Conventional Commits specification](https://www.conventionalcommits.org/en/v1.0.0/). Do not attempt to manually bump versions in `package.json` or manually create release tags.

The automation will handle the versioning, changelogs, publishing, and documentation hosting entirely on its own based on the commit prefixes used!

## Commit Types and Release Triggers

When writing commit messages (or when agents are generating commits), use the following standard prefixes:

### Triggers a Release

- **`feat:`** - A new feature. Triggers a **MINOR** version bump (e.g., 1.0.0 -> 1.1.0).
- **`fix:`** - A bug fix. Triggers a **PATCH** version bump (e.g., 1.0.0 -> 1.0.1).
- **`perf:`** - A code change that improves performance. Triggers a **PATCH** version bump.
- **`BREAKING CHANGE:`** (or `!` after the prefix like `feat!:` or `fix!:`) - An API breaking change. Triggers a **MAJOR** version bump (e.g., 1.0.0 -> 2.0.0).

### Does NOT Trigger a Release (Safe to use for internal updates)

Use these prefixes when you want to update the repository without triggering the CI/CD deployment pipeline:

- **`docs:`** - Documentation only changes (e.g., updating the README). Use this when updating a doc but you are not wanting to trigger a release.
- **`chore:`** - Changes to the build process or auxiliary tools and libraries (e.g., updating dependencies, modifying `.gitignore`).
- **`style:`** - Changes that do not affect the meaning of the code (white-space, formatting, missing semi-colons, etc).
- **`refactor:`** - A code change that neither fixes a bug nor adds a feature.
- **`test:`** - Adding missing tests or correcting existing tests.
- **`ci:`** - Changes to CI configuration files and scripts.

### Example Usage

To update the documentation without deploying a new version:

```bash
git commit -m "docs: update readme with new API instructions"
```

To add a new feature that will be automatically deployed:

```bash
git commit -m "feat: add user authentication"
```
