@echo off
echo ========================================
echo   清理 Windows 图标缓存
echo ========================================
echo.

echo [1/4] 停止 Windows Explorer...
taskkill /f /im explorer.exe >nul 2>&1
timeout /t 2 /nobreak >nul
echo [✓] Explorer 已停止

echo.
echo [2/4] 删除图标缓存文件...
del /a /q "%localappdata%\IconCache.db" >nul 2>&1
del /a /f /q "%localappdata%\Microsoft\Windows\Explorer\iconcache*" >nul 2>&1
del /a /f /q "%localappdata%\Microsoft\Windows\Explorer\thumbcache*" >nul 2>&1
echo [✓] 缓存文件已删除

echo.
echo [3/4] 清理 DNS 缓存...
ipconfig /flushdns >nul 2>&1
echo [✓] DNS 缓存已清理

echo.
echo [4/4] 重启 Windows Explorer...
start explorer.exe
echo [✓] Explorer 已重启

echo.
echo ========================================
echo   图标缓存清理完成！
echo ========================================
echo.
echo 现在请重新查看 notes.exe 的图标
echo 如果还是旧图标，请重启电脑
echo.
pause