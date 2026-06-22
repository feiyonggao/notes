use serde::{Deserialize, Serialize};
use chrono::{DateTime, Utc};

/// 重复规则
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum RepeatRule {
    None,
    Daily,
    Weekly,
    Monthly,
    Yearly,
    Custom(String), // cron 表达式
}

impl Default for RepeatRule {
    fn default() -> Self {
        RepeatRule::None
    }
}

/// 提醒数据结构
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Reminder {
    pub id: String,
    pub note_id: String,
    pub remind_at: DateTime<Utc>,
    pub repeat_rule: RepeatRule,
    pub notify_system: bool,
    pub notify_sound: bool,
    pub memo: Option<String>,
    pub is_active: bool,
    pub created_at: DateTime<Utc>,
}

/// 便签颜色主题
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum NoteColor {
    Yellow,
    Blue,
    Green,
    Pink,
    Purple,
    Orange,
    Gray,
    White,
}

impl Default for NoteColor {
    fn default() -> Self {
        NoteColor::Yellow
    }
}

/// 附件类型
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum AttachmentType {
    Image,
    Document,
    Audio,
    Video,
    Other,
}

impl Default for AttachmentType {
    fn default() -> Self {
        AttachmentType::Other
    }
}

/// 附件数据结构
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Attachment {
    pub id: String,
    pub note_id: String,
    pub name: String,
    pub file_type: AttachmentType,
    pub mime_type: String,
    pub size: i64,
    pub path: String,
    pub created_at: DateTime<Utc>,
}

/// 便签数据结构
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Note {
    pub id: String,
    pub title: String,
    pub content: String,
    pub color: NoteColor,
    pub tags: Vec<String>,
    pub is_pinned: bool,
    pub is_markdown: bool,
    pub x: f64,
    pub y: f64,
    pub width: f64,
    pub height: f64,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub attachments: Vec<Attachment>,
}

/// 应用设置
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppSettings {
    pub default_color: NoteColor,
    pub default_width: f64,
    pub default_height: f64,
    pub always_on_top: bool,
    pub show_in_taskbar: bool,
    pub auto_save: bool,
    pub auto_start: bool,
    pub font_size: u32,
    pub font_family: String,
    pub data_path: String,
}

impl Default for AppSettings {
    fn default() -> Self {
        Self {
            default_color: NoteColor::Yellow,
            default_width: 300.0,
            default_height: 300.0,
            always_on_top: false,
            show_in_taskbar: true,
            auto_save: true,
            auto_start: true, // 默认开启自启动
            font_size: 14,
            font_family: "Microsoft YaHei".to_string(),
            data_path: String::new(), // 空字符串表示使用默认路径
        }
    }
}

/// 便签存储数据（用于导入导出）
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NotesStore {
    pub notes: Vec<Note>,
    pub settings: AppSettings,
    pub version: u32,
}

impl Default for NotesStore {
    fn default() -> Self {
        Self {
            notes: Vec::new(),
            settings: AppSettings::default(),
            version: 1,
        }
    }
}
