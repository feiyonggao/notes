import { useState, useEffect } from 'react';
import { useNoteStore } from '../../stores/noteStore';
import { Reminder, RepeatRule } from '../../types/note';
import './styles.css';

interface ReminderPanelProps {
  noteId: string;
  onClose: () => void;
}

// 快捷时间选项
const QUICK_OPTIONS = [
  { label: '30分钟后', getValue: () => { const d = new Date(); d.setMinutes(d.getMinutes() + 30); return d; } },
  { label: '1小时后', getValue: () => { const d = new Date(); d.setHours(d.getHours() + 1); return d; } },
  { label: '2小时后', getValue: () => { const d = new Date(); d.setHours(d.getHours() + 2); return d; } },
  { label: '明天上午9点', getValue: () => { const d = new Date(); d.setDate(d.getDate() + 1); d.setHours(9, 0, 0, 0); return d; } },
  { label: '明天下午2点', getValue: () => { const d = new Date(); d.setDate(d.getDate() + 1); d.setHours(14, 0, 0, 0); return d; } },
  { label: '明天晚上8点', getValue: () => { const d = new Date(); d.setDate(d.getDate() + 1); d.setHours(20, 0, 0, 0); return d; } },
  { label: '下周一上午9点', getValue: () => {
    const d = new Date();
    const daysUntilMonday = (8 - d.getDay()) % 7 || 7;
    d.setDate(d.getDate() + daysUntilMonday);
    d.setHours(9, 0, 0, 0);
    return d;
  }},
];

