# Releasing QuartoReview

The repository includes a one-command release script.

## Normal release flow

From the repository root:

```powershell
npm run release -- 0.0.2
```

That command will:

1. verify the git working tree is clean
2. verify you are on `master`
3. update the version in all package manifests and lockfiles
4. create a git commit
5. create a tag like `v0.0.2`
6. push `master`
7. push the tag

After that, GitHub Actions will build and publish the release automatically.

## Requirements

- Work from the `master` branch
- Make sure all intended changes are already committed or staged before running the release command
- Use a new version number each time

## Example

```powershell
npm run release -- 0.0.1
```

This will create:

- git commit: `Release v0.0.1`
- git tag: `v0.0.1`

and trigger the release workflow on GitHub.

## If a release tag failed

Delete the local and remote tag first, then rerun the release with the version you actually want:

```powershell
git tag -d v0.0.1
git push origin :refs/tags/v0.0.1
```
