import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Note, COLOR_MAP, COLORS, NoteColor } from '../../types/note';
import { useNoteStore } from '../../stores/noteStore';
import './styles.css';

interface CompactNoteProps {
  note: Note;
  onClose: () => void;
}

const CompactNote: React.FC<CompactNoteProps> = ({ note, onClose }) => {
  const { updateNote, deleteNote, togglePin } = useNoteStore();
  const [title, setTitle] = useState(note.title);
  const [content, setContent] = useState(note.content);
  const [color, setColor] = useState(note.color);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [opacity, setOpacity] = useState(0.85);
  const [isEditing, setIsEditing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState({ x: 100, y: 100 });

  const noteRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLTextAreaElement>(null);
  const contentRef = useRef<HTMLTextAreaElement>(null);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const dragOffset = useRef({ x: 0, y: 0 });

  // 自动保存
  useEffect(() => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(async () => {
      setIsSaving(true);
      await updateNote({
        ...note,
        title,
        content,
        color,
        updated_at: new Date().toISOString(),
      });
      setIsSaving(false);
    }, 500);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [title, content, color]);

  // 处理拖拽开始
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (isEditing) return; // 编辑时不拖拽
    if ((e.target as HTMLElement).tagName === 'TEXTAREA' ||
        (e.target as HTMLElement).tagName === 'BUTTON') return;

    setIsDragging(true);
    dragOffset.current = {
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    };
    e.preventDefault();
  }, [isEditing, position]);

  // 处理拖拽
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;

      const newX = e.clientX - dragOffset.current.x;
      const newY = e.clientY - dragOffset.current.y;

      // 限制在窗口范围内
      const maxX = window.innerWidth - 220;
      const maxY = window.innerHeight - 120;

      setPosition({
        x: Math.max(0, Math.min(newX, maxX)),
        y: Math.max(0, Math.min(newY, maxY)),
      });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  // 处理点击进入编辑模式
  const handleClick = useCallback((e: React.MouseEvent) => {
    if (isDragging) return;
    // 只有点击内容区域才进入编辑模式
    const target = e.target as HTMLElement;
    if (target.tagName === 'TEXTAREA' || target.closest('.compact-content-area')) {
      setIsEditing(true);
    }
  }, [isDragging]);

  // 处理失焦退出编辑模式
  const handleBlur = useCallback((e: React.FocusEvent) => {
    // 检查焦点是否还在便签内
    if (noteRef.current && !noteRef.current.contains(e.relatedTarget as Node)) {
      setIsEditing(false);
    }
  }, []);

  // 处理删除
  const handleDelete = async () => {
    if (window.confirm('确定要删除这个便签吗？')) {
      await deleteNote(note.id);
      onClose();
    }
  };

  // 处理置顶
  const handlePin = async () => {
    await togglePin(note.id);
  };

  // 处理颜色选择
  const handleColorSelect = (newColor: NoteColor) => {
    setColor(newColor);
    setShowColorPicker(false);
  };

  // 处理透明度变化
  const handleOpacityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setOpacity(Number(e.target.value));
  };

  // 获取预览内容
  const getPreviewContent = () => {
    if (!content) return '暂无内容';
    // 去除 HTML 标签
    const tmp = document.createElement('div');
    tmp.innerHTML = content;
    const text = tmp.textContent || tmp.innerText || '';
    return text.length > 80 ? text.slice(0, 80) + '...' : text;
  };

  const bgColor = COLOR_MAP[color];

  return (
    <div
      ref={noteRef}
      className={`compact-note ${isEditing ? 'editing' : ''} ${isDragging ? 'dragging' : ''}`}
      style={{
        backgroundColor: bgColor,
        opacity,
        left: `${position.x}px`,
        top: `${position.y}px`,
      }}
      onMouseDown={handleMouseDown}
      onClick={handleClick}
      onBlur={handleBlur}
    >
      {/* 标题栏 */}
      <div className="compact-header">
        <div className="header-left">
          {/* 颜色选择器 */}
          <button
            className="btn-color"
            onClick={() => setShowColorPicker(!showColorPicker)}
            title="更换颜色"
          >
            <span
              className="color-dot"
              style={{ backgroundColor: bgColor }}
            />
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

          {/* 保存状态 */}
          <span className="save-indicator">
            {isSaving ? '💾' : '✓'}
          </span>
        </div>

        <div className="header-right">
          {/* 菜单按钮 */}
          <button
            className="btn-menu"
            onClick={() => setShowMenu(!showMenu)}
            title="菜单"
          >
            ⋯
          </button>

          {/* 关闭按钮 */}
          <button className="btn-close" onClick={onClose} title="关闭">
            ✕
          </button>
        </div>

        {/* 菜单 */}
        {showMenu && (
          <div className="compact-menu">
            <button onClick={() => { setIsEditing(!isEditing); setShowMenu(false); }}>
              {isEditing ? '🔒 锁定' : '✏️ 编辑'}
            </button>
            <button onClick={() => { handlePin(); setShowMenu(false); }}>
              {note.is_pinned ? '📌 取消置顶' : '📌 置顶'}
            </button>
            <button onClick={() => { handleDelete(); setShowMenu(false); }}>
              🗑️ 删除
            </button>
            <div className="menu-divider" />
            <div className="opacity-control">
              <span>透明度</span>
              <input
                type="range"
                min="0.3"
                max="1"
                step="0.1"
                value={opacity}
                onChange={handleOpacityChange}
              />
            </div>
          </div>
        )}
      </div>

      {/* 内容区域 */}
      <div className="compact-content-area">
        {isEditing ? (
          <>
            {/* 编辑模式 */}
            <textarea
              ref={titleRef}
              className="compact-title"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="标题"
              rows={1}
              autoFocus
            />
            <textarea
              ref={contentRef}
              className="compact-content"
              value={content}
              onChange={e => setContent(e.target.value)}
              placeholder="输入内容..."
              rows={3}
            />
          </>
        ) : (
          <>
            {/* 显示模式 */}
            <div className="compact-title-display">
              {title || '无标题'}
            </div>
            <div className="compact-content-display">
              {getPreviewContent()}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default CompactNote;
