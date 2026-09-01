import { useCallback, useRef, useState, type DragEvent, type ReactNode } from 'react'
import {
  ChevronDown,
  ChevronRight,
  FileAudio,
  FileImage,
  FileVideo,
  LayoutTemplate,
  Music,
  Search,
  Upload,
  Wand2,
} from 'lucide-react'

import type { Clip } from '@/lib/types'
import type { ImportedMedia } from '@/lib/media-store'
import { importFile } from '@/lib/media-store'
import { writePayload, clearPayload, type DndPayload } from '@/lib/dnd'
import { AUDIO_BEDS, EFFECTS, TEMPLATES } from '@/lib/graphics'
import { cn } from '@/lib/utils'

export type SidebarView = 'media' | 'effects' | 'audio' | 'templates' | 'search' | 'files' | 'settings'

interface LibraryPanelProps {
  view: SidebarView
  importedFiles: ImportedMedia[]
  onFilesImported: (files: ImportedMedia[]) => void
  onAddClip: (clip: Clip) => void
  onProxyReady: (fileName: string, proxyUrl: string) => void
}

const TITLES: Record<SidebarView, string> = {
  media: 'Media',
  effects: 'Effects',
  audio: 'Audio',
  templates: 'Templates',
  search: 'Search',
  files: 'Explorer',
  settings: 'Settings',
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

function parseDurationStr(dur: string): number {
  if (/^\d+(\.\d+)?$/.test(dur)) return parseFloat(dur)
  const parts = dur.split(':').map(Number)
  if (parts.length === 3) return (parts[0] || 0) * 3600 + (parts[1] || 0) * 60 + (parts[2] || 0)
  if (parts.length === 2) return (parts[0] || 0) * 60 + (parts[1] || 0)
  return 5
}

function clipFromPayload(payload: DndPayload): Clip {
  const durationSec = payload.duration ? parseDurationStr(payload.duration) : 5
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    label: payload.name,
    lane: payload.kind === 'audio' ? 4 : payload.kind === 'effect' ? 2 : 0,
    startTime: 0,
    durationSec,
    tone: payload.kind,
    fileId: payload.fileId,
    templateId: payload.templateId,
    effectId: payload.effectId,
  }
}

