mod models;
mod database;
mod commands;
mod tray;

use database::Database;
use tauri::Manager;
use tauri_plugin_autostart::MacosLauncher;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            // 当尝试打开第二个实例时，将现有窗口带到前台
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.show();
                let _ = window.set_focus();
                let _ = window.unminimize();
            }
        }))
        .plugin(tauri_plugin_autostart::init(MacosLauncher::LaunchAgent, Some(vec![])))
        .setup(|app| {
            // 初始化数据库
            let db = Database::new(&app.handle())?;

            // 尝试从旧 JSON 文件迁移数据
            let data_dir = app.path().app_data_dir().unwrap_or_default();
            let json_path = data_dir.join("notes.json");
            if json_path.exists() {
                match db.migrate_from_json(&json_path) {
                    Ok(count) if count > 0 => {
                        println!("从 JSON 迁移了 {} 条便签", count);
                        // 备份旧文件
                        let backup_path = data_dir.join("notes.json.bak");
                        let _ = std::fs::rename(&json_path, &backup_path);
                    }
                    _ => {}
                }
            }

            app.manage(db);

            // 创建系统托盘
            tray::create_tray(app.handle())?;

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::get_all_notes,
            commands::get_note,
            commands::create_note,
            commands::update_note,
            commands::delete_note,
            commands::search_notes,
            commands::get_notes_by_tag,
            commands::get_all_tags,
            commands::toggle_pin,
            commands::delete_notes,
            commands::get_settings,
            commands::update_settings,
            commands::export_notes,
            commands::import_notes,
            commands::get_stats,
            commands::get_colors,
            commands::get_data_dir,
            commands::get_default_data_dir,
            commands::validate_data_path,
            commands::get_attachments,
            commands::upload_attachment,
            commands::delete_attachment,
            commands::get_attachment_data,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
