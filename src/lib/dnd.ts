/**
 * Shared drag-and-drop payload type used between the library panel and timeline.
 *
 * Uses the native HTML5 DataTransfer API with a custom MIME type,
 * PLUS a module-level fallback for webview environments (Tauri / Electron)
 * where DataTransfer.setData during dragstart may not persist to the drop event.
 */

export const DND_MIME = 'application/x-vibecut'

export type DndPayload = {
  /** Asset identifier from the library */
  id: string
  /** Display name — becomes the clip label on the timeline */
  name: string
  /** Determines which track lane the clip lands on */
  kind: 'video' | 'image' | 'audio' | 'effect' | 'template'
  /** Human-readable duration, e.g. "00:12" */
  duration?: string
  /** If this drag came from an imported file, this links to ImportedMedia.id */
  fileId?: string
}

/**
 * Module-level fallback: stores the current drag payload so the drop handler
 * can read it even if the browser/webview strips custom MIME data from
 * the DataTransfer object.
 */
let _currentPayload: DndPayload | null = null

/**
 * Write a DndPayload into a DataTransfer event.
 * Called by draggable elements in the library panel.
 */
export function writePayload(
  dt: DataTransfer,
  payload: DndPayload,
): void {
  _currentPayload = payload
  try {
    dt.setData(DND_MIME, JSON.stringify(payload))
  } catch {
    /* some webviews throw on setData inside dragstart — fallback is set */
  }
  dt.effectAllowed = 'copy'
}

/**
 * Read a DndPayload from a drop event. Returns null if no valid data found.
 * Tries DataTransfer first, then falls back to the module-level variable.
 */
export function readPayload(
  dt: DataTransfer,
): DndPayload | null {
  // 1. Try DataTransfer (works in standard browsers)
  try {
    const raw = dt.getData(DND_MIME)
    if (raw) {
      const parsed = JSON.parse(raw) as DndPayload
      if (parsed.id && parsed.name && parsed.kind) return parsed
    }
  } catch {
    /* malformed or unavailable */
  }

  // 2. Fallback to module-level variable (for Tauri/Electron webviews)
  if (_currentPayload) {
    const payload = _currentPayload
    _currentPayload = null // consume once
    return payload
  }

  return null
}

/**
 * Get the current drag payload without consuming it.
 * Used for double-click-to-add fallback.
 */
export function peekPayload(): DndPayload | null {
  return _currentPayload
}

/**
 * Clear the current drag payload (call on dragend if drop didn't happen).
 */
export function clearPayload(): void {
  _currentPayload = null
}
