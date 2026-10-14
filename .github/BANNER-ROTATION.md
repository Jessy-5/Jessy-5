# Profile banner rotation

The profile uses four lossless WebP signature banners in `assets/banner/`. The first banner is ice blue; each daily rotation randomly selects one of the other three. The current layout uses `-v2.webp` filenames to give the revised images fresh URLs. Original PNGs, the standalone signature and earlier banner backups are excluded from this public repository.

- Schedule: checks at **00:17, 01:17, 09:17 and 17:17 Asia/Shanghai** (`16:17, 17:17, 01:17 and 09:17 UTC`). The first successful check each day rotates the image; subsequent checks do nothing. GitHub may delay or drop scheduled runs, so these backup checks reduce dependence on one trigger. They cannot guarantee an exact rotation time.
- A push to `main` that changes the profile, banner assets, rotation script/state or workflow also triggers a check. This verifies activation after uploading changes and recovers a stale banner without waiting for the next scheduled check. The bot's push uses `GITHUB_TOKEN`, which does not trigger another push workflow run.
- The Shanghai date in `.github/banner-state.json` prevents multiple changes on the same day, including workflow retries and manual runs. The profile README contains no rotation metadata or HTML.
- Only the banner's Markdown image reference is updated in the README. All other profile content is preserved.
- The workflow commits the README and state-file updates as `github-actions[bot]`. All visitors see the same current banner; page refreshes do not trigger rotation.
- Each variant has its own image URL, so daily rotation switches references rather than replacing a single cached image.

## Activation

Commit and push the README, all four WebP files, and the `.github/` files to this repository's default branch, currently `main`. This starts a check immediately. GitHub Actions must be enabled and repository rules must allow the workflow's `contents: write` token to push to the branch. No additional secret or external image service is required. If the default branch is renamed, update the workflow's push branch filter as well.

To run manually, open **Actions → Rotate profile banner → Run workflow**. A run on a day already recorded in the state file safely does nothing. Keep one standard Markdown banner image pointing to one of the four files in `assets/banner/` when editing the profile; no hidden markers or HTML comments are needed.

## Checking activation

After pushing, open **Actions → Rotate profile banner** and check that a run appears and completes successfully. Its job summary reports the Shanghai date and whether a new banner was selected. A changed selection also creates a `chore(profile): rotate daily banner` commit.

On 2026-10-14, the public GitHub API showed this workflow as `active` on `main` with **zero runs**, while the state still recorded 2026-10-13. This identifies a missing trigger rather than a failed selection script. With no run or logs, the API does not establish whether the schedule was delayed or dropped. The revised triggers make activation visible on push and provide additional daily recovery opportunities.

## Local verification

Requires Node.js 18 or newer, with no extra packages:

```sh
node --test .github/scripts/rotate-banner.test.mjs
```

The tests use temporary fixtures and never commit or push anything. Running `node .github/scripts/rotate-banner.mjs` updates the local README image reference and state file if the recorded Shanghai date is older than today.

References: [GitHub scheduled workflows](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#schedule), [preventing recursive workflow runs](https://docs.github.com/en/actions/how-tos/write-workflows/choose-when-workflows-run/trigger-a-workflow#triggering-a-workflow-from-a-workflow).
