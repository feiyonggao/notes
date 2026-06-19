use tauri::{
    AppHandle, Emitter,
    tray::{TrayIconBuilder, TrayIconEvent, MouseButton, MouseButtonState},
    menu::{Menu, MenuItem, PredefinedMenuItem},
};

/// 创建系统托盘
pub fn create_tray(app: &AppHandle) -> Result<(), Box<dyn std::error::Error>> {
    // 创建菜单
    let new_note = MenuItem::with_id(app, "new_note", "新建便签", true, None::<&str>)?;
    let show_all = MenuItem::with_id(app, "show_all", "显示所有", true, None::<&str>)?;
    let hide_all = MenuItem::with_id(app, "hide_all", "隐藏所有", true, None::<&str>)?;
    let separator = PredefinedMenuItem::separator(app)?;
    let settings = MenuItem::with_id(app, "settings", "设置", true, None::<&str>)?;
    let about = MenuItem::with_id(app, "about", "关于", true, None::<&str>)?;
    let separator2 = PredefinedMenuItem::separator(app)?;
    let quit = MenuItem::with_id(app, "quit", "退出", true, None::<&str>)?;

    let menu = Menu::with_items(
        app,
        &[
            &new_note,
            &show_all,
            &hide_all,
            &separator,
            &settings,
            &about,
            &separator2,
            &quit,
        ],
    )?;

    // 创建托盘图标
    let _tray = TrayIconBuilder::new()
        .icon(app.default_window_icon().unwrap().clone())
        .menu(&menu)
        .tooltip("Rusty Notes - 便签工具")
        .on_menu_event(move |app, event| {
            match event.id.as_ref() {
                "new_note" => {
                    // 触发新建便签事件
                    let _ = app.emit("tray-new-note", ());
                }
                "show_all" => {
                    let _ = app.emit("tray-show-all", ());
                }
                "hide_all" => {
                    let _ = app.emit("tray-hide-all", ());
                }
                "settings" => {
                    let _ = app.emit("tray-settings", ());
                }
                "about" => {
                    let _ = app.emit("tray-about", ());
                }
                "quit" => {
                    app.exit(0);
                }
                _ => {}
            }
        })
        .on_tray_icon_event(|tray, event| {
            if let TrayIconEvent::Click {
                button: MouseButton::Left,
                button_state: MouseButtonState::Up,
                ..
            } = event
            {
                let app = tray.app_handle();
                let _ = app.emit("tray-click", ());
            }
        })
        .build(app)?;

    Ok(())
}
