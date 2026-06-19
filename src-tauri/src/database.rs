use std::sync::Mutex;
use rusqlite::{Connection, params};
use tauri::AppHandle;
use tauri::Manager;

use crate::models::{Note, NotesStore, AppSettings, NoteColor, Attachment, AttachmentType};

/// SQLite 数据库管理器
pub struct Database {
    conn: Mutex<Connection>,
    default_data_dir: std::path::PathBuf,
}

impl Database {
    /// 初始化数据库
    pub fn new(app: &AppHandle) -> Result<Self, String> {
        let data_dir = app
            .path()
            .app_data_dir()
            .map_err(|e| format!("获取数据目录失败: {}", e))?;

        // 确保目录存在
        std::fs::create_dir_all(&data_dir)
            .map_err(|e| format!("创建数据目录失败: {}", e))?;

        let db_path = data_dir.join("notes.db");
        let conn = Connection::open(&db_path)
            .map_err(|e| format!("打开数据库失败: {}", e))?;

        // 启用 WAL 模式提高并发性能
        conn.execute_batch("PRAGMA journal_mode=WAL;")
            .map_err(|e| format!("设置 WAL 模式失败: {}", e))?;

        // 创建表结构
        conn.execute_batch("
            CREATE TABLE IF NOT EXISTS notes (
                id TEXT PRIMARY KEY,
                title TEXT NOT NULL DEFAULT '',
                content TEXT NOT NULL DEFAULT '',
                color TEXT NOT NULL DEFAULT 'Yellow',
                tags TEXT NOT NULL DEFAULT '[]',
                is_pinned INTEGER NOT NULL DEFAULT 0,
                is_markdown INTEGER NOT NULL DEFAULT 0,
                x REAL NOT NULL DEFAULT 100.0,
                y REAL NOT NULL DEFAULT 100.0,
                width REAL NOT NULL DEFAULT 300.0,
                height REAL NOT NULL DEFAULT 300.0,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );

            CREATE INDEX IF NOT EXISTS idx_notes_updated_at ON notes(updated_at);
            CREATE INDEX IF NOT EXISTS idx_notes_is_pinned ON notes(is_pinned);

            CREATE TABLE IF NOT EXISTS attachments (
                id TEXT PRIMARY KEY,
                note_id TEXT NOT NULL,
                name TEXT NOT NULL,
                file_type TEXT NOT NULL DEFAULT 'Other',
                mime_type TEXT NOT NULL DEFAULT '',
                size INTEGER NOT NULL DEFAULT 0,
                path TEXT NOT NULL,
                created_at TEXT NOT NULL,
                FOREIGN KEY (note_id) REFERENCES notes(id) ON DELETE CASCADE
            );

            CREATE INDEX IF NOT EXISTS idx_attachments_note_id ON attachments(note_id);

            CREATE TABLE IF NOT EXISTS settings (
                key TEXT PRIMARY KEY,
                value TEXT NOT NULL
            );
        ").map_err(|e| format!("创建表失败: {}", e))?;

        Ok(Self {
            conn: Mutex::new(conn),
            default_data_dir: data_dir,
        })
    }

    /// 获取所有便签
    pub fn get_all_notes(&self) -> Result<Vec<Note>, String> {
        let conn = self.conn.lock()
            .map_err(|e| format!("获取锁失败: {}", e))?;

        let mut stmt = conn.prepare(
            "SELECT id, title, content, color, tags, is_pinned, is_markdown, x, y, width, height, created_at, updated_at
             FROM notes ORDER BY is_pinned DESC, updated_at DESC"
        ).map_err(|e| format!("准备查询失败: {}", e))?;

        let notes = stmt.query_map([], |row| {
            let tags_str: String = row.get(4)?;
            let tags: Vec<String> = serde_json::from_str(&tags_str).unwrap_or_default();
            let color_str: String = row.get(3)?;
            let color: NoteColor = serde_json::from_str(&format!("\"{}\"", color_str))
                .unwrap_or(NoteColor::Yellow);

            Ok(Note {
                id: row.get(0)?,
                title: row.get(1)?,
                content: row.get(2)?,
                color,
                tags,
                is_pinned: row.get::<_, i32>(5)? != 0,
                is_markdown: row.get::<_, i32>(6)? != 0,
                x: row.get(7)?,
                y: row.get(8)?,
                width: row.get(9)?,
                height: row.get(10)?,
                created_at: chrono::DateTime::parse_from_rfc3339(&row.get::<_, String>(11)?)
                    .unwrap_or_default()
                    .with_timezone(&chrono::Utc),
                updated_at: chrono::DateTime::parse_from_rfc3339(&row.get::<_, String>(12)?)
                    .unwrap_or_default()
                    .with_timezone(&chrono::Utc),
                attachments: Vec::new(), // 稍后填充
            })
        })
        .map_err(|e| format!("查询失败: {}", e))?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| format!("收集结果失败: {}", e))?;

        // 为每个便签获取附件
        let mut notes_with_attachments = Vec::new();
        for mut note in notes {
            note.attachments = self.get_attachments_for_note(&conn, &note.id)?;
            notes_with_attachments.push(note);
        }

        Ok(notes_with_attachments)
    }

