import React, { useState, useCallback, useRef } from 'react';
import {
  Film, Music, Wand2, LayoutTemplate,
  Upload, Search, ChevronDown, ChevronRight,
  FileVideo, FileAudio, FileImage
} from 'lucide-react';
import type { ImportedMedia } from '../lib/media-store';
import { importFile } from '../lib/media-store';
import { writePayload, clearPayload, type DndPayload } from '../lib/dnd';
import type { Clip } from '../App';

interface LibraryPanelProps {
  width: number;
  onDragStart?: (e: React.DragEvent, payload: DndPayload) => void;
  importedFiles: ImportedMedia[];
  onFilesImported: (files: ImportedMedia[]) => void;
  onAddClip: (clip: Clip) => void;
  onProxyReady: (mediaId: string, proxyUrl: string) => void;
}

type TabId = 'media' | 'effects' | 'audio' | 'templates';

const tabs: { id: TabId; label: string; icon: React.ReactNode }[] = [
  { id: 'media', label: 'Media', icon: <Film size={14} /> },
  { id: 'effects', label: 'Effects', icon: <Wand2 size={14} /> },
  { id: 'audio', label: 'Audio', icon: <Music size={14} /> },
  { id: 'templates', label: 'Templates', icon: <LayoutTemplate size={14} /> },
];

const EFFECTS = [
  { id: 'fade-in', name: 'Fade In', duration: '0:00:30' },
  { id: 'fade-out', name: 'Fade Out', duration: '0:00:30' },
  { id: 'cross-dissolve', name: 'Cross Dissolve', duration: '0:01:00' },
  { id: 'blur', name: 'Gaussian Blur', duration: '0:00:00' },
  { id: 'glow', name: 'Glow', duration: '0:00:00' },
  { id: 'vignette', name: 'Vignette', duration: '0:00:00' },
];

const AUDIO = [
  { id: 'bgm-upbeat', name: 'Upbeat Background', duration: '0:02:30' },
  { id: 'bgm-cinematic', name: 'Cinematic Score', duration: '0:03:00' },
  { id: 'sfx-whoosh', name: 'Whoosh Transition', duration: '0:00:02' },
  { id: 'sfx-click', name: 'UI Click', duration: '0:00:01' },
  { id: 'sfx-reveal', name: 'Logo Reveal', duration: '0:00:03' },
];

const TEMPLATES = [
  { id: 'tpl-intro', name: 'Product Intro', duration: '0:00:10' },
  { id: 'tpl-launch', name: 'Launch Announcement', duration: '0:00:30' },
  { id: 'tpl-feature', name: 'Feature Highlight', duration: '0:00:15' },
  { id: 'tpl-testimonial', name: 'Testimonial', duration: '0:00:20' },
];

const ACCENT = '#0a84ff';

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