export function LibraryPanel({
  view,
  importedFiles,
  onFilesImported,
  onAddClip,
  onProxyReady,
}: LibraryPanelProps) {
  const [query, setQuery] = useState('')
  const [isDraggingOver, setIsDraggingOver] = useState(false)
  const [expanded, setExpanded] = useState({ video: true, image: true, audio: true })
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleDragStart = useCallback((e: DragEvent, payload: DndPayload) => {
    writePayload(e.dataTransfer, payload)
  }, [])

  const addClip = useCallback(
    (payload: DndPayload) => {
      onAddClip(clipFromPayload(payload))
    },
    [onAddClip],
  )

  const isDuplicate = useCallback(
    (file: File) =>
      importedFiles.some(
        (f) => f.name === file.name && f.file.size === file.size && f.file.lastModified === file.lastModified,
      ),
    [importedFiles],
  )

  const ingestFiles = useCallback(
    async (list: File[]) => {
      const files = list.filter(
        (f) =>
          (f.type.startsWith('video/') || f.type.startsWith('image/') || f.type.startsWith('audio/')) &&
          !isDuplicate(f),
      )
      if (files.length === 0) return
      const imported = await Promise.all(
        files.map((f) =>
          importFile(f, (proxyUrl) => {
            onProxyReady(f.name, proxyUrl)
          }),
        ),
      )
      onFilesImported(imported)
    },
    [isDuplicate, onFilesImported, onProxyReady],
  )

  const q = query.toLowerCase()
  const videos = importedFiles.filter((f) => f.kind === 'video')
  const images = importedFiles.filter((f) => f.kind === 'image')
  const audios = importedFiles.filter((f) => f.kind === 'audio')
  const searchMedia = importedFiles.filter((f) => !q || f.name.toLowerCase().includes(q))
  const searchGraphics = [...TEMPLATES, ...EFFECTS, ...AUDIO_BEDS].filter(
    (g) => !q || g.name.toLowerCase().includes(q),
  )

  return (
    <aside className="flex w-[260px] shrink-0 flex-col border-r border-[#1e1e28] bg-[#111116]">
      <div className="flex h-[34px] shrink-0 items-center justify-between border-b border-[#1e1e28] px-3">
        <span className="text-[11px] font-medium uppercase tracking-[0.08em] text-[#888]">{TITLES[view]}</span>
        {(view === 'media' || view === 'audio') && (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="grid size-6 place-items-center rounded text-[#555] hover:bg-[#1e1e28] hover:text-[#ccc]"
            title="Import files"
          >
            <Upload size={13} />
          </button>
        )}
      </div>

      {view !== 'files' && view !== 'settings' && (
        <div className="border-b border-[#1e1e28] px-2.5 py-2">
          <label className="flex h-7 items-center gap-1.5 rounded-md border border-[#2a2a35] bg-[#0c0c10] px-2">
            <Search size={12} className="shrink-0 text-[#444]" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={`Search ${TITLES[view].toLowerCase()}`}
              className="min-w-0 flex-1 bg-transparent text-[12px] text-[#ccc] outline-none placeholder:text-[#444]"
            />
          </label>
        </div>
      )}

      <div
        className="min-h-0 flex-1 overflow-y-auto px-2 py-2"
        onDragOver={(e) => {
          if (view !== 'media') return
          e.preventDefault()
          e.dataTransfer.dropEffect = 'copy'
          setIsDraggingOver(true)
        }}
        onDragLeave={() => setIsDraggingOver(false)}
        onDrop={async (e) => {
          e.preventDefault()
          setIsDraggingOver(false)
          await ingestFiles(Array.from(e.dataTransfer.files))
        }}
      >
        {view === 'media' && (
          <>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className={cn(
                'mb-3 w-full rounded-lg border border-dashed px-3 py-4 text-center transition-colors',
                isDraggingOver
                  ? 'border-[#6c9eeb] bg-[#6c9eeb]/8'
                  : 'border-[#2a2a35] hover:border-[#3a3a48] hover:bg-[#16161e]',
              )}
            >
              <Upload size={16} className="mx-auto mb-1.5 text-[#555]" />
              <div className="text-[11px] text-[#888]">Drop files or click to import</div>
              <div className="mt-0.5 text-[10px] text-[#555]">Video, image, audio</div>
            </button>

            <MediaGroup
              title={`Videos (${videos.length})`}
              icon={<FileVideo size={11} className="text-[#6c9eeb]" />}
              open={expanded.video}
              onToggle={() => setExpanded((s) => ({ ...s, video: !s.video }))}
            >
              {videos.map((file) => (
                <ImportedThumb key={file.id} file={file} onDragStart={handleDragStart} onDoubleClick={addClip} />
              ))}
            </MediaGroup>

            <MediaGroup
              title={`Images (${images.length})`}
              icon={<FileImage size={11} className="text-[#34d399]" />}
              open={expanded.image}
              onToggle={() => setExpanded((s) => ({ ...s, image: !s.image }))}
            >
              {images.map((file) => (
                <ImportedThumb key={file.id} file={file} onDragStart={handleDragStart} onDoubleClick={addClip} />
              ))}
            </MediaGroup>

            <MediaGroup
              title={`Imported audio (${audios.length})`}
              icon={<FileAudio size={11} className="text-[#a78bfa]" />}
              open={expanded.audio}
              onToggle={() => setExpanded((s) => ({ ...s, audio: !s.audio }))}
            >
              {audios.map((file) => (
                <ImportedThumb key={file.id} file={file} onDragStart={handleDragStart} onDoubleClick={addClip} />
              ))}
            </MediaGroup>

            {importedFiles.length === 0 && (
              <p className="px-1 pt-4 text-center text-[11px] text-[#444]">Import a logo and a few clips to start</p>
            )}
          </>
        )}

        {view === 'effects' &&
          EFFECTS.filter((e) => !q || e.name.toLowerCase().includes(q)).map((effect) => (
            <AssetRow
              key={effect.id}
              icon={<Wand2 size={12} className="text-[#f59e0b]" />}
              name={effect.name}
              meta={effect.description}
              onDragStart={(e) =>
                handleDragStart(e, {
                  id: effect.id,
                  kind: 'effect',
                  name: effect.name,
                  duration: String(effect.duration),
                  effectId: effect.id,
                })
              }
              onDoubleClick={() =>
                addClip({
                  id: effect.id,
                  kind: 'effect',
                  name: effect.name,
                  duration: String(effect.duration),
                  effectId: effect.id,
                })
              }
            />
          ))}

        {view === 'audio' && (
          <>
            {audios.map((file) => (
              <AssetRow
                key={file.id}
                icon={<Music size={12} className="text-[#a78bfa]" />}
                name={file.name}
                meta={file.duration ? formatDuration(file.duration) : 'audio'}
                onDragStart={(e) =>
                  handleDragStart(e, {
                    id: file.id,
                    kind: 'audio',
                    name: file.name,
                    duration: file.duration ? String(file.duration) : undefined,
                    fileId: file.id,
                  })
                }
                onDoubleClick={() =>
                  addClip({
                    id: file.id,
                    kind: 'audio',
                    name: file.name,
                    duration: file.duration ? String(file.duration) : undefined,
                    fileId: file.id,
                  })
                }
              />
            ))}
            {AUDIO_BEDS.filter((a) => !q || a.name.toLowerCase().includes(q)).map((audio) => (
              <AssetRow
                key={audio.id}
                icon={<Music size={12} className="text-[#888]" />}
                name={audio.name}
                meta={`${formatDuration(audio.duration)} bed`}
                onDragStart={(e) =>
                  handleDragStart(e, {
                    id: audio.id,
                    kind: 'audio',
                    name: audio.name,
                    duration: String(audio.duration),
                  })
                }
                onDoubleClick={() =>
                  addClip({
                    id: audio.id,
                    kind: 'audio',
                    name: audio.name,
                    duration: String(audio.duration),
                  })
                }
              />
            ))}
          </>
        )}

        {view === 'templates' &&
          TEMPLATES.filter((t) => !q || t.name.toLowerCase().includes(q)).map((template) => (
            <AssetRow
              key={template.id}
              icon={<LayoutTemplate size={12} className="text-[#6c9eeb]" />}
              name={template.name}
              meta={`${formatDuration(template.duration)} · ${template.description}`}
              onDragStart={(e) =>
                handleDragStart(e, {
                  id: template.id,
                  kind: 'template',
                  name: template.name,
                  duration: String(template.duration),
                  templateId: template.id,
                })
              }
              onDoubleClick={() =>
                addClip({
                  id: template.id,
                  kind: 'template',
                  name: template.name,
                  duration: String(template.duration),
                  templateId: template.id,
                })
              }
            />
          ))}

        {view === 'search' && (
          <>
            {searchMedia.map((file) => (
              <AssetRow
                key={file.id}
                icon={
                  file.kind === 'audio' ? (
                    <Music size={12} />
                  ) : file.kind === 'image' ? (
                    <FileImage size={12} />
                  ) : (
                    <FileVideo size={12} />
                  )
                }
                name={file.name}
                meta={file.kind}
                onDragStart={(e) =>
                  handleDragStart(e, {
                    id: file.id,
                    kind: file.kind,
                    name: file.name,
                    duration: file.duration ? String(file.duration) : undefined,
                    fileId: file.id,
                  })
                }
                onDoubleClick={() =>
                  addClip({
                    id: file.id,
                    kind: file.kind,
                    name: file.name,
                    duration: file.duration ? String(file.duration) : undefined,
                    fileId: file.id,
                  })
                }
              />
            ))}
            {searchGraphics.map((g) => (
              <AssetRow
                key={g.id}
                icon={g.kind === 'effect' ? <Wand2 size={12} /> : <LayoutTemplate size={12} />}
                name={g.name}
                meta={g.description}
                onDragStart={(e) =>
                  handleDragStart(e, {
                    id: g.id,
                    kind: g.kind === 'effect' ? 'effect' : g.id.startsWith('bgm') || g.id.startsWith('sfx') ? 'audio' : 'template',
                    name: g.name,
                    duration: String(g.duration),
                    templateId: g.kind === 'template' ? g.id : undefined,
                    effectId: g.kind === 'effect' ? g.id : undefined,
                  })
                }
                onDoubleClick={() =>
                  addClip({
                    id: g.id,
                    kind: g.kind === 'effect' ? 'effect' : g.id.startsWith('bgm') || g.id.startsWith('sfx') ? 'audio' : 'template',
                    name: g.name,
                    duration: String(g.duration),
                    templateId: g.kind === 'template' ? g.id : undefined,
                    effectId: g.kind === 'effect' ? g.id : undefined,
                  })
                }
              />
            ))}
          </>
        )}

        {view === 'files' && (
          <div className="px-1 text-[12px] text-[#888]">
            <TreeRow depth={0} label="launch-film" open />
            <TreeRow depth={1} label="media" open />
            {importedFiles.slice(0, 12).map((f) => (
              <TreeRow key={f.id} depth={2} label={f.name} />
            ))}
            <TreeRow depth={1} label="graphics" />
            <TreeRow depth={1} label="audio" />
          </div>
        )}

        {view === 'settings' && (
          <div className="space-y-3 px-1.5 pt-1 text-[12px] text-[#888]">
            <div>
              <div className="mb-1 text-[10px] uppercase tracking-wider text-[#555]">Composition</div>
              <div className="rounded-md border border-[#2a2a35] bg-[#16161e] px-2.5 py-2 font-mono text-[11px] text-[#ccc]">
                1920 × 1080 · 30 fps
              </div>
            </div>
            <div>
              <div className="mb-1 text-[10px] uppercase tracking-wider text-[#555]">Preview</div>
              <div className="rounded-md border border-[#2a2a35] bg-[#16161e] px-2.5 py-2 text-[11px] text-[#999]">
                Remotion Player, local-first
              </div>
            </div>
          </div>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="video/*,image/*,audio/*"
        className="hidden"
        onChange={async (e) => {
          await ingestFiles(Array.from(e.target.files || []))
          e.target.value = ''
        }}
      />
    </aside>
  )
}

function MediaGroup({
  title,
  icon,
  open,
  onToggle,
  children,
}: {
  title: string
  icon: ReactNode
  open: boolean
  onToggle: () => void
  children: ReactNode
}) {
  const items = Array.isArray(children) ? children : [children]
  if (items.filter(Boolean).length === 0) return null

  return (
    <div className="mb-3">
      <button
        type="button"
        onClick={onToggle}
        className="mb-1.5 flex w-full items-center gap-1.5 px-0.5 text-[10px] font-medium uppercase tracking-[0.06em] text-[#666] hover:text-[#999]"
      >
        {open ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
        {icon}
        {title}
      </button>
      {open && <div className="grid grid-cols-2 gap-1.5">{children}</div>}
    </div>
  )
}

function ImportedThumb({
  file,
  onDragStart,
  onDoubleClick,
}: {
  file: ImportedMedia
  onDragStart: (e: DragEvent, payload: DndPayload) => void
  onDoubleClick: (payload: DndPayload) => void
}) {
  const payload: DndPayload = {
    id: file.id,
    kind: file.kind,
    name: file.name,
    duration: file.duration ? String(file.duration) : undefined,
    fileId: file.id,
  }

  return (
    <button
      type="button"
      draggable
      onDragStart={(e) => onDragStart(e, payload)}
      onDragEnd={clearPayload}
      onDoubleClick={() => onDoubleClick(payload)}
      className="group relative aspect-video overflow-hidden rounded-md border border-[#2a2a35] bg-[#16161e] text-left hover:border-[#3a3a48]"
    >
      {file.thumbnail ? (
        <img src={file.thumbnail} alt="" className="h-full w-full object-cover" />
      ) : (
        <span className="flex h-full items-center justify-center px-1 text-[10px] text-[#555]">{file.name}</span>
      )}
      {file.duration != null && (
        <span className="absolute bottom-1 right-1 rounded bg-black/75 px-1 font-mono text-[9px] text-white">
          {formatDuration(file.duration)}
        </span>
      )}
    </button>
  )
}

function AssetRow({
  icon,
  name,
  meta,
  onDragStart,
  onDoubleClick,
}: {
  icon: ReactNode
  name: string
  meta: string
  onDragStart: (e: DragEvent) => void
  onDoubleClick: () => void
}) {
  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragEnd={clearPayload}
      onDoubleClick={onDoubleClick}
      className="mb-0.5 flex cursor-grab items-center gap-2 rounded-md px-1.5 py-1.5 hover:bg-[#16161e] active:cursor-grabbing"
    >
      <div className="grid size-7 shrink-0 place-items-center rounded border border-[#2a2a35] bg-[#16161e] text-[#888]">
        {icon}
      </div>
      <div className="min-w-0">
        <div className="truncate text-[12px] text-[#ccc]">{name}</div>
        <div className="truncate text-[10px] text-[#555]">{meta}</div>
      </div>
    </div>
  )
}

function TreeRow({ depth, label, open }: { depth: number; label: string; open?: boolean }) {
  return (
    <div className="flex items-center gap-1 py-0.5 text-[#888]" style={{ paddingLeft: 8 + depth * 12 }}>
      {open != null ? <ChevronDown size={10} className="text-[#444]" /> : <span className="w-2.5" />}
      <span className="truncate">{label}</span>
    </div>
  )
}
