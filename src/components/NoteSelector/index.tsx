import React, { useState } from 'react';
import { useNoteStore } from '../../stores/noteStore';
import { Note, COLOR_MAP } from '../../types/note';
import './styles.css';

interface NoteSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  onNoteSelect: (note: Note) => void;
  compactNotes: string[];
}

const NoteSelector: React.FC<NoteSelectorProps> = ({
  isOpen,
  onClose,
  onNoteSelect,
  compactNotes,
}) => {
  const { notes, searchNotes, searchQuery } = useNoteStore();
  const [filter, setFilter] = useState<'all' | 'open' | 'closed'>('all');

  // 处理搜索
  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    searchNotes(e.target.value);
  };

  // 筛选便签
  const filteredNotes = notes.filter(note => {
    if (filter === 'open') return compactNotes.includes(note.id);
    if (filter === 'closed') return !compactNotes.includes(note.id);
    return true;
  });

  // 处理便签选择
  const handleNoteClick = (note: Note) => {
    onNoteSelect(note);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="note-selector-overlay" onClick={onClose}>
      <div className="note-selector" onClick={e => e.stopPropagation()}>
        {/* 头部 */}
        <div className="selector-header">
          <h2 className="selector-title">📝 选择便签</h2>
          <button className="btn-close" onClick={onClose}>
            ✕
          </button>
        </div>

        {/* 搜索框 */}
        <div className="selector-search">
          <input
            type="text"
            placeholder="搜索便签..."
            value={searchQuery}
            onChange={handleSearch}
            autoFocus
          />
        </div>

        {/* 筛选按钮 */}
        <div className="selector-filters">
          <button
            className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
            onClick={() => setFilter('all')}
          >
            全部 ({notes.length})
          </button>
          <button
            className={`filter-btn ${filter === 'open' ? 'active' : ''}`}
            onClick={() => setFilter('open')}
          >
            已打开 ({compactNotes.length})
          </button>
          <button
            className={`filter-btn ${filter === 'closed' ? 'active' : ''}`}
            onClick={() => setFilter('closed')}
          >
            未打开 ({notes.length - compactNotes.length})
          </button>
        </div>

        {/* 便签列表 */}
        <div className="selector-list">
          {filteredNotes.length === 0 ? (
            <div className="empty-state">
              <span className="empty-icon">📭</span>
              <p>没有找到便签</p>
            </div>
          ) : (
            filteredNotes.map(note => (
              <div
                key={note.id}
                className={`selector-item ${compactNotes.includes(note.id) ? 'opened' : ''}`}
                style={{
                  borderLeftColor: COLOR_MAP[note.color] || COLOR_MAP.Yellow,
                }}
                onClick={() => handleNoteClick(note)}
              >
                <div className="item-header">
                  <span className="item-title">
                    {note.title || '无标题'}
                  </span>
                  {compactNotes.includes(note.id) && (
                    <span className="item-badge">已打开</span>
                  )}
                </div>
                <div className="item-preview">
                  {getPreview(note.content)}
                </div>
                <div className="item-meta">
                  <span className="item-time">
                    {new Date(note.updated_at).toLocaleDateString('zh-CN')}
                  </span>
                  {note.tags.length > 0 && (
                    <div className="item-tags">
                      {note.tags.slice(0, 2).map(tag => (
                        <span key={tag} className="tag-chip">
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* 底部 */}
        <div className="selector-footer">
          <span className="footer-info">
            点击便签即可在精简模式中打开
          </span>
        </div>
      </div>
    </div>
  );
};

// 获取预览内容
function getPreview(content: string): string {
  if (!content) return '暂无内容';
  // 去除 HTML 标签
  const tmp = document.createElement('div');
  tmp.innerHTML = content;
  const text = tmp.textContent || tmp.innerText || '';
  return text.length > 60 ? text.slice(0, 60) + '...' : text;
}

export default NoteSelector;
