# Manual Rebase Conflict Resolution Guide

This guide explains how to manually resolve rebase conflicts when the automated rebase workflow fails.

## Overview

The automated workflow attempts to rebase the `opensoft-prod` branch onto the upstream `production` branch. When conflicts occur, they must be resolved manually.

## Prerequisites

- Git installed locally
- Write access to the opensoft/opencode repository
- Familiarity with Git rebase and conflict resolution

## Steps to Resolve Conflicts

### 1. Clone the Repository (if not already done)

```bash
git clone https://github.com/opensoft/opencode.git
cd opencode
```

### 2. Add the Upstream Remote

```bash
git remote add upstream https://github.com/sst/opencode.git
```

If the remote already exists, you can skip this step or update it:

```bash
git remote set-url upstream https://github.com/sst/opencode.git
```

### 3. Fetch All Remotes

```bash
git fetch origin
git fetch upstream
```

### 4. Checkout the opensoft-prod Branch

```bash
git checkout opensoft-prod
```

### 5. Start the Rebase

```bash
git rebase upstream/production
```

### 6. Resolve Conflicts

When conflicts occur, Git will pause and show you which files have conflicts:

```
CONFLICT (content): Merge conflict in <filename>
```

For each conflicted file:

1. Open the file in your editor
2. Look for conflict markers:
   ```
   <<<<<<< HEAD
   (your changes)
   =======
   (upstream changes)
   >>>>>>> upstream/production
   ```
3. Edit the file to resolve the conflict, keeping the appropriate changes
4. Remove the conflict markers
5. Save the file

### 7. Mark Files as Resolved

After resolving conflicts in a file:

```bash
git add <filename>
```

### 8. Continue the Rebase

```bash
git rebase --continue
```

Repeat steps 6-8 for each conflict that occurs during the rebase.

### 9. Force Push to Update opensoft-prod

⚠️ **Warning**: This is a force push operation. Make sure you've resolved all conflicts correctly.

```bash
git push --force-with-lease origin opensoft-prod
```

Using `--force-with-lease` is safer than `--force` as it will fail if someone else has pushed changes since you last fetched.

## Aborting the Rebase

If you need to abort the rebase and start over:

```bash
git rebase --abort
```

This will return your branch to the state before the rebase started.

## Tips

- **Review changes carefully**: Use `git diff` to review changes before continuing
- **Test after resolution**: If possible, test the code after resolving conflicts
- **Ask for help**: If you're unsure about a conflict, consult with team members
- **Document complex resolutions**: If a conflict required non-obvious resolution, document it in the commit message

## Verification

After successfully pushing, verify the rebase:

1. Check the commit history: `git log --oneline -10`
2. Verify the branch has the expected upstream changes
3. Ensure any custom opensoft changes are preserved

## Re-running the Automated Workflow

After manually resolving and pushing, the automated workflow should succeed on its next run (or you can trigger it manually using workflow_dispatch).
