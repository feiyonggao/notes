import { format, formatDistanceToNow, parseISO } from 'date-fns';
import { zhCN } from 'date-fns/locale';

/// 格式化日期
export function formatDate(dateStr: string): string {
  try {
    const date = parseISO(dateStr);
    return format(date, 'yyyy-MM-dd HH:mm', { locale: zhCN });
  } catch {
    return dateStr;
  }
}

/// 格式化相对时间
export function formatRelativeTime(dateStr: string): string {
  try {
    const date = parseISO(dateStr);
    return formatDistanceToNow(date, { addSuffix: true, locale: zhCN });
  } catch {
    return dateStr;
  }
}

/// 去除 HTML 标签
export function stripHtml(html: string): string {
  if (!html) return '';
  // 创建临时元素来解析 HTML
  const tmp = document.createElement('div');
  tmp.innerHTML = html;
  return tmp.textContent || tmp.innerText || '';
}

/// 截断文本（支持 HTML）
export function truncateText(text: string, maxLength: number): string {
  if (!text) return '暂无内容';

  // 先去除 HTML 标签
  const plainText = stripHtml(text);

  if (plainText.length <= maxLength) return plainText;
  return plainText.slice(0, maxLength) + '...';
}

/// 获取纯文本预览
export function getPlainTextPreview(html: string, maxLength: number = 150): string {
  if (!html) return '暂无内容';
  const plainText = stripHtml(html);
  if (plainText.length <= maxLength) return plainText;
  return plainText.slice(0, maxLength) + '...';
}

/// 生成随机 ID
export function generateId(): string {
  return Math.random().toString(36).substring(2, 15) +
    Math.random().toString(36).substring(2, 15);
}

/// 防抖函数
export function debounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

/// 节流函数
export function throttle<T extends (...args: unknown[]) => unknown>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}
