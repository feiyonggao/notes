import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Note, COLORS, COLOR_MAP, NoteColor } from '../../types/note';
import { useNoteStore } from '../../stores/noteStore';
import TagInput from '../TagInput';
import RichEditor from '../RichEditor';
import './styles.css';

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

const NoteEditor: React.FC = () => {
  const {
    selectedNote,
    setSelectedNote,
    updateNote,
    deleteNote,
    loadTags,
    loadStats,
  } = useNoteStore();

  // 编辑状态
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [color, setColor] = useState<NoteColor>('Yellow');
  const [tags, setTags] = useState<string[]>([]);
  const [isMarkdown, setIsMarkdown] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);

  // 保存状态
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // 用于跟踪原始值，避免不必要的保存
  const originalValuesRef = useRef<{
    title: string;
    content: string;
    color: NoteColor;
    tags: string[];
    isMarkdown: boolean;
  } | null>(null);

  // 用于防抖的定时器
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const titleRef = useRef<HTMLTextAreaElement>(null);

  // 同步选中的便签数据
  useEffect(() => {
    if (selectedNote) {
      setTitle(selectedNote.title);
      setContent(selectedNote.content);
      setColor(selectedNote.color);
      setTags(selectedNote.tags);
      setIsMarkdown(selectedNote.is_markdown);
      setHasUnsavedChanges(false);
      setLastSaved(null);

      // 保存原始值用于比较
      originalValuesRef.current = {
        title: selectedNote.title,
        content: selectedNote.content,
        color: selectedNote.color,
        tags: selectedNote.tags,
        isMarkdown: selectedNote.is_markdown,
      };

      // 清除之前的保存定时器
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
        saveTimerRef.current = null;
      }
    }
  }, [selectedNote]);

  // 检查是否有实际变化
  const hasActualChanges = useCallback(() => {
    if (!originalValuesRef.current) return false;

    return (
      title !== originalValuesRef.current.title ||
      content !== originalValuesRef.current.content ||
      color !== originalValuesRef.current.color ||
      JSON.stringify(tags) !== JSON.stringify(originalValuesRef.current.tags) ||
      isMarkdown !== originalValuesRef.current.isMarkdown
    );
  }, [title, content, color, tags, isMarkdown]);

  // 保存便签
  const saveNote = useCallback(async () => {
    if (!selectedNote || !hasActualChanges()) return;

    const updatedNote: Note = {
      ...selectedNote,
      title,
      content,
      color,
      tags,
      is_markdown: isMarkdown,
      updated_at: new Date().toISOString(),
    };

    setIsSaving(true);
    try {
      await updateNote(updatedNote);
      await loadTags();
      await loadStats();
      setLastSaved(new Date());
      setHasUnsavedChanges(false);

      // 更新原始值
      originalValuesRef.current = {
        title,
        content,
        color,
        tags,
        isMarkdown,
      };
    } catch (error) {
      console.error('保存失败:', error);
    } finally {
      setIsSaving(false);
    }
  }, [selectedNote, title, content, color, tags, isMarkdown, hasActualChanges, updateNote, loadTags, loadStats]);

  // 数据变化时触发自动保存（防抖）
  useEffect(() => {
    if (!selectedNote || !originalValuesRef.current) return;

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
  }, [title, content, color, tags, isMarkdown, selectedNote, hasActualChanges, saveNote]);

  // 自动调整文本框高度
  const adjustTextareaHeight = (textarea: HTMLTextAreaElement | null) => {
    if (!textarea) return;
    textarea.style.height = 'auto';
    textarea.style.height = `${textarea.scrollHeight}px`;
  };

  useEffect(() => {
    adjustTextareaHeight(titleRef.current);
  }, [title]);

  // 处理关闭
  const handleClose = () => {
    // 如果有未保存的更改，先保存
    if (hasUnsavedChanges && hasActualChanges()) {
      saveNote();
    }
    setSelectedNote(null);
  };

  // 处理删除
  const handleDelete = async () => {
    if (selectedNote) {
      await deleteNote(selectedNote.id);
      setSelectedNote(null);
    }
  };

  // 处理标签更新
  const handleTagsChange = (newTags: string[]) => {
    setTags(newTags);
  };

  // 处理颜色选择
  const handleColorSelect = (newColor: NoteColor) => {
    setColor(newColor);
    setShowColorPicker(false);
  };

  // 处理内容变化
  const handleContentChange = useCallback((newContent: string) => {
    setContent(newContent);
  }, []);

  // 手动保存
  const handleManualSave = useCallback(async () => {
    if (!selectedNote || !hasActualChanges()) return;

    // 清除自动保存定时器
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }

    await saveNote();
  }, [selectedNote, hasActualChanges, saveNote]);

  // 处理键盘快捷键
  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Ctrl/Cmd + S 手动保存
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault();
      handleManualSave();
    }
    // Ctrl/Cmd + M 切换 Markdown
    if ((e.ctrlKey || e.metaKey) && e.key === 'm') {
      e.preventDefault();
      setIsMarkdown(!isMarkdown);
    }
    // Escape 关闭
    if (e.key === 'Escape') {
      handleClose();
    }
  };

  if (!selectedNote) {
    return (
      <div className="editor-empty">
        <div className="empty-content">
          <span className="empty-icon">📝</span>
          <h3>选择或创建一个便签</h3>
          <p>从左侧列表选择便签，或点击"新建便签"开始</p>
        </div>
      </div>
    );
  }

  const bgColor = COLOR_MAP[color];

  return (
    <div className="note-editor" style={{ backgroundColor: bgColor }} onKeyDown={handleKeyDown}>
      {/* 顶部工具栏 */}
      <div className="editor-toolbar">
        <div className="toolbar-left">
          {/* 颜色选择器 */}
          <div className="color-picker-wrapper">
            <button
              className="btn-color"
              onClick={() => setShowColorPicker(!showColorPicker)}
              title="更换颜色"
            >
              <span
                className="color-preview"
                style={{ backgroundColor: bgColor }}
              />
            </button>
            {showColorPicker && (
              <div className="color-picker animate-scale-in">
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

          {/* Markdown 切换 */}
          <button
            className={`btn-markdown ${isMarkdown ? 'active' : ''}`}
            onClick={() => setIsMarkdown(!isMarkdown)}
            title={isMarkdown ? '切换到普通模式' : '切换到 Markdown 模式'}
          >
            MD
          </button>

          {/* 保存状态 */}
          <span className="save-status">
            {isSaving ? (
              <span className="saving">💾 保存中...</span>
            ) : hasUnsavedChanges ? (
              <span className="unsaved">未保存</span>
            ) : lastSaved ? (
              <span className="saved">✓ 已保存 {formatLastSaved(lastSaved)}</span>
            ) : (
              <span className="saved">✓ 已保存</span>
            )}
          </span>
        </div>

        <div className="toolbar-right">
          {/* 删除按钮 */}
          <button
            className="btn-delete"
            onClick={handleDelete}
            title="删除便签"
          >
            🗑️
          </button>

          {/* 关闭按钮 */}
          <button className="btn-close" onClick={handleClose} title="关闭">
            ✕
          </button>
        </div>
      </div>

      {/* 标题输入 */}
      <textarea
        ref={titleRef}
        className="editor-title"
        value={title}
        onChange={e => setTitle(e.target.value)}
        placeholder="输入标题..."
        rows={1}
      />

      {/* 富文本内容编辑器 */}
      <RichEditor
        content={content}
        onChange={handleContentChange}
        placeholder="输入内容... (支持粘贴和拖拽图片)"
        noteId={selectedNote.id}
        isMarkdown={isMarkdown}
      />

      {/* 标签输入 */}
      <div className="editor-tags">
        <TagInput tags={tags} onChange={handleTagsChange} />
      </div>

      {/* 底部信息 */}
      <div className="editor-footer">
        <span className="footer-time">
          创建于: {new Date(selectedNote.created_at).toLocaleString('zh-CN')}
        </span>
        <span className="footer-time">
          更新于: {new Date(selectedNote.updated_at).toLocaleString('zh-CN')}
        </span>
        <span className="footer-shortcut">
          Ctrl+S 手动保存 | Ctrl+V 粘贴图片
        </span>
      </div>
    </div>
  );
};

export default NoteEditor;
