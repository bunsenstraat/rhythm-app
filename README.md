# 🎵 Rhythm Trainer

A modern web application for practicing and perfecting your rhythm skills. Design custom rhythm patterns, tap along at your chosen tempo, and receive detailed accuracy feedback.

## Features

- **Pattern Designer**: Create custom rhythm patterns with 1-8 bars and 2-8 beats per bar
- **Visual Grid Interface**: Click to toggle beats on/off with visual feedback
- **Pattern Presets**: Quick-start with quarter notes, eighth notes, syncopated patterns, or start from scratch
- **Adjustable Tempo**: Practice at any tempo from 40 to 240 BPM
- **Interactive Practice**: Tap along with a large button or use the spacebar
- **Precise Audio**: Web Audio API for accurate metronome clicks
- **Detailed Scoring**: Get comprehensive feedback including:
  - Overall score (0-100%)
  - Notes hit vs missed
  - Average timing accuracy
  - Performance rating
  - Individual tap breakdown with timing details

## Technologies

- **TypeScript**: Type-safe, modular code architecture
- **Vite**: Fast development and optimized builds
- **Web Audio API**: Precise audio timing for metronome clicks
- **CSS Grid & Flexbox**: Responsive, modern UI design

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
   - Adjust the number of bars (1-8)
   - Set beats per bar (2-8 for different time signatures)
   - Click on beats in the grid to add/remove notes
   - Use preset buttons for common patterns

2. **Set Your Tempo**
   - Use the tempo slider to adjust speed (40-240 BPM)
   - Start slow for learning, increase as you improve

3. **Practice**
   - Click "Start Practice" to begin
   - Tap the large button (or press spacebar) in time with the metronome
   - Watch the progress bar to track your position

4. **Review Results**
   - See your overall score and accuracy statistics
   - Review individual tap timing
   - Click "Try Again" to practice more

## Project Structure

```
src/
├── types.ts              # TypeScript type definitions
├── AudioEngine.ts        # Web Audio API wrapper for sound
├── PatternDesigner.ts    # Pattern creation interface
├── RhythmPlayer.ts       # Playback and tap detection
├── ResultsDisplay.ts     # Score and feedback display
├── RhythmTrainerApp.ts   # Main application controller
├── main.ts              # Entry point
└── style.css            # Application styles
```

## Browser Support

Works in all modern browsers that support:
- Web Audio API
- ES6+ JavaScript
- CSS Grid

## Tips for Best Results

- Use headphones for better audio accuracy
- Start with slower tempos (60-80 BPM)
- Focus on consistency before speed
- Practice regularly for muscle memory
- Try different pattern complexities

## License

MIT
