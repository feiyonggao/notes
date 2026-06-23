import React, { useState, useMemo, useCallback } from 'react';
import { useNoteStore } from '../../stores/noteStore';
import { COLORS } from '../../types/note';
import { save, open } from '@tauri-apps/plugin-dialog';
import { writeTextFile, readTextFile } from '@tauri-apps/plugin-fs';
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
    exportNotes,
    importNotes,
  } = useNoteStore();

  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [isTagsExpanded, setIsTagsExpanded] = useState(true);
  const [isPinnedExpanded, setIsPinnedExpanded] = useState(true);
  const [isRecentExpanded, setIsRecentExpanded] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

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

  // 导出便签为 TXT 格式
  const exportAsTxt = (notesList: any[]): string => {
    return notesList.map(note => {
      const title = note.title || '无标题';
      const content = note.content || '';
      // 移除 HTML 标签
      const plainContent = content.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
      const date = new Date(note.updated_at).toLocaleString('zh-CN');
      const tags = note.tags.length > 0 ? `标签: ${note.tags.join(', ')}` : '';
      return `【${title}】\n${tags ? tags + '\n' : ''}更新时间: ${date}\n\n${plainContent}\n\n${'='.repeat(50)}\n`;
    }).join('\n');
  };

  // 导出便签为 Markdown 格式
  const exportAsMarkdown = (notesList: any[]): string => {
    return notesList.map(note => {
      const title = note.title || '无标题';
      const content = note.content || '';
      // 移除 HTML 标签，保留基本格式
      let mdContent = content
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<\/p>/gi, '\n')
        .replace(/<\/div>/gi, '\n')
        .replace(/<h1[^>]*>(.*?)<\/h1>/gi, '# $1\n')
        .replace(/<h2[^>]*>(.*?)<\/h2>/gi, '## $1\n')
        .replace(/<h3[^>]*>(.*?)<\/h3>/gi, '### $1\n')
        .replace(/<strong[^>]*>(.*?)<\/strong>/gi, '**$1**')
        .replace(/<b[^>]*>(.*?)<\/b>/gi, '**$1**')
        .replace(/<em[^>]*>(.*?)<\/em>/gi, '*$1*')
        .replace(/<i[^>]*>(.*?)<\/i>/gi, '*$1*')
        .replace(/<a[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/gi, '[$2]($1)')
        .replace(/<li[^>]*>(.*?)<\/li>/gi, '- $1\n')
        .replace(/<[^>]*>/g, '')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>');
      const date = new Date(note.updated_at).toLocaleString('zh-CN');
      const tags = note.tags.length > 0 ? `> 标签: ${note.tags.join(', ')}` : '';
      return `# ${title}\n\n${tags ? tags + '\n' : ''}> 更新时间: ${date}\n\n${mdContent}\n\n---\n`;
    }).join('\n');
  };

  // 导出便签
  const handleExport = useCallback(async () => {
    try {
      setIsExporting(true);

      const filePath = await save({
        defaultPath: 'notes-backup.txt',
        filters: [
          { name: '文本文件', extensions: ['txt'] },
          { name: 'Markdown 文件', extensions: ['md'] },
          { name: 'JSON 文件', extensions: ['json'] },
        ]
      });

      if (filePath) {
        const json = await exportNotes();
        const store = JSON.parse(json);
        const notesList = store.notes || [];

        let content = '';
        const ext = filePath.split('.').pop()?.toLowerCase();

        if (ext === 'txt') {
          content = exportAsTxt(notesList);
        } else if (ext === 'md') {
          content = exportAsMarkdown(notesList);
        } else {
          content = json;
        }

        await writeTextFile(filePath, content);
        alert('导出成功！');
      }
    } catch (error) {
      console.error('导出失败:', error);
      alert('导出失败：' + error);
    } finally {
      setIsExporting(false);
    }
  }, [exportNotes]);

  // 从 TXT 导入便签
  const importFromTxt = async (content: string): Promise<number> => {
    // 按分隔符分割便签
    const sections = content.split(/={50}/).filter(s => s.trim());
    let imported = 0;

    for (const section of sections) {
      const lines = section.trim().split('\n').filter(l => l.trim());
      if (lines.length === 0) continue;

      let title = '导入的便签';
      let noteContent = '';

      // 解析标题（【标题】格式）
      const titleMatch = lines[0].match(/【(.+?)】/);
      if (titleMatch) {
        title = titleMatch[1];
        lines.shift();
      }

      // 跳过标签和时间行
      const contentStart = lines.findIndex(l => !l.startsWith('标签:') && !l.startsWith('更新时间:'));
      if (contentStart >= 0) {
        noteContent = lines.slice(contentStart).join('\n').trim();
      }

      if (title || noteContent) {
        // 转换为 HTML 格式
        const htmlContent = contentStart >= 0
          ? noteContent.replace(/\n/g, '<br>')
          : '';

        const json = JSON.stringify({
          notes: [{
            id: crypto.randomUUID(),
            title: title,
            content: htmlContent,
            color: 'Yellow',
            tags: [],
            is_pinned: false,
            is_markdown: false,
            x: 100,
            y: 100,
            width: 300,
            height: 300,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            attachments: []
          }],
          settings: {},
          version: 1
        });

        const count = await importNotes(json);
        imported += count;
      }
    }

    return imported;
  };

  // 从 Markdown 导入便签
  const importFromMarkdown = async (content: string): Promise<number> => {
    // 按 --- 分割便签
    const sections = content.split(/\n---\n/).filter(s => s.trim());
    let imported = 0;

    for (const section of sections) {
      const lines = section.trim().split('\n');
      if (lines.length === 0) continue;

      let title = '导入的便签';
      let noteContent = '';
      let tags: string[] = [];

      // 解析标题（# 标题格式）
      const titleMatch = lines[0].match(/^#\s+(.+)/);
      if (titleMatch) {
        title = titleMatch[1].trim();
        lines.shift();
      }

      // 解析标签（> 标签: xxx 格式）
      const tagLine = lines.find(l => l.startsWith('> 标签:'));
      if (tagLine) {
        const tagMatch = tagLine.match(/> 标签:\s*(.+)/);
        if (tagMatch) {
          tags = tagMatch[1].split(',').map(t => t.trim()).filter(t => t);
        }
      }

      // 跳过引用行（标签和时间）
      const contentLines = lines.filter(l => !l.startsWith('>') || l.startsWith('> ') && !l.startsWith('> 标签:') && !l.startsWith('> 更新时间:'));
      noteContent = contentLines.join('\n').trim();

      if (title || noteContent) {
        // 转换 Markdown 为 HTML
        let htmlContent = noteContent
          .replace(/^### (.*$)/gm, '<h3>$1</h3>')
          .replace(/^## (.*$)/gm, '<h2>$1</h2>')
          .replace(/^# (.*$)/gm, '<h1>$1</h1>')
          .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
          .replace(/\*(.*?)\*/g, '<em>$1</em>')
          .replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2">$1</a>')
          .replace(/^- (.*$)/gm, '<li>$1</li>')
          .replace(/\n/g, '<br>');

        const json = JSON.stringify({
          notes: [{
            id: crypto.randomUUID(),
            title: title,
            content: htmlContent,
            color: 'Yellow',
            tags: tags,
            is_pinned: false,
            is_markdown: false,
            x: 100,
            y: 100,
            width: 300,
            height: 300,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            attachments: []
          }],
          settings: {},
          version: 1
        });

        const count = await importNotes(json);
        imported += count;
      }
    }

    return imported;
  };

  // 导入便签
  const handleImport = useCallback(async () => {
    try {
      setIsImporting(true);

      const filePath = await open({
        multiple: false,
        filters: [
          { name: '所有支持的格式', extensions: ['json', 'txt', 'md'] },
          { name: 'JSON 文件', extensions: ['json'] },
          { name: '文本文件', extensions: ['txt'] },
          { name: 'Markdown 文件', extensions: ['md'] },
        ]
      });

      if (filePath) {
        const content = await readTextFile(filePath as string);
        const ext = (filePath as string).split('.').pop()?.toLowerCase();

        let count = 0;
        if (ext === 'txt') {
          count = await importFromTxt(content);
        } else if (ext === 'md') {
          count = await importFromMarkdown(content);
        } else {
          count = await importNotes(content);
        }

        alert(`导入成功！导入了 ${count} 个便签。`);
      }
    } catch (error) {
      console.error('导入失败:', error);
      alert('导入失败：' + error);
    } finally {
      setIsImporting(false);
    }
  }, [importNotes]);

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
        <div className="footer-actions">
          <button
            className="footer-btn"
            onClick={handleExport}
            disabled={isExporting}
            title="导出所有便签"
          >
            {isExporting ? '⏳' : '📤'} 导出
          </button>
          <button
            className="footer-btn"
            onClick={handleImport}
            disabled={isImporting}
            title="导入便签"
          >
            {isImporting ? '⏳' : '📥'} 导入
          </button>
        </div>
        <div className="footer-info">
          <span>Notes v1.3.1</span>
          <span>•</span>
          <span>{notes.length} 个便签</span>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