const ImportedThumb: React.FC<{
  file: ImportedMedia;
  onDragStart: (e: React.DragEvent, payload: DndPayload) => void;
  onDoubleClick: (payload: DndPayload) => void;
}> = ({ file, onDragStart, onDoubleClick }) => {
  const handleDragStart = useCallback((e: React.DragEvent) => {
    onDragStart(e, {
      id: file.id,
      kind: file.kind === 'image' ? 'image' : file.kind,
      name: file.name,
      duration: file.duration ? String(file.duration) : undefined,
      fileId: file.id,
    });
  }, [file, onDragStart]);

  const handleDragEnd = useCallback(() => {
    clearPayload();
  }, []);

  const kindIcon = file.kind === 'video' ? <FileVideo size={10} />
    : file.kind === 'image' ? <FileImage size={10} />
    : <FileAudio size={10} />;

  const handleDoubleClick = useCallback(() => {
    onDoubleClick({
      id: file.id,
      kind: file.kind === 'image' ? 'image' : file.kind,
      name: file.name,
      duration: file.duration ? String(file.duration) : undefined,
      fileId: file.id,
    });
  }, [file, onDoubleClick]);

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDoubleClick={handleDoubleClick}
      style={{
        aspectRatio: '16/9',
        borderRadius: 6,
        overflow: 'hidden',
        background: '#181818',
        cursor: 'grab',
        position: 'relative',
        border: '1px solid #2a2a2e',
        transition: 'border-color 0.15s',
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.borderColor = '#3a3a3e';
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.borderColor = '#2a2a2e';
      }}
    >
      {file.thumbnail ? (
        <img
          src={file.thumbnail}
          alt={file.name}
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
        />
      ) : (
        <div style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#666',
          fontSize: 10,
          gap: 4,
        }}>
          {kindIcon}
          {file.name}
        </div>
      )}

      {/* Duration badge */}
      {file.duration != null && (
        <div style={{
          position: 'absolute',
          bottom: 4,
          right: 4,
          background: 'rgba(0,0,0,0.8)',
          color: '#fff',
          fontSize: 9,
          padding: '1px 4px',
          borderRadius: 3,
          fontFamily: 'ui-monospace, monospace',
          letterSpacing: '0.02em',
        }}>
          {formatDuration(file.duration)}
        </div>
      )}

      {/* Proxy ready indicator — subtle green dot */}
      {file.proxyReady && file.kind === 'video' && (
        <div style={{
          position: 'absolute',
          top: 4,
          right: 4,
          width: 6,
          height: 6,
          borderRadius: '50%',
          background: '#34c759',
        }} />
      )}
    </div>
  );
};

