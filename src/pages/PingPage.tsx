import { useState, useCallback, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { Loader2, Image as ImageIcon, FileText, X, Sparkles, Lightbulb, Palette, ListChecks, Zap } from 'lucide-react';
import { usePingStore } from '../store/usePingStore';

export default function PingPage() {
  const { items, setItems, query, setQuery, result, setResult, removeItem } = usePingStore();
  const [isGenerating, setIsGenerating] = useState(false);
  const [contextMenu, setContextMenu] = useState<{x: number, y: number} | null>(null);

  useEffect(() => {
    const closeMenu = () => setContextMenu(null);
    window.addEventListener('click', closeMenu);
    return () => window.removeEventListener('click', closeMenu);
  }, []);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    for (const file of acceptedFiles) {
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        const dataUrl = await new Promise<string>((resolve) => {
          reader.onload = (e) => resolve(e.target?.result as string);
          reader.readAsDataURL(file);
        });
        
        setItems(prev => [...prev, {
          id: crypto.randomUUID(),
          type: 'image',
          content: dataUrl,
          file
        }]);
      } else if (file.type === 'text/plain') {
        const text = await file.text();
        setItems(prev => [...prev, {
          id: crypto.randomUUID(),
          type: 'text',
          content: text
        }]);
      }
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    noClick: true, // Only drop or paste
    accept: {
      'image/*': ['.jpeg', '.png', '.jpg', '.webp', '.gif'],
      'text/plain': ['.txt']
    }
  });

  const handlePaste = useCallback(async (e: React.ClipboardEvent) => {
    const clipboardItems = e.clipboardData.items;
    
    for (const item of clipboardItems) {
      if (item.type.indexOf('image') !== -1) {
        const file = item.getAsFile();
        if (file) {
          const reader = new FileReader();
          const dataUrl = await new Promise<string>((resolve) => {
            reader.onload = (e) => resolve(e.target?.result as string);
            reader.readAsDataURL(file);
          });
          
          setItems(prev => [...prev, {
            id: crypto.randomUUID(),
            type: 'image',
            content: dataUrl,
            file
          }]);
        }
      } else if (item.type === 'text/plain') {
        item.getAsString((text) => {
          // Prevent pasting into input from creating a dropped item
          if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
            return;
          }
          if (text.trim()) {
            setItems(prev => [...prev, {
              id: crypto.randomUUID(),
              type: 'text',
              content: text
            }]);
          }
        });
      }
    }
  }, []);

  const handleContextMenuPaste = async () => {
    setContextMenu(null);
    try {
      const clipboardItems = await navigator.clipboard.read();
      const filesToDrop: File[] = [];
      
      for (const item of clipboardItems) {
        const imageTypes = item.types.filter(type => type.startsWith('image/'));
        if (imageTypes.length > 0) {
          const blob = await item.getType(imageTypes[0]);
          const file = new File([blob], `粘贴图片_${Date.now()}.png`, { type: blob.type });
          filesToDrop.push(file);
        } else if (item.types.includes('text/plain')) {
          const blob = await item.getType('text/plain');
          const text = await blob.text();
          if (text.trim()) {
            setItems(prev => [...prev, {
              id: crypto.randomUUID(),
              type: 'text',
              content: text
            }]);
          }
        }
      }
      
      if (filesToDrop.length > 0) {
        onDrop(filesToDrop);
      }
    } catch (err) {
      console.error('Failed to read clipboard:', err);
      alert('无法读取剪贴板，请尝试使用快捷键 Ctrl+V / Cmd+V 粘贴');
    }
  };

  const handlePing = async () => {
    if (items.length === 0 && !query.trim()) return;
    
    setIsGenerating(true);
    setResult(null);

    // Mock AI generation delay
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Generate dynamic mock response based on inputs
    const imageItems = items.filter(i => i.type === 'image');
    const textItems = items.filter(i => i.type === 'text');
    
    let mockResponse: any = {};
    
    // Build context strings for dynamic output
    const hasQuery = query.trim().length > 0;
    const queryContext = hasQuery ? `关于"${query.substring(0, 15)}..."的诉求` : "当前的素材组合";
    const textContext = textItems.length > 0 ? `结合便签中提到的“${textItems[0].content.substring(0, 10)}...”等概念` : "";
    const imageContext = imageItems.length > 0 ? `提取了 ${imageItems.length} 张图片的形色构质特征` : "";

    // Generate dynamic content
    if (imageItems.length > 0 && textItems.length > 0) {
      mockResponse = {
        coreInsight: `通过跨模态分析，${queryContext}与视觉素材形成了强烈的互补。${imageContext}，并${textContext}，我们发现核心在于“感性视觉与理性逻辑的平衡”。设计上应当在保持高饱和度视觉冲击力的同时，通过极简的排版结构来承载复杂的业务信息。`,
        inspirations: [
          `从图片中提取赛博朋克紫与荧光绿，用于点亮文字便签中提到的核心转化按钮。`,
          `将便签中的抽象业务概念，转化为图片中出现的玻璃拟态UI隐喻，增加空间纵深感。`,
          hasQuery ? `针对您"${query.substring(0, 10)}..."的需求，建议采用卡片式流式布局，打破传统的方正网格。` : `尝试引入非对称的排版，打破传统的方正网格。`
        ],
        actionItems: [
          "建立一套基础的深色色板（如 #0A0A0E 为底色），并用提取的亮色作为点缀。",
          "梳理当前界面的信息层级，将文字便签中的次要信息折叠或透明化处理。",
          "为核心交互路径设计渐进式展现动画，减少用户的初次认知负荷。"
        ],
        unexpected: `素材中的留白方式意外地与文字便签中的业务诉求相契合。或许可以尝试在科技感中融入一丝禅意，采用对话式界面（Conversational UI）来承载复杂的表单录入。`
      };
    } else if (imageItems.length > 0) {
      mockResponse = {
        coreInsight: `${hasQuery ? `针对${queryContext}，` : ''}这组视觉素材展现了强烈的表现力。${imageContext}，暗示了一种突破常规的未来主义审美倾向。核心在于通过高对比度建立视觉焦点。`,
        inspirations: [
          "提取素材中的高饱和核心色作为系统的高亮色（Accent Color）。",
          "将图中的几何裁切方式应用到 UI 卡片容器设计中。",
          "引入细腻的玻璃拟态质感，为扁平的界面增加空间纵深感。"
        ],
        actionItems: [
          "建立基于素材提取色的设计系统（Design System）色彩变量。",
          "制定统一的卡片圆角和阴影规范。",
          "为页面关键元素的切换增加具有阻尼感的弹性动效。"
        ],
        unexpected: "素材的排版规律暗示了一种无边界设计（Borderless UI）的可能，通过间距而非线条来划分区域，会极大提升空间感。"
      };
    } else if (textItems.length > 0 || hasQuery) {
      mockResponse = {
        coreInsight: `基于${textItems.length > 0 ? '您的文字便签' : '您的输入描述'}${hasQuery ? `和${queryContext}` : ''}，系统捕捉到了底层的信息架构诉求。这要求设计在表现形式上做减法，在信息传递上做加法。`,
        inspirations: [
          `将抽象的文字概念转化为具象的UI隐喻，例如用“水滴阻尼动画”表现流畅感。`,
          `采用动态排版（Fluid Typography），让文字本身成为界面的核心装饰。`,
          `引入手势交互隐喻，以更自然的方式承载${textItems.length > 0 ? textItems[0].content.substring(0, 8) + '...' : '核心'}业务逻辑。`
        ],
        actionItems: [
          "严格控制界面层级，避免超过3层的信息嵌套。",
          "建立基于“黄金比例”的空间间距和排版网格规范。",
          "设计一个基于用户角色的分发路径，做到千人千面。"
        ],
        unexpected: `单纯的文本描述中潜藏着强烈的“对话”意图，考虑直接引入 AI Agent 驱动的对话式界面（CUI）作为主要交互模式可能会有意想不到的转化率提升。`
      };
    } else {
      return; // Should not reach here due to disabled button
    }

    setResult(mockResponse);
    setIsGenerating(false);
  };

  return (
    <div 
      className="h-full flex flex-col p-8 overflow-hidden relative focus:outline-none"
      onPaste={handlePaste}
      tabIndex={0}
      onContextMenu={(e) => {
        e.preventDefault();
        setContextMenu({ x: e.pageX, y: e.pageY });
      }}
    >
      {/* Context Menu */}
      {contextMenu && (
        <div 
          className="fixed z-50 bg-[#2A2B32] border border-white/10 rounded-lg shadow-2xl py-1 w-36 overflow-hidden animate-in fade-in zoom-in-95 duration-100"
          style={{ top: contextMenu.y, left: contextMenu.x }}
        >
          <button 
            className="w-full text-left px-4 py-2.5 text-sm text-white hover:bg-[#9c39ff] transition-colors flex items-center"
            onClick={(e) => {
              e.stopPropagation();
              handleContextMenuPaste();
            }}
          >
            <FileText className="w-4 h-4 mr-2 opacity-70" />
            粘贴素材
          </button>
        </div>
      )}

      <div className="max-w-5xl w-full mx-auto flex flex-col h-full relative z-10 pt-8 overflow-y-auto custom-scrollbar">
        
        {/* Workspace Area */}
        <div 
          {...getRootProps()}
          className={`flex-none flex flex-col border-2 rounded-2xl p-6 transition-all relative bg-[#1D1E24]/60 backdrop-blur-sm
            ${isDragActive ? 'border-[#9c39ff] bg-[#9c39ff]/10 shadow-[0_0_30px_rgba(156,57,255,0.2)]' : 'border-white/10 border-dashed hover:border-white/20'}
          `}
        >
          <input {...getInputProps()} />

          {/* Dropped Items Grid */}
          <div className="flex-none max-h-[300px] overflow-y-auto custom-scrollbar mb-6 border border-white/5 rounded-xl bg-black/20 p-4">
            {items.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-500 pointer-events-none py-8">
                <div className="w-16 h-16 mb-4 rounded-full bg-white/5 flex items-center justify-center">
                  <ImageIcon className="w-6 h-6 opacity-50" />
                </div>
                <p className="text-sm">拖拽或 Ctrl+V 粘贴您的灵感素材（图片/文本）到此区域</p>
              </div>
            ) : (
              <div className="flex flex-wrap gap-3 items-start content-start">
                {items.map(item => (
                  <div key={item.id} className="relative group rounded-lg overflow-hidden border border-white/10 bg-black/40 shadow-lg shrink-0 transition-transform hover:scale-105">
                    <button 
                      onClick={() => removeItem(item.id)}
                      className="absolute -top-1 -right-1 p-1 bg-red-500/80 hover:bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity z-10"
                    >
                      <X className="w-2.5 h-2.5" />
                    </button>
                    
                    {item.type === 'image' ? (
                      <div className="w-16 h-16">
                        <img src={item.content} alt="" className="w-full h-full object-cover" />
                      </div>
                    ) : (
                      <div className="w-16 h-16 p-2 text-[10px] text-slate-300 relative bg-[#1D1E24]">
                        <FileText className="w-3 h-3 text-[#9c39ff] mb-1 absolute top-1 right-1 opacity-30" />
                        <div className="line-clamp-3 leading-tight mt-1">{item.content}</div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Input & Action Area (Moved outside of the dropzone for better layout) */}
        </div>

        <div className="shrink-0 flex gap-4 items-end bg-black/40 p-2 rounded-xl border border-white/5 relative z-20 mt-6">
          <textarea
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="添加自然语言描述，例如：'帮我结合这些素材提取一套适合做医疗后台的UI规范...'"
            className="flex-1 bg-transparent border-none focus:ring-0 text-white placeholder-white/30 resize-none min-h-[60px] max-h-[150px] p-3 text-sm custom-scrollbar"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handlePing();
              }
            }}
          />
          <button
            onClick={handlePing}
            disabled={isGenerating || (items.length === 0 && !query.trim())}
            className={`shrink-0 px-8 h-[60px] rounded-lg font-bold text-lg tracking-wider transition-all flex items-center justify-center relative overflow-hidden
              ${isGenerating 
                ? 'bg-white/10 text-white/50 cursor-not-allowed' 
                : (items.length === 0 && !query.trim())
                  ? 'bg-white/5 text-white/30 cursor-not-allowed'
                  : 'bg-gradient-to-r from-[#7828c8] to-[#9c39ff] text-white hover:shadow-[0_0_20px_rgba(156,57,255,0.4)] hover:scale-[1.02] active:scale-95'
              }
            `}
          >
            {isGenerating ? (
              <Loader2 className="w-6 h-6 animate-spin" />
            ) : (
              <>
                <span className="relative z-10">砰！</span>
                {/* Button shine effect */}
                {!(items.length === 0 && !query.trim()) && (
                  <div className="absolute inset-0 -translate-x-full hover:animate-[shimmer_1s_infinite] bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-12"></div>
                )}
              </>
            )}
          </button>
        </div>

        {/* Result Area (Appears below input) */}
        {result && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in slide-in-from-bottom-4 relative z-10 pb-12 mt-6">
              {/* Core Insight Card */}
              <div className="col-span-full bg-[#1A1B23] p-5 rounded-xl border border-white/5 shadow-lg">
                 <h3 className="text-[#9c39ff] font-bold mb-3 flex items-center text-sm">
                   <Lightbulb className="w-4 h-4 mr-2" />
                   核心洞察
                 </h3>
                 <p className="text-white/80 text-sm leading-relaxed">{result.coreInsight}</p>
              </div>
              
              {/* Creative Inspiration */}
              <div className="bg-[#1A1B23] p-5 rounded-xl border border-white/5 shadow-lg">
                 <h3 className="text-[#3b82f6] font-bold mb-4 flex items-center text-sm">
                   <Palette className="w-4 h-4 mr-2" />
                   创意灵感
                 </h3>
                 <ul className="space-y-3">
                   {result.inspirations.map((item, i) => (
                     <li key={i} className="text-white/70 text-sm flex items-start">
                       <span className="mr-2 text-[#3b82f6] font-bold mt-0.5">•</span>
                       <span className="leading-relaxed">{item}</span>
                     </li>
                   ))}
                 </ul>
              </div>

              {/* Action Items */}
              <div className="bg-[#1A1B23] p-5 rounded-xl border border-white/5 shadow-lg">
                 <h3 className="text-[#10b981] font-bold mb-4 flex items-center text-sm">
                   <ListChecks className="w-4 h-4 mr-2" />
                   行动建议
                 </h3>
                 <ul className="space-y-3">
                   {result.actionItems.map((item, i) => (
                     <li key={i} className="text-white/70 text-sm flex items-start">
                       <span className="mr-2 text-[#10b981] font-bold mt-0.5">•</span>
                       <span className="leading-relaxed">{item}</span>
                     </li>
                   ))}
                 </ul>
              </div>

              {/* Unexpected */}
              <div className="col-span-full bg-gradient-to-r from-[#9c39ff]/10 to-transparent p-5 rounded-xl border border-[#9c39ff]/20 shadow-lg relative overflow-hidden">
                 <div className="absolute right-0 top-0 w-32 h-32 bg-[#9c39ff]/20 blur-3xl rounded-full pointer-events-none"></div>
                 <h3 className="text-[#ea9eff] font-bold mb-3 flex items-center text-sm relative z-10">
                   <Zap className="w-4 h-4 mr-2" />
                   意外发现
                 </h3>
                 <p className="text-white/80 text-sm leading-relaxed relative z-10">{result.unexpected}</p>
              </div>
            </div>
          )}

      </div>
    </div>
  );
}