    /// 获取单个便签
    pub fn get_note(&self, id: &str) -> Result<Option<Note>, String> {
        let conn = self.conn.lock()
            .map_err(|e| format!("获取锁失败: {}", e))?;

        let mut stmt = conn.prepare(
            "SELECT id, title, content, color, tags, is_pinned, is_markdown, x, y, width, height, created_at, updated_at
             FROM notes WHERE id = ?1"
        ).map_err(|e| format!("准备查询失败: {}", e))?;

        let mut notes = stmt.query_map(params![id], |row| {
            let tags_str: String = row.get(4)?;
            let tags: Vec<String> = serde_json::from_str(&tags_str).unwrap_or_default();
            let color_str: String = row.get(3)?;
            let color: NoteColor = serde_json::from_str(&format!("\"{}\"", color_str))
                .unwrap_or(NoteColor::Yellow);

            Ok(Note {
                id: row.get(0)?,
                title: row.get(1)?,
                content: row.get(2)?,
                color,
                tags,
                is_pinned: row.get::<_, i32>(5)? != 0,
                is_markdown: row.get::<_, i32>(6)? != 0,
                x: row.get(7)?,
                y: row.get(8)?,
                width: row.get(9)?,
                height: row.get(10)?,
                created_at: chrono::DateTime::parse_from_rfc3339(&row.get::<_, String>(11)?)
                    .unwrap_or_default()
                    .with_timezone(&chrono::Utc),
                updated_at: chrono::DateTime::parse_from_rfc3339(&row.get::<_, String>(12)?)
                    .unwrap_or_default()
                    .with_timezone(&chrono::Utc),
                attachments: Vec::new(), // 稍后填充
            })
        })
        .map_err(|e| format!("查询失败: {}", e))?;

        let mut note = notes.next().transpose()
            .map_err(|e| format!("获取结果失败: {}", e))?;

        // 如果找到便签，获取附件
        if let Some(ref mut n) = note {
            n.attachments = self.get_attachments_for_note(&conn, &n.id)?;
        }

        Ok(note)
    }

    /// 获取便签的附件（内部方法，需要已持有锁）
    fn get_attachments_for_note(&self, conn: &Connection, note_id: &str) -> Result<Vec<Attachment>, String> {
        let mut stmt = conn.prepare(
            "SELECT id, note_id, name, file_type, mime_type, size, path, created_at
             FROM attachments WHERE note_id = ?1 ORDER BY created_at DESC"
        ).map_err(|e| format!("准备查询失败: {}", e))?;

        let attachments = stmt.query_map(params![note_id], |row| {
            let file_type_str: String = row.get(3)?;
            let file_type: AttachmentType = serde_json::from_str(&format!("\"{}\"", file_type_str))
                .unwrap_or(AttachmentType::Other);

            Ok(Attachment {
                id: row.get(0)?,
                note_id: row.get(1)?,
                name: row.get(2)?,
                file_type,
                mime_type: row.get(4)?,
                size: row.get(5)?,
                path: row.get(6)?,
                created_at: chrono::DateTime::parse_from_rfc3339(&row.get::<_, String>(7)?)
                    .unwrap_or_default()
                    .with_timezone(&chrono::Utc),
            })
        })
        .map_err(|e| format!("查询失败: {}", e))?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| format!("收集结果失败: {}", e))?;

