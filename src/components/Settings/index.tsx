import React, { useState, useEffect } from 'react';
import { useNoteStore } from '../../stores/noteStore';
import { COLORS } from '../../types/note';
import { open } from '@tauri-apps/plugin-dialog';
import { enable, isEnabled, disable } from '@tauri-apps/plugin-autostart';
import Modal from '../Modal';
import './styles.css';

interface SettingsProps {
  isOpen: boolean;
  onClose: () => void;
}

const Settings: React.FC<SettingsProps> = ({ isOpen, onClose }) => {
  const {
    settings,
    updateSettings,
    dataDir,
    defaultDataDir,
    loadDataDir,
    loadDefaultDataDir,
    validateDataPath,
  } = useNoteStore();
  const [localSettings, setLocalSettings] = useState(settings);
  const [pathStatus, setPathStatus] = useState<'idle' | 'valid' | 'invalid'>('idle');
  const [pathError, setPathError] = useState('');
  const [autoStartEnabled, setAutoStartEnabled] = useState(false);

  // 同步设置
  useEffect(() => {
    setLocalSettings(settings);
  }, [settings]);

  // 加载数据目录信息和自启动状态
  useEffect(() => {
    if (isOpen) {
      loadDataDir();
      loadDefaultDataDir();
      // 检查自启动状态
      isEnabled().then(enabled => {
        setAutoStartEnabled(enabled);
      }).catch(err => {
        console.error('检查自启动状态失败:', err);
      });
    }
  }, [isOpen]);

  // 处理自启动切换
  const handleAutoStartToggle = async (checked: boolean) => {
    try {
      if (checked) {
        await enable();
      } else {
        await disable();
      }
      setAutoStartEnabled(checked);
      setLocalSettings({ ...localSettings, auto_start: checked });
    } catch (err) {
      console.error('设置自启动失败:', err);
    }
  };

  // 处理保存
  const handleSave = async () => {
    await updateSettings(localSettings);
    onClose();
  };

  // 处理重置
  const handleReset = () => {
    setLocalSettings({
      default_color: 'Yellow',
      default_width: 300,
      default_height: 300,
      always_on_top: false,
      show_in_taskbar: true,
      auto_save: true,
      auto_start: true,
      font_size: 14,
      font_family: 'Microsoft YaHei',
      data_path: '',
    });
    setPathStatus('idle');
    setPathError('');
  };

  // 选择文件夹
  const handleSelectFolder = async () => {
    try {
      const selected = await open({
        directory: true,
        multiple: false,
        title: '选择数据存储位置',
        defaultPath: dataDir || defaultDataDir,
      });

      if (selected) {
        const path = selected as string;
        setLocalSettings({ ...localSettings, data_path: path });

        // 验证路径
        const isValid = await validateDataPath(path);
        if (isValid) {
          setPathStatus('valid');
          setPathError('');
        } else {
          setPathStatus('invalid');
          setPathError('该目录不可写');
        }
      }
    } catch (error) {
      console.error('选择文件夹失败:', error);
    }
  };

  // 重置为默认路径
  const handleResetPath = () => {
    setLocalSettings({ ...localSettings, data_path: '' });
    setPathStatus('idle');
    setPathError('');
  };

  // 获取当前显示的路径
  const getCurrentPath = () => {
    if (localSettings.data_path) {
      return localSettings.data_path;
    }
    return dataDir || defaultDataDir || '加载中...';
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="设置" width="550px">
      <div className="settings-content">
        {/* 数据存储位置 */}
        <div className="setting-group">
          <label className="setting-label">📁 数据存储位置</label>
          <div className="path-setting">
            <div className="path-display">
              <input
                type="text"
                value={getCurrentPath()}
                readOnly
                className={`path-input ${pathStatus}`}
              />
              <button
                className="btn-browse"
                onClick={handleSelectFolder}
                title="选择文件夹"
              >
                浏览...
              </button>
            </div>
            {pathStatus === 'valid' && (
              <p className="path-hint success">✓ 路径有效</p>
            )}
            {pathStatus === 'invalid' && (
              <p className="path-hint error">✗ {pathError}</p>
            )}
            {localSettings.data_path && (
              <button className="btn-reset-path" onClick={handleResetPath}>
                恢复默认路径
              </button>
            )}
            <p className="path-info">
              当前数据存储在: <code>{dataDir}</code>
            </p>
            <p className="path-warning">
              ⚠️ 修改路径后需要重启应用才能生效，数据不会自动迁移
            </p>
          </div>
        </div>

        {/* 默认颜色 */}
        <div className="setting-group">
          <label className="setting-label">🎨 默认颜色</label>
          <div className="color-options">
            {COLORS.map(color => (
              <button
                key={color.name}
                className={`color-option ${localSettings.default_color === color.name ? 'active' : ''}`}
                style={{ backgroundColor: color.hex }}
                onClick={() =>
                  setLocalSettings({ ...localSettings, default_color: color.name })
                }
                title={color.label}
              />
            ))}
          </div>
        </div>

        {/* 默认尺寸 */}
        <div className="setting-group">
          <label className="setting-label">📐 默认尺寸</label>
          <div className="size-inputs">
            <div className="size-input-group">
              <label>宽度</label>
              <input
                type="number"
                value={localSettings.default_width}
                onChange={e =>
                  setLocalSettings({
                    ...localSettings,
                    default_width: Number(e.target.value),
                  })
                }
                min="200"
                max="800"
              />
              <span>px</span>
            </div>
            <div className="size-input-group">
              <label>高度</label>
              <input
                type="number"
                value={localSettings.default_height}
                onChange={e =>
                  setLocalSettings({
                    ...localSettings,
                    default_height: Number(e.target.value),
                  })
                }
                min="200"
                max="800"
              />
              <span>px</span>
            </div>
          </div>
        </div>

        {/* 字体设置 */}
        <div className="setting-group">
          <label className="setting-label">🔤 字体大小</label>
          <div className="font-size-control">
            <button
              className="btn-control"
              onClick={() =>
                setLocalSettings({
                  ...localSettings,
                  font_size: Math.max(12, localSettings.font_size - 1),
                })
              }
            >
              -
            </button>
            <span className="font-size-value">{localSettings.font_size}px</span>
            <button
              className="btn-control"
              onClick={() =>
                setLocalSettings({
                  ...localSettings,
                  font_size: Math.min(24, localSettings.font_size + 1),
                })
              }
            >
              +
            </button>
          </div>
        </div>

        {/* 开关选项 */}
        <div className="setting-group">
          <label className="setting-label">⚙️ 其他选项</label>
          <div className="toggle-options">
            <label className="toggle-option">
              <span>开机自启动</span>
              <input
                type="checkbox"
                checked={autoStartEnabled}
                onChange={e => handleAutoStartToggle(e.target.checked)}
              />
              <span className="toggle-slider"></span>
            </label>

            <label className="toggle-option">
              <span>窗口置顶</span>
              <input
                type="checkbox"
                checked={localSettings.always_on_top}
                onChange={e =>
                  setLocalSettings({
                    ...localSettings,
                    always_on_top: e.target.checked,
                  })
                }
              />
              <span className="toggle-slider"></span>
            </label>

            <label className="toggle-option">
              <span>显示在任务栏</span>
              <input
                type="checkbox"
                checked={localSettings.show_in_taskbar}
                onChange={e =>
                  setLocalSettings({
                    ...localSettings,
                    show_in_taskbar: e.target.checked,
                  })
                }
              />
              <span className="toggle-slider"></span>
            </label>

            <label className="toggle-option">
              <span>自动保存</span>
              <input
                type="checkbox"
                checked={localSettings.auto_save}
                onChange={e =>
                  setLocalSettings({
                    ...localSettings,
                    auto_save: e.target.checked,
                  })
                }
              />
              <span className="toggle-slider"></span>
            </label>
          </div>
        </div>

        {/* 按钮 */}
        <div className="settings-actions">
          <button className="btn-secondary" onClick={handleReset}>
            恢复默认
          </button>
          <div className="btn-group">
            <button className="btn-secondary" onClick={onClose}>
              取消
            </button>
            <button className="btn-primary" onClick={handleSave}>
              保存
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default Settings;
