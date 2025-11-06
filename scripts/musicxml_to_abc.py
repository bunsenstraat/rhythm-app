#!/usr/bin/env python3
"""
Convert MusicXML files to ABC notation format.
This script uses music21 library to parse MusicXML and generate ABC notation.
"""

import sys
import os
from pathlib import Path

try:
    from music21 import converter, note, stream
except ImportError:
    print("Error: music21 library not installed.", file=sys.stderr)
    print("Install it with: pip install music21", file=sys.stderr)
    sys.exit(1)


def musicxml_to_abc(musicxml_path: str, output_path: str = None) -> str:
    """
    Convert a MusicXML file to ABC notation.
    
    Args:
        musicxml_path: Path to the input MusicXML file
        output_path: Optional path to write the ABC file. If None, just returns the ABC string.
    
    Returns:
        ABC notation as a string
    """
    try:
        # Parse the MusicXML file
        score = converter.parse(musicxml_path)
        
        # Get the first part (usually the melody/rhythm part)
        if score.parts:
            part = score.parts[0]
        else:
            part = score
        
        # Extract basic metadata
        title = score.metadata.title or "Untitled"
        
        # Build ABC notation manually for better control over rhythm representation
        abc_lines = []
        abc_lines.append(f"X:1")
        abc_lines.append(f"T:{title}")
        
        # Get time signature from first measure
        time_sig = part.flatten().getElementsByClass('TimeSignature')
        if time_sig:
            ts = time_sig[0]
            abc_lines.append(f"M:{ts.numerator}/{ts.denominator}")
            abc_lines.append(f"L:1/{ts.denominator}")
        else:
            abc_lines.append("M:4/4")
            abc_lines.append("L:1/4")
        
        # Get key signature
        key_sig = part.flatten().getElementsByClass('KeySignature')
        if key_sig:
            key_name = key_sig[0].asKey().name.replace('-', 'b')
            abc_lines.append(f"K:{key_name}")
        else:
            abc_lines.append("K:C")
        
        # Process notes and rests
        notes_line = []
        measures = part.getElementsByClass('Measure')
        
        for measure in measures:
            # Get all notes and rests in this measure
            for element in measure.flatten().notesAndRests:
                abc_note = convert_note_to_abc(element)
                if abc_note:
                    notes_line.append(abc_note)
            
            # Add bar line
            notes_line.append('|')
        
        # Join notes into lines (wrap at ~80 chars or after every 4 bars)
        abc_notes = ' '.join(notes_line)
        abc_lines.append(abc_notes)
        
        abc_content = '\n'.join(abc_lines)
        
        # Write to file if output path specified
        if output_path:
            with open(output_path, 'w') as f:
                f.write(abc_content)
            print(f"Converted {musicxml_path} -> {output_path}")
        
        return abc_content
        
    except Exception as e:
        print(f"Error converting {musicxml_path}: {e}", file=sys.stderr)
        raise


def convert_note_to_abc(element) -> str:
    """
    Convert a music21 note or rest to ABC notation.
    
    Args:
        element: A music21 note.Note, note.Rest, or chord.Chord
    
    Returns:
        ABC notation string for this note
    """
    # Handle rests
    if isinstance(element, note.Rest):
        duration = get_abc_duration(element.quarterLength)
        return f"z{duration}"
    
    # Handle notes (we only care about rhythm, so use 'C' for all notes)
    if isinstance(element, note.Note):
        duration = get_abc_duration(element.quarterLength)
        
        # Check for ties
        tie_str = ""
        if element.tie and element.tie.type == 'start':
            tie_str = "-"
        
        return f"C{duration}{tie_str}"
    
    return ""


def get_abc_duration(quarter_length: float) -> str:
    """
    Convert a quarterLength to ABC duration notation.
    
    Args:
        quarter_length: The duration in quarter notes
    
    Returns:
        ABC duration string (e.g., "", "2", "/2", "3/2")
    """
    # Common durations
    if quarter_length == 1.0:
        return ""  # Quarter note (default)
    elif quarter_length == 2.0:
        return "2"  # Half note
    elif quarter_length == 4.0:
        return "4"  # Whole note
    elif quarter_length == 0.5:
        return "/2"  # Eighth note
    elif quarter_length == 0.25:
        return "/4"  # Sixteenth note
    elif quarter_length == 1.5:
        return "3/2"  # Dotted quarter
    elif quarter_length == 3.0:
        return "3"  # Dotted half
    elif quarter_length == 0.75:
        return "3/4"  # Dotted eighth
    else:
        # Handle other durations as fractions
        # Try to represent as simple fraction
        from fractions import Fraction
        frac = Fraction(quarter_length).limit_denominator(16)
        if frac.numerator == 1:
            return f"/{frac.denominator}"
        else:
            return f"{frac.numerator}/{frac.denominator}"


def main():
    """Main entry point for command-line usage."""
    if len(sys.argv) < 2:
        print("Usage: python musicxml_to_abc.py <input.xml> [output.abc]")
        print("If output is not specified, ABC is printed to stdout")
        sys.exit(1)
    
    input_path = sys.argv[1]
    output_path = sys.argv[2] if len(sys.argv) > 2 else None
    
    if not os.path.exists(input_path):
        print(f"Error: File not found: {input_path}", file=sys.stderr)
        sys.exit(1)
    
    abc_content = musicxml_to_abc(input_path, output_path)
    
    # Print to stdout if no output file specified
    if not output_path:
        print(abc_content)


if __name__ == "__main__":
    main()
