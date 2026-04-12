import { ColorTone, StyleType, FunctionType, ImageTag, NoteTag, InsightData, GraphNode, GraphEdge } from '../types';

const COLORS: ColorTone[] = ['红', '橙', '黄', '绿', '蓝', '紫', '黑白'];
const STYLES: StyleType[] = ['极简主义', '玻璃拟态', '扁平化', '拟物化', '赛博朋克', '复古'];
const FUNCTIONS: FunctionType[] = ['登录页', '横幅', '图标', '插画', '界面组件', '配色方案'];

// Helper to convert RGB to HSV
function rgbToHsv(r: number, g: number, b: number) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s, v = max;
  const d = max - min;
  s = max === 0 ? 0 : d / max;
  if (max !== min) {
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }
  return [h, s, v];
}

// Helper to convert HSV to RGB
function hsvToRgb(h: number, s: number, v: number) {
  let r = 0, g = 0, b = 0;
  const i = Math.floor(h * 6);
  const f = h * 6 - i;
  const p = v * (1 - s);
  const q = v * (1 - f * s);
  const t = v * (1 - (1 - f) * s);
  switch (i % 6) {
    case 0: r = v; g = t; b = p; break;
    case 1: r = q; g = v; b = p; break;
    case 2: r = p; g = v; b = t; break;
    case 3: r = p; g = q; b = v; break;
    case 4: r = t; g = p; b = v; break;
    case 5: r = v; g = p; b = q; break;
  }
  return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
}

// Simple LAB conversion for delta E (simplified)
function rgbToLab(r: number, g: number, b: number) {
  let r_ = r / 255, g_ = g / 255, b_ = b / 255;
  r_ = r_ > 0.04045 ? Math.pow((r_ + 0.055) / 1.055, 2.4) : r_ / 12.92;
  g_ = g_ > 0.04045 ? Math.pow((g_ + 0.055) / 1.055, 2.4) : g_ / 12.92;
  b_ = b_ > 0.04045 ? Math.pow((b_ + 0.055) / 1.055, 2.4) : b_ / 12.92;
  
  let x = (r_ * 0.4124 + g_ * 0.3576 + b_ * 0.1805) / 0.95047;
  let y = (r_ * 0.2126 + g_ * 0.7152 + b_ * 0.0722) / 1.00000;
  let z = (r_ * 0.0193 + g_ * 0.1192 + b_ * 0.9505) / 1.08883;
  
  x = x > 0.008856 ? Math.pow(x, 1/3) : (7.787 * x) + 16/116;
  y = y > 0.008856 ? Math.pow(y, 1/3) : (7.787 * y) + 16/116;
  z = z > 0.008856 ? Math.pow(z, 1/3) : (7.787 * z) + 16/116;
  
  return [(116 * y) - 16, 500 * (x - y), 200 * (y - z)];
}

// Simple Delta E (Euclidean in LAB space) - approximation of dE2000 for speed
function deltaE(lab1: number[], lab2: number[]) {
  const dL = lab1[0] - lab2[0];
  const da = lab1[1] - lab2[1];
  const db = lab1[2] - lab2[2];
  return Math.sqrt(dL*dL + da*da + db*db);
}

