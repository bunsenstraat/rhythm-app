# Preset Rhythm Patterns

This directory contains 13 preset rhythm patterns that users can load into the Rhythm Trainer app. Each pattern is a JSON file containing:

- **name**: Display name of the pattern
- **description**: Brief explanation of the rhythmic concept
- **difficulty**: One of "beginner", "intermediate", or "advanced"
- **pattern**: The RhythmPattern object with bars, beatsPerBar, and notes array

## Pattern Structure

Each pattern file follows this structure:

```json
{
  "name": "Pattern Name",
  "description": "What this pattern teaches",
  "difficulty": "beginner|intermediate|advanced",
  "pattern": {
    "bars": 1,
    "beatsPerBar": 4,
    "notes": [
      { "duration": "q", "type": "note" }
    ]
  }
}
```

### Note Durations
- `w`: Whole note (4 beats)
- `h`: Half note (2 beats)
- `q`: Quarter note (1 beat)
- `8`: Eighth note (0.5 beats)
- `16`: Sixteenth note (0.25 beats)
- `q3`: Quarter triplet (2/3 beats)
- `83`: Eighth triplet (1/3 beats)

### Note Properties
- **duration**: One of the duration values above
- **type**: Either "note" or "rest"
- **tie**: (optional) Boolean - connects this note to the next
- **dotted**: (optional) Boolean - adds 50% to the duration

## Available Patterns

### Beginner (4 patterns)
1. **basic-quarters.json**: Four quarter notes - the foundation
2. **eighth-notes.json**: Eight eighth notes in 4/4
3. **rests-and-notes.json**: Quarter rests mixed with notes
4. **half-and-whole-notes.json**: Longer note values (2 bars)

### Intermediate (7 patterns)
5. **syncopation-1.json**: Q-8-8-Q-Q introducing offbeat accents
6. **dotted-quarter.json**: Dotted quarter and eighth pattern
7. **quarter-triplets.json**: Three quarters in space of two
8. **eighth-triplets.json**: Three eighths in space of one quarter
9. **eighth-rest-syncopation.json**: Eighth rests creating syncopation
10. **tied-notes.json**: Notes connected across beats
11. **sixteenth-notes.json**: Basic sixteenth note patterns

### Advanced (2 patterns)
12. **complex-syncopation.json**: Advanced offbeat rhythms (2 bars)
13. **mixed-dotted-rhythms.json**: Various dotted note combinations (2 bars)

## Pattern Index

The `index.json` file catalogs all available patterns for the UI to display:

```json
{
  "patterns": [
    {
      "filename": "basic-quarters.json",
      "category": "beginner",
      "name": "Basic Quarters"
    },
    ...
  ]
}
```

## Adding New Patterns

To add a new preset pattern:

1. Create a JSON file in this directory following the structure above
2. Add an entry to `index.json` with the filename, category, and name
3. Ensure the pattern is rhythmically valid (total beats match bars × beatsPerBar)
4. Test the pattern in the app to verify it renders and plays correctly

## Usage in the App

Users can access these patterns via the "🎵 Load Preset Patterns" button in the Pattern Designer. The UI groups patterns by difficulty level and allows users to load any pattern with a single click.

The patterns work in both development and production environments:
- **Development**: Loaded from `http://localhost:5173/patterns/`
- **Production**: Loaded from `https://bunsenstraat.github.io/rhythm-app/patterns/`

The PatternDesigner automatically handles the correct base path based on the environment.
