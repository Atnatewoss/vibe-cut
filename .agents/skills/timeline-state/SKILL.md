---
name: timeline-state
description: Exact TypeScript shape of tracks/clips, how to add/move/trim/delete, undo/redo expectations
---

# Timeline State Management

Vibecut's core architecture dictates that the **Timeline State is the single source of truth** for the video composition. The renderer (Remotion) strictly reflects this state.

## 1. State Shape
The timeline is composed of `tracks` and `clips`. 
When mutating or adding to the timeline state, respect the TypeScript interfaces strictly (e.g., `Clip`, `Track`).

- `id`: Must be a unique string (uuid or timestamp-based).
- `startTime` / `durationSec`: Use seconds (floats), NOT frames. Remotion handles the conversion to frames using `fps`.
- `lane` / `track`: Determines Z-index and rendering order. Video/Images go on lower tracks (e.g., 0-1), Effects on middle tracks (2), Audio on bottom tracks (3-4).

## 2. Mutating State Safely
- **Immutability**: Always use immutable updates (e.g., mapping over arrays, spreading objects). Do not mutate `clip` properties directly in place.
- **Helper Functions**: If adding a clip, calculate the correct insertion point (avoiding overlaps if necessary, or placing on an empty track).
- **Trimming**: When trimming a clip, ensure `durationSec` > 0 and `startTime` does not fall behind 0.

## 3. Undo/Redo Expectations
- Any significant mutation to the timeline (add, delete, move, trim) should ideally be pushed to a history stack if one exists, ensuring users can undo accidental actions.
- Group rapid continuous changes (e.g., dragging a clip) into a single undo frame upon drag-end.

## 4. Agent Control Rules
- As an AI agent, when asked to "add X to the video", you must modify the underlying data store / state array that feeds into the composition. Do NOT try to modify the DOM or React render output directly.
- Ensure any clip you inject has a valid `tone`, `label`, and references valid `fileId`, `templateId`, or `effectId` as defined by the graphics registry.
