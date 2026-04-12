import { create } from 'zustand';
import { ImageItem } from '../types';
import { storage } from '../utils/storage';
import { useAuthStore } from './useAuthStore';

interface ImageState {
  images: ImageItem[];
  isLoading: boolean;
  loadImages: () => Promise<void>;
  addImage: (image: ImageItem) => Promise<void>;
  updateImage: (id: string, updates: Partial<ImageItem>) => Promise<void>;
  deleteImage: (id: string) => Promise<void>;
}

// 游客模式下的模拟数据
const mockImages: ImageItem[] = [
  {
    id: 'mock_img_1',
    user_id: 'guest',
    filename: '示例：赛博朋克女孩',
    storage_path: 'https://images.unsplash.com/photo-1605806616949-1e87b487cb2a?q=80&w=2940&auto=format&fit=crop',
    created_at: new Date().toISOString(),
    color_tone: '紫',
    style: '赛博朋克',
    function_type: '插画',
    aspect_ratio: '横图',
    semantic_description: '一个穿着赛博朋克风格发光夹克的女孩站在下雨的霓虹灯街道上，充满科技感',
    tags: [
      { id: 'tag_m1_1', image_id: 'mock_img_1', tag_type: 'style', tag_value: '赛博朋克', confidence: 0.9 },
      { id: 'tag_m1_2', image_id: 'mock_img_1', tag_type: 'color', tag_value: '紫', confidence: 0.9 },
    ],
    custom_tags: ['演示', '未来感']
  },
  {
    id: 'mock_img_2',
    user_id: 'guest',
    filename: '示例：极简后台UI',
    storage_path: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?q=80&w=2940&auto=format&fit=crop',
    created_at: new Date(Date.now() - 100000).toISOString(),
    color_tone: '蓝',
    style: '极简主义',
    function_type: '界面组件',
    aspect_ratio: '横图',
    semantic_description: '极简风数据展示后台界面，包含图表和数据看板，整体背景深色，适合企业级系统',
    tags: [
      { id: 'tag_m2_1', image_id: 'mock_img_2', tag_type: 'style', tag_value: '极简主义', confidence: 0.9 },
      { id: 'tag_m2_2', image_id: 'mock_img_2', tag_type: 'function', tag_value: '界面组件', confidence: 0.8 },
    ],
    custom_tags: ['演示', 'UI']
  },
  {
    id: 'mock_img_3',
    user_id: 'guest',
    filename: '示例：玻璃拟态图标',
    storage_path: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=2864&auto=format&fit=crop',
    created_at: new Date(Date.now() - 200000).toISOString(),
    color_tone: '绿',
    style: '玻璃拟态',
    function_type: '图标',
    aspect_ratio: '方图',
    semantic_description: '玻璃拟态风格的UI组件，带有磨砂半透明质感，悬浮在绿色渐变背景之上',
    tags: [
      { id: 'tag_m3_1', image_id: 'mock_img_3', tag_type: 'style', tag_value: '玻璃拟态', confidence: 0.95 },
    ],
    custom_tags: ['演示', '趋势']
  }
];

export const useImageStore = create<ImageState>((set) => ({
  images: [],
  isLoading: true,
  
  loadImages: async () => {
    const user = useAuthStore.getState().user;
    if (!user) {
      set({ images: mockImages, isLoading: false });
      return;
    }
    
    set({ isLoading: true });
    const images = await storage.getImagesByUser(user.id);
    set({ images, isLoading: false });
  },
  
  addImage: async (image: ImageItem) => {
    const user = useAuthStore.getState().user;
    if (!user) {
      alert('游客模式仅供体验，请先登录/注册后保存您的灵感。');
      return;
    }
    
    const imageWithUser = { ...image, user_id: user.id };
    await storage.addImage(imageWithUser);
    set((state) => ({ images: [imageWithUser, ...state.images] }));
  },
  
  updateImage: async (id: string, updates: Partial<ImageItem>) => {
    const user = useAuthStore.getState().user;
    if (!user) {
      alert('游客模式不可修改演示数据。');
      return;
    }
    await storage.updateImage(id, updates);
    set((state) => ({
      images: state.images.map((img) => 
        img.id === id ? { ...img, ...updates } : img
      )
    }));
  },
  
  deleteImage: async (id: string) => {
    const user = useAuthStore.getState().user;
    if (!user) {
      alert('游客模式不可删除演示数据。');
      return;
    }
    await storage.deleteImage(id);
    set((state) => ({
      images: state.images.filter((img) => img.id !== id)
    }));
  }
}));
