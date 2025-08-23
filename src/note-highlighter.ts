import { CursorControl, NoteTimingEvent } from 'abcjs';

/**
 * Monitors playback and provides event hooks.
 * 
 * Used to:
 * 1. indicate song start/end
 * 2. highlight the currently playing note
 * 
 * https://paulrosen.github.io/abcjs/audio/synthesized-sound.html#cursorcontrol-object
 */
export class NoteHighlighter implements CursorControl {
    beatSubdivisions = 2;

    constructor(private readonly el: any) { }

    onStart = () => togglePlayingHighlight(this.el)(true);

    onFinished = () => rmAllHighlights(this.el)();

    // On every note event, clear highlights and redraw with current note highlighted.
    onEvent(event: NoteTimingEvent) {
        // this was the second part of a tie across a measure line. Just ignore it.
        if (event.measureStart && event.left === null) return;

        // Select the currently selected notes.
        rmNoteHighlights(this.el)();
        if (event.elements) {
            event.elements.flat().forEach((el: any) => el.classList.add("abcjs-highlight"));
        }
    }
}

// -------------------------------------------------------------- 2nd order fn library: Visualization

// outline region when playing
export const togglePlayingHighlight = (el: any) => (is: boolean) =>
    el.parentElement?.classList.toggle('is-playing', is);

// clear all the note highlights
export const rmNoteHighlights = (parentEl: any) => () => {
    const selected = Array.from(parentEl.querySelectorAll(".abcjs-highlight"));
    selected.forEach((el: any) => el.classList.remove("abcjs-highlight"));
};

// remove both playing and note highlights
export const rmAllHighlights = (parentEl: any) => () => {
    togglePlayingHighlight(parentEl)(false);
    rmNoteHighlights(parentEl)();
};
