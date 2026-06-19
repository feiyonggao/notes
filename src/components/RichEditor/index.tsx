import React, { useState, useEffect, useRef, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import './styles.css';

// 临时移除未使用的导入警告
// @ts-ignore
const _ReactMarkdown = ReactMarkdown;

interface RichEditorProps {
  content: string;
  onChange: (content: string) => void;
  placeholder?: string;
  noteId: string;
  isMarkdown?: boolean;
}

// Markdown 格式选项
const FORMAT_OPTIONS = [
  {
    category: '段落格式',
    items: [
      { label: '正文', icon: '¶', prefix: '', suffix: '', defaultText: '正文内容', description: '普通段落' },
      { label: '标题 1', icon: 'H1', prefix: '# ', suffix: '', defaultText: '一级标题', description: '大标题' },
      { label: '标题 2', icon: 'H2', prefix: '## ', suffix: '', defaultText: '二级标题', description: '中标题' },
      { label: '标题 3', icon: 'H3', prefix: '### ', suffix: '', defaultText: '三级标题', description: '小标题' },
      { label: '标题 4', icon: 'H4', prefix: '#### ', suffix: '', defaultText: '四级标题', description: '更小标题' },
    ]
  },
  {
    category: '列表',
    items: [
      { label: '无序列表', icon: '•', prefix: '- ', suffix: '', defaultText: '列表项', description: '项目符号列表' },
      { label: '有序列表', icon: '1.', prefix: '1. ', suffix: '', defaultText: '列表项', description: '数字编号列表' },
      { label: '任务列表', icon: '☑', prefix: '- [ ] ', suffix: '', defaultText: '待办事项', description: '可勾选的待办列表' },
    ]
  },
  {
    category: '引用与代码',
    items: [
      { label: '引用', icon: '❝', prefix: '> ', suffix: '', defaultText: '引用内容', description: '引用块' },
      { label: '行内代码', icon: '`', prefix: '`', suffix: '`', defaultText: '代码', description: '行内代码片段' },
      { label: '代码块', icon: '{ }', prefix: '```\n', suffix: '\n```', defaultText: '// 代码内容', description: '多行代码块' },
    ]
  },
  {
    category: '媒体与链接',
    items: [
      { label: '链接', icon: '🔗', prefix: '[', suffix: '](https://)', defaultText: '链接文字', description: '超链接' },
      { label: '图片', icon: '🖼️', prefix: '![', suffix: '](图片地址)', defaultText: '图片描述', description: '图片' },
      { label: '视频', icon: '🎬', prefix: '<video src="', suffix: '" controls></video>', defaultText: '视频地址', description: '视频' },
    ]
  },
  {
    category: '其他',
    items: [
      { label: '分割线', icon: '—', prefix: '\n---\n', suffix: '', defaultText: '', description: '水平分割线' },
      { label: '表格', icon: '📊', prefix: '\n| 列1 | 列2 | 列3 |\n| --- | --- | --- |\n| 内容 | 内容 | 内容 |\n', suffix: '', defaultText: '', description: '表格' },
      { label: '数学公式', icon: '∑', prefix: '$$\n', suffix: '\n$$', defaultText: 'E = mc^2', description: '数学公式块' },
      { label: '脚注', icon: '¹', prefix: '[^1]: ', suffix: '', defaultText: '脚注内容', description: '脚注' },
    ]
  }
];

const RichEditor: React.FC<RichEditorProps> = ({
  content,
  onChange,
  placeholder = '输入内容...',
  isMarkdown = false,
}) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [showFormatMenu, setShowFormatMenu] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });
  const [searchQuery, setSearchQuery] = useState('');
  const isInternalChange = useRef(false);

  // 同步编辑器内容
  useEffect(() => {
    if (isMarkdown) {
      if (textareaRef.current && !isInternalChange.current) {
        const plainText = htmlToPlainText(content);
        if (textareaRef.current.value !== plainText) {
          textareaRef.current.value = plainText;
        }
      }
    } else {
      if (editorRef.current && !isInternalChange.current) {
        if (editorRef.current.innerHTML !== content) {
          editorRef.current.innerHTML = content || '';
        }
      }
    }
    isInternalChange.current = false;
    if (!isMarkdown) {
      attachImageHandlers();
    }
  }, [content, isMarkdown]);

  const attachImageHandlers = useCallback(() => {
    if (!editorRef.current) return;
    const images = editorRef.current.querySelectorAll('img.inline-image');
    images.forEach(img => {
      img.removeEventListener('dblclick', handleImageDoubleClick);
      img.addEventListener('dblclick', handleImageDoubleClick);
    });
  }, []);

  const handleImageDoubleClick = useCallback((e: Event) => {
    e.preventDefault();
    e.stopPropagation();
    const img = e.target as HTMLImageElement;
    showImagePreview(img.src);
  }, []);

  const htmlToPlainText = (html: string): string => {
    if (!html) return '';
    const tmp = document.createElement('div');
    tmp.innerHTML = html;
    let text = tmp.innerHTML;
    text = text.replace(/<br\s*\/?>/gi, '\n');
    text = text.replace(/<\/p>/gi, '\n');
    text = text.replace(/<[^>]*>/g, '');
    text = text.replace(/&amp;/g, '&');
    text = text.replace(/&lt;/g, '<');
    text = text.replace(/&gt;/g, '>');
    text = text.replace(/&nbsp;/g, ' ');
    text = text.replace(/\n+$/, '');
    return text;
  };

  const handleInput = useCallback(() => {
    if (editorRef.current) {
      isInternalChange.current = true;
      onChange(editorRef.current.innerHTML);
    }
  }, [onChange]);

  const handleTextareaChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    isInternalChange.current = true;
    onChange(e.target.value);
  }, [onChange]);

  const getMarkdownValue = useCallback(() => {
    if (content && content.includes('<')) {
      return htmlToPlainText(content);
    }
    return content || '';
  }, [content]);

  // 显示格式菜单
  const handleShowFormatMenu = useCallback(() => {
    if (!textareaRef.current) return;

    const textarea = textareaRef.current;
    const rect = textarea.getBoundingClientRect();
    const cursorPos = textarea.selectionStart;
    const textBeforeCursor = textarea.value.substring(0, cursorPos);
    const lines = textBeforeCursor.split('\n');
    const currentLineIndex = lines.length - 1;

    // 计算菜单位置
    const lineHeight = 24; // 大约行高
    const top = Math.min(rect.top + (currentLineIndex * lineHeight) + 30, rect.bottom - 300);
    const left = rect.left + 20;

    setMenuPosition({ top, left });
    setShowFormatMenu(true);
    setSearchQuery('');
  }, []);

  // 插入格式
  const insertFormat = useCallback((prefix: string, suffix: string, defaultText: string) => {
    if (!textareaRef.current) return;

    const textarea = textareaRef.current;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    const selectedText = text.substring(start, end) || defaultText;

    const newText = text.substring(0, start) + prefix + selectedText + suffix + text.substring(end);
    textarea.value = newText;

    // 选中插入的文本
    const newStart = start + prefix.length;
    const newEnd = newStart + selectedText.length;
    textarea.selectionStart = newStart;
    textarea.selectionEnd = newEnd;
    textarea.focus();

    isInternalChange.current = true;
    onChange(newText);
    setShowFormatMenu(false);
  }, [onChange]);

  // 过滤格式选项
  const filteredOptions = FORMAT_OPTIONS.map(category => ({
    ...category,
    items: category.items.filter(item =>
      item.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description.toLowerCase().includes(searchQuery.toLowerCase())
    )
  })).filter(category => category.items.length > 0);

  // 处理粘贴事件
  const handlePaste = useCallback(async (e: React.ClipboardEvent) => {
    const items = e.clipboardData.items;
    const files: File[] = [];

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.kind === 'file') {
        const file = item.getAsFile();
        if (file && file.type.startsWith('image/')) {
          files.push(file);
        }
      }
    }

    if (files.length > 0) {
      e.preventDefault();
      setIsUploading(true);
      setUploadProgress(0);

      try {
        for (let i = 0; i < files.length; i++) {
          const file = files[i];
          setUploadProgress(Math.round(((i + 1) / files.length) * 100));
          const base64 = await readFileAsBase64(file);
          insertImageAtCursor(base64, file.name);
        }
      } catch (error) {
        console.error('粘贴图片失败:', error);
      } finally {
        setIsUploading(false);
        setUploadProgress(0);
      }
    }
  }, [isMarkdown]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'));
    if (files.length > 0) {
      setIsUploading(true);
      setUploadProgress(0);

      try {
        for (let i = 0; i < files.length; i++) {
          const file = files[i];
          setUploadProgress(Math.round(((i + 1) / files.length) * 100));
          const base64 = await readFileAsBase64(file);
          insertImageAtCursor(base64, file.name);
        }
      } catch (error) {
        console.error('拖拽图片失败:', error);
      } finally {
        setIsUploading(false);
        setUploadProgress(0);
      }
    }
  }, [isMarkdown]);

  const readFileAsBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const insertImageAtCursor = (base64: string, alt: string) => {
    if (isMarkdown) {
      const newValue = `${getMarkdownValue()}\n![${alt}](${base64})\n`;
      onChange(newValue);
    } else if (editorRef.current) {
      const selection = window.getSelection();
      if (!selection) return;

      const img = document.createElement('img');
      img.src = base64;
      img.alt = alt;
      img.className = 'inline-image';
      img.style.maxWidth = '100%';
      img.style.height = 'auto';
      img.style.cursor = 'pointer';
      img.style.borderRadius = '4px';
      img.style.margin = '4px 0';

      img.addEventListener('dblclick', (e) => {
        e.preventDefault();
        e.stopPropagation();
        showImagePreview(base64);
      });

      if (selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        range.deleteContents();
        range.insertNode(img);
        range.setStartAfter(img);
        range.setEndAfter(img);
        selection.removeAllRanges();
        selection.addRange(range);
      } else {
        editorRef.current.appendChild(img);
      }
      handleInput();
    }
  };

  const showImagePreview = (src: string) => {
    const modal = document.createElement('div');
    modal.className = 'image-preview-modal';
    modal.onclick = () => modal.remove();

    const img = document.createElement('img');
    img.src = src;
    img.className = 'preview-image';

    const closeBtn = document.createElement('button');
    closeBtn.className = 'btn-close-preview';
    closeBtn.textContent = '✕';
    closeBtn.onclick = (e) => {
      e.stopPropagation();
      modal.remove();
    };

    modal.appendChild(img);
    modal.appendChild(closeBtn);
    document.body.appendChild(modal);
  };

  const execFormatCommand = useCallback((command: string, value?: string) => {
    if (!editorRef.current) return;
    editorRef.current.focus();
    document.execCommand(command, false, value);
    handleInput();
  }, [handleInput]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      if (isMarkdown && textareaRef.current) {
        const start = textareaRef.current.selectionStart;
        const end = textareaRef.current.selectionEnd;
        const text = textareaRef.current.value;
        const newText = text.substring(0, start) + '    ' + text.substring(end);
        textareaRef.current.value = newText;
        textareaRef.current.selectionStart = textareaRef.current.selectionEnd = start + 4;
        isInternalChange.current = true;
        onChange(newText);
      } else {
        document.execCommand('insertText', false, '    ');
      }
    }
    if ((e.ctrlKey || e.metaKey) && e.key === 'b') { e.preventDefault(); execFormatCommand('bold'); }
    if ((e.ctrlKey || e.metaKey) && e.key === 'i') { e.preventDefault(); execFormatCommand('italic'); }
    if ((e.ctrlKey || e.metaKey) && e.key === 'u') { e.preventDefault(); execFormatCommand('underline'); }

    // 输入 "/" 时显示格式菜单
    if (isMarkdown && e.key === '/' && textareaRef.current) {
      const textarea = textareaRef.current;
      const cursorPos = textarea.selectionStart;
      const textBefore = textarea.value.substring(0, cursorPos);
      const textAfter = textarea.value.substring(cursorPos);

      // 如果在行首或前面是空格/换行，显示菜单
      if (cursorPos === 0 || textBefore.endsWith('\n') || textBefore.endsWith(' ')) {
        e.preventDefault();
        handleShowFormatMenu();
      }
    }
  }, [isMarkdown, execFormatCommand, handleShowFormatMenu, onChange]);

  return (
    <div className={`rich-editor-container ${isMarkdown ? 'markdown-mode' : ''}`}>
      {/* 上传进度 */}
      {isUploading && (
        <div className="upload-progress">
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${uploadProgress}%` }} />
          </div>
          <span className="progress-text">上传中... {uploadProgress}%</span>
        </div>
      )}

      {/* 格式菜单 */}
      {showFormatMenu && (
        <div
          className="format-menu-overlay"
          onClick={() => setShowFormatMenu(false)}
        >
          <div
            className="format-menu"
            style={{ top: menuPosition.top, left: menuPosition.left }}
            onClick={e => e.stopPropagation()}
          >
            <div className="format-menu-header">
              <input
                type="text"
                className="format-search"
                placeholder="搜索格式..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                autoFocus
              />
            </div>
            <div className="format-menu-content">
              {filteredOptions.map((category, categoryIndex) => (
                <div key={categoryIndex} className="format-category">
                  <div className="format-category-title">{category.category}</div>
                  {category.items.map((item, itemIndex) => (
                    <div
                      key={itemIndex}
                      className="format-item"
                      onClick={() => insertFormat(item.prefix, item.suffix, item.defaultText)}
                    >
                      <span className="format-item-icon">{item.icon}</span>
                      <div className="format-item-info">
                        <span className="format-item-label">{item.label}</span>
                        <span className="format-item-description">{item.description}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ))}
              {filteredOptions.length === 0 && (
                <div className="format-no-results">没有找到匹配的格式</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 内容区域 */}
      {isMarkdown ? (
        <div className="markdown-editor-wrapper">
          {/* 工具栏 */}
          <div className="markdown-toolbar">
            <button
              className="toolbar-btn add-btn"
              onClick={handleShowFormatMenu}
              title="插入格式 (输入 /)"
            >
              <span className="add-icon">+</span>
            </button>
            <div className="toolbar-divider" />
            <button className="toolbar-btn" onClick={() => insertFormat('**', '**', '粗体')} title="粗体"><strong>B</strong></button>
            <button className="toolbar-btn" onClick={() => insertFormat('*', '*', '斜体')} title="斜体"><em>I</em></button>
            <button className="toolbar-btn" onClick={() => insertFormat('~~', '~~', '删除线')} title="删除线"><s>S</s></button>
            <div className="toolbar-divider" />
            <button className="toolbar-btn" onClick={() => insertFormat('`', '`', '代码')} title="行内代码">{'</>'}</button>
            <button className="toolbar-btn" onClick={() => insertFormat('[', '](https://)', '链接')} title="链接">🔗</button>
            <button className="toolbar-btn" onClick={() => insertFormat('![', '](图片地址)', '图片')} title="图片">🖼️</button>
            <div className="toolbar-divider" />
            <button className="toolbar-btn" onClick={() => insertFormat('> ', '', '引用')} title="引用">❝</button>
            <button className="toolbar-btn" onClick={() => insertFormat('- ', '', '列表项')} title="列表">•</button>
            <button className="toolbar-btn" onClick={() => insertFormat('1. ', '', '列表项')} title="有序列表">1.</button>
            <div className="toolbar-divider" />
            <button className="toolbar-btn" onClick={() => insertFormat('\n---\n', '', '')} title="分割线">—</button>
          </div>

          {/* 分栏视图：左侧编辑，右侧预览 */}
          <div className="markdown-split-view">
            <div className="markdown-edit-pane">
              <div className="pane-header">📝 编辑</div>
              <textarea
                ref={textareaRef}
                className="markdown-textarea"
                defaultValue={content}
                onChange={handleTextareaChange}
                onKeyDown={handleKeyDown}
                placeholder="输入 Markdown 内容... 输入 / 插入格式"
                spellCheck={false}
              />
            </div>
            <div className="markdown-preview-pane">
              <div className="pane-header">👁️ 预览</div>
              <div className="preview-content">
                <ReactMarkdown>{getMarkdownValue()}</ReactMarkdown>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* 普通模式工具栏 */}
          <div className="format-toolbar">
            <div className="toolbar-group">
              <button className="format-btn" onClick={() => execFormatCommand('bold')} title="粗体"><strong>B</strong></button>
              <button className="format-btn" onClick={() => execFormatCommand('italic')} title="斜体"><em>I</em></button>
              <button className="format-btn" onClick={() => execFormatCommand('underline')} title="下划线"><u>U</u></button>
              <button className="format-btn" onClick={() => execFormatCommand('strikeThrough')} title="删除线"><s>S</s></button>
            </div>
            <div className="toolbar-divider" />
            <div className="toolbar-group">
              <button className="format-btn" onClick={() => document.execCommand('formatBlock', false, '<h2>')} title="标题">H</button>
              <button className="format-btn" onClick={() => document.execCommand('formatBlock', false, '<h3>')} title="小标题">h</button>
            </div>
            <div className="toolbar-divider" />
            <div className="toolbar-group">
              <button className="format-btn" onClick={() => document.execCommand('insertUnorderedList')} title="列表">•</button>
              <button className="format-btn" onClick={() => document.execCommand('insertOrderedList')} title="有序列表">1.</button>
              <button className="format-btn" onClick={() => document.execCommand('formatBlock', false, '<blockquote>')} title="引用">❝</button>
            </div>
          </div>

          <div
            ref={editorRef}
            className="rich-editor"
            contentEditable
            onInput={handleInput}
            onPaste={handlePaste}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onKeyDown={handleKeyDown}
            data-placeholder={placeholder}
            suppressContentEditableWarning
          />
        </>
      )}
    </div>
  );
};

export default RichEditor;
