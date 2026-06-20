import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Note, COLOR_MAP, COLORS, NoteColor } from '../../types/note';
import { useNoteStore } from '../../stores/noteStore';
import RichEditor from '../RichEditor';
import './styles.css';

interface DesktopEditorProps {
  note: Note;
  noteIndex: number;
  totalNotes: number;
  onNewNote: () => void;
  onExit: () => void;
  onPrev: () => void;
  onNext: () => void;
  canPrev: boolean;
  canNext: boolean;
  onClose: () => void;
}

const DesktopEditor: React.FC<DesktopEditorProps> = ({
  note, noteIndex, totalNotes, onNewNote, onExit, onPrev, onNext, canPrev, canNext, onClose
}) => {
  const { updateNote, deleteNote, togglePin, loadTags, loadStats } = useNoteStore();

  const [title, setTitle] = useState(note.title);
  const [content, setContent] = useState(note.content);
  const [color, setColor] = useState(note.color);
  const [isSaving, setIsSaving] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  const originalValuesRef = useRef<{ title: string; content: string; color: NoteColor } | null>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setTitle(note.title);
    setContent(note.content);
    setColor(note.color);
    originalValuesRef.current = { title: note.title, content: note.content, color: note.color };
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
  }, [note]);

  // 点击外部关闭菜单
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const hasActualChanges = useCallback(() => {
    if (!originalValuesRef.current) return false;
    return title !== originalValuesRef.current.title || content !== originalValuesRef.current.content || color !== originalValuesRef.current.color;
  }, [title, content, color]);

  const saveNote = useCallback(async () => {
    if (!hasActualChanges()) return;
    setIsSaving(true);
    try {
      await updateNote({ ...note, title, content, color, updated_at: new Date().toISOString() });
      await loadTags();
      await loadStats();
      originalValuesRef.current = { title, content, color };
    } catch (error) {
      console.error('保存失败:', error);
    } finally {
      setIsSaving(false);
    }
  }, [note, title, content, color, hasActualChanges, updateNote, loadTags, loadStats]);

  // 自动保存
  useEffect(() => {
    if (!originalValuesRef.current || !hasActualChanges()) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => saveNote(), 2000);
    return () => { if (saveTimerRef.current) clearTimeout(saveTimerRef.current); };
  }, [title, content, color, hasActualChanges, saveNote]);

  const handleContentChange = useCallback((newContent: string) => setContent(newContent), []);

  const handleDelete = async () => {
    await deleteNote(note.id);
    onClose();
  };

  const bgColor = COLOR_MAP[color];

  return (
    <div className="desktop-editor-compact" style={{ backgroundColor: bgColor }}>
      {/* 顶部集成工具栏 - 单行极简 */}
      <div className="compact-topbar">
        {/* 左侧：导航 */}
        <div className="topbar-nav">
          <button className="topbar-btn" onClick={onPrev} disabled={!canPrev}>‹</button>
          <span className="topbar-count">{noteIndex + 1}/{totalNotes}</span>
          <button className="topbar-btn" onClick={onNext} disabled={!canNext}>›</button>
        </div>

        {/* 右侧：操作 */}
        <div className="topbar-actions">
          {isSaving && <span className="save-dot" />}
          <button className="topbar-btn exit-btn" onClick={onExit} title="退出桌面模式">✕</button>
          <div className="menu-wrapper" ref={menuRef}>
            <button className="topbar-btn" onClick={() => setShowMenu(!showMenu)}>⋯</button>
            {showMenu && (
              <div className="dropdown-menu">
                <button onClick={() => { onNewNote(); setShowMenu(false); }}>📝 新建便签</button>
                <button onClick={() => { togglePin(note.id); setShowMenu(false); }}>
                  {note.is_pinned ? '📌 取消置顶' : '📌 置顶'}
                </button>
                <div className="menu-colors">
                  {COLORS.map(c => (
                    <button
                      key={c.name}
                      className={`color-dot-small ${c.name === color ? 'active' : ''}`}
                      style={{ backgroundColor: c.hex }}
                      onClick={() => { setColor(c.name); setShowMenu(false); }}
                    />
                  ))}
                </div>
                <div className="menu-divider" />
                <button className="danger" onClick={() => { handleDelete(); setShowMenu(false); }}>🗑 删除</button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 标题 - 紧凑 */}
      <input
        type="text"
        className="compact-title-input"
        value={title}
        onChange={e => setTitle(e.target.value)}
        placeholder="标题..."
      />

      {/* 内容 - 最大化 */}
      <div className="compact-content-area">
        <RichEditor
          content={content}
          onChange={handleContentChange}
          placeholder="开始记录..."
          noteId={note.id}
        />
      </div>
    </div>
  );
};

export default DesktopEditor;
