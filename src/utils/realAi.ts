import { ColorTone, StyleType, FunctionType, ImageTag, NoteTag, InsightData, GraphNode, GraphEdge } from '../types';
import { mockAiAnalyzeImage as fallbackMockAiAnalyzeImage, mockAiExtractNoteTags, mockAiGenerateInsights } from './mockAi';

export { mockAiExtractNoteTags, mockAiGenerateInsights };

/**
 * 真实的大模型视觉和 OCR 处理接口 (Real AI Vision & OCR)
 * 会读取环境变量中的配置。如果没有配置，自动降级到 mock 数据。
 */
export const analyzeImage = async (filename: string, width?: number, height?: number, dataUrl?: string): Promise<{
  color_tone: string;
  extracted_colors: string[];
  style: string;
  function_type: string;
  ocr_text: string;
  semantic_description: string;
  aspect_ratio: '横图' | '竖图' | '方图';
  tags: Omit<ImageTag, 'id' | 'image_id'>[];
}> => {
  const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
  const baseUrl = import.meta.env.VITE_OPENAI_BASE_URL || 'https://api.openai.com/v1';
  const modelName = import.meta.env.VITE_OPENAI_MODEL || 'gpt-4o';

  // 如果没有配置真实的 API KEY，则退回到原本的 Mock 体验
  if (!apiKey || !dataUrl) {
    console.log('未配置大模型 API Key 或未传入图片 base64，退回到本地模拟分析');
    return fallbackMockAiAnalyzeImage(filename, width, height, dataUrl);
  }

  try {
    const prompt = `
    你是一个专业的视觉设计分析和图像理解专家大模型。
    请仔细观察这张图片，并以严格的 JSON 格式返回分析结果。

    JSON 必须包含以下字段：
    1. ocr_text (string): 提取图片中所有可见的文字。如果没有文字请返回空字符串 ""。
    2. semantic_description (string): 提供一段非常详细的画面视觉和语义描述（例如：“一个穿着赛博朋克风格发光夹克的女孩站在下雨的霓虹灯街道上，充满科技感”）。这段描述将作为用户的底层隐形搜索词。
    3. color_tone (string): 只能从以下选项中选一个: "红", "橙", "黄", "绿", "蓝", "紫", "黑白"。
    4. extracted_colors (array): 提取画面中5个最核心的主题颜色的 HEX 十六进制代码，返回一个字符串数组（例如 ["#FF0000", "#00FF00", "#0000FF", "#FFFF00", "#00FFFF"]）。
    5. style (string): 只能从以下选项中选一个或最接近的: "极简主义", "玻璃拟态", "扁平化", "拟物化", "赛博朋克", "复古"。如果都不符合，选一个最接近的。
    6. function_type (string): 只能从以下选项中选一个: "网页设计", "登录页", "横幅", "图标", "插画", "界面组件", "配色方案", "背景图", "摄影图"。注意：如果图片只是纯粹的颜色渐变、模糊背景或没有实质内容的底图，必须选"背景图"或"配色方案"！绝对不能选"网页设计"！
    7. tags (array): 一个数组，每个元素包含 tag_type (只能是 "device" 或 "context") 和 tag_value (具体的标签名，如"科技", "极简", "渐变", "UI")，以及 confidence (0-1的小数)。

    不要返回任何 markdown 标记（如 \`\`\`json ），直接返回纯 JSON 字符串！
    `;

    // 调用兼容 OpenAI 格式的 Vision 接口
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: modelName,
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: prompt },
              {
                type: 'image_url',
                image_url: {
                  url: dataUrl,
                },
              },
            ],
          },
        ],
        max_tokens: 800,
        temperature: 0.1,
      }),
    });

    if (!response.ok) {
      throw new Error(`API 请求失败: ${response.statusText}`);
    }

    const result = await response.json();
    let content = result.choices[0].message.content.trim();
    
    // 清理可能带有 markdown 的返回结果
    if (content.startsWith('```json')) {
      content = content.replace(/^```json/, '').replace(/```$/, '').trim();
    } else if (content.startsWith('```')) {
      content = content.replace(/^```/, '').replace(/```$/, '').trim();
    }

    const aiData = JSON.parse(content);

    // 计算长宽比
    let aspect_ratio: '横图' | '竖图' | '方图' = '方图';
    if (width && height) {
      const ratio = width / height;
      if (ratio > 1.1) aspect_ratio = '横图';
      else if (ratio < 0.9) aspect_ratio = '竖图';
    }

    // 将 AI 结果整合成我们应用需要的格式
    return {
      color_tone: aiData.color_tone || '黑白',
      extracted_colors: Array.isArray(aiData.extracted_colors) && aiData.extracted_colors.length > 0 
                        ? aiData.extracted_colors 
                        : ['#FFFFFF', '#CCCCCC', '#999999', '#666666', '#000000'],
      style: aiData.style || '极简主义',
      function_type: aiData.function_type || '插画',
      ocr_text: aiData.ocr_text || '',
      semantic_description: aiData.semantic_description || '一张图片',
      aspect_ratio,
      tags: [
        { tag_type: 'color', tag_value: aiData.color_tone, confidence: 0.9 },
        { tag_type: 'style', tag_value: aiData.style, confidence: 0.9 },
        { tag_type: 'function', tag_value: aiData.function_type, confidence: 0.9 },
        ...(aiData.tags || []),
      ],
    };

  } catch (error) {
    console.error('大模型调用失败，退回到本地模拟分析', error);
    return fallbackMockAiAnalyzeImage(filename, width, height, dataUrl);
  }
};