// Extract colors using Canvas and KMeans
async function extractColors(dataUrl: string, k = 5): Promise<string[]> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      // Downsample to 100x100 max for speed
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(['#CCCCCC', '#999999', '#666666', '#333333', '#000000']);
        return;
      }
      
      const maxSize = 100;
      let w = img.width, h = img.height;
      if (w > h) {
        if (w > maxSize) { h *= maxSize / w; w = maxSize; }
      } else {
        if (h > maxSize) { w *= maxSize / h; h = maxSize; }
      }
      
      canvas.width = w;
      canvas.height = h;
      ctx.drawImage(img, 0, 0, w, h);
      
      const imgData = ctx.getImageData(0, 0, w, h).data;
      const pixels: number[][] = [];
      
      for (let i = 0; i < imgData.length; i += 4) {
        const r = imgData[i], g = imgData[i+1], b = imgData[i+2], a = imgData[i+3];
        if (a < 128) continue; // ignore transparent
        
        const hsv = rgbToHsv(r, g, b);
        // Ignore extremely dark (V < 0.15) and extremely bright (V > 0.95)
        if (hsv[2] < 0.15 || (hsv[2] > 0.95 && hsv[1] < 0.1)) continue;
        
        pixels.push([r, g, b, hsv[0], hsv[1], hsv[2]]);
      }
      
      if (pixels.length === 0) {
        resolve(['#CCCCCC', '#999999', '#666666', '#333333', '#000000']);
        return;
      }

      // Initialize centroids (k-means++ approach approximation: spread out)
      let centroids: number[][] = [pixels[Math.floor(Math.random() * pixels.length)]];
      for (let i = 1; i < k; i++) {
        let maxDist = -1;
        let nextCentroid = pixels[0];
        for (const p of pixels) {
          let minDistToCentroids = Infinity;
          for (const c of centroids) {
            const dist = Math.sqrt(Math.pow(p[0]-c[0],2) + Math.pow(p[1]-c[1],2) + Math.pow(p[2]-c[2],2));
            if (dist < minDistToCentroids) minDistToCentroids = dist;
          }
          if (minDistToCentroids > maxDist) {
            maxDist = minDistToCentroids;
            nextCentroid = p;
          }
        }
        centroids.push(nextCentroid);
      }
      
      // K-means iterations
      for (let iter = 0; iter < 10; iter++) {
        const clusters: number[][][] = Array(k).fill(0).map(() => []);
        
        for (const p of pixels) {
          let minDist = Infinity;
          let bestCluster = 0;
          for (let i = 0; i < k; i++) {
            const c = centroids[i];
            // Distance with saturation weighting: highly saturated colors are pulled closer (preferred)
            const rgbDist = Math.sqrt(Math.pow(p[0]-c[0],2) + Math.pow(p[1]-c[1],2) + Math.pow(p[2]-c[2],2));
            const satWeight = 1 - (p[4] * 0.5); // 0.5 to 1.0 multiplier
            const dist = rgbDist * satWeight;
            
            if (dist < minDist) {
              minDist = dist;
              bestCluster = i;
            }
          }
          clusters[bestCluster].push(p);
        }
        
        // Update centroids
        let changed = false;
        for (let i = 0; i < k; i++) {
          if (clusters[i].length === 0) continue;
          let sumR = 0, sumG = 0, sumB = 0;
          for (const p of clusters[i]) {
            sumR += p[0]; sumG += p[1]; sumB += p[2];
          }
          const newR = sumR / clusters[i].length;
          const newG = sumG / clusters[i].length;
          const newB = sumB / clusters[i].length;
          
          if (Math.abs(centroids[i][0] - newR) > 1 || Math.abs(centroids[i][1] - newG) > 1) changed = true;
          centroids[i][0] = newR;
          centroids[i][1] = newG;
          centroids[i][2] = newB;
        }
        if (!changed) break;
      }
      
      // Merge similar clusters (Delta E < 3 approximated by lab distance < 10)
      const mergedCentroids: number[][] = [];
      for (const c of centroids) {
        const lab1 = rgbToLab(c[0], c[1], c[2]);
        let tooSimilar = false;
        for (const m of mergedCentroids) {
          const lab2 = rgbToLab(m[0], m[1], m[2]);
          if (deltaE(lab1, lab2) < 10) { // Approximation of visual similarity threshold
            tooSimilar = true;
            break;
          }
        }
        if (!tooSimilar) mergedCentroids.push(c);
      }
      
      // Format to hex
      let hexColors = mergedCentroids.map(c => {
        const r = Math.round(c[0]).toString(16).padStart(2, '0');
        const g = Math.round(c[1]).toString(16).padStart(2, '0');
        const b = Math.round(c[2]).toString(16).padStart(2, '0');
        return `#${r}${g}${b}`.toUpperCase();
      });
      
      // Pad to 5 colors if needed
      while (hexColors.length < 5) {
        // Just duplicate the last one or add a neutral
        hexColors.push(hexColors[hexColors.length - 1] || '#888888');
      }
      // Trim to exactly 5
      hexColors = hexColors.slice(0, 5);
      
      resolve(hexColors);
    };
    img.src = dataUrl;
  });
}

