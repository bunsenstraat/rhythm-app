# Scripts

Utility scripts for maintaining the Rhythm Trainer app.

## update-pattern-index.js

Automatically generates `public/patterns/index.json` by scanning all pattern files in the `public/patterns/` directory.

### Usage

```bash
npm run update-patterns
```

### What it does

1. Scans `public/patterns/` for all `.json` files (excluding `index.json`)
2. Reads each pattern file and extracts:
   - `filename`: The pattern's filename
   - `category`: Maps from the pattern's `difficulty` field (beginner/intermediate/advanced)
   - `name`: The pattern's display name
3. Sorts patterns by category, then alphabetically by name
4. Writes the updated index to `public/patterns/index.json`

### When to use

Run this script whenever you:
- Add new pattern files
- Remove pattern files
- Change a pattern's name or difficulty level

The script ensures the pattern index is always in sync with the actual pattern files.
