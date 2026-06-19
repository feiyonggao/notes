import React, { useState, useEffect, useRef } from 'react';
import { Note, COLOR_MAP } from '../../types/note';
import { formatRelativeTime, getPlainTextPreview } from '../../utils/format';
import { useNoteStore } from '../../stores/noteStore';
import './styles.css';

interface NoteCardProps {
  note: Note;
  viewMode: 'grid' | 'list';
  compact?: boolean;
  onClick?: () => void;
  isSelected?: boolean;
}

const NoteCard: React.FC<NoteCardProps> = ({ note, viewMode, compact = false, onClick, isSelected = false }) => {
  const { setSelectedNote, updateNote, togglePin, deleteNote } = useNoteStore();
  const [showMenu, setShowMenu] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(note.content);
  const [isSaving, setIsSaving] = useState(false);

  const contentRef = useRef<HTMLTextAreaElement>(null);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  // 同步内容
  useEffect(() => {
    setEditContent(note.content);
  }, [note.content]);

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
        content: editContent,
        updated_at: new Date().toISOString(),
      });
      setIsSaving(false);
    }, 500);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [editContent, isEditing]);

  // 获取背景色
  const bgColor = COLOR_MAP[note.color] || COLOR_MAP.Yellow;

  // 处理点击
  const handleClick = (e: React.MouseEvent) => {
    // 如果正在编辑或展开，不处理
    if (isEditing || isExpanded) return;

    // 如果点击的是按钮，不处理
    const target = e.target as HTMLElement;
    if (target.tagName === 'BUTTON' || target.closest('button')) return;

    if (compact) {
      // 桌面模式下展开显示完整内容
      setIsExpanded(true);
    } else if (onClick) {
      onClick();
    } else {
      setSelectedNote(note);
    }
  };

  // 关闭展开
  const handleCloseExpanded = () => {
    setIsExpanded(false);
    setIsEditing(false);
  };

  // 进入编辑模式
  const handleStartEdit = () => {
    setIsEditing(true);
    setTimeout(() => contentRef.current?.focus(), 100);
  };

  // 处理键盘事件
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      if (isEditing) {
        setIsEditing(false);
      } else {
        handleCloseExpanded();
      }
    }
    e.stopPropagation();
  };

  // 处理置顶
  const handlePin = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await togglePin(note.id);
  };

  // 处理删除
  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm('确定要删除这个便签吗？')) {
      await deleteNote(note.id);
      handleCloseExpanded();
    }
  };

  // 获取纯文本预览
  const getPreview = () => {
    const maxLength = compact ? 100 : (viewMode === 'grid' ? 150 : 80);
    return getPlainTextPreview(note.content, maxLength);
  };

  // 渲染完整内容
  const renderFullContent = () => {
    if (!note.content) return <p className="empty-content">暂无内容</p>;
    return <div dangerouslySetInnerHTML={{ __html: note.content }} />;
  };

  // 展开模式 - 显示完整便签
  if (isExpanded && compact) {
    return (
      <div className="note-expanded-overlay" onClick={handleCloseExpanded}>
        <div
          className="note-expanded"
          style={{ backgroundColor: bgColor }}
          onClick={e => e.stopPropagation()}
          onKeyDown={handleKeyDown}
        >
          {/* 标题栏 */}
          <div className="expanded-header">
            <div className="header-left">
              {/* 颜色标识 */}
              <div className="color-indicator" style={{ backgroundColor: bgColor }} />

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

              {/* 置顶按钮 */}
              <button
                className={`btn-pin ${note.is_pinned ? 'active' : ''}`}
                onClick={handlePin}
                title={note.is_pinned ? '取消置顶' : '置顶'}
              >
                📌
              </button>

              {/* 删除按钮 */}
              <button className="btn-delete" onClick={handleDelete} title="删除">
                🗑️
              </button>

              {/* 关闭按钮 */}
              <button className="btn-close" onClick={handleCloseExpanded} title="关闭">
                ✕
              </button>
            </div>
          </div>

          {/* 标题 */}
          <div className="expanded-title">
            {note.title || '无标题'}
          </div>

          {/* 内容区域 */}
          <div className="expanded-content">
            {isEditing ? (
              <textarea
                ref={contentRef}
                className="expanded-content-edit"
                value={editContent}
                onChange={e => setEditContent(e.target.value)}
                placeholder="输入内容..."
                autoFocus
              />
            ) : (
              <div className="expanded-content-view" onClick={handleStartEdit}>
                {renderFullContent()}
                <div className="edit-hint-overlay">
                  <span>点击编辑</span>
                </div>
              </div>
            )}
          </div>

          {/* 底部信息 */}
          <div className="expanded-footer">
            <span className="footer-time">
              创建于: {new Date(note.created_at).toLocaleString('zh-CN')}
            </span>
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
            {isEditing && (
              <span className="footer-hint">ESC 退出编辑</span>
            )}
          </div>
        </div>
      </div>
    );
  }

  // 卡片模式
  return (
    <div
      className={`note-card ${viewMode} ${compact ? 'compact' : ''} ${note.is_pinned ? 'pinned' : ''} ${isSelected ? 'selected' : ''}`}
      style={{ backgroundColor: bgColor }}
      onClick={handleClick}
      onMouseEnter={() => setShowMenu(true)}
      onMouseLeave={() => setShowMenu(false)}
    >
      {/* 置顶标记 */}
      {note.is_pinned && (
        <div className="pin-badge">📌</div>
      )}

      {/* 操作菜单 */}
      {showMenu && (
        <div className="card-menu animate-fade-in">
          <button
            className={`menu-btn ${note.is_pinned ? 'active' : ''}`}
            onClick={handlePin}
            title={note.is_pinned ? '取消置顶' : '置顶'}
          >
            📌
          </button>
          <button
            className="menu-btn delete"
            onClick={handleDelete}
            title="删除"
          >
            🗑️
          </button>
        </div>
      )}

      {/* 标题 */}
      <h3 className="card-title">{note.title || '无标题'}</h3>

      {/* 内容预览 */}
      <p className="card-content">{getPreview()}</p>

      {/* 标签 - 紧凑模式下不显示 */}
      {!compact && note.tags.length > 0 && (
        <div className="card-tags">
          {note.tags.slice(0, 3).map(tag => (
            <span key={tag} className="tag-chip">
              {tag}
            </span>
          ))}
          {note.tags.length > 3 && (
            <span className="tag-more">+{note.tags.length - 3}</span>
          )}
        </div>
      )}

      {/* 底部信息 */}
      <div className="card-footer">
        <span className="card-time">
          {formatRelativeTime(note.updated_at)}
        </span>
        {!compact && note.is_markdown && (
          <span className="markdown-badge" title="Markdown 格式">
            MD
          </span>
        )}
      </div>
    </div>
  );
};

export default NoteCard;