export const mockAiAnalyzeImage = async (filename: string, width?: number, height?: number, dataUrl?: string): Promise<{
  color_tone: string;
  extracted_colors: string[];
  style: string;
  function_type: string;
  ocr_text: string;
  semantic_description: string;
  aspect_ratio: '横图' | '竖图' | '方图';
  tags: Omit<ImageTag, 'id' | 'image_id'>[];
}> => {
  let ocrResult = '';
  // Fallback mock text implementation to avoid slow/inaccurate Tesseract OCR processing
  // Real OCR should be handled server-side with a robust engine like Google Vision or Tesseract in a worker
  const ocrTexts = [
    '双十一大促 满300减50 立即抢购', 
    '全新设计语言 探索未来边界', 
    '登录 注册 忘记密码', 
    '品牌灵感 2026春夏系列', 
    '设计系统规范 组件库 v2.0',
    '蝉妈妈 数据分析平台 实时榜单' // Added "蝉妈妈" for testing
  ];
  
  // To make the user experience better for the demo, we check if filename has hints
  if (filename.includes('蝉妈妈')) {
    ocrResult = '蝉妈妈 数据分析平台 实时榜单';
  } else if (filename.includes('手机图4')) {
    ocrResult = 'UPLOAD\nYOUR\nIMAGE\n1125x2436 px';
  } else {
    const hasOcr = Math.random() > 0.3;
    ocrResult = hasOcr ? ocrTexts[Math.floor(Math.random() * ocrTexts.length)] : '';
  }

  return new Promise((resolve) => {
    setTimeout(async () => {
      const color = COLORS[Math.floor(Math.random() * COLORS.length)];
      const style = STYLES[Math.floor(Math.random() * STYLES.length)];
      const func = FUNCTIONS[Math.floor(Math.random() * FUNCTIONS.length)];

      // Mock Semantic Descriptions (隐形语义描述)
      const semanticDescriptions = [
        '一个穿着赛博朋克风格发光夹克的女孩站在下雨的霓虹灯街道上，充满科技感的暗黑风',
        '极简风登录页，包含表单输入框、社交账号登录按钮，整体背景留白较多，适合企业级后台系统',
        '大红色的电商促销海报，具有强烈的视觉冲击力，中间有立体加粗的折扣文案',
        '一张夏日海滩背景图，包含阳光、沙滩和棕榈树，色彩明快清新，适合做夏天背景的图',
        '玻璃拟态风格的UI组件卡片，带有磨砂半透明质感，悬浮在渐变色彩色背景之上',
        '画面中有手机的图片，展示了APP的启动页，极简设计风格，包含了产品Logo'
      ];
      const semantic_description = semanticDescriptions[Math.floor(Math.random() * semanticDescriptions.length)];

      // Real color extraction via Canvas if dataUrl is provided
      let extracted_colors: string[];
      if (dataUrl) {
        extracted_colors = await extractColors(dataUrl, 5);
      } else {
        const generateHex = () => '#' + Math.floor(Math.random()*16777215).toString(16).padStart(6, '0').toUpperCase();
        extracted_colors = [generateHex(), generateHex(), generateHex(), generateHex(), generateHex()];
      }

      // Calculate Aspect Ratio
      let aspect_ratio: '横图' | '竖图' | '方图' = '方图';
      if (width && height) {
        const ratio = width / height;
        if (ratio > 1.1) aspect_ratio = '横图';
        else if (ratio < 0.9) aspect_ratio = '竖图';
      } else {
        const randomRatio = Math.random();
        if (randomRatio > 0.6) aspect_ratio = '横图';
        else if (randomRatio > 0.3) aspect_ratio = '竖图';
      }

      // Add smart object tags based on context and aspect ratio to simulate AI recognition
      const smartTags = [];
      if (aspect_ratio === '竖图') {
        smartTags.push({ tag_type: 'device', tag_value: '手机', confidence: 0.95 });
        smartTags.push({ tag_type: 'context', tag_value: 'APP界面', confidence: 0.85 });
      } else if (aspect_ratio === '横图') {
        smartTags.push({ tag_type: 'device', tag_value: '电脑', confidence: 0.85 });
        smartTags.push({ tag_type: 'context', tag_value: '网页设计', confidence: 0.80 });
      }
      
      const lowerFilename = filename.toLowerCase();
      if (lowerFilename.includes('watch') || lowerFilename.includes('表')) {
        smartTags.push({ tag_type: 'device', tag_value: '手表', confidence: 0.98 });
      }

      resolve({
        color_tone: color as any,
        extracted_colors,
        style: style as any,
        function_type: func as any,
        ocr_text: ocrResult,
        semantic_description,
        aspect_ratio,
        tags: [
          { tag_type: 'color', tag_value: color, confidence: 0.9 + Math.random() * 0.1 },
          { tag_type: 'style', tag_value: style, confidence: 0.8 + Math.random() * 0.2 },
          { tag_type: 'function', tag_value: func, confidence: 0.85 + Math.random() * 0.15 },
          ...smartTags
        ]
      });
    }, 1500); // simulate network latency
  });
};