/**
 * Extract Figma/CSS parameters from a specific cropped area of an image.
 */
export const extractFigmaParams = async (dataUrl: string): Promise<string> => {
  const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
  const baseUrl = import.meta.env.VITE_OPENAI_BASE_URL || 'https://api.openai.com/v1';
  const modelName = import.meta.env.VITE_OPENAI_MODEL || 'gpt-4o';

  if (!apiKey || !dataUrl) {
    // Mock return if no AI
    return `/* 提取失败，请检查模型 API 密钥配置 */\nbackground: linear-gradient(180deg, #fbf4ffe5 0%, #fcedffe5 100%);\nborder-radius: 12px;`;
  }

  try {
    const prompt = `
    你是一个专业的前端工程师和UI设计师。
    请仔细观察这张图片中包含的UI元素（这可能是一个被框选出来的局部截图）。
    请尝试还原这个元素的 CSS 样式代码（如 background, border-radius, box-shadow, backdrop-filter, color, font-size 等等）。
    
    要求：
    1. 只返回 CSS 属性的键值对，不需要返回选择器或包裹的大括号。
    2. 每行一个属性，以分号结尾。
    3. 尽量猜测渐变色、阴影和圆角的精确值。
    4. 不要使用 markdown 代码块，直接返回纯文本。
    `;

    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: modelName,
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: prompt },
              {
                type: 'image_url',
                image_url: {
                  url: dataUrl,
                },
              },
            ],
          },
        ],
        max_tokens: 500,
        temperature: 0.1,
      }),
    });

    if (!response.ok) {
      throw new Error('API Request Failed');
    }

    const result = await response.json();
    let content = result.choices[0].message.content.trim();
    if (content.startsWith('```css')) {
      content = content.replace(/^```css/, '').replace(/```$/, '').trim();
    } else if (content.startsWith('```')) {
      content = content.replace(/^```/, '').replace(/```$/, '').trim();
    }
    return content;
  } catch (error) {
    console.error('Figma param extraction failed:', error);
    return `/* 提取失败，请检查网络或稍后重试 */\nbackground: linear-gradient(180deg, #fbf4ffe5 0%, #fcedffe5 100%);\nborder-radius: 12px;`;
  }
};
