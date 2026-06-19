import { useEffect, useCallback, useState, useRef } from 'react';
import { useNoteStore } from './stores/noteStore';
import Sidebar from './components/Sidebar';
import NoteCard from './components/NoteCard';
import NoteEditor from './components/NoteEditor';
import DesktopEditor from './components/DesktopEditor';
import Settings from './components/Settings';
import About from './components/About';
import { Note, COLOR_MAP } from './types/note';
import { getPlainTextPreview } from './utils/format';
import { listen } from '@tauri-apps/api/event';
import { getCurrentWindow, LogicalSize, LogicalPosition, currentMonitor } from '@tauri-apps/api/window';
import './styles/theme.css';
import './App.css';

function App() {
  const {
    notes,
    viewMode,
    isLoading,
    selectedNote,
    setSelectedNote,
    loadNotes,
    loadTags,
    loadSettings,
    loadStats,
    createNote,
  } = useNoteStore();

  const [showSettings, setShowSettings] = useState(false);
  const [showAbout, setShowAbout] = useState(false);
  const [isDesktopMode, setIsDesktopMode] = useState(false);
  const [desktopSelectedNote, setDesktopSelectedNote] = useState<Note | null>(null);
  const noteListRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const init = async () => {
      await loadNotes();
      await loadTags();
      await loadSettings();
      await loadStats();
    };
    init();
  }, []);

  // 同步 desktopSelectedNote 与 store 中的 notes
  useEffect(() => {
    if (isDesktopMode && desktopSelectedNote) {
      const updatedNote = notes.find(n => n.id === desktopSelectedNote.id);
      if (updatedNote && JSON.stringify(updatedNote) !== JSON.stringify(desktopSelectedNote)) {
        setDesktopSelectedNote(updatedNote);
      }
    }
  }, [notes, isDesktopMode, desktopSelectedNote]);

  useEffect(() => {
    const unlistenNewNote = listen('tray-new-note', async () => {
      const note = await createNote();
      if (isDesktopMode) setDesktopSelectedNote(note);
    });
    const unlistenShowAll = listen('tray-show-all', async () => {
      try { await getCurrentWindow().show(); } catch (e) { console.error(e); }
    });
    const unlistenHideAll = listen('tray-hide-all', async () => {
      try { await getCurrentWindow().hide(); } catch (e) { console.error(e); }
    });
    const unlistenSettings = listen('tray-settings', () => setShowSettings(true));
    const unlistenAbout = listen('tray-about', () => setShowAbout(true));
    const unlistenClick = listen('tray-click', async () => {
      try { await getCurrentWindow().show(); } catch (e) { console.error(e); }
    });

    return () => {
      unlistenNewNote.then(fn => fn());
      unlistenShowAll.then(fn => fn());
      unlistenHideAll.then(fn => fn());
      unlistenSettings.then(fn => fn());
      unlistenAbout.then(fn => fn());
      unlistenClick.then(fn => fn());
    };
  }, [createNote, isDesktopMode]);

  const handleNewNote = useCallback(async () => {
    const note = await createNote();
    if (isDesktopMode) {
      setDesktopSelectedNote(note);
      // 滚动到新便签
      setTimeout(() => {
        if (noteListRef.current) {
          const noteElement = noteListRef.current.querySelector(`[data-note-id="${note.id}"]`);
          if (noteElement) {
            noteElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          }
        }
      }, 100);
    } else {
      // 常规模式下选中新便签
      setSelectedNote(note);
    }
  }, [createNote, isDesktopMode, setSelectedNote]);

  const toggleDesktopMode = useCallback(async () => {
    try {
      const appWindow = getCurrentWindow();
      const newMode = !isDesktopMode;

      // 先更新状态
      setIsDesktopMode(newMode);
      setDesktopSelectedNote(null);

      // 然后调整窗口
      if (newMode) {
        // 进入桌面模式
        await appWindow.setSkipTaskbar(true);
        await appWindow.setSize(new LogicalSize(800, 500));
        try {
          const monitor = await currentMonitor();
          if (monitor) {
            await appWindow.setPosition(new LogicalPosition(monitor.size.width - 820, 20));
          } else {
            await appWindow.setPosition(new LogicalPosition(500, 20));
          }
        } catch (e) {
          await appWindow.setPosition(new LogicalPosition(500, 20));
        }
      } else {
        // 退出桌面模式
        await appWindow.setSkipTaskbar(false);
        await appWindow.setAlwaysOnTop(false);
        await appWindow.setSize(new LogicalSize(1400, 900));
        await appWindow.center();
        await appWindow.show();
        await appWindow.setFocus();
      }
    } catch (e) {
      console.error(e);
      setIsDesktopMode(false);
      setDesktopSelectedNote(null);
    }
  }, [isDesktopMode]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'n') { e.preventDefault(); handleNewNote(); }
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'D') { e.preventDefault(); toggleDesktopMode(); }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleNewNote, toggleDesktopMode]);

  // 桌面模式 - 双栏布局
  if (isDesktopMode) {
    return (
      <div className="app desktop-mode">
        <div className="desktop-sidebar">
          <div className="desktop-header">
            <h3>📝 便签</h3>
            <button className="btn-add" onClick={handleNewNote} title="新建便签">➕</button>
          </div>
          <div className="desktop-note-list" ref={noteListRef}>
            {notes.length === 0 ? (
              <div className="empty-list"><span>暂无便签</span></div>
            ) : (
              notes.map(note => (
                <div
                  key={note.id}
                  data-note-id={note.id}
                  className={`desktop-note-item ${desktopSelectedNote?.id === note.id ? 'active' : ''}`}
                  onClick={() => setDesktopSelectedNote(note)}
                  style={{ borderLeftColor: COLOR_MAP[note.color] || COLOR_MAP.Yellow }}
                >
                  <div className="note-item-title">{note.title || '无标题'}</div>
                  <div className="note-item-preview">{getPlainTextPreview(note.content, 40)}</div>
                </div>
              ))
            )}
          </div>
          <div className="desktop-footer">
            <button className="btn-exit" onClick={toggleDesktopMode}>🖥️ 退出桌面模式</button>
          </div>
        </div>
        <div className="desktop-content">
          {desktopSelectedNote ? (
            <DesktopEditor
              key={desktopSelectedNote.id}
              note={desktopSelectedNote}
              onClose={() => setDesktopSelectedNote(null)}
            />
          ) : (
            <div className="empty-hint">
              <span className="empty-icon">👈</span>
              <span>选择一个便签开始编辑</span>
            </div>
          )}
        </div>
        <Settings isOpen={showSettings} onClose={() => setShowSettings(false)} />
        <About isOpen={showAbout} onClose={() => setShowAbout(false)} />
      </div>
    );
  }

  // 常规模式
  return (
    <div className="app">
      <Sidebar />
      <main className="main-content">
        <div className="main-toolbar">
          <div className="toolbar-title">{notes.length > 0 ? `${notes.length} 个便签` : '暂无便签'}</div>
          <div className="toolbar-actions">
            <button className="btn-mode-switch" onClick={toggleDesktopMode} title="切换到桌面模式 (Ctrl+Shift+D)">📌 桌面模式</button>
            <button className="btn-add-note" onClick={handleNewNote} title="新建便签 (Ctrl+N)">+</button>
          </div>
        </div>
        <div className="content-area">
          <div className={`notes-container ${viewMode} ${selectedNote ? 'with-editor' : ''}`}>
            {isLoading ? (
              <div className="loading-state"><div className="loading-spinner"></div><p>加载中...</p></div>
            ) : notes.length === 0 ? (
              <div className="empty-state">
                <span className="empty-icon">📝</span>
                <h3>还没有便签</h3>
                <p>点击"新建便签"开始记录吧</p>
                <button className="btn-primary" onClick={handleNewNote}>创建第一个便签</button>
              </div>
            ) : (
              notes.map(note => <NoteCard key={note.id} note={note} viewMode={viewMode} isSelected={selectedNote?.id === note.id} />)
            )}
          </div>
          {selectedNote && (
            <div className="editor-panel animate-slide-up"><NoteEditor /></div>
          )}
        </div>
      </main>
      <Settings isOpen={showSettings} onClose={() => setShowSettings(false)} />
      <About isOpen={showAbout} onClose={() => setShowAbout(false)} />
    </div>
  );
}

export default App;
