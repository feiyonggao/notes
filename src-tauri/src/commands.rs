use tauri::State;
use crate::models::{Note, AppSettings, Attachment, AttachmentType};
use crate::database::Database;

/// 获取所有便签
#[tauri::command]
pub async fn get_all_notes(
    db: State<'_, Database>,
) -> Result<Vec<Note>, String> {
    db.get_all_notes()
}

/// 获取单个便签
#[tauri::command]
pub async fn get_note(
    id: String,
    db: State<'_, Database>,
) -> Result<Option<Note>, String> {
    db.get_note(&id)
}

/// 创建新便签
#[tauri::command]
pub async fn create_note(
    x: Option<f64>,
    y: Option<f64>,
    db: State<'_, Database>,
) -> Result<Note, String> {
    db.create_note(x, y)
}

/// 更新便签
#[tauri::command]
pub async fn update_note(
    note: Note,
    db: State<'_, Database>,
) -> Result<Note, String> {
    db.update_note(&note)?;
    Ok(note)
}

/// 删除便签
#[tauri::command]
pub async fn delete_note(
    id: String,
    db: State<'_, Database>,
) -> Result<(), String> {
    db.delete_note(&id)
}

/// 搜索便签
#[tauri::command]
pub async fn search_notes(
    query: String,
    db: State<'_, Database>,
) -> Result<Vec<Note>, String> {
    db.search_notes(&query)
}

/// 按标签筛选
#[tauri::command]
pub async fn get_notes_by_tag(
    tag: String,
    db: State<'_, Database>,
) -> Result<Vec<Note>, String> {
    db.get_notes_by_tag(&tag)
}

/// 获取所有标签
#[tauri::command]
pub async fn get_all_tags(
    db: State<'_, Database>,
) -> Result<Vec<String>, String> {
    db.get_all_tags()
}

/// 切换置顶状态
#[tauri::command]
pub async fn toggle_pin(
    id: String,
    db: State<'_, Database>,
) -> Result<Note, String> {
    let _is_pinned = db.toggle_pin(&id)?;
    let note = db.get_note(&id)?.ok_or("便签不存在")?;
    Ok(note)
}

/// 批量删除
#[tauri::command]
pub async fn delete_notes(
    ids: Vec<String>,
    db: State<'_, Database>,
) -> Result<(), String> {
    db.delete_notes(&ids)
}

/// 获取设置
#[tauri::command]
pub async fn get_settings(
    db: State<'_, Database>,
) -> Result<AppSettings, String> {
    db.get_settings()
}

/// 更新设置
#[tauri::command]
pub async fn update_settings(
    settings: AppSettings,
    db: State<'_, Database>,
) -> Result<AppSettings, String> {
    db.update_settings(&settings)?;
    Ok(settings)
}

/// 导出便签
#[tauri::command]
pub async fn export_notes(
    db: State<'_, Database>,
) -> Result<String, String> {
    db.export_notes()
}

/// 导入便签
#[tauri::command]
pub async fn import_notes(
    json: String,
    db: State<'_, Database>,
) -> Result<usize, String> {
    db.import_notes(&json)
}

/// 获取统计信息
#[tauri::command]
pub async fn get_stats(
    db: State<'_, Database>,
) -> Result<serde_json::Value, String> {
    db.get_stats()
}

/// 获取颜色列表
#[tauri::command]
pub async fn get_colors() -> Vec<serde_json::Value> {
    vec![
        serde_json::json!({ "name": "Yellow", "hex": "#FFF9C4", "label": "黄色" }),
        serde_json::json!({ "name": "Blue", "hex": "#BBDEFB", "label": "蓝色" }),
        serde_json::json!({ "name": "Green", "hex": "#C8E6C9", "label": "绿色" }),
        serde_json::json!({ "name": "Pink", "hex": "#F8BBD0", "label": "粉色" }),
        serde_json::json!({ "name": "Purple", "hex": "#E1BEE7", "label": "紫色" }),
        serde_json::json!({ "name": "Orange", "hex": "#FFE0B2", "label": "橙色" }),
        serde_json::json!({ "name": "Gray", "hex": "#E0E0E0", "label": "灰色" }),
        serde_json::json!({ "name": "White", "hex": "#FFFFFF", "label": "白色" }),
    ]
}

/// 获取当前数据目录路径
#[tauri::command]
pub async fn get_data_dir(
    db: State<'_, Database>,
) -> Result<String, String> {
    db.get_data_dir()
}

/// 获取默认数据目录路径
#[tauri::command]
pub async fn get_default_data_dir(
    db: State<'_, Database>,
) -> Result<String, String> {
    Ok(db.get_default_data_dir())
}

/// 验证数据路径
#[tauri::command]
pub async fn validate_data_path(
    path: String,
    db: State<'_, Database>,
) -> Result<bool, String> {
    db.validate_data_path(&path)
}

/// 获取便签附件
#[tauri::command]
pub async fn get_attachments(
    note_id: String,
    db: State<'_, Database>,
) -> Result<Vec<Attachment>, String> {
    db.get_attachments(&note_id)
}

/// 上传附件
#[tauri::command]
pub async fn upload_attachment(
    note_id: String,
    name: String,
    data: Vec<u8>,
    mime_type: String,
    db: State<'_, Database>,
) -> Result<Attachment, String> {
    // 确定附件类型
    let file_type = if mime_type.starts_with("image/") {
        AttachmentType::Image
    } else if mime_type.starts_with("video/") {
        AttachmentType::Video
    } else if mime_type.starts_with("audio/") {
        AttachmentType::Audio
    } else if mime_type.starts_with("application/pdf")
        || mime_type.starts_with("application/msword")
        || mime_type.starts_with("application/vnd.openxmlformats")
        || mime_type.starts_with("text/")
    {
        AttachmentType::Document
    } else {
        AttachmentType::Other
    };

    // 获取附件存储目录
    let attachments_dir = db.get_attachments_dir()?;

    // 生成唯一文件名
    let ext = name.rsplit('.').next().unwrap_or("bin");
    let file_name = format!("{}.{}", uuid::Uuid::new_v4(), ext);
    let file_path = attachments_dir.join(&file_name);

    // 写入文件
    std::fs::write(&file_path, &data)
        .map_err(|e| format!("写入文件失败: {}", e))?;

    // 创建附件记录
    let attachment = db.create_attachment(
        &note_id,
        &name,
        file_type,
        &mime_type,
        data.len() as i64,
        &file_path.to_string_lossy(),
    )?;

    Ok(attachment)
}

/// 删除附件
#[tauri::command]
pub async fn delete_attachment(
    id: String,
    db: State<'_, Database>,
) -> Result<(), String> {
    let path = db.delete_attachment(&id)?;

    // 删除文件
    let file_path = std::path::Path::new(&path);
    if file_path.exists() {
        std::fs::remove_file(file_path)
            .map_err(|e| format!("删除文件失败: {}", e))?;
    }

    Ok(())
}

/// 获取附件内容
#[tauri::command]
pub async fn get_attachment_data(
    id: String,
    db: State<'_, Database>,
) -> Result<Vec<u8>, String> {
    let attachment = db.get_attachment(&id)?
        .ok_or("附件不存在")?;

    std::fs::read(&attachment.path)
        .map_err(|e| format!("读取文件失败: {}", e))
}
