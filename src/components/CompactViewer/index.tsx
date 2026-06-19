import React, { useState, useEffect, useRef } from 'react';
import { Note, COLOR_MAP, COLORS, NoteColor } from '../../types/note';
import { useNoteStore } from '../../stores/noteStore';
import './styles.css';

interface CompactViewerProps {
  note: Note;
  onClose: () => void;
}

const CompactViewer: React.FC<CompactViewerProps> = ({ note, onClose }) => {
  const { updateNote, deleteNote, togglePin } = useNoteStore();
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState(note.title);
  const [content, setContent] = useState(note.content);
  const [color, setColor] = useState(note.color);
  const [isSaving, setIsSaving] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  // 自动保存
  useEffect(() => {
    if (!isEditing) return;

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
  }, [title, content, color, isEditing]);

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
  };

  const bgColor = COLOR_MAP[color];

  return (
    <div className="compact-viewer-overlay" onClick={onClose}>
      <div
        className="compact-viewer"
        style={{ backgroundColor: bgColor }}
        onClick={e => e.stopPropagation()}
      >
        {/* 标题栏 */}
        <div className="viewer-header">
          <div className="header-left">
            {/* 颜色选择 */}
            <div className="color-dots">
              {COLORS.slice(0, 4).map(c => (
                <button
                  key={c.name}
                  className={`color-dot ${c.name === color ? 'active' : ''}`}
                  style={{ backgroundColor: c.hex }}
                  onClick={() => handleColorSelect(c.name)}
                  title={c.label}
                />
              ))}
            </div>

            {/* 保存状态 */}
            {isEditing && (
              <span className="save-status">
                {isSaving ? '💾 保存中...' : '✓ 已保存'}
              </span>
            )}
          </div>

          <div className="header-right">
            {/* 编辑按钮 */}
            <button
              className={`btn-edit ${isEditing ? 'active' : ''}`}
              onClick={() => setIsEditing(!isEditing)}
              title={isEditing ? '完成编辑' : '编辑'}
            >
              {isEditing ? '✓' : '✏️'}
            </button>

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
            <div className="viewer-menu">
              <button onClick={() => { handlePin(); setShowMenu(false); }}>
                {note.is_pinned ? '📌 取消置顶' : '📌 置顶'}
              </button>
              <button onClick={() => { handleDelete(); setShowMenu(false); }}>
                🗑️ 删除
              </button>
            </div>
          )}
        </div>

        {/* 内容区域 */}
        <div className="viewer-content">
          {isEditing ? (
            <>
              {/* 编辑模式 */}
              <input
                type="text"
                className="viewer-title-input"
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="输入标题..."
                autoFocus
              />
              <textarea
                className="viewer-content-input"
                value={content}
                onChange={e => setContent(e.target.value)}
                placeholder="输入内容..."
              />
            </>
          ) : (
            <>
              {/* 显示模式 */}
              <h2 className="viewer-title">
                {note.title || '无标题'}
              </h2>
              <div className="viewer-text">
                {note.content ? (
                  <div dangerouslySetInnerHTML={{ __html: note.content }} />
                ) : (
                  <p className="empty-content">暂无内容</p>
                )}
              </div>
            </>
          )}
        </div>

        {/* 底部信息 */}
        <div className="viewer-footer">
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
    </div>
  );
};

export default CompactViewer;
