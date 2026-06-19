import { create } from 'zustand';
import { invoke } from '@tauri-apps/api/core';
import { Note, AppSettings, Stats, Attachment } from '../types/note';

interface NoteStore {
  // 状态
  notes: Note[];
  selectedNote: Note | null;
  settings: AppSettings;
  stats: Stats;
  tags: string[];
  searchQuery: string;
  selectedTag: string | null;
  isLoading: boolean;
  viewMode: 'grid' | 'list';
  dataDir: string;
  defaultDataDir: string;

  // 操作
  loadNotes: () => Promise<void>;
  createNote: (x?: number, y?: number) => Promise<Note>;
  updateNote: (note: Note) => Promise<void>;
  deleteNote: (id: string) => Promise<void>;
  deleteNotes: (ids: string[]) => Promise<void>;
  togglePin: (id: string) => Promise<void>;
  searchNotes: (query: string) => Promise<void>;
  filterByTag: (tag: string | null) => Promise<void>;
  loadTags: () => Promise<void>;
  loadSettings: () => Promise<void>;
  updateSettings: (settings: AppSettings) => Promise<void>;
  loadStats: () => Promise<void>;
  exportNotes: () => Promise<string>;
  importNotes: (json: string) => Promise<number>;
  setSelectedNote: (note: Note | null) => void;
  setSearchQuery: (query: string) => void;
  setViewMode: (mode: 'grid' | 'list') => void;
  loadDataDir: () => Promise<void>;
  loadDefaultDataDir: () => Promise<void>;
  validateDataPath: (path: string) => Promise<boolean>;
  uploadAttachment: (noteId: string, file: File) => Promise<Attachment>;
  deleteAttachment: (id: string) => Promise<void>;
  getAttachmentData: (id: string) => Promise<string>;
}

