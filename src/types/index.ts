export type ThemePreference = 'light' | 'dark' | 'system';

export interface User {
  id: string;
  email: string;
  name: string;
  avatar_url: string;
  theme_preference: ThemePreference;
  created_at: string;
}

export type ColorTone = '红' | '橙' | '黄' | '绿' | '蓝' | '紫' | '黑白';
export type StyleType = '极简主义' | '玻璃拟态' | '扁平化' | '拟物化' | '赛博朋克' | '复古';
export type FunctionType = '登录页' | '横幅' | '图标' | '插画' | '界面组件' | '配色方案';

export interface ImageTag {
  id: string;
  image_id: string;
  tag_type: 'color' | 'style' | 'function';
  tag_value: string;
  confidence: number;
}

export interface ImageItem {
  id: string;
  user_id: string;
  filename: string;
  storage_path: string; // Used as data URL or base64 in local storage
  color_tone?: ColorTone;
  extracted_colors?: string[]; // HEX colors
  style?: StyleType;
  function_type?: FunctionType;
  width?: number;
  height?: number;
  aspect_ratio?: '横图' | '竖图' | '方图';
  file_size?: number;
  created_at: string;
  tags?: ImageTag[];
  custom_tags?: string[];
  ocr_text?: string;
  semantic_description?: string; // 隐形语义描述 (Vibe)
}

export interface NoteTag {
  id: string;
  note_id: string;
  tag_name: string;
  relevance: number;
}

export interface NoteItem {
  id: string;
  user_id: string;
  title: string;
  content: string;
  created_at: string;
  updated_at: string;
  tags?: NoteTag[];
  is_pinned?: boolean;
}

export interface GraphNode {
  id: string;
  label: string;
  type: 'note' | 'tag';
}

export interface GraphEdge {
  source: string;
  target: string;
  weight: number;
}

export interface InsightOpportunity {
  title: string;
  content: string;
  related_notes: string[];
}

export interface InsightData {
  nodes: GraphNode[];
  edges: GraphEdge[];
  insights: string[]; // Legacy, kept for backward compatibility if needed
  overall_insight: string;
  opportunities: InsightOpportunity[];
  stats: {
    themes: number;
    notes: number;
    relations: number;
  };
}
