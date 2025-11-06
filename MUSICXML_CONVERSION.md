# MusicXML Import via GitHub Actions

## Overview

Instead of using a messy jQuery-based xml2abc library in the browser, we now use a **GitHub Action** with Python's `music21` library to pre-convert MusicXML files to ABC notation.

## Why This Approach?

✅ **No runtime dependencies** - No minified jQuery code in the app
✅ **Clean codebase** - Removed 60+ lines of complex parsing code  
✅ **Python music21** - Professional, well-maintained music notation library
✅ **Pre-converted patterns** - ABC files ready to use
✅ **Simpler frontend** - Just use existing ABC import feature

## How It Works

```
1. Add MusicXML file to public/patterns/source-musicxml/
2. Push to GitHub
3. GitHub Action runs Python script
4. ABC file automatically created in public/patterns/
5. Import using existing ABC feature in app
```

## Files Created

### GitHub Action
- `.github/workflows/convert-musicxml.yml` - Auto-converts on push

### Python Script
- `scripts/musicxml_to_abc.py` - Conversion script using music21
- `requirements.txt` - Python dependencies

### Documentation
- `public/patterns/source-musicxml/README.md` - Usage guide
- `scripts/README.md` - Updated with converter docs

### Test Files
- `public/patterns/source-musicxml/test-simple.xml` - Basic test
- `public/patterns/source-musicxml/test-complex.xml` - Ties, dots, rests

## Local Testing

```bash
# Setup
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

# Convert
python scripts/musicxml_to_abc.py public/patterns/source-musicxml/test-simple.xml
```

Output:
```abc
X:1
T:Simple Quarter Notes
M:4/4
L:1/4
K:C major
C C C C |
```

## What Was Removed

❌ `xml2abc` npm package (jQuery-based, minified)
❌ `src/xml2abc.js` (550KB minified file)
❌ `src/xml2abc.d.ts` (Type declarations)
❌ MusicXML upload UI in PatternDesigner
❌ `handleMusicXMLUpload()` method (25 lines)
❌ `parseMusicXML()` method (35 lines)
❌ Script tag in index.html

## Features Supported

✅ All note durations (whole, half, quarter, eighth, sixteenth)
✅ Dotted notes (e.g., dotted quarter = `C3/2`)
✅ Ties (e.g., `C3/2- C/2`)
✅ Rests (e.g., `z`)
✅ Time signatures
✅ Multiple measures
✅ Bar lines

## Workflow

**For users:**
1. Export rhythm from MuseScore/Finale/Sibelius as MusicXML
2. Upload to `public/patterns/source-musicxml/`
3. Commit & push
4. ABC file auto-generated
5. Import using ABC feature

**Automatic conversion happens on:**
- Push to main branch with changes in `source-musicxml/`
- Manual workflow dispatch

## Benefits

- **Cleaner code**: Removed jQuery dependency and minified code
- **Better testing**: Can test converter locally with Python
- **Easier maintenance**: Python is more readable than minified JS
- **Professional tools**: music21 is industry-standard
- **Version control**: ABC files committed to repo for transparency
