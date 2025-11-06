# Scripts

Utility scripts for maintaining the Rhythm Trainer app.

## fix-patterns.js

Validates and auto-corrects all pattern files in `public/patterns/` directory. Fixes bar length issues, incomplete bars, and updates metadata.

### Usage

```bash
npm run fix-patterns
```

### What it does

1. Scans all pattern files for rhythm validation issues:
   - **Overfilled bars**: Too many beats in a bar
   - **Incomplete bars**: Not enough beats to complete a bar
   - **Metadata mismatches**: Actual bar count vs declared bar count

2. Auto-corrects problems by:
   - Filling incomplete bars with appropriately-sized rests
   - Updating the `bars` metadata to match actual bar count
   - Preserving all original notes

3. Shows detailed report:
   - Which patterns were valid
   - Which patterns had issues and how they were fixed
   - Summary statistics

### When to use

Run this script whenever you:
- Add new pattern files
- Manually edit pattern files
- Notice rhythm calculation issues
- Want to validate all patterns at once

### Example output

```
🔍 Validating 23 pattern files...

⚠️  bossa-nova-8bar-a.json: Bossa Nova 8-Bar A
   - Bar 6 incomplete: 3.50/4 beats
   - Bar 9 incomplete: 3.00/4 beats
   ✓ Fixed and saved!

✅ basic-quarters.json: Valid

📊 Summary:
   ✅ Valid patterns: 12
   🔧 Fixed patterns: 11
   ❌ Unfixable errors: 0
```

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
