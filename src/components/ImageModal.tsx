import { X, Tag, Download, Trash2, Edit2, Check, Copy, Palette, Wand2, Search, Loader2 } from 'lucide-react';
import { ImageItem } from '../types';
import { useImageStore } from '../store/useImageStore';
import { useState, useEffect, useRef } from 'react';
import { extractFigmaParams } from '../utils/realAi';

interface ImageModalProps {
  image: ImageItem;
  onClose: () => void;
  onFindSimilar?: (img: ImageItem) => void;
}

export default function ImageModal({ image, onClose, onFindSimilar }: ImageModalProps) {
  const { images, updateImage, deleteImage } = useImageStore();
  const currentImage = images.find(img => img.id === image.id) || image;
  
  const [isEditing, setIsEditing] = useState(false);
  const [filename, setFilename] = useState(currentImage.filename);
  const [newTagInput, setNewTagInput] = useState('');
  const [editingTagIndex, setEditingTagIndex] = useState<{ index: number, isAi: boolean, originalValue: string } | null>(null);
  const [editTagValue, setEditTagValue] = useState('');
  
  const [showFigmaParams, setShowFigmaParams] = useState(false);
  const [isCropping, setIsCropping] = useState(false);
  const [cropStart, setCropStart] = useState<{ x: number, y: number } | null>(null);
  const [cropEnd, setCropEnd] = useState<{ x: number, y: number } | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [figmaResult, setFigmaResult] = useState<string | null>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  const handleStartCropping = () => {
    if (isCropping) {
      // Cancel cropping
      setIsCropping(false);
      setShowFigmaParams(false);
      setCropStart(null);
      setCropEnd(null);
    } else {
      setShowFigmaParams(true);
      setIsCropping(true);
      setCropStart(null);
      setCropEnd(null);
      setFigmaResult(null);
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!isCropping || !imageRef.current) return;
    const rect = imageRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setCropStart({ x, y });
    setCropEnd({ x, y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isCropping || !cropStart || !imageRef.current) return;
    const rect = imageRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
    const y = Math.max(0, Math.min(e.clientY - rect.top, rect.height));
    setCropEnd({ x, y });
  };

  const handleMouseUp = () => {
    if (!isCropping || !cropStart) return;
    // Done drawing
  };

  const handleConfirmCrop = async () => {
    if (!cropStart || !cropEnd || !imageRef.current) return;
    setIsCropping(false);
    setIsExtracting(true);

    try {
      const rect = imageRef.current.getBoundingClientRect();
      const naturalWidth = imageRef.current.naturalWidth;
      const naturalHeight = imageRef.current.naturalHeight;

      const scaleX = naturalWidth / rect.width;
      const scaleY = naturalHeight / rect.height;

      const x1 = Math.min(cropStart.x, cropEnd.x) * scaleX;
      const y1 = Math.min(cropStart.y, cropEnd.y) * scaleY;
      const w = Math.abs(cropEnd.x - cropStart.x) * scaleX;
      const h = Math.abs(cropEnd.y - cropStart.y) * scaleY;

      // Draw cropped area to canvas
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(
          imageRef.current,
          x1, y1, w, h,
          0, 0, w, h
        );
        const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
        const result = await extractFigmaParams(dataUrl);
        setFigmaResult(result);
      }
    } catch (error) {
      console.error('Extraction failed:', error);
      setFigmaResult('/* 提取失败，请重试 */');
    } finally {
      setIsExtracting(false);
    }
  };

  const legacyTranslationMap: Record<string, string> = {
    'desktop': '电脑',
    'laptop': '笔记本电脑',
    'mobile': '手机',
    'smartphone': '智能手机',
    'tablet': '平板',
    'watch': '手表',
    'minimalist': '极简主义',
    'glassmorphism': '玻璃拟态',
    'flat': '扁平化',
    'skeuomorphism': '拟物化',
    'cyberpunk': '赛博朋克',
    'retro': '复古',
    'web': '网页设计',
    'landing': '登录页',
    'banner': '横幅',
    'icon': '图标',
    'illustration': '插画',
    'ui': '界面组件',
    'color-scheme': '配色方案',
    'red': '红',
    'orange': '橙',
    'yellow': '黄',
    'green': '绿',
    'blue': '蓝',
    'purple': '紫',
    'monochrome': '黑白'
  };

  const translateTag = (val: string) => legacyTranslationMap[val?.toLowerCase?.()] || val;

  const handleSaveName = () => {
    updateImage(currentImage.id, { filename });
    setIsEditing(false);
  };

  const handleAddCustomTag = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && newTagInput.trim()) {
      const tag = newTagInput.trim();
      const currentTags = currentImage.custom_tags || [];
      if (!currentTags.includes(tag)) {
        updateImage(currentImage.id, { custom_tags: [...currentTags, tag] });
      }
      setNewTagInput('');
    }
  };

  const handleRemoveCustomTag = (tagToRemove: string) => {
    const currentTags = currentImage.custom_tags || [];
    updateImage(currentImage.id, { custom_tags: currentTags.filter(t => t !== tagToRemove) });
  };

  const handleRemoveAiTag = (indexToRemove: number) => {
    const newAiTags = [...(currentImage.tags || [])];
    newAiTags.splice(indexToRemove, 1);
    updateImage(currentImage.id, { tags: newAiTags });
  };

  const handleSaveTagEdit = () => {
    if (!editingTagIndex) return;
    
    const { index, isAi, originalValue } = editingTagIndex;
    const newValue = editTagValue.trim();

    if (!newValue) {
      // If empty, just remove it
      if (isAi) {
        handleRemoveAiTag(index);
      } else {
        handleRemoveCustomTag(originalValue);
      }
    } else if (newValue !== originalValue) {
      if (isAi) {
        // For AI tags, we update the tag value in place to preserve confidence score if any
        const newAiTags = [...(currentImage.tags || [])];
        newAiTags[index] = { ...newAiTags[index], tag_value: newValue };
        updateImage(currentImage.id, { tags: newAiTags });
      } else {
        // For custom tags, update the array
        const currentTags = currentImage.custom_tags || [];
        const newCustomTags = [...currentTags];
        newCustomTags[index] = newValue;
        updateImage(currentImage.id, { custom_tags: newCustomTags });
      }
    }
    
    setEditingTagIndex(null);
  };

  const handleDelete = () => {
    if (window.confirm('确定删除这张图片吗？')) {
      deleteImage(currentImage.id);
      onClose();
    }
  };

  const handleDownload = () => {
    const a = document.createElement('a');
    a.href = currentImage.storage_path;
    a.download = currentImage.filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleCopyColor = (color: string) => {
    navigator.clipboard.writeText(color);
    // You could add a toast notification here
  };

  const [contextMenu, setContextMenu] = useState<{x: number, y: number} | null>(null);

  useEffect(() => {
    const closeMenu = () => setContextMenu(null);
    window.addEventListener('click', closeMenu);
    return () => window.removeEventListener('click', closeMenu);
  }, []);

  const handleCopyImage = async (e?: React.MouseEvent) => {
    e?.stopPropagation();
    try {
      const response = await fetch(currentImage.storage_path);
      const blob = await response.blob();
      await navigator.clipboard.write([
        new ClipboardItem({
          [blob.type]: blob
        })
      ]);
      setContextMenu(null);
    } catch (err) {
      console.error('Failed to copy image:', err);
      alert('复制图片失败，您的浏览器可能不支持此操作');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="absolute top-4 right-4 flex space-x-2">
        {onFindSimilar && (
          <button 
            onClick={() => onFindSimilar(currentImage)}
            className="flex items-center px-3 py-2 text-white/90 bg-[#9c39ff]/60 hover:bg-[#9c39ff] rounded-lg transition-colors mr-4 shadow-lg backdrop-blur-sm border border-white/10 font-medium text-sm"
            title="基于此图找相似"
          >
            <Search className="w-4 h-4 mr-2" />
            寻找相似灵感
          </button>
        )}
        <button 
          onClick={handleDownload}
          className="p-2 text-white/70 hover:text-white bg-black/20 hover:bg-black/40 rounded-lg transition-colors"
          title="下载"
        >
          <Download className="w-5 h-5" />
        </button>
        <button 
          onClick={handleDelete}
          className="p-2 text-white/70 hover:text-red-400 bg-black/20 hover:bg-black/40 rounded-lg transition-colors"
          title="删除"
        >
          <Trash2 className="w-5 h-5" />
        </button>
        <button 
          onClick={onClose}
          className="p-2 text-white/70 hover:text-white bg-black/20 hover:bg-black/40 rounded-lg transition-colors"
          title="关闭"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="max-w-6xl w-full h-full flex flex-col md:flex-row gap-6 items-center justify-center">
        <div className="flex-1 flex items-center justify-center min-h-[50vh] relative select-none">
          <img 
            ref={imageRef}
            src={currentImage.storage_path} 
            alt={currentImage.filename}
            className={`max-w-full max-h-[85vh] object-contain rounded-xl shadow-2xl ${isCropping ? 'cursor-crosshair' : 'cursor-context-menu'}`}
            onContextMenu={(e) => {
              if (isCropping) { e.preventDefault(); return; }
              e.preventDefault();
              setContextMenu({ x: e.clientX, y: e.clientY });
            }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            draggable={false}
          />
          {isCropping && cropStart && cropEnd && (
            <div 
              className="absolute border-2 border-[#9c39ff] bg-[#9c39ff]/20 pointer-events-none"
              style={{
                left: imageRef.current ? imageRef.current.offsetLeft + Math.min(cropStart.x, cropEnd.x) : 0,
                top: imageRef.current ? imageRef.current.offsetTop + Math.min(cropStart.y, cropEnd.y) : 0,
                width: Math.abs(cropEnd.x - cropStart.x),
                height: Math.abs(cropEnd.y - cropStart.y)
              }}
            >
              <button
                onMouseDown={(e) => e.stopPropagation()}
                onClick={handleConfirmCrop}
                className="absolute -bottom-10 right-0 px-3 py-1 bg-[#9c39ff] text-white rounded text-xs shadow pointer-events-auto hover:bg-[#862be0] transition-colors flex items-center"
              >
                <Check className="w-3 h-3 mr-1" />
                提取
              </button>
            </div>
          )}
          {isCropping && !cropStart && (
            <div className="absolute top-4 bg-black/60 text-white/90 px-4 py-2 rounded-full text-sm backdrop-blur-md border border-white/10 shadow-xl animate-pulse pointer-events-none">
              请在图片上拖拽框选需要提取效果的区域
            </div>
          )}
        </div>
        
        <div className="w-full md:w-80 bg-[#1D1E24] border border-white/10 rounded-xl p-6 shadow-xl flex flex-col shrink-0 text-white overflow-y-auto max-h-[85vh]">
          <div className="mb-6">
            <div className="text-xs text-white/50 mb-1">图片名称</div>
            {isEditing ? (
              <div className="flex items-center space-x-2">
                <input 
                  type="text" 
                  value={filename}
                  onChange={(e) => setFilename(e.target.value)}
                  className="flex-1 border border-white/20 rounded px-2 py-1 text-sm bg-transparent text-white"
                  autoFocus
                />
                <button onClick={handleSaveName} className="p-1 text-green-400 hover:bg-green-400/10 rounded">
                  <Check className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-between group">
                <h3 className="font-medium text-white truncate" title={currentImage.filename}>
                  {currentImage.filename}
                </h3>
                <button 
                  onClick={() => setIsEditing(true)}
                  className="p-1 text-white/40 opacity-0 group-hover:opacity-100 transition-opacity hover:text-[#9c39ff]"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          <div className="space-y-6">
            {/* Core Colors Section */}
            <div>
              <div className="flex items-center text-sm font-medium text-white mb-3">
                <Palette className="w-4 h-4 mr-2 text-[#9c39ff]" />
                核心色彩提取
              </div>
              <div className="flex flex-wrap gap-2">
                {currentImage.extracted_colors?.map((color) => (
                  <div 
                    key={color} 
                    className="flex flex-col items-center group cursor-pointer"
                    onClick={() => handleCopyColor(color)}
                    title="点击复制色值"
                  >
                    <div 
                      className="w-8 h-8 rounded-full shadow-sm border border-white/20 mb-1 transition-transform group-hover:scale-110 relative flex items-center justify-center"
                      style={{ backgroundColor: color }}
                    >
                      <Copy className="w-3 h-3 text-white/0 group-hover:text-white/80 absolute mix-blend-difference" />
                    </div>
                    <span className="text-[10px] text-white/60 font-mono uppercase">{color}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Effect Extraction Section */}
            <div>
              <button 
                onClick={handleStartCropping}
                className={`w-full flex items-center justify-center py-2 px-4 rounded-lg text-sm font-medium transition-colors border ${
                  isCropping 
                    ? 'bg-red-500/20 text-red-400 border-red-500/30 hover:bg-red-500/30' 
                    : 'bg-[#9c39ff]/20 hover:bg-[#9c39ff]/30 text-[#9c39ff] border-[#9c39ff]/30'
                }`}
              >
                {isCropping ? <X className="w-4 h-4 mr-2" /> : <Wand2 className="w-4 h-4 mr-2" />}
                {isCropping ? '取消框选' : '局部效果提取 (Figma/CSS)'}
              </button>
              
              {showFigmaParams && (
                <div className="mt-3 p-3 bg-black/40 rounded-lg border border-white/5 text-xs font-mono text-white/80 space-y-2 relative min-h-[100px] overflow-hidden">
                  {isExtracting ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-[#9c39ff] bg-[#1D1E24]/80 backdrop-blur-sm z-10">
                      <Loader2 className="w-6 h-6 animate-spin mb-2" />
                      <span>AI 正在提取样式...</span>
                    </div>
                  ) : figmaResult ? (
                    <div className="relative group">
                      <button 
                        onClick={() => handleCopyColor(figmaResult)}
                        className="absolute top-0 right-0 p-1.5 bg-white/10 hover:bg-white/20 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                        title="复制全部代码"
                      >
                        <Copy className="w-3 h-3 text-white" />
                      </button>
                      <pre className="whitespace-pre-wrap font-mono text-[11px] leading-relaxed text-[#c9a7fe]">
                        {figmaResult}
                      </pre>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-full min-h-[80px] text-white/40">
                      请在左侧图片中框选区域...
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* OCR Text Section */}
            {currentImage.ocr_text && (
              <div className="pt-4 border-t border-white/10">
                <div className="flex items-center text-sm font-medium text-white mb-3">
                  <Wand2 className="w-4 h-4 mr-2 text-blue-400" />
                  图片文字识别 (OCR)
                </div>
                <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg text-sm text-blue-200 leading-relaxed whitespace-pre-wrap">
                  {currentImage.ocr_text}
                </div>
              </div>
            )}

            {/* Unified Tags Section */}
            <div className="pt-4 border-t border-white/10">
              <div className="flex items-center text-sm font-medium text-white mb-3">
                <Tag className="w-4 h-4 mr-2 text-slate-400" />
                标签管理
              </div>
              <div className="flex flex-wrap gap-2 mb-3">
                {/* AI Tags */}
                {currentImage.tags?.map((tag, idx) => {
                  if (tag.tag_type === 'color' || tag.tag_type === 'style' || tag.tag_type === 'function') {
                    return null;
                  }
                  return editingTagIndex?.index === idx && editingTagIndex.isAi ? (
                    <input 
                      key={`ai-edit-${idx}`}
                      autoFocus
                      value={editTagValue}
                      onChange={(e) => setEditTagValue(e.target.value)}
                      onBlur={handleSaveTagEdit}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSaveTagEdit();
                        if (e.key === 'Escape') setEditingTagIndex(null);
                      }}
                      className="px-2 py-1 bg-[#9c39ff]/20 text-[#c9a7fe] rounded text-xs flex items-center border border-[#9c39ff]/50 outline-none w-24"
                    />
                  ) : (
                    <span 
                      key={`ai-${idx}`} 
                      onClick={() => {
                        setEditingTagIndex({ index: idx, isAi: true, originalValue: tag.tag_value });
                        setEditTagValue(translateTag(tag.tag_value));
                      }}
                      className="px-2 py-1 bg-[#9c39ff]/10 hover:bg-[#9c39ff]/20 text-[#c9a7fe] rounded text-xs flex items-center border border-[#9c39ff]/30 cursor-text group/tag transition-colors"
                    >
                      <span className="mr-1 text-[10px]">⭐️</span>
                      {translateTag(tag.tag_value)}
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveAiTag(idx);
                        }}
                        className="ml-1.5 opacity-0 group-hover/tag:opacity-100 hover:text-red-400 transition-opacity"
                        title="删除标签"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  );
                })}

                {/* Custom Tags */}
                {currentImage.custom_tags?.filter(tag => !currentImage.tags?.some(aiTag => aiTag.tag_value === tag)).map((tag, idx) => (
                  editingTagIndex?.index === idx && !editingTagIndex.isAi ? (
                    <input 
                      key={`custom-edit-${idx}`}
                      autoFocus
                      value={editTagValue}
                      onChange={(e) => setEditTagValue(e.target.value)}
                      onBlur={handleSaveTagEdit}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSaveTagEdit();
                        if (e.key === 'Escape') setEditingTagIndex(null);
                      }}
                      className="px-2 py-1 bg-white/10 text-white/90 rounded text-xs flex items-center border border-white/30 outline-none w-24"
                    />
                  ) : (
                    <span 
                      key={`custom-${idx}`} 
                      onClick={() => {
                        setEditingTagIndex({ index: idx, isAi: false, originalValue: tag });
                        setEditTagValue(tag);
                      }}
                      className="px-2 py-1 bg-white/5 hover:bg-white/10 text-white/80 rounded text-xs flex items-center border border-white/10 cursor-text group/tag transition-colors"
                    >
                      {tag}
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveCustomTag(tag);
                        }}
                        className="ml-1.5 opacity-0 group-hover/tag:opacity-100 hover:text-red-400 transition-opacity"
                        title="删除标签"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  )
                ))}
              </div>
              
              <input 
                type="text"
                placeholder="输入标签后按回车添加..."
                value={newTagInput}
                onChange={(e) => setNewTagInput(e.target.value)}
                onKeyDown={handleAddCustomTag}
                className="w-full text-sm px-3 py-2 border border-white/10 rounded-lg bg-black/30 focus:outline-none focus:border-[#9c39ff] transition-colors text-white"
              />
              
              {/* Existing Tags suggestion */}
              <div className="mt-3">
                <div className="text-xs text-white/30 mb-2">已有标签</div>
                <div className="flex flex-wrap gap-2">
                  {Array.from(new Set(images.flatMap(img => [
                      ...(img.custom_tags || []),
                      ...(img.tags?.filter(t => t.tag_type !== 'color' && t.tag_type !== 'style' && t.tag_type !== 'function').map(t => translateTag(t.tag_value)) || [])
                    ])))
                    .filter(t => !currentImage.custom_tags?.includes(t) && !currentImage.tags?.some(aiTag => translateTag(aiTag.tag_value) === t))
                    .map(tag => (
                      <button 
                        key={tag}
                        onClick={() => updateImage(currentImage.id, { custom_tags: [...(currentImage.custom_tags || []), tag] })}
                        className="px-2 py-1 bg-white/5 hover:bg-white/10 text-white/60 rounded text-xs transition-colors"
                      >
                        + {tag}
                      </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
          
          <div className="mt-auto pt-6">
            <div className="text-xs text-white/30">
              上传时间：{new Date(currentImage.created_at).toLocaleString()}
            </div>
          </div>
        </div>
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <div 
          className="fixed z-50 bg-[#2A2B32] border border-white/10 rounded-lg shadow-2xl py-1 w-36 overflow-hidden animate-in fade-in zoom-in-95 duration-100"
          style={{ top: contextMenu.y, left: contextMenu.x }}
        >
          <button 
            className="w-full text-left px-4 py-2.5 text-sm text-white hover:bg-[#9c39ff] transition-colors flex items-center"
            onClick={handleCopyImage}
          >
            <Copy className="w-4 h-4 mr-2 opacity-70" />
            复制图片
          </button>
        </div>
      )}
    </div>
  );
}
