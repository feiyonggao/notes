import { useState, useEffect } from 'react';
import { useNoteStore } from '../../stores/noteStore';
import { Reminder, RepeatRule } from '../../types/note';
import './styles.css';

interface ReminderPanelProps {
  noteId: string;
  onClose: () => void;
}

export default function ReminderPanel({ noteId, onClose }: ReminderPanelProps) {
  const { reminders, loadNoteReminders, createReminder, updateReminder, deleteReminder } = useNoteStore();

  const [remindAt, setRemindAt] = useState('');
  const [repeatRule, setRepeatRule] = useState<RepeatRule>('None');
  const [notifySystem, setNotifySystem] = useState(true);
  const [notifySound, setNotifySound] = useState(true);
  const [memo, setMemo] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    loadNoteReminders(noteId);
  }, [noteId, loadNoteReminders]);

  // 过滤当前便签的提醒
  const noteReminders = reminders.filter(r => r.note_id === noteId);

  // 设置默认时间为当前时间后 1 小时
  useEffect(() => {
    const now = new Date();
    now.setHours(now.getHours() + 1);
    now.setMinutes(0, 0, 0);
    const formatted = now.toISOString().slice(0, 16);
    setRemindAt(formatted);
  }, []);

  const handleSubmit = async () => {
    if (!remindAt) {
      alert('请选择提醒时间');
      return;
    }

    try {
      const remindDate = new Date(remindAt);
      if (editingId) {
        await updateReminder(editingId, remindDate, repeatRule, notifySystem, notifySound, memo || undefined);
        setEditingId(null);
      } else {
        await createReminder(noteId, remindDate, repeatRule, notifySystem, notifySound, memo || undefined);
      }

      // 重置表单
      const now = new Date();
      now.setHours(now.getHours() + 1);
      now.setMinutes(0, 0, 0);
      setRemindAt(now.toISOString().slice(0, 16));
      setRepeatRule('None');
      setNotifySystem(true);
      setNotifySound(true);
      setMemo('');
    } catch (error) {
      console.error('保存提醒失败:', error);
      alert('保存提醒失败');
    }
  };

  const handleEdit = (reminder: Reminder) => {
    setEditingId(reminder.id);
    const date = new Date(reminder.remind_at);
    setRemindAt(date.toISOString().slice(0, 16));
    setRepeatRule(reminder.repeat_rule);
    setNotifySystem(reminder.notify_system);
    setNotifySound(reminder.notify_sound);
    setMemo(reminder.memo || '');
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
    const now = new Date();
    now.setHours(now.getHours() + 1);
    now.setMinutes(0, 0, 0);
    setRemindAt(now.toISOString().slice(0, 16));
    setRepeatRule('None');
    setNotifySystem(true);
    setNotifySound(true);
    setMemo('');
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

  return (
    <div className="reminder-panel-overlay" onClick={onClose}>
      <div className="reminder-panel" onClick={e => e.stopPropagation()}>
        <div className="reminder-header">
          <h3>⏰ 提醒设置</h3>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>

        <div className="reminder-form">
          <div className="form-group">
            <label>提醒时间</label>
            <input
              type="datetime-local"
              value={remindAt}
              onChange={e => setRemindAt(e.target.value)}
              min={new Date().toISOString().slice(0, 16)}
            />
          </div>

          <div className="form-group">
            <label>重复规则</label>
            <select
              value={typeof repeatRule === 'string' ? repeatRule : 'Custom'}
              onChange={e => {
                const value = e.target.value;
                if (value === 'Custom') {
                  const custom = prompt('请输入 cron 表达式 (例: 0 9 * * 1-5)');
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
