import React, { useState, useMemo, useCallback } from 'react';
import { useNoteStore } from '../../stores/noteStore';
import { COLORS } from '../../types/note';
import './styles.css';

const Sidebar: React.FC = () => {
  const {
    notes,
    tags,
    selectedTag,
    stats,
    searchQuery,
    viewMode,
    selectedNote,
    searchNotes,
    filterByTag,
    setViewMode,
    createNote,
    setSelectedNote,
    loadNotes,
    loadTags,
    loadStats,
  } = useNoteStore();

  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [isTagsExpanded, setIsTagsExpanded] = useState(true);
  const [isPinnedExpanded, setIsPinnedExpanded] = useState(true);
  const [isRecentExpanded, setIsRecentExpanded] = useState(true);

  // 计算每个标签的便签数量
  const tagCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    notes.forEach(note => {
      note.tags.forEach(tag => {
        counts[tag] = (counts[tag] || 0) + 1;
      });
    });
    return counts;
  }, [notes]);

  // 刷新数据
  const refreshData = useCallback(async () => {
    await loadNotes();
    await loadTags();
    await loadStats();
  }, [loadNotes, loadTags, loadStats]);

  // 处理搜索
  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    searchNotes(e.target.value);
  };

  // 清除搜索
  const clearSearch = () => {
    searchNotes('');
  };

  // 处理标签筛选
  const handleTagClick = async (tag: string | null) => {
    if (selectedTag === tag) {
      // 如果点击已选中的标签，取消筛选
      await filterByTag(null);
    } else {
      await filterByTag(tag);
    }
  };

  // 新建便签
  const handleNewNote = async () => {
    try {
      const note = await createNote();
      setSelectedNote(note);
      await refreshData();
    } catch (error) {
      console.error('创建便签失败:', error);
    }
  };

  // 点击最近便签
  const handleRecentClick = (noteId: string) => {
    const note = notes.find(n => n.id === noteId);
    if (note) {
      setSelectedNote(note);
    }
  };

  // 点击置顶便签
  const handlePinnedClick = (noteId: string) => {
    const note = notes.find(n => n.id === noteId);
    if (note) {
      setSelectedNote(note);
    }
  };

  // 获取置顶便签
  const pinnedNotes = useMemo(() => notes.filter(n => n.is_pinned), [notes]);
  const recentNotes = useMemo(() => notes.slice(0, 8), [notes]);

  return (
    <aside className="sidebar">
      {/* Logo */}
      <div className="sidebar-header">
        <div className="logo">
          <span className="logo-icon">📝</span>
          <h1 className="logo-text">Notes</h1>
        </div>
        <button className="btn-new-note" onClick={handleNewNote}>
          <span className="btn-icon">+</span>
          <span className="btn-text">新建便签</span>
        </button>
      </div>

      {/* 搜索框 */}
      <div className={`search-box ${isSearchFocused ? 'focused' : ''}`}>
        <span className="search-icon">🔍</span>
        <input
          type="text"
          placeholder="搜索便签..."
          value={searchQuery}
          onChange={handleSearch}
          onFocus={() => setIsSearchFocused(true)}
          onBlur={() => setIsSearchFocused(false)}
        />
        {searchQuery && (
          <button className="btn-clear" onClick={clearSearch}>
            ✕
          </button>
        )}
      </div>

      {/* 统计信息 */}
      <div className="stats-bar">
        <div className="stat-item">
          <span className="stat-number">{stats.total}</span>
          <span className="stat-label">全部</span>
        </div>
        <div className="stat-item">
          <span className="stat-number">{stats.pinned}</span>
          <span className="stat-label">置顶</span>
        </div>
        <div className="stat-item">
          <span className="stat-number">{stats.tags}</span>
          <span className="stat-label">标签</span>
        </div>
      </div>

      {/* 视图切换 */}
      <div className="view-toggle">
        <button
          className={`btn-view ${viewMode === 'grid' ? 'active' : ''}`}
          onClick={() => setViewMode('grid')}
          title="网格视图"
        >
          ▦
        </button>
        <button
          className={`btn-view ${viewMode === 'list' ? 'active' : ''}`}
          onClick={() => setViewMode('list')}
          title="列表视图"
        >
          ☰
        </button>
      </div>

      {/* 标签列表 */}
      <div className="section compact">
        <div
          className="section-header"
          onClick={() => setIsTagsExpanded(!isTagsExpanded)}
        >
          <h3 className="section-title">
            <span className="expand-icon">{isTagsExpanded ? '▼' : '▶'}</span>
            标签
          </h3>
          <span className="section-count">{tags.length}</span>
        </div>
        {isTagsExpanded && (
          <div className="tags-container">
            <div
              className={`tag-chip ${!selectedTag ? 'active' : ''}`}
              onClick={() => handleTagClick(null)}
            >
              全部 ({notes.length})
            </div>
            <div className="tags-flow">
              {tags.map(tag => (
                <div
                  key={tag}
                  className={`tag-chip ${selectedTag === tag ? 'active' : ''}`}
                  onClick={() => handleTagClick(tag)}
                >
                  {tag} ({tagCounts[tag] || 0})
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 置顶便签 */}
      {pinnedNotes.length > 0 && (
        <div className="section compact">
          <div
            className="section-header"
            onClick={() => setIsPinnedExpanded(!isPinnedExpanded)}
          >
            <h3 className="section-title">
              <span className="expand-icon">{isPinnedExpanded ? '▼' : '▶'}</span>
              📌 置顶
            </h3>
            <span className="section-count">{pinnedNotes.length}</span>
          </div>
          {isPinnedExpanded && (
            <div className="pinned-list compact">
              {pinnedNotes.map(note => (
                <div
                  key={note.id}
                  className={`pinned-item compact ${selectedNote?.id === note.id ? 'active' : ''}`}
                  style={{ borderLeftColor: COLORS.find(c => c.name === note.color)?.hex }}
                  onClick={() => handlePinnedClick(note.id)}
                >
                  <span className="pinned-title">
                    {note.title || '无标题'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 最近便签 */}
      <div className="section compact">
        <div
          className="section-header"
          onClick={() => setIsRecentExpanded(!isRecentExpanded)}
        >
          <h3 className="section-title">
            <span className="expand-icon">{isRecentExpanded ? '▼' : '▶'}</span>
            🕐 最近
          </h3>
          <span className="section-count">{recentNotes.length}</span>
        </div>
        {isRecentExpanded && (
          <div className="recent-list compact">
            {recentNotes.map(note => (
              <div
                key={note.id}
                className={`recent-item compact ${selectedNote?.id === note.id ? 'active' : ''}`}
                style={{ borderLeftColor: COLORS.find(c => c.name === note.color)?.hex }}
                onClick={() => handleRecentClick(note.id)}
              >
                <div className="recent-title">{note.title || '无标题'}</div>
                <div className="recent-time">
                  {new Date(note.updated_at).toLocaleDateString('zh-CN')}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 底部信息 */}
      <div className="sidebar-footer">
        <div className="footer-info">
          <span>Notes v1.0</span>
          <span>•</span>
          <span>{notes.length} 个便签</span>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
