import { renderMediaOnWeb, type RenderMediaOnWebProgress } from '@remotion/web-renderer'

import { ProjectComposition, type MediaInput } from '@/remotion/ProjectComposition'
import { COMP_HEIGHT, COMP_WIDTH, FPS, compositionDurationSec, timeToFrame, type Clip } from '@/lib/types'

export type ExportProgress = RenderMediaOnWebProgress

export type ExportOptions = {
  clips: Clip[]
  media: MediaInput[]
  onProgress?: (progress: ExportProgress) => void
}

/**
 * Render the current composition to an MP4 blob in-browser using the
 * @remotion/web-renderer. Reports encoded-frame progress via onProgress.
 */
export async function exportMediaToBlob({ clips, media, onProgress }: ExportOptions): Promise<Blob> {
  const durationSec = compositionDurationSec(clips)
  const durationInFrames = Math.max(1, timeToFrame(durationSec))

  const result = await renderMediaOnWeb({
    composition: {
      component: ProjectComposition,
      id: 'vibecut',
      defaultProps: { clips, media },
      durationInFrames,
      fps: FPS,
      width: COMP_WIDTH,
      height: COMP_HEIGHT,
    },
    inputProps: { clips, media },
    onProgress: onProgress ?? null,
  })

  return result.getBlob()
}

/**
 * Persist the rendered blob to disk. Prefers the native save-file picker when
 * available, falling back to an anchor download for plain browsers.
 */
export async function saveBlob(
  blob: Blob,
  filename = `vibecut-${Date.now()}.mp4`,
): Promise<string | null> {
  type SaveWritable = {
  write: (data: Blob | Uint8Array | string) => Promise<void>;
  close: () => Promise<void>;
};
type SavePicker = (options: {
    suggestedName: string;
    types: { description: string; accept: Record<string, string[]> }[];
  }) => Promise<{
    name?: string;
    createWritable: () => Promise<SaveWritable>;
  }>;

  const picker: SavePicker | undefined = (window as unknown as { showSaveFilePicker?: SavePicker }).showSaveFilePicker

  if (picker) {
    try {
      const handle = await picker({
        suggestedName: filename,
        types: [{ description: 'MP4 Video', accept: { 'video/mp4': ['.mp4'] } }],
      })
      const writable = await handle.createWritable()
      await writable.write(blob)
      await writable.close()
      return handle.name ?? filename
    } catch (err) {
      console.warn('Save file picker failed:', err)
    }
  }

  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
  return filename
}