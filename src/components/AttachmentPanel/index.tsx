import React, { useRef, useState } from 'react';
import { Attachment, AttachmentType } from '../../types/note';
import { useNoteStore } from '../../stores/noteStore';
import './styles.css';

interface AttachmentPanelProps {
  noteId: string;
  attachments: Attachment[];
}

const AttachmentPanel: React.FC<AttachmentPanelProps> = ({ noteId, attachments }) => {
  const { uploadAttachment, deleteAttachment, getAttachmentData } = useNoteStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  // 获取附件图标
  const getAttachmentIcon = (type: AttachmentType): string => {
    switch (type) {
      case 'Image':
        return '🖼️';
      case 'Document':
        return '📄';
      case 'Audio':
        return '🎵';
      case 'Video':
        return '🎬';
      default:
        return '📎';
    }
  };

  // 格式化文件大小
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // 处理文件选择
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);

    try {
      for (let i = 0; i < files.length; i++) {
        await uploadAttachment(noteId, files[i]);
      }
    } catch (error) {
      console.error('上传失败:', error);
      alert('上传失败，请重试');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // 处理删除附件
  const handleDelete = async (id: string, name: string) => {
    if (window.confirm(`确定要删除附件 "${name}" 吗？`)) {
      try {
        await deleteAttachment(id);
      } catch (error) {
        console.error('删除失败:', error);
      }
    }
  };

  // 处理预览图片
  const handlePreviewImage = async (attachment: Attachment) => {
    if (attachment.file_type === 'Image') {
      try {
        const base64 = await getAttachmentData(attachment.id);
        setPreviewImage(`data:${attachment.mime_type};base64,${base64}`);
      } catch (error) {
        console.error('获取图片失败:', error);
      }
    }
  };

  // 处理下载附件
  const handleDownload = async (attachment: Attachment) => {
    try {
      const base64 = await getAttachmentData(attachment.id);
      const link = document.createElement('a');
      link.href = `data:${attachment.mime_type};base64,${base64}`;
      link.download = attachment.name;
      link.click();
    } catch (error) {
      console.error('下载失败:', error);
    }
  };

  return (
    <div className="attachment-panel">
      {/* 标题栏 */}
      <div className="attachment-header">
        <span className="attachment-title">
          📎 附件 ({attachments.length})
        </span>
        <button
          className="btn-upload"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
        >
          {isUploading ? '上传中...' : '+ 添加'}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          onChange={handleFileSelect}
          style={{ display: 'none' }}
          accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.txt,.md"
        />
      </div>

      {/* 附件列表 */}
      {attachments.length > 0 ? (
        <div className="attachment-list">
          {attachments.map(attachment => (
            <div key={attachment.id} className="attachment-item">
              {/* 图片预览 */}
              {attachment.file_type === 'Image' && (
                <div
                  className="attachment-preview"
                  onClick={() => handlePreviewImage(attachment)}
                >
                  <span className="preview-icon">🖼️</span>
                </div>
              )}

              {/* 附件信息 */}
              <div className="attachment-info">
                <span className="attachment-icon">
                  {getAttachmentIcon(attachment.file_type)}
                </span>
                <div className="attachment-details">
                  <span className="attachment-name" title={attachment.name}>
                    {attachment.name}
                  </span>
                  <span className="attachment-size">
                    {formatFileSize(attachment.size)}
                  </span>
                </div>
              </div>

              {/* 操作按钮 */}
              <div className="attachment-actions">
                <button
                  className="btn-action"
                  onClick={() => handleDownload(attachment)}
                  title="下载"
                >
                  ⬇️
                </button>
                <button
                  className="btn-action delete"
                  onClick={() => handleDelete(attachment.id, attachment.name)}
                  title="删除"
                >
                  🗑️
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="attachment-empty">
          <p>暂无附件</p>
          <p className="hint">点击"添加"按钮上传文件</p>
        </div>
      )}

      {/* 图片预览模态框 */}
      {previewImage && (
        <div className="image-preview-modal" onClick={() => setPreviewImage(null)}>
          <div className="image-preview-content" onClick={e => e.stopPropagation()}>
            <img src={previewImage} alt="预览" />
            <button className="btn-close" onClick={() => setPreviewImage(null)}>
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AttachmentPanel;
