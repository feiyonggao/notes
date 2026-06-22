import { useEffect, useCallback, useState } from 'react';
import { useNoteStore } from './stores/noteStore';
import Sidebar from './components/Sidebar';
import NoteCard from './components/NoteCard';
import NoteEditor from './components/NoteEditor';
import DesktopEditor from './components/DesktopEditor';
import Settings from './components/Settings';
import About from './components/About';
import { Note } from './types/note';
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
  const [slideDirection, setSlideDirection] = useState<'left' | 'right' | 'none'>('none');
  const [isAnimating, setIsAnimating] = useState(false);

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
      try {
        const window = getCurrentWindow();
        await window.show();
        await window.unminimize();
        await window.setFocus();
      } catch (e) { console.error(e); }
    });
    const unlistenHideAll = listen('tray-hide-all', async () => {
      try { await getCurrentWindow().hide(); } catch (e) { console.error(e); }
    });
    const unlistenSettings = listen('tray-settings', () => setShowSettings(true));
    const unlistenAbout = listen('tray-about', () => setShowAbout(true));
    const unlistenClick = listen('tray-click', async () => {
      try {
        const window = getCurrentWindow();
        await window.show();
        await window.unminimize();
        await window.setFocus();
      } catch (e) { console.error(e); }
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
    } else {
      setSelectedNote(note);
    }
  }, [createNote, isDesktopMode, setSelectedNote]);

  // 获取当前便签在列表中的索引
  const getCurrentNoteIndex = useCallback(() => {
    if (!desktopSelectedNote) return -1;
    return notes.findIndex(n => n.id === desktopSelectedNote.id);
  }, [notes, desktopSelectedNote]);

  // 切换到上一个便签
  const switchToPrevNote = useCallback(() => {
    if (isAnimating || notes.length <= 1) return;
    const currentIndex = getCurrentNoteIndex();
    if (currentIndex <= 0) return;

    setIsAnimating(true);
    setSlideDirection('right');

    setTimeout(() => {
      setDesktopSelectedNote(notes[currentIndex - 1]);
      setTimeout(() => {
        setIsAnimating(false);
        setSlideDirection('none');
      }, 50);
    }, 200);
  }, [isAnimating, notes, getCurrentNoteIndex]);

  // 切换到下一个便签
  const switchToNextNote = useCallback(() => {
    if (isAnimating || notes.length <= 1) return;
    const currentIndex = getCurrentNoteIndex();
    if (currentIndex >= notes.length - 1) return;

    setIsAnimating(true);
    setSlideDirection('left');

    setTimeout(() => {
      setDesktopSelectedNote(notes[currentIndex + 1]);
      setTimeout(() => {
        setIsAnimating(false);
        setSlideDirection('none');
      }, 50);
    }, 200);
  }, [isAnimating, notes, getCurrentNoteIndex]);

  const toggleDesktopMode = useCallback(async () => {
    try {
      const appWindow = getCurrentWindow();
      const newMode = !isDesktopMode;

      setIsDesktopMode(newMode);
      setDesktopSelectedNote(null);

      if (newMode) {
        // 进入桌面模式 - 更小更精简
        await appWindow.setSkipTaskbar(true);
        await appWindow.setAlwaysOnTop(false);
        await appWindow.setResizable(true);
        await appWindow.setMinSize(new LogicalSize(300, 400));
        await appWindow.setSize(new LogicalSize(380, 500));
        try {
          const monitor = await currentMonitor();
          if (monitor) {
            const monitorX = monitor.position.x;
            const monitorY = monitor.position.y;
            const monitorWidth = monitor.size.width;
            const scale = monitor.scaleFactor;
            const logicalWidth = monitorWidth / scale;

            // 右下角
            let x = monitorX / scale + logicalWidth - 400;
            let y = monitorY / scale + 40;
            x = Math.max(monitorX / scale, x);
            y = Math.max(monitorY / scale, y);

            await appWindow.setPosition(new LogicalPosition(x, y));
          } else {
            await appWindow.setPosition(new LogicalPosition(800, 40));
          }
        } catch (e) {
          await appWindow.setPosition(new LogicalPosition(800, 40));
        }
        await appWindow.show();
        await appWindow.setFocus();

        // 默认选中第一个便签
        if (notes.length > 0) {
          setDesktopSelectedNote(notes[0]);
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
  }, [isDesktopMode, notes]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'n') { e.preventDefault(); handleNewNote(); }
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'D') { e.preventDefault(); toggleDesktopMode(); }
      // 桌面模式下 Ctrl+左右箭头切换便签（不在编辑区时）
      if (isDesktopMode && (e.ctrlKey || e.metaKey)) {
        const target = e.target as HTMLElement;
        const isEditing = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;
        if (!isEditing) {
          if (e.key === 'ArrowLeft') {
            e.preventDefault();
            switchToPrevNote();
          }
          if (e.key === 'ArrowRight') {
            e.preventDefault();
            switchToNextNote();
          }
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleNewNote, toggleDesktopMode, isDesktopMode, switchToPrevNote, switchToNextNote]);

  const currentIndex = getCurrentNoteIndex();

  // 桌面模式 - 极简便签样式
  if (isDesktopMode) {
    return (
      <div className="app desktop-mode-compact">
        {/* 便签内容区 - 最大化 */}
        <div className="compact-content">
          {desktopSelectedNote ? (
            <div className={`compact-note-wrapper ${slideDirection !== 'none' ? 'sliding-' + slideDirection : ''}`}>
              <DesktopEditor
                key={desktopSelectedNote.id}
                note={desktopSelectedNote}
                noteIndex={currentIndex}
                totalNotes={notes.length}
                onNewNote={handleNewNote}
                onPrev={switchToPrevNote}
                onNext={switchToNextNote}
                canPrev={currentIndex > 0 && !isAnimating}
                canNext={currentIndex < notes.length - 1 && !isAnimating}
                onClose={() => {
                  const idx = getCurrentNoteIndex();
                  if (notes.length > 1) {
                    setDesktopSelectedNote(notes[idx > 0 ? idx - 1 : 1]);
                  } else {
                    setDesktopSelectedNote(null);
                  }
                }}
                onExitDesktop={toggleDesktopMode}
              />
            </div>
          ) : (
            <div className="compact-empty">
              <span>📝</span>
              <p>按 + 新建便签</p>
            </div>
          )}
        </div>

        {/* 底部迷你导航 - 只显示圆点 */}
        {notes.length > 1 && (
          <div className="compact-nav-mini">
            {notes.map((note, i) => (
              <button
                key={note.id}
                className={`nav-dot-mini ${i === currentIndex ? 'active' : ''}`}
                onClick={() => {
                  if (!isAnimating && i !== currentIndex) {
                    setIsAnimating(true);
                    setSlideDirection(i > currentIndex ? 'left' : 'right');
                    setTimeout(() => {
                      setDesktopSelectedNote(note);
                      setTimeout(() => {
                        setIsAnimating(false);
                        setSlideDirection('none');
                      }, 50);
                    }, 200);
                  }
                }}
              />
            ))}
          </div>
        )}

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
