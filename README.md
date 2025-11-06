# 🎵 Rhythm Trainer

A modern web application for practicing and perfecting your rhythm skills. Design custom rhythm patterns, tap along at your chosen tempo, and receive detailed accuracy feedback.

## Features

- **Pattern Designer**: Create custom rhythm patterns with complex durations including:
  - Whole, half, quarter, eighth, and sixteenth notes
  - Quarter and eighth note triplets
  - Dotted notes (1.5x duration)
  - Tied notes (connecting notes across beats)
  - Rests and notes mixed together
- **Multi-Note Selection**: Select multiple notes with:
  - Click to select single note
  - Cmd/Ctrl+Click to toggle selection
  - Shift+Click for range selection
  - Bulk editing: change duration, type, add/remove ties and dots, delete selected notes
- **Music Notation**: Real sheet music display using ABC.js with:
  - Automatic barlines based on time signature
  - Proper rendering of triplets, ties, and dots
  - Click notes on the sheet music to select them
- **Preset Patterns**: 13 built-in patterns organized by difficulty:
  - **Beginner**: Basic quarters, eighth notes, rests, half and whole notes
  - **Intermediate**: Syncopation, dotted rhythms, triplets, tied notes, sixteenth notes
  - **Advanced**: Complex syncopation, mixed dotted rhythms
  - Load presets instantly with the "Load Preset Patterns" button
- **Pattern Management**: 
  - Save your custom patterns to localStorage
  - Load previously saved patterns
  - Start new patterns from scratch
- **Dual Audio System**: 
  - Metronome clicks (1200Hz sharp sound, louder on downbeats)
  - Pattern playback (600Hz soft tone)
  - Count-in before playback starts
- **Practice & Test Modes**:
  - **Practice Mode**: Hear both metronome and pattern to learn
  - **Test Mode**: Metronome only - test your memory
  - Manual start button (no auto-start)
- **Tempo Presets**: Italian tempo markings for quick selection:
  - Largo (40 BPM), Adagio (60 BPM), Andante (90 BPM)
  - Moderato (108 BPM), Allegro (132 BPM), Presto (180 BPM)
  - Fine-tune with tempo slider (40-240 BPM)
- **Interactive Practice**: Tap along with a large button or use the spacebar
- **Precise Audio**: Web Audio API for millisecond-accurate timing
- **Detailed Scoring**: Get comprehensive feedback including:
  - Overall score (0-100%)
  - Notes hit vs missed
  - Average timing accuracy in milliseconds
  - Performance rating (color-coded)
  - Individual tap breakdown with timing details
- **Persistent State**: All settings saved to localStorage:
  - Current pattern design
  - Practice/Test mode preference
  - Tempo selection

## Technologies

- **TypeScript**: Type-safe, modular code architecture
- **Vite**: Fast development and optimized builds
- **ABC.js**: Music notation rendering with support for complex rhythms
- **Web Audio API**: Precise audio timing for metronome and pattern sounds
- **CSS Grid & Flexbox**: Responsive, modern UI design
- **localStorage**: Persistent pattern and settings storage

## Getting Started

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

Open your browser to `http://localhost:5173`

### Build

```bash
npm run build
```

### Preview Production Build

```bash
npm run preview
```

## How to Use

1. **Design Your Pattern**
   - Add notes using the duration and type buttons
   - Select multiple notes and edit them together
   - Add ties to connect notes across beats
   - Add dots to extend note durations by 50%
   - Click notes on the sheet music to select them
   - Use the "Load Preset Patterns" button to start with a built-in pattern
   - Save your custom patterns for later use

2. **Set Your Tempo**
   - Click Italian tempo presets (Largo, Adagio, Andante, Moderato, Allegro, Presto)
   - Or use the tempo slider for fine control (40-240 BPM)
   - Start slow for learning, increase as you improve
   - Your tempo preference is saved automatically

3. **Choose Your Mode**
   - **Practice Mode**: Hear both metronome and pattern sounds
   - **Test Mode**: Metronome only - test your sight-reading
   - Mode preference is saved for next session

4. **Practice**
   - Click "Start Practice" or "Start Test" to begin
   - Listen to the count-in (one bar of metronome clicks)
   - Tap the large button (or press spacebar) in time with the rhythm
   - Watch the progress bar to track your position

5. **Review Results**
   - See your overall score and accuracy statistics
   - Review individual tap timing (green = on time, red = off time)
   - Click "Try Again" to practice more
   - Click "Back to Designer" to modify the pattern

## Preset Patterns

The app includes 13 carefully crafted preset patterns organized by difficulty level:

### Beginner (4 patterns)
- **Basic Quarters**: Four quarter notes - the foundation of rhythm
- **Eighth Notes**: Eight eighth notes in 4/4 time
- **Rests and Notes**: Quarter rests mixed with notes
- **Half and Whole Notes**: Longer note values across multiple bars

### Intermediate (7 patterns)
- **Syncopation 1**: Q-8-8-Q-Q pattern introducing offbeat accents
- **Dotted Quarter**: Dotted quarter and eighth pattern
- **Quarter Triplets**: Three quarter notes in the space of two
- **Eighth Triplets**: Three eighth notes in the space of one quarter
- **Eighth Rest Syncopation**: Eighth rests creating offbeat accents
- **Tied Notes**: Notes connected across beats
- **Sixteenth Notes**: Basic sixteenth note patterns

### Advanced (2 patterns)
- **Complex Syncopation**: Advanced offbeat rhythms spanning 2 bars
- **Mixed Dotted Rhythms**: Various dotted note combinations

All preset patterns are stored as JSON files in the `public/patterns/` directory and can be loaded via the "Load Preset Patterns" button in the Pattern Designer.

## Project Structure

```
src/
├── types.ts              # TypeScript type definitions
├── AudioEngine.ts        # Web Audio API wrapper for sound
├── PatternDesigner.ts    # Pattern creation & editing interface
├── RhythmPlayer.ts       # Playback and tap detection
├── SheetMusicRenderer.ts # ABC.js wrapper for music notation
├── ResultsDisplay.ts     # Score and feedback display
├── RhythmTrainerApp.ts   # Main application controller
├── main.ts              # Entry point
└── style.css            # Application styles

public/
└── patterns/            # Preset rhythm patterns
    ├── index.json       # Pattern catalog
    ├── basic-quarters.json
    ├── eighth-notes.json
    ├── rests-and-notes.json
    ├── half-and-whole-notes.json
    ├── syncopation-1.json
    ├── dotted-quarter.json
    ├── quarter-triplets.json
    ├── eighth-triplets.json
    ├── eighth-rest-syncopation.json
    ├── tied-notes.json
    ├── sixteenth-notes.json
    ├── complex-syncopation.json
    └── mixed-dotted-rhythms.json
```

## Browser Support

Works in all modern browsers that support:
- Web Audio API
- ES6+ JavaScript
- CSS Grid

## Tips for Best Results

- Use headphones for better audio accuracy
- Start with preset patterns to understand rhythm notation
- Begin with beginner patterns and slower tempos (60-80 BPM)
- Use Practice Mode first to learn the pattern
- Switch to Test Mode to challenge your sight-reading
- Focus on consistency before speed
- Practice regularly for muscle memory
- Try creating your own patterns with different combinations of:
  - Note durations (whole, half, quarter, eighth, sixteenth)
  - Triplets for compound rhythms
  - Dots for extended durations
  - Ties for syncopation
  - Rests for rhythmic breathing
- Use multi-select to quickly edit multiple notes at once
- Save patterns you want to practice repeatedly

## License

MIT
