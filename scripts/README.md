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

## musicxml_to_abc.py

Converts MusicXML files to ABC notation format using the music21 library.

### Prerequisites

```bash
# Create a virtual environment (recommended)
python3 -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt
```

### Usage

```bash
# Convert to stdout
python scripts/musicxml_to_abc.py input.xml

# Convert to file
python scripts/musicxml_to_abc.py input.xml output.abc
```

### Features

- Extracts rhythm from first part/voice of MusicXML
- Handles all common durations (whole, half, quarter, eighth, sixteenth, dotted)
- Preserves ties
- Converts rests
- Extracts time signature and key
- Generates clean ABC notation

### Automation

This script is automatically run by the GitHub Action `.github/workflows/convert-musicxml.yml` whenever MusicXML files are pushed to `public/patterns/source-musicxml/`.

The workflow:
1. Detects new/changed MusicXML files
2. Converts them to ABC
3. Commits the ABC files back to the repo

### Examples

Input (MusicXML):
- `test-simple.xml` - Four quarter notes
- `test-complex.xml` - Mixed rhythms with ties, rests, dotted notes

Output (ABC):
```abc
X:1
T:Simple Quarter Notes
M:4/4
L:1/4
K:C major
C C C C |
```

### Local Testing

Test the converter locally before pushing:

```bash
source .venv/bin/activate
python scripts/musicxml_to_abc.py public/patterns/source-musicxml/your-file.xml
```

### Integration with App

The generated ABC files can be imported using the existing "Import from ABC" feature in the Pattern Designer.