        Ok(attachments)
    }

    /// 创建新便签
    pub fn create_note(&self, x: Option<f64>, y: Option<f64>) -> Result<Note, String> {
        let conn = self.conn.lock()
            .map_err(|e| format!("获取锁失败: {}", e))?;

        let id = uuid::Uuid::new_v4().to_string();
        let now = chrono::Utc::now();
        let now_str = now.to_rfc3339();

        // 计算位置
        let count: i64 = conn.query_row("SELECT COUNT(*) FROM notes", [], |row| row.get(0))
            .unwrap_or(0);
        let offset = (count as f64) * 30.0;
        let note_x = x.unwrap_or(100.0 + offset % 500.0);
        let note_y = y.unwrap_or(100.0 + (offset / 500.0).floor() * 30.0);

        // 获取默认设置
        let default_color = self.get_setting_value(&conn, "default_color")
            .unwrap_or_else(|_| "Yellow".to_string());
        let default_width: f64 = self.get_setting_value(&conn, "default_width")
            .ok()
            .and_then(|v| v.parse().ok())
            .unwrap_or(300.0);
        let default_height: f64 = self.get_setting_value(&conn, "default_height")
            .ok()
            .and_then(|v| v.parse().ok())
            .unwrap_or(300.0);

        conn.execute(
            "INSERT INTO notes (id, title, content, color, tags, is_pinned, is_markdown, x, y, width, height, created_at, updated_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13)",
            params![
                id,
                "",
                "",
                default_color,
                "[]",
                0,
                0,
                note_x,
                note_y,
                default_width,
                default_height,
                now_str,
                now_str,
            ],
        ).map_err(|e| format!("创建便签失败: {}", e))?;

        Ok(Note {
            id,
            title: String::new(),
            content: String::new(),
            color: serde_json::from_str(&format!("\"{}\"", default_color))
                .unwrap_or(NoteColor::Yellow),
            tags: Vec::new(),
            is_pinned: false,
            is_markdown: false,
            x: note_x,
            y: note_y,
            width: default_width,
            height: default_height,
            created_at: now,
            updated_at: now,
            attachments: Vec::new(),
        })
    }

    /// 更新便签
    pub fn update_note(&self, note: &Note) -> Result<(), String> {
        let conn = self.conn.lock()
            .map_err(|e| format!("获取锁失败: {}", e))?;

        let tags_str = serde_json::to_string(&note.tags)
            .map_err(|e| format!("序列化标签失败: {}", e))?;
        let color_str = serde_json::to_string(&note.color)
            .map_err(|e| format!("序列化颜色失败: {}", e))?
            .trim_matches('"').to_string();

        conn.execute(
            "UPDATE notes SET title = ?1, content = ?2, color = ?3, tags = ?4, is_pinned = ?5,
             is_markdown = ?6, x = ?7, y = ?8, width = ?9, height = ?10, updated_at = ?11
             WHERE id = ?12",
            params![
                note.title,
                note.content,
                color_str,
                tags_str,
                note.is_pinned as i32,
                note.is_markdown as i32,
                note.x,
                note.y,
                note.width,
                note.height,
                note.updated_at.to_rfc3339(),
                note.id,
            ],
        ).map_err(|e| format!("更新便签失败: {}", e))?;

        Ok(())
    }

    /// 删除便签
    pub fn delete_note(&self, id: &str) -> Result<(), String> {
        let conn = self.conn.lock()
            .map_err(|e| format!("获取锁失败: {}", e))?;

        conn.execute("DELETE FROM notes WHERE id = ?1", params![id])
            .map_err(|e| format!("删除便签失败: {}", e))?;

        Ok(())
    }

    /// 批量删除便签
    pub fn delete_notes(&self, ids: &[String]) -> Result<(), String> {
        let conn = self.conn.lock()
            .map_err(|e| format!("获取锁失败: {}", e))?;

        let placeholders: Vec<String> = ids.iter().enumerate()
            .map(|(i, _)| format!("?{}", i + 1))
            .collect();
        let sql = format!("DELETE FROM notes WHERE id IN ({})", placeholders.join(","));

        let params: Vec<&dyn rusqlite::types::ToSql> = ids.iter()
            .map(|id| id as &dyn rusqlite::types::ToSql)
            .collect();

        conn.execute(&sql, params.as_slice())
            .map_err(|e| format!("批量删除失败: {}", e))?;

        Ok(())
    }

    /// 搜索便签
    pub fn search_notes(&self, query: &str) -> Result<Vec<Note>, String> {
        let conn = self.conn.lock()
            .map_err(|e| format!("获取锁失败: {}", e))?;

        let search_pattern = format!("%{}%", query);
        let mut stmt = conn.prepare(
            "SELECT id, title, content, color, tags, is_pinned, is_markdown, x, y, width, height, created_at, updated_at
             FROM notes
             WHERE title LIKE ?1 OR content LIKE ?1 OR tags LIKE ?1
             ORDER BY is_pinned DESC, updated_at DESC"
        ).map_err(|e| format!("准备查询失败: {}", e))?;

        let notes = stmt.query_map(params![search_pattern], |row| {
            let tags_str: String = row.get(4)?;
            let tags: Vec<String> = serde_json::from_str(&tags_str).unwrap_or_default();
            let color_str: String = row.get(3)?;
            let color: NoteColor = serde_json::from_str(&format!("\"{}\"", color_str))
                .unwrap_or(NoteColor::Yellow);

            Ok(Note {
                id: row.get(0)?,
                title: row.get(1)?,
                content: row.get(2)?,
                color,
                tags,
                is_pinned: row.get::<_, i32>(5)? != 0,
                is_markdown: row.get::<_, i32>(6)? != 0,
                x: row.get(7)?,
                y: row.get(8)?,
                width: row.get(9)?,
                height: row.get(10)?,
                created_at: chrono::DateTime::parse_from_rfc3339(&row.get::<_, String>(11)?)
                    .unwrap_or_default()
                    .with_timezone(&chrono::Utc),
                updated_at: chrono::DateTime::parse_from_rfc3339(&row.get::<_, String>(12)?)
                    .unwrap_or_default()
                    .with_timezone(&chrono::Utc),
                attachments: Vec::new(),
            })
        })
        .map_err(|e| format!("查询失败: {}", e))?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| format!("收集结果失败: {}", e))?;

        Ok(notes)
    }

    /// 按标签筛选
    pub fn get_notes_by_tag(&self, tag: &str) -> Result<Vec<Note>, String> {
        let conn = self.conn.lock()
            .map_err(|e| format!("获取锁失败: {}", e))?;

        // 标签存储格式为 ["tag1","tag2"]，需要精确匹配
        let search_pattern = format!("%\"{}\"%", tag);
        let mut stmt = conn.prepare(
            "SELECT id, title, content, color, tags, is_pinned, is_markdown, x, y, width, height, created_at, updated_at
             FROM notes
             WHERE tags LIKE ?1
             ORDER BY is_pinned DESC, updated_at DESC"
        ).map_err(|e| format!("准备查询失败: {}", e))?;

        let notes = stmt.query_map(params![search_pattern], |row| {
            let tags_str: String = row.get(4)?;
            let tags: Vec<String> = serde_json::from_str(&tags_str).unwrap_or_default();
            let color_str: String = row.get(3)?;
            let color: NoteColor = serde_json::from_str(&format!("\"{}\"", color_str))
                .unwrap_or(NoteColor::Yellow);

            Ok(Note {
                id: row.get(0)?,
                title: row.get(1)?,
                content: row.get(2)?,
                color,
                tags,
                is_pinned: row.get::<_, i32>(5)? != 0,
                is_markdown: row.get::<_, i32>(6)? != 0,
                x: row.get(7)?,
                y: row.get(8)?,
                width: row.get(9)?,
                height: row.get(10)?,
                created_at: chrono::DateTime::parse_from_rfc3339(&row.get::<_, String>(11)?)
                    .unwrap_or_default()
                    .with_timezone(&chrono::Utc),
                updated_at: chrono::DateTime::parse_from_rfc3339(&row.get::<_, String>(12)?)
                    .unwrap_or_default()
                    .with_timezone(&chrono::Utc),
                attachments: Vec::new(),
            })
        })
        .map_err(|e| format!("查询失败: {}", e))?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| format!("收集结果失败: {}", e))?;

        Ok(notes)
    }

    /// 获取所有标签
    pub fn get_all_tags(&self) -> Result<Vec<String>, String> {
        let conn = self.conn.lock()
            .map_err(|e| format!("获取锁失败: {}", e))?;

        let mut stmt = conn.prepare("SELECT tags FROM notes")
            .map_err(|e| format!("准备查询失败: {}", e))?;

        let mut all_tags = std::collections::HashSet::new();
        let rows = stmt.query_map([], |row| {
            let tags_str: String = row.get(0)?;
            Ok(tags_str)
        })
        .map_err(|e| format!("查询失败: {}", e))?;

        for row in rows {
            let tags_str = row.map_err(|e| format!("获取行失败: {}", e))?;
            let tags: Vec<String> = serde_json::from_str(&tags_str).unwrap_or_default();
            all_tags.extend(tags);
        }

        let mut tags: Vec<String> = all_tags.into_iter().collect();
        tags.sort();
        Ok(tags)
    }

    /// 切换置顶状态
    pub fn toggle_pin(&self, id: &str) -> Result<bool, String> {
        let conn = self.conn.lock()
            .map_err(|e| format!("获取锁失败: {}", e))?;

        let current: i32 = conn.query_row(
            "SELECT is_pinned FROM notes WHERE id = ?1",
            params![id],
            |row| row.get(0),
        ).map_err(|e| format!("查询失败: {}", e))?;

        let new_value = if current == 0 { 1 } else { 0 };
        conn.execute(
            "UPDATE notes SET is_pinned = ?1 WHERE id = ?2",
            params![new_value, id],
        ).map_err(|e| format!("更新失败: {}", e))?;

        Ok(new_value != 0)
    }

    /// 获取设置
    pub fn get_settings(&self) -> Result<AppSettings, String> {
        let conn = self.conn.lock()
            .map_err(|e| format!("获取锁失败: {}", e))?;

        let mut settings = AppSettings::default();

        if let Ok(value) = self.get_setting_value(&conn, "default_color") {
            settings.default_color = serde_json::from_str(&format!("\"{}\"", value))
                .unwrap_or(NoteColor::Yellow);
        }
        if let Ok(value) = self.get_setting_value(&conn, "default_width") {
            settings.default_width = value.parse().unwrap_or(300.0);
        }
        if let Ok(value) = self.get_setting_value(&conn, "default_height") {
            settings.default_height = value.parse().unwrap_or(300.0);
        }
        if let Ok(value) = self.get_setting_value(&conn, "always_on_top") {
            settings.always_on_top = value == "true";
        }
        if let Ok(value) = self.get_setting_value(&conn, "show_in_taskbar") {
            settings.show_in_taskbar = value == "true";
        }
        if let Ok(value) = self.get_setting_value(&conn, "auto_save") {
            settings.auto_save = value == "true";
        }
        if let Ok(value) = self.get_setting_value(&conn, "font_size") {
            settings.font_size = value.parse().unwrap_or(14);
        }
        if let Ok(value) = self.get_setting_value(&conn, "font_family") {
            settings.font_family = value;
        }
        if let Ok(value) = self.get_setting_value(&conn, "data_path") {
            settings.data_path = value;
        }

        Ok(settings)
    }

    /// 更新设置
    pub fn update_settings(&self, settings: &AppSettings) -> Result<(), String> {
        let conn = self.conn.lock()
            .map_err(|e| format!("获取锁失败: {}", e))?;

        let color_str = serde_json::to_string(&settings.default_color)
            .unwrap_or_else(|_| "\"Yellow\"".to_string())
            .trim_matches('"').to_string();

        self.set_setting_value(&conn, "default_color", &color_str)?;
        self.set_setting_value(&conn, "default_width", &settings.default_width.to_string())?;
        self.set_setting_value(&conn, "default_height", &settings.default_height.to_string())?;
        self.set_setting_value(&conn, "always_on_top", &settings.always_on_top.to_string())?;
        self.set_setting_value(&conn, "show_in_taskbar", &settings.show_in_taskbar.to_string())?;
        self.set_setting_value(&conn, "auto_save", &settings.auto_save.to_string())?;
        self.set_setting_value(&conn, "font_size", &settings.font_size.to_string())?;
        self.set_setting_value(&conn, "font_family", &settings.font_family)?;
        self.set_setting_value(&conn, "data_path", &settings.data_path)?;

        Ok(())
    }

    /// 获取统计信息
    pub fn get_stats(&self) -> Result<serde_json::Value, String> {
        let conn = self.conn.lock()
            .map_err(|e| format!("获取锁失败: {}", e))?;

        let total: i64 = conn.query_row("SELECT COUNT(*) FROM notes", [], |row| row.get(0))
            .unwrap_or(0);
        let pinned: i64 = conn.query_row("SELECT COUNT(*) FROM notes WHERE is_pinned = 1", [], |row| row.get(0))
            .unwrap_or(0);
        let tags = self.get_all_tags_from_conn(&conn).unwrap_or_default();

        Ok(serde_json::json!({
            "total": total,
            "pinned": pinned,
            "tags": tags.len()
        }))
    }

    /// 导出所有便签
    pub fn export_notes(&self) -> Result<String, String> {
        let notes = self.get_all_notes()?;
        let settings = self.get_settings()?;

        let store = NotesStore {
            notes,
            settings,
            version: 1,
        };

        serde_json::to_string_pretty(&store)
            .map_err(|e| format!("导出失败: {}", e))
    }

    /// 导入便签
    pub fn import_notes(&self, json: &str) -> Result<usize, String> {
        let imported: NotesStore = serde_json::from_str(json)
            .map_err(|e| format!("解析数据失败: {}", e))?;

        let conn = self.conn.lock()
            .map_err(|e| format!("获取锁失败: {}", e))?;

        let mut count = 0;
        for note in imported.notes {
            // 检查是否已存在
            let exists: bool = conn.query_row(
                "SELECT COUNT(*) FROM notes WHERE id = ?1",
                params![note.id],
                |row| Ok(row.get::<_, i64>(0)? > 0),
            ).unwrap_or(false);

            if !exists {
                let tags_str = serde_json::to_string(&note.tags).unwrap_or_else(|_| "[]".to_string());
                let color_str = serde_json::to_string(&note.color)
                    .unwrap_or_else(|_| "\"Yellow\"".to_string())
                    .trim_matches('"').to_string();

                conn.execute(
                    "INSERT INTO notes (id, title, content, color, tags, is_pinned, is_markdown, x, y, width, height, created_at, updated_at)
                     VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13)",
                    params![
                        note.id,
                        note.title,
                        note.content,
                        color_str,
                        tags_str,
                        note.is_pinned as i32,
                        note.is_markdown as i32,
                        note.x,
                        note.y,
                        note.width,
                        note.height,
                        note.created_at.to_rfc3339(),
                        note.updated_at.to_rfc3339(),
                    ],
                ).map_err(|e| format!("导入便签失败: {}", e))?;
                count += 1;
            }
        }

        Ok(count)
    }

    /// 从旧 JSON 迁移数据
    pub fn migrate_from_json(&self, json_path: &std::path::Path) -> Result<usize, String> {
        if !json_path.exists() {
            return Ok(0);
        }

        let content = std::fs::read_to_string(json_path)
            .map_err(|e| format!("读取 JSON 文件失败: {}", e))?;

        self.import_notes(&content)
    }

    /// 获取当前数据目录路径
    pub fn get_data_dir(&self) -> Result<String, String> {
        let conn = self.conn.lock()
            .map_err(|e| format!("获取锁失败: {}", e))?;

        // 先检查是否有自定义路径
        if let Ok(value) = self.get_setting_value(&conn, "data_path") {
            if !value.is_empty() {
                return Ok(value);
            }
        }

        // 返回默认路径
        Ok(self.default_data_dir.to_string_lossy().to_string())
    }

    /// 获取默认数据目录路径
    pub fn get_default_data_dir(&self) -> String {
        self.default_data_dir.to_string_lossy().to_string()
    }

    /// 检查路径是否存在且可写
    pub fn validate_data_path(&self, path: &str) -> Result<bool, String> {
        let path = std::path::Path::new(path);

        // 如果路径不存在，尝试创建
        if !path.exists() {
            std::fs::create_dir_all(path)
                .map_err(|e| format!("无法创建目录: {}", e))?;
        }

        // 检查是否可写
        let test_file = path.join(".test_write");
        match std::fs::write(&test_file, "test") {
            Ok(_) => {
                let _ = std::fs::remove_file(&test_file);
                Ok(true)
            }
            Err(e) => Err(format!("目录不可写: {}", e)),
        }
    }

    // 辅助方法
    fn get_setting_value(&self, conn: &Connection, key: &str) -> Result<String, String> {
        conn.query_row(
            "SELECT value FROM settings WHERE key = ?1",
            params![key],
            |row| row.get(0),
        ).map_err(|e| format!("获取设置失败: {}", e))
    }

    fn set_setting_value(&self, conn: &Connection, key: &str, value: &str) -> Result<(), String> {
        conn.execute(
            "INSERT OR REPLACE INTO settings (key, value) VALUES (?1, ?2)",
            params![key, value],
        ).map_err(|e| format!("保存设置失败: {}", e))?;
        Ok(())
    }

    fn get_all_tags_from_conn(&self, conn: &Connection) -> Result<Vec<String>, String> {
        let mut stmt = conn.prepare("SELECT tags FROM notes")
            .map_err(|e| format!("准备查询失败: {}", e))?;

        let mut all_tags = std::collections::HashSet::new();
        let rows = stmt.query_map([], |row| {
            let tags_str: String = row.get(0)?;
            Ok(tags_str)
        })
        .map_err(|e| format!("查询失败: {}", e))?;

        for row in rows {
            let tags_str = row.map_err(|e| format!("获取行失败: {}", e))?;
            let tags: Vec<String> = serde_json::from_str(&tags_str).unwrap_or_default();
            all_tags.extend(tags);
        }

        Ok(all_tags.into_iter().collect())
    }

    /// 获取便签的附件
    pub fn get_attachments(&self, note_id: &str) -> Result<Vec<Attachment>, String> {
        let conn = self.conn.lock()
            .map_err(|e| format!("获取锁失败: {}", e))?;

        let mut stmt = conn.prepare(
            "SELECT id, note_id, name, file_type, mime_type, size, path, created_at
             FROM attachments WHERE note_id = ?1 ORDER BY created_at DESC"
        ).map_err(|e| format!("准备查询失败: {}", e))?;

        let attachments = stmt.query_map(params![note_id], |row| {
            let file_type_str: String = row.get(3)?;
            let file_type: AttachmentType = serde_json::from_str(&format!("\"{}\"", file_type_str))
                .unwrap_or(AttachmentType::Other);

            Ok(Attachment {
                id: row.get(0)?,
                note_id: row.get(1)?,
                name: row.get(2)?,
                file_type,
                mime_type: row.get(4)?,
                size: row.get(5)?,
                path: row.get(6)?,
                created_at: chrono::DateTime::parse_from_rfc3339(&row.get::<_, String>(7)?)
                    .unwrap_or_default()
                    .with_timezone(&chrono::Utc),
            })
        })
        .map_err(|e| format!("查询失败: {}", e))?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| format!("收集结果失败: {}", e))?;

        Ok(attachments)
    }

    /// 创建附件
    pub fn create_attachment(
        &self,
        note_id: &str,
        name: &str,
        file_type: AttachmentType,
        mime_type: &str,
        size: i64,
        path: &str,
    ) -> Result<Attachment, String> {
        let conn = self.conn.lock()
            .map_err(|e| format!("获取锁失败: {}", e))?;

        let id = uuid::Uuid::new_v4().to_string();
        let now = chrono::Utc::now();
        let now_str = now.to_rfc3339();
        let file_type_str = serde_json::to_string(&file_type)
            .unwrap_or_else(|_| "\"Other\"".to_string())
            .trim_matches('"').to_string();

        conn.execute(
            "INSERT INTO attachments (id, note_id, name, file_type, mime_type, size, path, created_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
            params![id, note_id, name, file_type_str, mime_type, size, path, now_str],
        ).map_err(|e| format!("创建附件失败: {}", e))?;

        Ok(Attachment {
            id,
            note_id: note_id.to_string(),
            name: name.to_string(),
            file_type,
            mime_type: mime_type.to_string(),
            size,
            path: path.to_string(),
            created_at: now,
        })
    }

    /// 删除附件
    pub fn delete_attachment(&self, id: &str) -> Result<String, String> {
        let conn = self.conn.lock()
            .map_err(|e| format!("获取锁失败: {}", e))?;

        // 先获取附件路径
        let path: String = conn.query_row(
            "SELECT path FROM attachments WHERE id = ?1",
            params![id],
            |row| row.get(0),
        ).map_err(|e| format!("获取附件失败: {}", e))?;

        // 删除数据库记录
        conn.execute("DELETE FROM attachments WHERE id = ?1", params![id])
            .map_err(|e| format!("删除附件失败: {}", e))?;

        Ok(path)
    }

    /// 删除便签的所有附件
    pub fn delete_note_attachments(&self, note_id: &str) -> Result<Vec<String>, String> {
        let conn = self.conn.lock()
            .map_err(|e| format!("获取锁失败: {}", e))?;

        // 获取所有附件路径
        let mut stmt = conn.prepare("SELECT path FROM attachments WHERE note_id = ?1")
            .map_err(|e| format!("准备查询失败: {}", e))?;

        let paths: Vec<String> = stmt.query_map(params![note_id], |row| {
            Ok(row.get::<_, String>(0)?)
        })
        .map_err(|e| format!("查询失败: {}", e))?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| format!("收集结果失败: {}", e))?;

        // 删除数据库记录
        conn.execute("DELETE FROM attachments WHERE note_id = ?1", params![note_id])
            .map_err(|e| format!("删除附件失败: {}", e))?;

        Ok(paths)
    }

    /// 获取附件
    pub fn get_attachment(&self, id: &str) -> Result<Option<Attachment>, String> {
        let conn = self.conn.lock()
            .map_err(|e| format!("获取锁失败: {}", e))?;

        let mut stmt = conn.prepare(
            "SELECT id, note_id, name, file_type, mime_type, size, path, created_at
             FROM attachments WHERE id = ?1"
        ).map_err(|e| format!("准备查询失败: {}", e))?;

        let mut attachments = stmt.query_map(params![id], |row| {
            let file_type_str: String = row.get(3)?;
            let file_type: AttachmentType = serde_json::from_str(&format!("\"{}\"", file_type_str))
                .unwrap_or(AttachmentType::Other);

            Ok(Attachment {
                id: row.get(0)?,
                note_id: row.get(1)?,
                name: row.get(2)?,
                file_type,
                mime_type: row.get(4)?,
                size: row.get(5)?,
                path: row.get(6)?,
                created_at: chrono::DateTime::parse_from_rfc3339(&row.get::<_, String>(7)?)
                    .unwrap_or_default()
                    .with_timezone(&chrono::Utc),
            })
        })
        .map_err(|e| format!("查询失败: {}", e))?;

        attachments.next().transpose()
            .map_err(|e| format!("获取结果失败: {}", e))
    }

    /// 获取附件存储目录
    pub fn get_attachments_dir(&self) -> Result<std::path::PathBuf, String> {
        let data_dir = self.get_data_dir()?;
        let attachments_dir = std::path::Path::new(&data_dir).join("attachments");

        if !attachments_dir.exists() {
            std::fs::create_dir_all(&attachments_dir)
                .map_err(|e| format!("创建附件目录失败: {}", e))?;
        }

        Ok(attachments_dir)
    }
}
