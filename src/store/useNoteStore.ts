import { create } from 'zustand';
import { NoteItem } from '../types';
import { storage } from '../utils/storage';
import { useAuthStore } from './useAuthStore';

interface NoteState {
  notes: NoteItem[];
  isLoading: boolean;
  loadNotes: () => Promise<void>;
  addNote: (note: NoteItem) => Promise<void>;
  updateNote: (id: string, updates: Partial<NoteItem>) => Promise<void>;
  deleteNote: (id: string) => Promise<void>;
}

// 游客模式下的模拟便签数据
const mockNotes: NoteItem[] = [
  {
    id: 'mock_note_1',
    user_id: 'guest',
    title: 'UI 设计灵感记录',
    content: '今天看到了一个非常棒的医疗后台设计，整体色调使用了低饱和度的莫兰迪色系，配合大圆角卡片和玻璃拟态效果，让原本枯燥的数据显得非常有亲和力。特别是他们对数据空状态的处理，加了很有趣的插画，值得学习。',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    is_pinned: true,
    tags: [
      { id: 't1', note_id: 'mock_note_1', tag_name: 'UI设计', relevance: 0.9 },
      { id: 't2', note_id: 'mock_note_1', tag_name: '色彩', relevance: 0.85 },
      { id: 't3', note_id: 'mock_note_1', tag_name: '灵感', relevance: 0.95 },
    ]
  },
  {
    id: 'mock_note_2',
    user_id: 'guest',
    title: '关于大模型产品交互的思考',
    content: '现在的 AI 产品交互太同质化了，全都是对话框形式。我们在设计新产品时，能不能把 AI 能力做成“隐形”的？比如用户在拖拽图片时，后台静默完成视觉特征提取，直接参与到检索逻辑里，而不是让用户一直感知到“我在和AI对话”。',
    created_at: new Date(Date.now() - 86400000).toISOString(),
    updated_at: new Date(Date.now() - 86400000).toISOString(),
    tags: [
      { id: 't4', note_id: 'mock_note_2', tag_name: '交互逻辑', relevance: 0.95 },
      { id: 't5', note_id: 'mock_note_2', tag_name: 'AI', relevance: 0.9 },
      { id: 't6', note_id: 'mock_note_2', tag_name: '产品需求', relevance: 0.8 },
    ]
  },
  {
    id: 'mock_note_3',
    user_id: 'guest',
    title: '待办：重构登录注册页',
    content: '需要把原先的弹窗登录改成一个独立的满屏页面，背景加一些氛围光和模糊毛玻璃效果。另外要支持 Supabase 的邮箱密码注册逻辑，记得加上 loading 状态。',
    created_at: new Date(Date.now() - 172800000).toISOString(),
    updated_at: new Date(Date.now() - 172800000).toISOString(),
    tags: [
      { id: 't7', note_id: 'mock_note_3', tag_name: 'UI设计', relevance: 0.8 },
      { id: 't8', note_id: 'mock_note_3', tag_name: '排版', relevance: 0.7 },
    ]
  }
];

export const useNoteStore = create<NoteState>((set) => ({
  notes: [],
  isLoading: true,
  
  loadNotes: async () => {
    const user = useAuthStore.getState().user;
    if (!user) {
      set({ notes: mockNotes, isLoading: false });
      return;
    }

    set({ isLoading: true });
    const notes = await storage.getNotesByUser(user.id);
    set({ notes, isLoading: false });
  },
  
  addNote: async (note: NoteItem) => {
    const user = useAuthStore.getState().user;
    if (!user) {
      alert('游客模式仅供体验，请先登录/注册后保存您的便签。');
      return;
    }
    
    const noteWithUser = { ...note, user_id: user.id };
    await storage.addNote(noteWithUser);
    set((state) => ({ notes: [noteWithUser, ...state.notes] }));
  },
  
  updateNote: async (id: string, updates: Partial<NoteItem>) => {
    const user = useAuthStore.getState().user;
    if (!user) {
      alert('游客模式不可修改演示数据。');
      return;
    }
    await storage.updateNote(id, updates);
    set((state) => ({
      notes: state.notes.map((n) => 
        n.id === id ? { ...n, ...updates, updated_at: new Date().toISOString() } : n
      )
    }));
  },
  
  deleteNote: async (id: string) => {
    const user = useAuthStore.getState().user;
    if (!user) {
      alert('游客模式不可删除演示数据。');
      return;
    }
    await storage.deleteNote(id);
    set((state) => ({
      notes: state.notes.filter((n) => n.id !== id)
    }));
  }
}));