export default function ReminderPanel({ noteId, onClose }: ReminderPanelProps) {
  const { reminders, loadNoteReminders, createReminder, updateReminder, deleteReminder } = useNoteStore();

  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [repeatRule, setRepeatRule] = useState<RepeatRule>('None');
  const [notifySystem, setNotifySystem] = useState(true);
  const [notifySound, setNotifySound] = useState(false);
  const [memo, setMemo] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showQuickOptions, setShowQuickOptions] = useState(true);

  useEffect(() => {
    loadNoteReminders(noteId);
  }, [noteId, loadNoteReminders]);

  // 过滤当前便签的提醒
  const noteReminders = reminders.filter(r => r.note_id === noteId);

  // 设置默认时间
  useEffect(() => {
    const now = new Date();
    now.setHours(now.getHours() + 1);
    now.setMinutes(0, 0, 0);
    setSelectedDate(now.toISOString().slice(0, 10));
    setSelectedTime(now.toTimeString().slice(0, 5));
  }, []);

  // 快捷选择时间
  const handleQuickOption = (getValue: () => Date) => {
    const date = getValue();
    setSelectedDate(date.toISOString().slice(0, 10));
    setSelectedTime(date.toTimeString().slice(0, 5));
    setShowQuickOptions(false);
  };

  const handleSubmit = async () => {
    if (!selectedDate || !selectedTime) {
      alert('请选择提醒时间');
      return;
    }

    try {
      const remindDate = new Date(`${selectedDate}T${selectedTime}:00`);
      if (isNaN(remindDate.getTime())) {
        alert('无效的时间格式');
        return;
      }

      if (editingId) {
        await updateReminder(editingId, remindDate, repeatRule, notifySystem, notifySound, memo || undefined);
        setEditingId(null);
      } else {
        await createReminder(noteId, remindDate, repeatRule, notifySystem, notifySound, memo || undefined);
      }

      // 重置表单
      resetForm();
    } catch (error) {
      console.error('保存提醒失败:', error);
      alert('保存提醒失败');
    }
  };

  const resetForm = () => {
    const now = new Date();
    now.setHours(now.getHours() + 1);
    now.setMinutes(0, 0, 0);
    setSelectedDate(now.toISOString().slice(0, 10));
    setSelectedTime(now.toTimeString().slice(0, 5));
    setRepeatRule('None');
    setNotifySystem(true);
    setNotifySound(false);
    setMemo('');
    setShowQuickOptions(true);
  };

  const handleEdit = (reminder: Reminder) => {
    setEditingId(reminder.id);
    const date = new Date(reminder.remind_at);
    setSelectedDate(date.toISOString().slice(0, 10));
    setSelectedTime(date.toTimeString().slice(0, 5));
    setRepeatRule(reminder.repeat_rule);
    setNotifySystem(reminder.notify_system);
    setNotifySound(reminder.notify_sound);
    setMemo(reminder.memo || '');
    setShowQuickOptions(false);
  };

  const handleDelete = async (id: string) => {
    if (confirm('确定删除此提醒？')) {
      try {
        await deleteReminder(id);
      } catch (error) {
        console.error('删除提醒失败:', error);
      }
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    resetForm();
  };

  const formatRepeatRule = (rule: RepeatRule): string => {
    if (rule === 'None') return '不重复';
    if (rule === 'Daily') return '每天';
    if (rule === 'Weekly') return '每周';
    if (rule === 'Monthly') return '每月';
    if (rule === 'Yearly') return '每年';
    if (typeof rule === 'object' && 'Custom' in rule) return `自定义: ${rule.Custom}`;
    return '不重复';
  };

  const formatDateTime = (dateStr: string): string => {
    const date = new Date(dateStr);
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const isToday = date.toDateString() === now.toDateString();
    const isTomorrow = date.toDateString() === tomorrow.toDateString();

    const timeStr = date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });

    if (isToday) return `今天 ${timeStr}`;
    if (isTomorrow) return `明天 ${timeStr}`;
    return date.toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' }) + ' ' + timeStr;
  };

  // 获取今天的日期字符串（用于设置 min 属性）
  const getTodayStr = () => {
    return new Date().toISOString().slice(0, 10);
  };

  return (
    <div className="reminder-panel-overlay" onClick={onClose}>
      <div className="reminder-panel" onClick={e => e.stopPropagation()}>
        <div className="reminder-header">
          <h3>⏰ 提醒设置</h3>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>

        <div className="reminder-form">
          {/* 快捷选项 */}
          {showQuickOptions && !editingId && (
            <div className="quick-options">
              <label>快捷选择</label>
              <div className="quick-buttons">
                {QUICK_OPTIONS.map((option, index) => (
                  <button
                    key={index}
                    className="quick-btn"
                    onClick={() => handleQuickOption(option.getValue)}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 自定义时间选择 */}
          <div className="time-picker-section">
            <label>{showQuickOptions ? '或自定义时间' : '提醒时间'}</label>
            <div className="time-inputs">
              <div className="date-input-wrapper">
                <input
                  type="date"
                  value={selectedDate}
                  onChange={e => setSelectedDate(e.target.value)}
                  min={getTodayStr()}
                  className="date-input"
                />
              </div>
              <div className="time-input-wrapper">
                <input
                  type="time"
                  value={selectedTime}
                  onChange={e => setSelectedTime(e.target.value)}
                  className="time-input"
                />
              </div>
            </div>
            {!showQuickOptions && !editingId && (
              <button
                className="show-quick-btn"
                onClick={() => setShowQuickOptions(true)}
              >
                显示快捷选项
              </button>
            )}
          </div>

          <div className="form-group">
            <label>重复规则</label>
            <select
              value={typeof repeatRule === 'string' ? repeatRule : 'Custom'}
              onChange={e => {
                const value = e.target.value;
                if (value === 'Custom') {
                  const custom = prompt('请输入 cron 表达式\n\n示例:\n• 每个工作日: 0 9 * * 1-5\n• 每月1号: 0 9 1 * *\n• 每年生日: 0 9 15 6 *');
                  if (custom) {
                    setRepeatRule({ Custom: custom });
                  }
                } else {
                  setRepeatRule(value as RepeatRule);
                }
              }}
            >
              <option value="None">不重复</option>
              <option value="Daily">每天</option>
              <option value="Weekly">每周</option>
              <option value="Monthly">每月</option>
              <option value="Yearly">每年</option>
              <option value="Custom">自定义...</option>
            </select>
          </div>

          <div className="form-group checkbox-group">
            <label>
              <input
                type="checkbox"
                checked={notifySystem}
                onChange={e => setNotifySystem(e.target.checked)}
              />
              系统通知
            </label>
            <label>
              <input
                type="checkbox"
                checked={notifySound}
                onChange={e => setNotifySound(e.target.checked)}
              />
              声音提醒
            </label>
          </div>

          <div className="form-group">
            <label>备注（可选）</label>
            <input
              type="text"
              value={memo}
              onChange={e => setMemo(e.target.value)}
              placeholder="添加提醒备注..."
            />
          </div>

          <div className="form-actions">
            {editingId && (
              <button className="btn-cancel" onClick={handleCancelEdit}>
                取消编辑
              </button>
            )}
            <button className="btn-primary" onClick={handleSubmit}>
              {editingId ? '更新提醒' : '添加提醒'}
            </button>
          </div>
        </div>

        {/* 提醒列表 */}
        {noteReminders.length > 0 && (
          <div className="reminder-list">
            <h4>已设置的提醒</h4>
            {noteReminders.map(reminder => (
              <div key={reminder.id} className={`reminder-item ${!reminder.is_active ? 'inactive' : ''}`}>
                <div className="reminder-info">
                  <div className="reminder-time">
                    ⏰ {formatDateTime(reminder.remind_at)}
                  </div>
                  <div className="reminder-meta">
                    <span className="repeat-badge">{formatRepeatRule(reminder.repeat_rule)}</span>
                    {reminder.memo && <span className="memo-text">{reminder.memo}</span>}
                  </div>
                </div>
                <div className="reminder-actions">
                  <button
                    className="btn-icon"
                    onClick={() => handleEdit(reminder)}
                    title="编辑"
                  >
                    ✏️
                  </button>
                  <button
                    className="btn-icon btn-danger"
                    onClick={() => handleDelete(reminder.id)}
                    title="删除"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