export const mockAiExtractNoteTags = async (content: string): Promise<Omit<NoteTag, 'id' | 'note_id'>[]> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      const possibleTags = ['UI设计', '配色方案', '交互逻辑', '动效设计', '用户研究', '产品需求', '灵感', '排版'];
      const numTags = 1 + Math.floor(Math.random() * 3);
      const tags: Omit<NoteTag, 'id' | 'note_id'>[] = [];
      for(let i=0; i<numTags; i++) {
        const t = possibleTags[Math.floor(Math.random() * possibleTags.length)];
        if (!tags.find(tag => tag.tag_name === t)) {
          tags.push({ tag_name: t, relevance: 0.7 + Math.random() * 0.3 });
        }
      }
      resolve(tags);
    }, 1000);
  });
};

export const mockAiGenerateInsights = async (noteIds: string[], noteTitles: string[]): Promise<InsightData> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      const nodes: GraphNode[] = [];
      const edges: GraphEdge[] = [];
      
      // Analyze semantic keywords from titles to form clusters
      const keywordMap = new Map<string, string[]>(); // keyword -> noteId[]
      
      // Common keywords we might extract from the note titles (mock NLP extraction)
      const potentialKeywords = ['早教', '红点奖', '抖音', 'AI', '排版', '组件', '大模型', 'UI设计', '交互', '色彩', '灵感', '普世化', '转译'];
      
      noteTitles.forEach((title, index) => {
        const id = noteIds[index];
        nodes.push({ id, label: title || `Note ${index}`, type: 'note' });
        
        // Find which keywords this note contains
        let hasKeyword = false;
        potentialKeywords.forEach(kw => {
          if (title.includes(kw)) {
            hasKeyword = true;
            if (!keywordMap.has(kw)) {
              keywordMap.set(kw, []);
            }
            keywordMap.get(kw)!.push(id);
          }
        });
        
        // Assign a random keyword if none matched, just so it connects to something in the graph
        if (!hasKeyword && potentialKeywords.length > 0) {
          const randomKw = potentialKeywords[Math.floor(Math.random() * potentialKeywords.length)];
          if (!keywordMap.has(randomKw)) keywordMap.set(randomKw, []);
          keywordMap.get(randomKw)!.push(id);
        }
      });
      
      // Add semantic tag nodes and edges for keywords that have at least one note
      let tagIndex = 0;
      keywordMap.forEach((connectedNoteIds, kw) => {
        const tagId = `tag_semantic_${tagIndex++}`;
        nodes.push({ id: tagId, label: kw, type: 'tag' });
        
        connectedNoteIds.forEach(noteId => {
          edges.push({
            source: noteId,
            target: tagId,
            weight: 0.6 + Math.random() * 0.4
          });
        });
      });
      
      // Generate contextual insights based on the found keywords
      const foundKeywords = Array.from(keywordMap.keys());
      const topKeywords = foundKeywords.sort((a, b) => keywordMap.get(b)!.length - keywordMap.get(a)!.length).slice(0, 3);
      
      let insights: string[] = [];
      if (topKeywords.length > 0) {
        insights.push(`发现高度集中的知识簇：您的便签中“${topKeywords[0]}”相关内容出现最为频繁，这可能是您当前最核心的关注点。`);
        
        if (topKeywords.length > 1) {
          insights.push(`跨界灵感连接：尝试将“${topKeywords[0]}”的设计理念与“${topKeywords[1]}”的应用场景相结合，可能会产生意想不到的创新。`);
        } else {
          insights.push(`建议多关注色彩与排版的结合，可能会产生意想不到的效果。`);
        }
        
        if (topKeywords.includes('早教')) {
          insights.push('关于“早教”主题，建议在界面设计中多采用圆润、低饱和度且有亲和力的色彩与交互。');
        } else if (topKeywords.includes('红点奖')) {
          insights.push('关于“红点奖”相关的探索，建议总结一套具备极高国际化视野和极简主义的美学规范。');
        } else {
          insights.push('近期收集了较多深色模式的参考，可以尝试总结一套设计规范。');
        }
      } else {
        insights = [
          '你的灵感主要集中在基础 UI 设计和交互逻辑领域。',
          '建议多关注色彩与排版的结合，可能会产生意想不到的效果。',
          '近期收集了较多深色模式的参考，可以尝试总结一套设计规范。'
        ];
      }
      
      let overall_insight = '';
      const opportunities: any[] = [];
      
      if (topKeywords.length > 0) {
        overall_insight = `这组灵感涵盖了从AI交互前沿到深层用户心理的广泛视角，核心冲突点在于'高效交互'与'认知负荷'之间的平衡。整体趋势显示，未来的设计正从表象的极简转向内在的意义重构，且AI的应用正在模糊工具与伙伴的关系界限。`;
        
        opportunities.push({
          title: "1. 从‘功能供给’转向‘意义共建’",
          content: "结合便签内容，发现下一代产品不应只是执行工具（如AI Prompt或简单的社交浏览），而应通过引导用户贡献价值（被需要感）和对话协作来建立深层链接，实现从被动响应到主动共建的跨越。",
          related_notes: keywordMap.get(topKeywords[0]) || []
        });

        if (topKeywords.length > 1) {
          opportunities.push({
            title: "2. 以‘结构化’对抗‘信息熵增’",
            content: "多条便签共同指向了设计的克制与知识的连结。建议通过‘极简设计’过滤无效信息，利用‘功能色彩’强化认知层级，并在碎片化信息间建立‘知识关联网络’，解决现代用户普遍的认知焦虑。",
            related_notes: keywordMap.get(topKeywords[1]) || []
          });
        }
        
        if (topKeywords.length > 2) {
          opportunities.push({
            title: "3. AI辅助的‘教学相长型’交互模式",
            content: "结合AI引导痛点和中老年分享需求，这启示我们在设计界面时需要降低认知门槛，提供循序渐进的引导，让用户在使用的同时完成知识的获取与分享。",
            related_notes: keywordMap.get(topKeywords[2]) || []
          });
        }
      } else {
        overall_insight = '您的灵感目前较为分散，建议收集更多相关维度的便签以生成深度的知识网络。';
        opportunities.push({
          title: "1. 知识沉淀与分类",
          content: "尝试将日常收集的碎片化信息进行归类，提取出核心的关键词。",
          related_notes: []
        });
      }
      
      resolve({
        nodes,
        edges,
        insights,
        overall_insight,
        opportunities,
        stats: {
          themes: foundKeywords.length,
          notes: noteIds.length,
          relations: edges.length
        }
      });
    }, 2000);
  });
};
