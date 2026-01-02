## Rebase Conflict Detected

The automated weekly rebase of `opensoft-prod` onto `production` has encountered merge conflicts and requires manual resolution.

### Steps to Resolve

1. **Clone the repository and fetch latest changes:**
   ```bash
   git fetch origin
   ```

2. **Checkout the opensoft-prod branch:**
   ```bash
   git checkout opensoft-prod
   ```

3. **Start the rebase onto production:**
   ```bash
   git rebase origin/production
   ```

4. **Resolve conflicts:**
   - Git will pause at each conflicting commit
   - Open the conflicting files and resolve the conflicts manually
   - Look for conflict markers (`<<<<<<<`, `=======`, `>>>>>>>`)
   - Edit the files to keep the desired changes

5. **After resolving conflicts in each file:**
   ```bash
   git add <resolved-file>
   git rebase --continue
   ```

6. **Repeat steps 4-5 until the rebase is complete**

7. **Force-push the rebased branch:**
   ```bash
   git push --force-with-lease origin opensoft-prod
   ```

### Need Help?

If you're unsure about resolving conflicts, consider:
- Consulting with the team members who made the conflicting changes
- Using a visual merge tool like `git mergetool`
- Reviewing the commit history: `git log origin/production..origin/opensoft-prod`

### Prevention

To minimize future conflicts:
- Keep `opensoft-prod` regularly synced with `production`
- Coordinate large changes with the team
- Consider breaking large features into smaller, incremental updates