export const useNoteStore = create<NoteStore>((set, get) => ({
  notes: [],
  selectedNote: null,
  settings: {
    default_color: 'Yellow',
    default_width: 300,
    default_height: 300,
    always_on_top: false,
    show_in_taskbar: true,
    auto_save: true,
    font_size: 14,
    font_family: 'Microsoft YaHei',
    data_path: '',
  },
  stats: { total: 0, pinned: 0, tags: 0 },
  tags: [],
  searchQuery: '',
  selectedTag: null,
  isLoading: false,
  viewMode: 'grid',
  dataDir: '',
  defaultDataDir: '',

  // 加载所有便签
  loadNotes: async () => {
    try {
      set({ isLoading: true });
      const notes = await invoke<Note[]>('get_all_notes');
      // 确保每个便签都有 attachments 数组
      const notesWithAttachments = notes.map(n => ({
        ...n,
        attachments: n.attachments || [],
      }));
      set({ notes: notesWithAttachments, isLoading: false });
    } catch (error) {
      console.error('加载便签失败:', error);
      set({ isLoading: false });
    }
  },

  // 创建新便签
  createNote: async (x?: number, y?: number) => {
    try {
      const note = await invoke<Note>('create_note', { x, y });
      set(state => {
        // 按照排序规则插入到正确位置：置顶在前，然后按更新时间倒序
        const newNotes = [...state.notes, note].sort((a, b) => {
          // 先按置顶排序（置顶的在前面）
          if (a.is_pinned !== b.is_pinned) {
            return a.is_pinned ? -1 : 1;
          }
          // 再按更新时间倒序（最新的在前面）
          return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
        });
        return { notes: newNotes };
      });
      get().loadStats();
      return note;
    } catch (error) {
      console.error('创建便签失败:', error);
      throw error;
    }
  },

  // 更新便签
  updateNote: async (note: Note) => {
    try {
      const updated = await invoke<Note>('update_note', { note });
      set(state => ({
        notes: state.notes.map(n => n.id === updated.id ? updated : n),
        selectedNote: state.selectedNote?.id === updated.id ? updated : state.selectedNote,
      }));
    } catch (error) {
      console.error('更新便签失败:', error);
    }
  },

  // 删除便签
  deleteNote: async (id: string) => {
    try {
      await invoke('delete_note', { id });
      set(state => ({
        notes: state.notes.filter(n => n.id !== id),
        selectedNote: state.selectedNote?.id === id ? null : state.selectedNote,
      }));
      get().loadStats();
    } catch (error) {
      console.error('删除便签失败:', error);
    }
  },

  // 批量删除
  deleteNotes: async (ids: string[]) => {
    try {
      await invoke('delete_notes', { ids });
      set(state => ({
        notes: state.notes.filter(n => !ids.includes(n.id)),
        selectedNote: state.selectedNote && ids.includes(state.selectedNote.id) ? null : state.selectedNote,
      }));
      get().loadStats();
    } catch (error) {
      console.error('批量删除失败:', error);
    }
  },

  // 切换置顶
  togglePin: async (id: string) => {
    try {
      const updated = await invoke<Note>('toggle_pin', { id });
      set(state => {
        // 更新便签并重新排序
        const newNotes = state.notes.map(n => n.id === updated.id ? updated : n).sort((a, b) => {
          // 先按置顶排序（置顶的在前面）
          if (a.is_pinned !== b.is_pinned) {
            return a.is_pinned ? -1 : 1;
          }
          // 再按更新时间倒序（最新的在前面）
          return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
        });
        return { notes: newNotes };
      });
    } catch (error) {
      console.error('切换置顶失败:', error);
    }
  },

  // 搜索便签
  searchNotes: async (query: string) => {
    try {
      set({ searchQuery: query });
      if (!query.trim()) {
        get().loadNotes();
        return;
      }
      const notes = await invoke<Note[]>('search_notes', { query });
      set({ notes });
    } catch (error) {
      console.error('搜索失败:', error);
    }
  },

  // 按标签筛选
  filterByTag: async (tag: string | null) => {
    try {
      set({ selectedTag: tag });
      if (!tag) {
        get().loadNotes();
        return;
      }
      const notes = await invoke<Note[]>('get_notes_by_tag', { tag });
      set({ notes });
    } catch (error) {
      console.error('筛选失败:', error);
    }
  },

  // 加载标签
  loadTags: async () => {
    try {
      const tags = await invoke<string[]>('get_all_tags');
      set({ tags });
    } catch (error) {
      console.error('加载标签失败:', error);
    }
  },

  // 加载设置
  loadSettings: async () => {
    try {
      const settings = await invoke<AppSettings>('get_settings');
      set({ settings });
    } catch (error) {
      console.error('加载设置失败:', error);
    }
  },

  // 更新设置
  updateSettings: async (settings: AppSettings) => {
    try {
      const updated = await invoke<AppSettings>('update_settings', { settings });
      set({ settings: updated });
    } catch (error) {
      console.error('更新设置失败:', error);
    }
  },

  // 加载统计
  loadStats: async () => {
    try {
      const stats = await invoke<Stats>('get_stats');
      set({ stats });
    } catch (error) {
      console.error('加载统计失败:', error);
    }
  },

  // 导出便签
  exportNotes: async () => {
    try {
      return await invoke<string>('export_notes');
    } catch (error) {
      console.error('导出失败:', error);
      throw error;
    }
  },

  // 导入便签
  importNotes: async (json: string) => {
    try {
      const count = await invoke<number>('import_notes', { json });
      get().loadNotes();
      get().loadTags();
      get().loadStats();
      return count;
    } catch (error) {
      console.error('导入失败:', error);
      throw error;
    }
  },

  setSelectedNote: (note) => set({ selectedNote: note }),
  setSearchQuery: (query) => set({ searchQuery: query }),
  setViewMode: (mode) => set({ viewMode: mode }),

  // 加载数据目录
  loadDataDir: async () => {
    try {
      const dataDir = await invoke<string>('get_data_dir');
      set({ dataDir });
    } catch (error) {
      console.error('加载数据目录失败:', error);
    }
  },

  // 加载默认数据目录
  loadDefaultDataDir: async () => {
    try {
      const defaultDataDir = await invoke<string>('get_default_data_dir');
      set({ defaultDataDir });
    } catch (error) {
      console.error('加载默认数据目录失败:', error);
    }
  },

  // 验证数据路径
  validateDataPath: async (path: string) => {
    try {
      return await invoke<boolean>('validate_data_path', { path });
    } catch (error) {
      console.error('验证数据路径失败:', error);
      return false;
    }
  },

  // 上传附件
  uploadAttachment: async (noteId: string, file: File) => {
    try {
      // 读取文件内容
      const arrayBuffer = await file.arrayBuffer();
      const data = Array.from(new Uint8Array(arrayBuffer));

      const attachment = await invoke<Attachment>('upload_attachment', {
        noteId,
        name: file.name,
        data,
        mimeType: file.type || 'application/octet-stream',
      });

      // 更新当前便签的附件列表
      set(state => {
        if (state.selectedNote && state.selectedNote.id === noteId) {
          const currentAttachments = state.selectedNote.attachments || [];
          return {
            selectedNote: {
              ...state.selectedNote,
              attachments: [attachment, ...currentAttachments],
            },
          };
        }
        return {};
      });

      // 更新便签列表
      set(state => ({
        notes: state.notes.map(n => {
          if (n.id === noteId) {
            const currentAttachments = n.attachments || [];
            return { ...n, attachments: [attachment, ...currentAttachments] };
          }
          return n;
        }),
      }));

      return attachment;
    } catch (error) {
      console.error('上传附件失败:', error);
      throw error;
    }
  },

  // 删除附件
  deleteAttachment: async (id: string) => {
    try {
      await invoke('delete_attachment', { id });

      // 更新当前便签的附件列表
      set(state => {
        if (state.selectedNote) {
          const currentAttachments = state.selectedNote.attachments || [];
          return {
            selectedNote: {
              ...state.selectedNote,
              attachments: currentAttachments.filter(a => a.id !== id),
            },
          };
        }
        return {};
      });

      // 更新便签列表
      set(state => ({
        notes: state.notes.map(n => ({
          ...n,
          attachments: (n.attachments || []).filter(a => a.id !== id),
        })),
      }));
    } catch (error) {
      console.error('删除附件失败:', error);
      throw error;
    }
  },

  // 获取附件数据
  getAttachmentData: async (id: string) => {
    try {
      const data = await invoke<number[]>('get_attachment_data', { id });
      // 转换为 base64
      const bytes = new Uint8Array(data);
      let binary = '';
      for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      return btoa(binary);
    } catch (error) {
      console.error('获取附件数据失败:', error);
      throw error;
    }
  },
}));
