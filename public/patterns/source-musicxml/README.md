# MusicXML to ABC Conversion

This directory contains source MusicXML files that are automatically converted to ABC notation.

## How it works

1. Place MusicXML files (`.xml` or `.musicxml`) in this directory
2. Push to GitHub
3. The GitHub Action automatically converts them to ABC files in `/public/patterns/`
4. The ABC files are then available in the pattern library

## Manual Conversion

You can also convert files manually using the Python script:

```bash
# Install dependencies
pip install music21

# Convert a single file
python scripts/musicxml_to_abc.py public/patterns/source-musicxml/mypattern.xml public/patterns/mypattern.abc

# Or just output to stdout
python scripts/musicxml_to_abc.py public/patterns/source-musicxml/mypattern.xml
```

## File Format

The converter extracts rhythm information from the first part/voice of the MusicXML file. It captures:

- Note durations (whole, half, quarter, eighth, sixteenth, dotted notes)
- Rests
- Ties
- Time signature
- Bar lines

The ABC files can then be imported using the existing ABC import feature in the app.

## Example Files

- `test-simple.xml` - Four quarter notes in 4/4 time (for testing)

## Adding New Patterns

1. Export your rhythm pattern from any music notation software (MuseScore, Finale, Sibelius, etc.) as MusicXML
2. Place the file in this directory
3. Commit and push
4. The GitHub Action will automatically convert it
5. Add the pattern to `/public/patterns/index.json` to make it available in the library
