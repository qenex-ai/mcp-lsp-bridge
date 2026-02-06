# GitLab Setup Guide

Since GitHub Actions is disabled for your account, this guide will help you set up GitLab CI/CD for the MCP-LSP Bridge project.

## Option 1: Mirror Repository to GitLab (Recommended)

This keeps your GitHub repository and adds GitLab for CI/CD.

### Step 1: Create GitLab Repository

1. Go to [GitLab.com](https://gitlab.com)
2. Sign in or create an account
3. Click "New project" > "Create blank project"
4. Set project details:
   - **Project name:** mcp-lsp-bridge
   - **Visibility:** Private or Public
   - **Initialize with README:** Uncheck (we're importing)

### Step 2: Add GitLab Remote

```bash
cd /path/to/mcp-lsp-bridge

# Add GitLab as a remote
git remote add gitlab git@gitlab.com:YOUR_USERNAME/mcp-lsp-bridge.git

# Or use HTTPS:
git remote add gitlab https://gitlab.com/YOUR_USERNAME/mcp-lsp-bridge.git

# Verify remotes
git remote -v
```

### Step 3: Push to GitLab

```bash
# Push all branches to GitLab
git push gitlab main

# Push all tags (if any)
git push gitlab --tags

# Set up tracking (optional)
git branch --set-upstream-to=gitlab/main main
```

### Step 4: Verify Pipeline

1. Go to https://gitlab.com/YOUR_USERNAME/mcp-lsp-bridge
2. Click "CI/CD" > "Pipelines"
3. You should see the pipeline running automatically
4. Click on the pipeline to view job status

## Option 2: Use GitLab Repository Push Mirroring

This automatically syncs GitHub → GitLab.

### On GitLab:

1. Create new project (as above)
2. Go to Settings > Repository > Mirroring repositories
3. Enter:
   - **Git repository URL:** https://github.com/qenex-ai/mcp-lsp-bridge.git
   - **Mirror direction:** Pull
   - **Authentication:** None (for public repos) or use token
4. Click "Mirror repository"

GitLab will automatically pull changes from GitHub and run CI/CD.

## Option 3: Import from GitHub

### Complete Migration to GitLab:

1. Go to GitLab.com
2. Click "New project" > "Import project" > "GitHub"
3. Authorize GitLab to access GitHub
4. Select "mcp-lsp-bridge" repository
5. Click "Import"

This imports:
- All code
- All commits
- All branches
- All tags

## Verifying GitLab CI/CD Setup

### Check Pipeline Configuration

```bash
# Validate .gitlab-ci.yml syntax locally
cat .gitlab-ci.yml

# Or use GitLab's CI Lint tool:
# https://gitlab.com/YOUR_USERNAME/mcp-lsp-bridge/-/ci/lint
```

### First Pipeline Run

After pushing to GitLab, the pipeline should automatically:

1. **Test Stage:**
   - Run tests on Node 18, 20, 22
   - Generate coverage report
   - Save test artifacts

2. **Security Stage:**
   - Run npm audit
   - Run Trivy security scan

3. **Docker Stage:**
   - Build Docker image

### Viewing Results

```
GitLab UI:
└── CI/CD
    ├── Pipelines (see all runs)
    ├── Jobs (individual job logs)
    └── Schedules (for recurring pipelines)
```

## Configuring CI/CD Variables

Some features may require environment variables.

### Setting Variables:

1. Go to Settings > CI/CD > Variables
2. Click "Add variable"
3. Add these (if needed):

| Variable | Description | Required |
|----------|-------------|----------|
| `CODECOV_TOKEN` | For Codecov integration | Optional |
| `NPM_TOKEN` | For private npm packages | If using |
| `DOCKER_USERNAME` | For Docker Hub push | If pushing |
| `DOCKER_PASSWORD` | For Docker Hub auth | If pushing |

## Pipeline Status Badge

Add to your README.md:

```markdown
## CI/CD Status

[![pipeline status](https://gitlab.com/YOUR_USERNAME/mcp-lsp-bridge/badges/main/pipeline.svg)](https://gitlab.com/YOUR_USERNAME/mcp-lsp-bridge/-/commits/main)

[![coverage report](https://gitlab.com/YOUR_USERNAME/mcp-lsp-bridge/badges/main/coverage.svg)](https://gitlab.com/YOUR_USERNAME/mcp-lsp-bridge/-/commits/main)
```

Replace `YOUR_USERNAME` with your GitLab username.

## Dual Remote Workflow

If you keep both GitHub and GitLab:

```bash
# Push to both remotes
git push origin main    # GitHub
git push gitlab main    # GitLab

# Or create an alias to push to both
git remote add all https://github.com/qenex-ai/mcp-lsp-bridge.git
git remote set-url --add --push all https://github.com/qenex-ai/mcp-lsp-bridge.git
git remote set-url --add --push all git@gitlab.com:YOUR_USERNAME/mcp-lsp-bridge.git

# Now push to both with:
git push all main
```

## Troubleshooting

### Pipeline Not Running

**Check:**
- Repository has `.gitlab-ci.yml` in root
- File is valid YAML (use CI Lint)
- CI/CD is enabled: Settings > General > Visibility > CI/CD (toggle on)

### Pipeline Fails on First Run

**Common issues:**
1. **npm ci fails:** Ensure `package-lock.json` is committed
2. **Tests fail:** Run `npm test` locally first
3. **Docker build fails:** Check Dockerfile is in root

### Coverage Not Showing

**Verify:**
- `npm run test:coverage` works locally
- Coverage regex in `.gitlab-ci.yml` matches output
- Artifacts are being uploaded

## Next Steps

After GitLab setup:

1. ✓ Push code to GitLab
2. ✓ Verify pipeline runs successfully
3. ✓ Review coverage reports
4. ✓ Add pipeline badge to README
5. ✓ Configure any required CI/CD variables
6. ✓ Set up scheduled pipelines (optional)
7. ✓ Configure notifications (Settings > Integrations)

## Resources

- **GitLab CI/CD Docs:** https://docs.gitlab.com/ee/ci/
- **Pipeline Configuration:** https://docs.gitlab.com/ee/ci/yaml/
- **GitLab vs GitHub Actions:** https://about.gitlab.com/devops-tools/github-vs-gitlab/
- **CI Lint Tool:** https://gitlab.com/YOUR_USERNAME/mcp-lsp-bridge/-/ci/lint

## Support

If you encounter issues:

1. Check pipeline job logs
2. Validate `.gitlab-ci.yml` with CI Lint
3. Review GitLab CI/CD documentation
4. Open an issue in this repository

---

**Generated:** 2026-01-24
**Purpose:** Enable CI/CD after GitHub Actions disabled
**Status:** Ready for GitLab setup
