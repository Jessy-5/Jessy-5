# Profile banner rotation

The profile uses four lossless WebP signature banners in `assets/banner/`. The first banner is ice blue; each daily rotation randomly selects one of the other three. Original PNGs, the standalone signature and earlier banner backups are excluded from this public repository.

- Schedule: daily at **09:17 Asia/Shanghai** (`01:17 UTC`). GitHub may delay scheduled runs.
- The Shanghai date in `.github/banner-state.json` prevents multiple changes on the same day, including workflow retries and manual runs. The profile README contains no rotation metadata or HTML.
- Only the banner's Markdown image reference is updated in the README. All other profile content is preserved.
- The workflow commits the README and state-file updates as `github-actions[bot]`. All visitors see the same current banner; page refreshes do not trigger rotation.
- Each variant has its own image URL, so daily rotation switches references rather than replacing a single cached image.

## Activation

Commit and push the README, all four WebP files, and the `.github/` files to this repository's default branch. The schedule becomes available after that push, provided GitHub Actions is enabled and repository rules allow the workflow's `contents: write` token to push to the branch. No additional secret or external image service is required.

To run manually, open **Actions → Rotate profile banner → Run workflow**. A run on a day already recorded in the state file safely does nothing. Keep one standard Markdown banner image pointing to one of the four files in `assets/banner/` when editing the profile; no hidden markers or HTML comments are needed.

## Local verification

Requires Node.js 18 or newer, with no extra packages:

```sh
node --test .github/scripts/rotate-banner.test.mjs
```

The tests use temporary fixtures and never commit or push anything. Running `node .github/scripts/rotate-banner.mjs` updates the local README image reference and state file if the recorded Shanghai date is older than today.

Reference: [GitHub scheduled workflows](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#schedule).