const LibraryPanel: React.FC<LibraryPanelProps> = ({
  width,
  onDragStart,
  importedFiles,
  onFilesImported,
  onAddClip,
  onProxyReady,
}) => {
  const [activeTab, setActiveTab] = useState<TabId>('media');
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedSections, setExpandedSections] = useState({
    video: true,
    image: false,
    audio: false,
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragStart = useCallback((e: React.DragEvent, payload: DndPayload) => {
    writePayload(e.dataTransfer, payload);
    onDragStart?.(e, payload);
  }, [onDragStart]);

  // Double-click to add: converts a DndPayload into a Clip and adds it
  const handleAddClip = useCallback((payload: DndPayload) => {
    const durationSec = payload.duration ? parseDurationStr(payload.duration) : 5
    onAddClip({
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      label: payload.name,
      lane: 0,
      startTime: 0,
      durationSec,
      tone: payload.kind,
      fileId: payload.fileId,
    })
  }, [onAddClip])

  // Check if a File is already imported (by name + size + lastModified)
  const isDuplicate = useCallback((file: File): boolean => {
    return importedFiles.some(f =>
      f.name === file.name &&
      f.file.size === file.size &&
      f.file.lastModified === file.lastModified
    )
  }, [importedFiles])

  // Accept files dropped from OS
  const handleFileDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(false);

    const files = Array.from(e.dataTransfer.files).filter(f =>
      (f.type.startsWith('video/') || f.type.startsWith('image/') || f.type.startsWith('audio/')) &&
      !isDuplicate(f)
    );

    if (files.length === 0) return;

    const imported = await Promise.all(
      files.map(f => importFile(f, (proxyUrl) => {
        onProxyReady(f.name, proxyUrl);
      }))
    );

    onFilesImported(imported);
  }, [onFilesImported, onProxyReady, isDuplicate]);

  const handleFileBrowse = useCallback(async () => {
    fileInputRef.current?.click();
  }, []);

  const handleFileInput = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []).filter(f =>
      (f.type.startsWith('video/') || f.type.startsWith('image/') || f.type.startsWith('audio/')) &&
      !isDuplicate(f)
    );

    if (files.length === 0) {
      e.target.value = '';
      return;
    }

    const imported = await Promise.all(
      files.map(f => importFile(f, (proxyUrl) => {
        onProxyReady(f.name, proxyUrl);
      }))
    );

    onFilesImported(imported);
    e.target.value = '';
  }, [onFilesImported, onProxyReady, isDuplicate]);

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  // Group imported files by kind
  const videoFiles = importedFiles.filter(f => f.kind === 'video');
  const imageFiles = importedFiles.filter(f => f.kind === 'image');
  const audioFiles = importedFiles.filter(f => f.kind === 'audio');

  const filteredAudio = AUDIO.filter(a =>
    !searchQuery || a.name.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const filteredEffects = EFFECTS.filter(e =>
    !searchQuery || e.name.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const filteredTemplates = TEMPLATES.filter(t =>
    !searchQuery || t.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div
      style={{
        width,
        display: 'flex',
        flexDirection: 'column',
        background: '#141418',
        borderRight: '1px solid #1e1e24',
        overflow: 'hidden',
        minWidth: 0,
        padding: '0 12px',
      }}
    >
      {/* Tab bar */}
      <div style={{
        display: 'flex',
        borderBottom: '1px solid #27272a',
        flexShrink: 0,
      }}>
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 4,
              padding: '8px 0',
              background: activeTab === tab.id ? '#27272a' : 'transparent',
              border: 'none',
              borderBottom: activeTab === tab.id ? `2px solid ${ACCENT}` : '2px solid transparent',
              color: activeTab === tab.id ? '#fff' : '#71717a',
              fontSize: 11,
              fontWeight: 500,
              cursor: 'pointer',
              transition: 'color 0.15s, background 0.15s',
              letterSpacing: '0.02em',
            }}
            onMouseEnter={(e) => {
              if (activeTab !== tab.id) e.currentTarget.style.color = '#a1a1aa';
            }}
            onMouseLeave={(e) => {
              if (activeTab !== tab.id) e.currentTarget.style.color = '#71717a';
            }}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Search */}
      <div style={{
        padding: '8px 10px',
        borderBottom: '1px solid #27272a',
        flexShrink: 0,
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          padding: '5px 8px',
          background: '#09090b',
          borderRadius: 6,
          border: '1px solid #27272a',
        }}>
          <Search size={12} style={{ color: '#52525b', flexShrink: 0 }} />
          <input
            type="text"
            placeholder={`Search ${activeTab}...`}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              outline: 'none',
              color: '#e4e4e7',
              fontSize: 11,
              fontFamily: 'inherit',
              minWidth: 0,
            }}
          />
        </div>
      </div>

      {/* Content */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          overflowX: 'hidden',
          padding: '6px',
        }}
        onDragOver={(e) => {
          e.preventDefault();
          if (activeTab === 'media') {
            e.dataTransfer.dropEffect = 'copy';
            setIsDraggingOver(true);
          }
        }}
        onDragLeave={() => setIsDraggingOver(false)}
        onDrop={handleFileDrop}
      >
        {activeTab === 'media' && (
          <>
            {/* Import zone */}
            <div
              onClick={handleFileBrowse}
              style={{
                padding: '12px',
                border: `2px dashed ${isDraggingOver ? ACCENT : '#27272a'}`,
                borderRadius: 8,
                textAlign: 'center',
                cursor: 'pointer',
                marginBottom: 8,
                transition: 'border-color 0.2s, background 0.2s',
                background: isDraggingOver ? 'rgba(10, 132, 255, 0.08)' : 'transparent',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#3a3a3e';
                e.currentTarget.style.background = '#0f0f12';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = isDraggingOver ? ACCENT : '#27272a';
                e.currentTarget.style.background = isDraggingOver ? 'rgba(10, 132, 255, 0.08)' : 'transparent';
              }}
            >
              <Upload size={20} style={{ color: '#52525b', margin: '0 auto 4px', display: 'block' }} />
              <div style={{ color: '#a1a1aa', fontSize: 11, fontWeight: 500 }}>
                Drop media files or click to import
              </div>
              <div style={{ color: '#52525b', fontSize: 10, marginTop: 2 }}>
                Video, Image, Audio
              </div>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="video/*,image/*,audio/*"
              style={{ display: 'none' }}
              onChange={handleFileInput}
            />

            {/* Imported Files Section */}
            {videoFiles.length > 0 && (
              <div style={{ marginBottom: 8 }}>
                <button
                  onClick={() => toggleSection('video')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                    width: '100%',
                    padding: '4px 4px',
                    background: 'transparent',
                    border: 'none',
                    color: '#a1a1aa',
                    fontSize: 10,
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                    cursor: 'pointer',
                    marginBottom: 4,
                  }}
                >
                  {expandedSections.video ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
                  <FileVideo size={10} style={{ color: ACCENT }} />
                  Videos ({videoFiles.length})
                </button>
                {expandedSections.video && (
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    gap: 4,
                  }}>
                    {videoFiles.map(file => (
                      <ImportedThumb key={file.id} file={file} onDragStart={handleDragStart} onDoubleClick={handleAddClip} />
                    ))}
                  </div>
                )}
              </div>
            )}

            {imageFiles.length > 0 && (
              <div style={{ marginBottom: 8 }}>
                <button
                  onClick={() => toggleSection('image')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                    width: '100%',
                    padding: '4px 4px',
                    background: 'transparent',
                    border: 'none',
                    color: '#a1a1aa',
                    fontSize: 10,
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                    cursor: 'pointer',
                    marginBottom: 4,
                  }}
                >
                  {expandedSections.image ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
                  <FileImage size={10} style={{ color: '#34c759' }} />
                  Images ({imageFiles.length})
                </button>
                {expandedSections.image && (
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    gap: 4,
                  }}>
                    {imageFiles.map(file => (
                      <ImportedThumb key={file.id} file={file} onDragStart={handleDragStart} onDoubleClick={handleAddClip} />
                    ))}
                  </div>
                )}
              </div>
            )}

            {audioFiles.length > 0 && (
              <div style={{ marginBottom: 8 }}>
                <button
                  onClick={() => toggleSection('audio')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                    width: '100%',
                    padding: '4px 4px',
                    background: 'transparent',
                    border: 'none',
                    color: '#a1a1aa',
                    fontSize: 10,
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                    cursor: 'pointer',
                    marginBottom: 4,
                  }}
                >
                  {expandedSections.audio ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
                  <FileAudio size={10} style={{ color: '#bf5af2' }} />
                  Imported Audio ({audioFiles.length})
                </button>
                {expandedSections.audio && (
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    gap: 4,
                  }}>
                    {audioFiles.map(file => (
                      <ImportedThumb key={file.id} file={file} onDragStart={handleDragStart} onDoubleClick={handleAddClip} />
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Stock placeholder */}
            {importedFiles.length === 0 && (
              <div style={{ marginTop: 8 }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  padding: '4px 4px',
                  color: '#52525b',
                  fontSize: 10,
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  marginBottom: 4,
                }}>
                  <Film size={10} />
                  No media imported
                </div>
                <div style={{
                  color: '#3f3f46',
                  fontSize: 10,
                  textAlign: 'center',
                  padding: '12px 0',
                }}>
                  Drag files above to get started
                </div>
              </div>
            )}
          </>
        )}

        {activeTab === 'effects' && (
          <div style={{ marginBottom: 8 }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              padding: '4px 4px',
              color: '#a1a1aa',
              fontSize: 10,
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              marginBottom: 4,
            }}>
              <Wand2 size={10} style={{ color: '#ff9f0a' }} />
              Transitions & Effects
            </div>
            {filteredEffects.map(effect => (
              <div
                key={effect.id}
                draggable
                onDragStart={(e) => handleDragStart(e, {
                  id: effect.id,
                  kind: 'effect',
                  name: effect.name,
                })}
                onDragEnd={clearPayload}
                onDoubleClick={() => handleAddClip({
                  id: effect.id,
                  kind: 'effect',
                  name: effect.name,
                  duration: effect.duration,
                })}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '6px 6px',
                  borderRadius: 4,
                  cursor: 'grab',
                  marginBottom: 2,
                  transition: 'background 0.1s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#1a1a1e';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent';
                }}
              >
                <div style={{
                  width: 28,
                  height: 20,
                  borderRadius: 3,
                  background: 'linear-gradient(135deg, #27272a 0%, #18181b 100%)',
                  border: '1px solid #27272a',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  <Wand2 size={9} style={{ color: '#ff9f0a' }} />
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{
                    color: '#d4d4d8',
                    fontSize: 11,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}>
                    {effect.name}
                  </div>
                  <div style={{ color: '#52525b', fontSize: 9, fontFamily: 'ui-monospace, monospace' }}>
                    {effect.duration}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'audio' && (
          <div style={{ marginBottom: 8 }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              padding: '4px 4px',
              color: '#a1a1aa',
              fontSize: 10,
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              marginBottom: 4,
            }}>
              <Music size={10} style={{ color: '#bf5af2' }} />
              Audio Library
            </div>
            {filteredAudio.map(audio => (
              <div
                key={audio.id}
                draggable
                onDragStart={(e) => handleDragStart(e, {
                  id: audio.id,
                  kind: 'audio',
                  name: audio.name,
                })}
                onDragEnd={clearPayload}
                onDoubleClick={() => handleAddClip({
                  id: audio.id,
                  kind: 'audio',
                  name: audio.name,
                  duration: audio.duration,
                })}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '6px 6px',
                  borderRadius: 4,
                  cursor: 'grab',
                  marginBottom: 2,
                  transition: 'background 0.1s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#1a1a1e';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent';
                }}
              >
                <div style={{
                  width: 28,
                  height: 20,
                  borderRadius: 3,
                  background: 'linear-gradient(135deg, #27272a 0%, #18181b 100%)',
                  border: '1px solid #27272a',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  <Music size={9} style={{ color: '#bf5af2' }} />
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{
                    color: '#d4d4d8',
                    fontSize: 11,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}>
                    {audio.name}
                  </div>
                  <div style={{ color: '#52525b', fontSize: 9, fontFamily: 'ui-monospace, monospace' }}>
                    {audio.duration}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'templates' && (
          <div style={{ marginBottom: 8 }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              padding: '4px 4px',
              color: '#a1a1aa',
              fontSize: 10,
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              marginBottom: 4,
            }}>
              <LayoutTemplate size={10} style={{ color: '#0a84ff' }} />
              Templates
            </div>
            {filteredTemplates.map(template => (
              <div
                key={template.id}
                draggable
                onDragStart={(e) => handleDragStart(e, {
                  id: template.id,
                  kind: 'template',
                  name: template.name,
                })}
                onDragEnd={clearPayload}
                onDoubleClick={() => handleAddClip({
                  id: template.id,
                  kind: 'template',
                  name: template.name,
                  duration: template.duration,
                })}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '6px 6px',
                  borderRadius: 4,
                  cursor: 'grab',
                  marginBottom: 2,
                  transition: 'background 0.1s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#1a1a1e';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent';
                }}
              >
                <div style={{
                  width: 28,
                  height: 20,
                  borderRadius: 3,
                  background: 'linear-gradient(135deg, #27272a 0%, #18181b 100%)',
                  border: '1px solid #27272a',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  <LayoutTemplate size={9} style={{ color: '#0a84ff' }} />
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{
                    color: '#d4d4d8',
                    fontSize: 11,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}>
                    {template.name}
                  </div>
                  <div style={{ color: '#52525b', fontSize: 9, fontFamily: 'ui-monospace, monospace' }}>
                    {template.duration}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

function parseDurationStr(dur: string): number {
  // Plain number = seconds (e.g. "150" from file.duration)
  if (/^\d+(\.\d+)?$/.test(dur)) return parseFloat(dur)
  const parts = dur.split(':').map(Number)
  if (parts.length === 3) return (parts[0] || 0) * 3600 + (parts[1] || 0) * 60 + (parts[2] || 0)
  if (parts.length === 2) return (parts[0] || 0) * 60 + (parts[1] || 0)
  return 5
}

export default LibraryPanel;
