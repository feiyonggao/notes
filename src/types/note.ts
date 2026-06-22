/// 便签颜色
export type NoteColor =
  | 'Yellow'
  | 'Blue'
  | 'Green'
  | 'Pink'
  | 'Purple'
  | 'Orange'
  | 'Gray'
  | 'White';

/// 颜色配置
export interface ColorConfig {
  name: NoteColor;
  hex: string;
  label: string;
}

/// 便签数据
export interface Note {
  id: string;
  title: string;
  content: string;
  color: NoteColor;
  tags: string[];
  is_pinned: boolean;
  is_markdown: boolean;
  x: number;
  y: number;
  width: number;
  height: number;
  created_at: string;
  updated_at: string;
  attachments: Attachment[];
}

/// 应用设置
export interface AppSettings {
  default_color: NoteColor;
  default_width: number;
  default_height: number;
  always_on_top: boolean;
  show_in_taskbar: boolean;
  auto_save: boolean;
  auto_start: boolean;
  font_size: number;
  font_family: string;
  data_path: string;
}

/// 附件类型
export type AttachmentType = 'Image' | 'Document' | 'Audio' | 'Video' | 'Other';

/// 重复规则
export type RepeatRule = 'None' | 'Daily' | 'Weekly' | 'Monthly' | 'Yearly' | { Custom: string };

/// 提醒数据
export interface Reminder {
  id: string;
  note_id: string;
  remind_at: string;
  repeat_rule: RepeatRule;
  notify_system: boolean;
  notify_sound: boolean;
  memo: string | null;
  is_active: boolean;
  created_at: string;
}

/// 便签存储数据（用于导入导出）
export interface NotesStore {
  notes: Note[];
  settings: AppSettings;
  version: number;
}

/// 附件
export interface Attachment {
  id: string;
  note_id: string;
  name: string;
  file_type: AttachmentType;
  mime_type: string;
  size: number;
  path: string;
  created_at: string;
}

/// 统计信息
export interface Stats {
  total: number;
  pinned: number;
  tags: number;
}

/// 颜色映射
export const COLOR_MAP: Record<NoteColor, string> = {
  Yellow: '#FFF9C4',
  Blue: '#BBDEFB',
  Green: '#C8E6C9',
  Pink: '#F8BBD0',
  Purple: '#E1BEE7',
  Orange: '#FFE0B2',
  Gray: '#E0E0E0',
  White: '#FFFFFF',
};

/// 颜色列表
export const COLORS: ColorConfig[] = [
  { name: 'Yellow', hex: '#FFF9C4', label: '黄色' },
  { name: 'Blue', hex: '#BBDEFB', label: '蓝色' },
  { name: 'Green', hex: '#C8E6C9', label: '绿色' },
  { name: 'Pink', hex: '#F8BBD0', label: '粉色' },
  { name: 'Purple', hex: '#E1BEE7', label: '紫色' },
  { name: 'Orange', hex: '#FFE0B2', label: '橙色' },
  { name: 'Gray', hex: '#E0E0E0', label: '灰色' },
  { name: 'White', hex: '#FFFFFF', label: '白色' },
];
