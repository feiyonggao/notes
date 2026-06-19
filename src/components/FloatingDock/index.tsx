import React, { useState, useEffect, useRef } from 'react';
import { useNoteStore } from '../../stores/noteStore';
import { Note } from '../../types/note';
import './styles.css';

interface FloatingDockProps {
  onNoteSelect: (note: Note) => void;
  onToggleSelector: () => void;
  isOpen: boolean;
}

const FloatingDock: React.FC<FloatingDockProps> = ({
  onNoteSelect,
  onToggleSelector,
  isOpen,
}) => {
  const { notes } = useNoteStore();
  const [position, setPosition] = useState({ x: window.innerWidth - 80, y: window.innerHeight - 80 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const dockRef = useRef<HTMLDivElement>(null);

  // 处理拖拽开始
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return; // 只处理左键
    setIsDragging(true);
    setDragOffset({
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    });
  };

  // 处理拖拽
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;

      const newX = e.clientX - dragOffset.x;
      const newY = e.clientY - dragOffset.y;

      // 限制在窗口范围内
      const maxX = window.innerWidth - 60;
      const maxY = window.innerHeight - 60;

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
  }, [isDragging, dragOffset]);

  // 处理点击
  const handleClick = (e: React.MouseEvent) => {
    if (isDragging) return;
    e.stopPropagation();
    onToggleSelector();
  };

  // 获取最近打开的便签
  const recentNotes = notes.slice(0, 5);

  return (
    <div
      ref={dockRef}
      className={`floating-dock ${isOpen ? 'open' : ''} ${isDragging ? 'dragging' : ''}`}
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
      }}
      onMouseDown={handleMouseDown}
      onClick={handleClick}
    >
      {/* 主按钮 */}
      <div className="dock-main">
        <span className="dock-icon">📝</span>
        <span className="dock-count">{notes.length}</span>
      </div>

      {/* 展开的便签预览 */}
      {isOpen && (
        <div className="dock-preview">
          {recentNotes.map((note, index) => (
            <div
              key={note.id}
              className="preview-item"
              style={{
                animationDelay: `${index * 50}ms`,
                backgroundColor: getNoteColor(note.color),
              }}
              onClick={(e) => {
                e.stopPropagation();
                onNoteSelect(note);
              }}
            >
              <span className="preview-title">
                {note.title || '无标题'}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// 获取便签颜色
function getNoteColor(color: string): string {
  const colorMap: Record<string, string> = {
    Yellow: '#FFF9C4',
    Blue: '#BBDEFB',
    Green: '#C8E6C9',
    Pink: '#F8BBD0',
    Purple: '#E1BEE7',
    Orange: '#FFE0B2',
    Gray: '#E0E0E0',
    White: '#FFFFFF',
  };
  return colorMap[color] || colorMap.Yellow;
}

export default FloatingDock;
