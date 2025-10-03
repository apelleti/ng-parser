# Publishing Guide

Guide for publishing ng-parser to NPM.

## Prerequisites

1. **NPM Account**: Create an account at [npmjs.com](https://www.npmjs.com)
2. **NPM Token**: Generate an automation token with publish permissions
3. **GitHub Repository**: Create a GitHub repository for the project
4. **GitHub Secrets**: Add `NPM_TOKEN` to repository secrets

## Setup

### 1. Update Repository URLs

Edit `package.json` and update the repository URLs:

```json
{
  "repository": {
    "type": "git",
    "url": "https://github.com/YOUR_USERNAME/ng-parser.git"
  },
  "bugs": {
    "url": "https://github.com/YOUR_USERNAME/ng-parser/issues"
  },
  "homepage": "https://github.com/YOUR_USERNAME/ng-parser#readme"
}
```

### 2. Configure NPM Token

#### For GitHub Actions (Automated Publishing)

1. Go to [npmjs.com/settings/tokens](https://www.npmjs.com/settings/tokens)
2. Create a new **Automation** token
3. Copy the token
4. Go to your GitHub repository → Settings → Secrets and variables → Actions
5. Add a new secret named `NPM_TOKEN` with your token value

#### For Local Publishing (Manual)

```bash
npm login
# Enter your NPM credentials
```

### 3. Configure Codecov (Optional)

1. Go to [codecov.io](https://codecov.io) and sign up with GitHub
2. Add your repository
3. Get the repository token
4. Add `CODECOV_TOKEN` to GitHub secrets

## Publishing Process

### Automated Publishing (Recommended)

ng-parser uses GitHub Actions for automated publishing on releases:

1. **Update version** in `package.json`:
   ```bash
   npm version patch  # 1.0.0 → 1.0.1
   npm version minor  # 1.0.0 → 1.1.0
   npm version major  # 1.0.0 → 2.0.0
   ```

2. **Update CHANGELOG.md**:
   - Move changes from `[Unreleased]` to new version section
   - Add release date

3. **Commit and push**:
   ```bash
   git add package.json CHANGELOG.md
   git commit -m "chore: release v1.0.1"
   git push
   ```

4. **Create GitHub Release**:
   ```bash
   git tag v1.0.1
   git push origin v1.0.1
   ```

   Or create a release via GitHub UI:
   - Go to Releases → Draft a new release
   - Tag version: `v1.0.1`
   - Title: `v1.0.1`
   - Description: Copy from CHANGELOG.md
   - Click "Publish release"

5. **Automated Publishing**:
   - GitHub Actions will automatically:
     - Run tests
     - Build the package
     - Publish to NPM with provenance

### Manual Publishing

If you prefer manual publishing:

```bash
# 1. Update version
npm version patch

# 2. Build
npm run build:cli

# 3. Run tests
npm test

# 4. Publish
npm publish --access public
```

## Pre-publish Checklist

Before publishing, ensure:

- [ ] Version number updated in `package.json`
- [ ] CHANGELOG.md updated with new version
- [ ] All tests passing (`npm test`)
- [ ] Build successful (`npm run build:cli`)
- [ ] Documentation up to date
- [ ] README.md reflects current features
- [ ] No uncommitted changes
- [ ] GitHub repository URL correct in `package.json`

## Verify Package Contents

Before publishing, check what will be included:

```bash
npm pack --dry-run
```

This shows the files that will be published. The package includes:

```
dist/              # Compiled JavaScript and types
README.md          # Main documentation
CHANGELOG.md       # Version history
CLI.md             # CLI documentation
API_REFERENCE.md   # API documentation
GETTING_STARTED.md # Getting started guide
LICENSE            # MIT license
package.json       # Package metadata
```

Excluded (via `.npmignore`):
- Source TypeScript files (`src/`)
- Tests and examples
- Development configuration
- GitHub workflows

## Post-publish

After publishing:

1. **Verify on NPM**: Visit https://www.npmjs.com/package/ng-parser
2. **Test installation**:
   ```bash
   npm install -g ng-parser
   ng-parser --version
   ```
3. **Update documentation** if needed
4. **Announce release** (optional):
   - Twitter/X
   - Reddit (r/Angular, r/typescript)
   - Dev.to
   - LinkedIn

## Version Strategy

ng-parser follows [Semantic Versioning](https://semver.org/):

- **Patch** (1.0.x): Bug fixes, documentation updates
- **Minor** (1.x.0): New features, backward compatible
- **Major** (x.0.0): Breaking changes

### Release Cadence

- **Patch releases**: As needed for bug fixes
- **Minor releases**: Monthly for new features
- **Major releases**: Annually or when breaking changes necessary

## Troubleshooting

### "npm ERR! 403 Forbidden"

- Ensure you're logged in: `npm whoami`
- Check NPM_TOKEN is valid
- Verify package name is not taken

### "npm ERR! You do not have permission to publish"

- Use `--access public` flag
- Verify you're the package owner

### Build fails in GitHub Actions

- Check Node.js version compatibility
- Verify all dependencies are in `package.json`
- Check `.npmignore` isn't excluding required files

### Package is too large

Check size:
```bash
npm pack
ls -lh ng-parser-*.tgz
```

Reduce size:
- Ensure examples/ and tests/ are excluded
- Check .npmignore is properly configured
- Remove unnecessary dependencies

## Rollback a Release

If a release has issues:

1. **Deprecate the version**:
   ```bash
   npm deprecate ng-parser@1.0.1 "Please upgrade to 1.0.2"
   ```

2. **Publish a fix**:
   ```bash
   npm version patch
   # Fix the issue
   npm publish
   ```

3. **Never unpublish** unless critical security issue (within 72 hours)

## GitHub Actions Workflows

### CI Workflow (`.github/workflows/ci.yml`)

Runs on every push and PR:
- Tests on Node.js 18, 20, 22
- Linting
- Build verification
- Code coverage (Codecov)

### Publish Workflow (`.github/workflows/publish.yml`)

Runs on GitHub releases:
- Tests
- Build
- Publish to NPM with provenance

## NPM Scripts

- `npm run build` - Build TypeScript
- `npm run build:cli` - Build with CLI executable permissions
- `npm test` - Run tests
- `npm run test:coverage` - Run tests with coverage
- `npm run lint` - Run ESLint
- `npm run format` - Format code with Prettier
- `npm run prepublishOnly` - Auto-run before publish (build + test)

## Support

For issues with publishing:
- Check [NPM documentation](https://docs.npmjs.com/)
- Review [GitHub Actions logs](https://github.com/YOUR_USERNAME/ng-parser/actions)
- Open an issue in the repository
