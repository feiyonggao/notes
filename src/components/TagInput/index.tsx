import React, { useState, useRef, KeyboardEvent } from 'react';
import './styles.css';

interface TagInputProps {
  tags: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
}

const TagInput: React.FC<TagInputProps> = ({
  tags,
  onChange,
  placeholder = '添加标签...',
}) => {
  const [inputValue, setInputValue] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // 添加标签
  const addTag = (tag: string) => {
    const trimmedTag = tag.trim();
    if (trimmedTag && !tags.includes(trimmedTag)) {
      onChange([...tags, trimmedTag]);
    }
    setInputValue('');
  };

  // 删除标签
  const removeTag = (indexToRemove: number) => {
    onChange(tags.filter((_, index) => index !== indexToRemove));
  };

  // 处理键盘事件
  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    // 回车添加标签
    if (e.key === 'Enter') {
      e.preventDefault();
      addTag(inputValue);
    }
    // 退格删除最后一个标签
    if (e.key === 'Backspace' && !inputValue && tags.length > 0) {
      removeTag(tags.length - 1);
    }
    // 逗号添加标签
    if (e.key === ',') {
      e.preventDefault();
      addTag(inputValue);
    }
    // Escape 取消编辑
    if (e.key === 'Escape') {
      setIsEditing(false);
      setInputValue('');
    }
  };

  // 处理输入变化
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
  };

  // 处理失去焦点
  const handleBlur = () => {
    if (inputValue.trim()) {
      addTag(inputValue);
    }
    setIsEditing(false);
  };

  // 处理点击容器
  const handleContainerClick = () => {
    setIsEditing(true);
    inputRef.current?.focus();
  };

  return (
    <div className="tag-input-container" onClick={handleContainerClick}>
      {/* 标签图标 */}
      <span className="tag-input-icon">🏷️</span>

      {/* 标签列表 */}
      <div className="tag-list">
        {tags.map((tag, index) => (
          <span key={index} className="tag-item">
            <span className="tag-text">{tag}</span>
            <button
              className="tag-remove"
              onClick={(e) => {
                e.stopPropagation();
                removeTag(index);
              }}
              title="移除标签"
            >
              ✕
            </button>
          </span>
        ))}

        {/* 输入框 */}
        {isEditing ? (
          <input
            ref={inputRef}
            type="text"
            className="tag-input"
            value={inputValue}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onBlur={handleBlur}
            placeholder={tags.length === 0 ? placeholder : ''}
            autoFocus
          />
        ) : (
          tags.length === 0 && (
            <span className="tag-placeholder">{placeholder}</span>
          )
        )}
      </div>

      {/* 提示 */}
      {isEditing && (
        <div className="tag-hint">
          按回车或逗号添加
        </div>
      )}
    </div>
  );
};

export default TagInput;
