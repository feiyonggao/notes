import React, { useState, useEffect } from 'react';
import Modal from '../Modal';
import { openUrl } from '@tauri-apps/plugin-opener';
import { check, Update } from '@tauri-apps/plugin-updater';
import './styles.css';

interface AboutProps {
  isOpen: boolean;
  onClose: () => void;
}

const CURRENT_VERSION = '1.3.1';

const About: React.FC<AboutProps> = ({ isOpen, onClose }) => {
  const [updateInfo, setUpdateInfo] = useState<Update | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [updateStatus, setUpdateStatus] = useState<string>('');

  useEffect(() => {
    if (isOpen) {
      checkUpdate();
    }
  }, [isOpen]);

  const checkUpdate = async () => {
    setIsChecking(true);
    setUpdateStatus('');
    try {
      const update = await check();
      if (update) {
        setUpdateInfo(update);
        setUpdateStatus(`发现新版本 ${update.version}`);
      } else {
        setUpdateInfo(null);
        setUpdateStatus('已是最新版本');
      }
    } catch (error) {
      console.error('检查更新失败:', error);
      setUpdateStatus('检查更新失败');
    } finally {
      setIsChecking(false);
    }
  };

  const handleUpdate = async () => {
    if (!updateInfo) return;

    setIsDownloading(true);
    setDownloadProgress(0);
    setUpdateStatus('正在下载...');

    let contentLength = 0;
    let downloaded = 0;

    try {
      await updateInfo.downloadAndInstall((event) => {
        switch (event.event) {
          case 'Started':
            contentLength = event.data.contentLength ?? 0;
            setUpdateStatus('开始下载...');
            break;
          case 'Progress':
            downloaded += event.data.chunkLength;
            const percent = contentLength > 0
              ? Math.round((downloaded / contentLength) * 100)
              : 0;
            setDownloadProgress(percent);
            setUpdateStatus(`下载中... ${percent}%`);
            break;
          case 'Finished':
            setUpdateStatus('下载完成，准备安装...');
            break;
        }
      });

      setUpdateStatus('安装完成，即将重启...');
      // 重启应用
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (error) {
      console.error('更新失败:', error);
      setUpdateStatus('更新失败，请手动下载');
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="关于" width="450px">
      <div className="about-content">
        {/* Logo */}
        <div className="about-logo">
          <span className="logo-icon">📝</span>
          <h2 className="logo-title">Notes</h2>
          <p className="logo-version">版本 {CURRENT_VERSION}</p>
        </div>

        {/* 版本更新提示 */}
        {updateInfo && (
          <div className="update-banner">
            <div className="update-icon">🆕</div>
            <div className="update-info">
              <p className="update-text">发现新版本 {updateInfo.version}</p>
              <p className="update-date">
                发布时间: {updateInfo.date ? new Date(updateInfo.date).toLocaleDateString('zh-CN') : '未知'}
              </p>
              {isDownloading ? (
                <div className="update-progress">
                  <div className="progress-bar">
                    <div
                      className="progress-fill"
                      style={{ width: `${downloadProgress}%` }}
                    />
                  </div>
                  <span className="progress-text">{downloadProgress}%</span>
                </div>
              ) : (
                <button
                  className="update-btn"
                  onClick={handleUpdate}
                  disabled={isDownloading}
                >
                  立即更新
                </button>
              )}
            </div>
          </div>
        )}

        {updateStatus && !updateInfo && (
          <div className={`update-status ${updateStatus.includes('失败') ? 'error' : 'success'}`}>
            {updateStatus}
          </div>
        )}

        {isChecking && (
          <div className="update-checking">
            <span className="checking-spinner">⏳</span> 检查更新中...
          </div>
        )}

        {/* 手动检查按钮 */}
        {!isChecking && !updateInfo && (
          <button className="check-update-btn" onClick={checkUpdate}>
            检查更新
          </button>
        )}

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
          <p>© 2026 Notes. 用 ❤️ 和 Rust 构建</p>
          <p className="about-link">
            <a href="#" onClick={(e) => { e.preventDefault(); openUrl('https://github.com/feiyonggao/notes'); }}>
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
