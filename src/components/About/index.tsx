import React from 'react';
import Modal from '../Modal';
import './styles.css';

interface AboutProps {
  isOpen: boolean;
  onClose: () => void;
}

const About: React.FC<AboutProps> = ({ isOpen, onClose }) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="关于" width="450px">
      <div className="about-content">
        {/* Logo */}
        <div className="about-logo">
          <span className="logo-icon">📝</span>
          <h2 className="logo-title">Rusty Notes</h2>
          <p className="logo-version">版本 1.0.0</p>
        </div>

        {/* 描述 */}
        <div className="about-description">
          <p>
            一个用 Rust 和 React 构建的现代化便签应用，
            比 Windows 自带便签更强大、更高效。
          </p>
        </div>

        {/* 特性列表 */}
        <div className="about-features">
          <h3>✨ 主要特性</h3>
          <ul>
            <li>🎨 多彩背景，个性化你的便签</li>
            <li>📌 置顶功能，重要事项随时可见</li>
            <li>📝 Markdown 支持，富文本编辑</li>
            <li>🔍 全文搜索，快速找到内容</li>
            <li>🏷️ 标签分类，高效管理便签</li>
            <li>💾 SQLite 存储，安全可靠</li>
            <li>⚡ Rust 驱动，极致性能</li>
          </ul>
        </div>

        {/* 技术栈 */}
        <div className="about-tech">
          <h3>🛠️ 技术栈</h3>
          <div className="tech-tags">
            <span className="tech-tag">Rust</span>
            <span className="tech-tag">Tauri</span>
            <span className="tech-tag">React</span>
            <span className="tech-tag">TypeScript</span>
            <span className="tech-tag">SQLite</span>
            <span className="tech-tag">Zustand</span>
          </div>
        </div>

        {/* 快捷键 */}
        <div className="about-shortcuts">
          <h3>⌨️ 快捷键</h3>
          <div className="shortcut-list">
            <div className="shortcut-item">
              <span className="shortcut-key">Ctrl + N</span>
              <span className="shortcut-desc">新建便签</span>
            </div>
            <div className="shortcut-item">
              <span className="shortcut-key">Ctrl + M</span>
              <span className="shortcut-desc">切换 Markdown</span>
            </div>
            <div className="shortcut-item">
              <span className="shortcut-key">Esc</span>
              <span className="shortcut-desc">关闭编辑器</span>
            </div>
          </div>
        </div>

        {/* 版权信息 */}
        <div className="about-footer">
          <p>© 2026 Rusty Notes. 用 ❤️ 和 Rust 构建</p>
          <p className="about-link">
            <a href="https://github.com" target="_blank" rel="noopener noreferrer">
              GitHub
            </a>
            {' · '}
            <a href="https://tauri.app" target="_blank" rel="noopener noreferrer">
              Tauri
            </a>
          </p>
        </div>
      </div>
    </Modal>
  );
};

export default About;
