import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Note, COLOR_MAP, COLORS, NoteColor } from '../../types/note';
import { useNoteStore } from '../../stores/noteStore';
import RichEditor from '../RichEditor';
import './styles.css';

interface DesktopEditorProps {
  note: Note;
  onClose: () => void;
}

// 格式化最后保存时间
const formatLastSaved = (date: Date): string => {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);

  if (seconds < 10) return '刚刚';
  if (seconds < 60) return `${seconds}秒前`;
  if (minutes < 60) return `${minutes}分钟前`;
  return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
};

const DesktopEditor: React.FC<DesktopEditorProps> = ({ note, onClose }) => {
  const { updateNote, deleteNote, togglePin, loadTags, loadStats } = useNoteStore();

  // 编辑状态
  const [title, setTitle] = useState(note.title);
  const [content, setContent] = useState(note.content);
  const [color, setColor] = useState(note.color);

  // 保存状态
  const [isSaving, setIsSaving] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // 用于跟踪原始值
  const originalValuesRef = useRef<{
    title: string;
    content: string;
    color: NoteColor;
  } | null>(null);

  // 用于防抖的定时器
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 同步便签数据
  useEffect(() => {
    setTitle(note.title);
    setContent(note.content);
    setColor(note.color);
    setHasUnsavedChanges(false);
    setLastSaved(null);

    // 保存原始值
    originalValuesRef.current = {
      title: note.title,
      content: note.content,
      color: note.color,
    };

    // 清除之前的定时器
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }
  }, [note]);

  // 检查是否有实际变化
  const hasActualChanges = useCallback(() => {
    if (!originalValuesRef.current) return false;

    return (
      title !== originalValuesRef.current.title ||
      content !== originalValuesRef.current.content ||
      color !== originalValuesRef.current.color
    );
  }, [title, content, color]);

  // 保存便签
  const saveNote = useCallback(async () => {
    if (!hasActualChanges()) return;

    setIsSaving(true);
    try {
      await updateNote({
        ...note,
        title,
        content,
        color,
        updated_at: new Date().toISOString(),
      });
      await loadTags();
      await loadStats();
      setLastSaved(new Date());
      setHasUnsavedChanges(false);

      // 更新原始值
      originalValuesRef.current = {
        title,
        content,
        color,
      };
    } catch (error) {
      console.error('保存失败:', error);
    } finally {
      setIsSaving(false);
    }
  }, [note, title, content, color, hasActualChanges, updateNote, loadTags, loadStats]);

  // 数据变化时触发自动保存（防抖）
  useEffect(() => {
    if (!originalValuesRef.current) return;

    // 检查是否有实际变化
    if (!hasActualChanges()) {
      setHasUnsavedChanges(false);
      return;
    }

    // 标记有未保存的更改
    setHasUnsavedChanges(true);

    // 清除之前的定时器
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
    }

    // 设置新的定时器（2秒后保存）
    saveTimerRef.current = setTimeout(() => {
      saveNote();
    }, 2000);

    // 清理函数
    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
    };
  }, [title, content, color, hasActualChanges, saveNote]);

  // 处理内容变化
  const handleContentChange = useCallback((newContent: string) => {
    setContent(newContent);
  }, []);

  // 处理删除
  const handleDelete = async () => {
    if (window.confirm('确定要删除这个便签吗？')) {
      // 如果有未保存的更改，先保存
      if (hasUnsavedChanges && hasActualChanges()) {
        await saveNote();
      }
      await deleteNote(note.id);
      onClose();
    }
  };

  // 处理置顶
  const handlePin = async () => {
    // 如果有未保存的更改，先保存
    if (hasUnsavedChanges && hasActualChanges()) {
      await saveNote();
    }
    await togglePin(note.id);
  };

  // 处理颜色选择
  const handleColorSelect = (newColor: NoteColor) => {
    setColor(newColor);
    setShowColorPicker(false);
  };

  // 手动保存
  const handleManualSave = useCallback(async () => {
    if (!hasActualChanges()) return;

    // 清除自动保存定时器
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }

    await saveNote();
  }, [hasActualChanges, saveNote]);

  // 处理键盘快捷键
  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Ctrl/Cmd + S 手动保存
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault();
      handleManualSave();
    }
  };

  const bgColor = COLOR_MAP[color];

  return (
    <div className="desktop-editor" style={{ backgroundColor: bgColor }} onKeyDown={handleKeyDown}>
      {/* 工具栏 */}
      <div className="editor-toolbar">
        <div className="toolbar-left">
          {/* 颜色选择 */}
          <div className="color-picker-wrapper">
            <button
              className="btn-color"
              onClick={() => setShowColorPicker(!showColorPicker)}
              title="更换颜色"
            >
              <span className="color-dot" style={{ backgroundColor: bgColor }} />
            </button>
            {showColorPicker && (
              <div className="color-picker-popup">
                {COLORS.map(c => (
                  <button
                    key={c.name}
                    className={`color-option ${c.name === color ? 'active' : ''}`}
                    style={{ backgroundColor: c.hex }}
                    onClick={() => handleColorSelect(c.name)}
                    title={c.label}
                  />
                ))}
              </div>
            )}
          </div>

          {/* 保存状态 */}
          <span className="save-status">
            {isSaving ? (
              <span className="saving">💾 保存中...</span>
            ) : hasUnsavedChanges ? (
              <span className="unsaved">未保存</span>
            ) : lastSaved ? (
              <span className="saved">✓ {formatLastSaved(lastSaved)}</span>
            ) : (
              <span className="saved">✓ 已保存</span>
            )}
          </span>
        </div>

        <div className="toolbar-right">
          {/* 置顶 */}
          <button
            className={`btn-action ${note.is_pinned ? 'active' : ''}`}
            onClick={handlePin}
            title={note.is_pinned ? '取消置顶' : '置顶'}
          >
            📌
          </button>

          {/* 删除 */}
          <button className="btn-action delete" onClick={handleDelete} title="删除">
            🗑️
          </button>
        </div>
      </div>

      {/* 标题 */}
      <input
        type="text"
        className="editor-title"
        value={title}
        onChange={e => setTitle(e.target.value)}
        placeholder="输入标题..."
      />

      {/* 内容 */}
      <div className="editor-content-wrapper">
        <RichEditor
          content={content}
          onChange={handleContentChange}
          placeholder="输入内容... (支持粘贴和拖拽图片)"
          noteId={note.id}
        />
      </div>

      {/* 底部信息 */}
      <div className="editor-footer">
        <span className="footer-time">
          更新于: {new Date(note.updated_at).toLocaleString('zh-CN')}
        </span>
        {note.tags.length > 0 && (
          <div className="footer-tags">
            {note.tags.map(tag => (
              <span key={tag} className="tag-chip">{tag}</span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default DesktopEditor;
