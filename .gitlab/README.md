# GitLab CI/CD Configuration

This project uses GitLab CI/CD for automated testing and deployment.

## Pipeline Overview

The pipeline (`.gitlab-ci.yml`) consists of three stages:

### 1. Test Stage

**Multi-version Node.js testing:**
- `test:node18` - Tests on Node.js 18.x
- `test:node20` - Tests on Node.js 20.x (with coverage)
- `test:node22` - Tests on Node.js 22.x
- `test:integration` - Integration tests (manual trigger)

**Each job runs:**
- Type checking (`npm run typecheck`)
- Linting (`npm run lint`)
- Build (`npm run build`)
- Tests (`npm test`)
- Coverage (Node 20 only)

### 2. Security Stage

**Security scanning:**
- `security:audit` - npm vulnerability audit
- `security:trivy` - Trivy container/filesystem scanning

### 3. Docker Stage

**Container build:**
- `docker:build` - Verifies Docker image builds successfully

## Pipeline Features

### Coverage Reporting

The pipeline extracts coverage percentage and displays it in GitLab:

```yaml
coverage: '/All files[^|]*\|[^|]*\s+([\d\.]+)/'
```

Coverage reports are available in:
- Job artifacts (downloadable)
- GitLab coverage visualization
- `coverage/` directory

### Caching

Node modules are cached between pipeline runs for faster execution:

```yaml
cache:
  key: ${CI_COMMIT_REF_SLUG}
  paths:
    - .npm/
    - node_modules/
```

### Artifacts

The pipeline preserves:
- Coverage reports (1 week)
- Build artifacts (`dist/`)
- Test results (JUnit XML)
- Security scan reports

## Triggering the Pipeline

### Automatic Triggers

Pipeline runs automatically on:
- Push to `main` branch
- Push to `develop` branch
- Merge requests to `main` or `develop`

### Manual Triggers

Integration tests can be triggered manually:
- Go to CI/CD > Pipelines
- Click "Run pipeline"
- Expand `test:integration` job
- Click "Play" button

## Viewing Pipeline Results

1. **Navigate to CI/CD > Pipelines**
2. **Click on a pipeline**
3. **View job status:**
   - ✓ Green = passed
   - ✗ Red = failed
   - ⏸ Gray = manual/skipped

4. **Click a job to view logs**
5. **Download artifacts** from job page

## Pipeline Status Badge

Add to your README:

```markdown
[![pipeline status](https://gitlab.com/your-username/mcp-lsp-bridge/badges/main/pipeline.svg)](https://gitlab.com/your-username/mcp-lsp-bridge/-/commits/main)

[![coverage report](https://gitlab.com/your-username/mcp-lsp-bridge/badges/main/coverage.svg)](https://gitlab.com/your-username/mcp-lsp-bridge/-/commits/main)
```

## Local Pipeline Testing

Test pipeline configuration locally with GitLab Runner:

```bash
# Install gitlab-runner
curl -L https://packages.gitlab.com/install/repositories/runner/gitlab-runner/script.deb.sh | sudo bash
sudo apt-get install gitlab-runner

# Validate configuration
gitlab-runner exec docker test:node20
```

## Troubleshooting

### Pipeline Fails on npm ci

**Issue:** `npm ci` fails with "package-lock.json not found"

**Solution:** Ensure `package-lock.json` is committed:
```bash
git add package-lock.json
git commit -m "Add package-lock.json"
```

### Coverage Not Showing

**Issue:** Coverage percentage not extracted

**Solution:** Verify vitest output matches regex pattern:
```
All files        | 85.23 | 78.45 | 90.12 | 85.23 |
```

### Docker Build Fails

**Issue:** Docker service connection error

**Solution:** Check `.gitlab-ci.yml` has:
```yaml
services:
  - docker:24-dind
```

## Comparison: GitLab vs GitHub Actions

| Feature | GitLab CI/CD | GitHub Actions |
|---------|--------------|----------------|
| Configuration | `.gitlab-ci.yml` | `.github/workflows/ci.yml` |
| Coverage visualization | ✓ Built-in | Via Codecov |
| Artifacts storage | ✓ Built-in | ✓ Built-in |
| Manual triggers | ✓ Yes | ✓ Yes |
| Security scanning | ✓ Built-in | Via marketplace |
| Status | ✓ Active | Disabled for account |

## Environment Variables

Set in GitLab: Settings > CI/CD > Variables

Recommended variables:
- `CODECOV_TOKEN` - For Codecov integration (optional)
- `DOCKER_USERNAME` - For Docker Hub push (if needed)
- `DOCKER_PASSWORD` - For Docker Hub push (if needed)

## Next Steps

1. Push changes to trigger first pipeline
2. Monitor pipeline execution
3. Review coverage reports
4. Fix any failing tests
5. Iterate and improve

---

**Documentation:** [GitLab CI/CD Documentation](https://docs.gitlab.com/ee/ci/)
**Support:** Open an issue if you encounter problems
