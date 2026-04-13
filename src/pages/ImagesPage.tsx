import { useEffect, useState, useCallback, useMemo } from 'react';
import { useDropzone } from 'react-dropzone';
import { Loader2, ArrowLeft, LayoutGrid, List, Folder, ChevronRight, Copy, Zap, Check, Trash2, Tag } from 'lucide-react';
import { useImageStore } from '../store/useImageStore';
import { useSearchStore } from '../store/useSearchStore';
import { usePingStore } from '../store/usePingStore';
import { analyzeImage } from '../utils/realAi';
import { ImageItem } from '../types';
import ImageModal from '../components/ImageModal';
import SearchBar from '../components/SearchBar';

export default function ImagesPage() {
  const { images, isLoading, loadImages, addImage, updateImage } = useImageStore();
  const [uploading, setUploading] = useState(false);
  const [selectedImage, setSelectedImage] = useState<ImageItem | null>(null);
  
  const [editingField, setEditingField] = useState<{ id: string, field: 'filename' | 'tags' } | null>(null);
  const [editValue, setEditValue] = useState('');
  
  const [activeTab, setActiveTab] = useState('全部');
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [visibleCount, setVisibleCount] = useState(20);
  const [zoomLevel, setZoomLevel] = useState(3); // 1 to 5
  const { searchQuery } = useSearchStore();
  const { items: pingItems, setItems: setPingItems } = usePingStore();
  const { deleteImage } = useImageStore();

  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedImageIds, setSelectedImageIds] = useState<Set<string>>(new Set());

  const [contextMenu, setContextMenu] = useState<{x: number, y: number, img: ImageItem} | null>(null);

  useEffect(() => {
    const closeMenu = () => setContextMenu(null);
    window.addEventListener('click', closeMenu);
    return () => window.removeEventListener('click', closeMenu);
  }, []);

  const [similarImageRef, setSimilarImageRef] = useState<ImageItem | null>(null);
  
  const [batchTagInput, setBatchTagInput] = useState<{isOpen: boolean, value: string}>({isOpen: false, value: ''});

  const handleToggleImageSelection = (e: React.MouseEvent, imgId: string) => {
    if (!isSelectMode) return;
    setSelectedImageIds(prev => {
      const next = new Set(prev);
      if (next.has(imgId)) next.delete(imgId);
      else next.add(imgId);
      return next;
    });
  };

  const handleBatchDelete = async () => {
    if (selectedImageIds.size === 0) return;
    if (window.confirm(`确定要删除选中的 ${selectedImageIds.size} 张图片吗？`)) {
      for (const id of Array.from(selectedImageIds)) {
        await deleteImage(id);
      }
      setSelectedImageIds(new Set());
      setIsSelectMode(false);
    }
  };

  const handleBatchAddToPing = () => {
    if (selectedImageIds.size === 0) return;
    const itemsToAdd = Array.from(selectedImageIds)
      .filter(id => !pingItems.some(item => item.id === id))
      .map(id => {
        const img = images.find(img => img.id === id);
        return img ? { id: img.id, type: 'image' as const, content: img.storage_path } : null;
      })
      .filter(Boolean) as any[];

    if (itemsToAdd.length > 0) {
      setPingItems(prev => [...prev, ...itemsToAdd]);
      alert(`已成功将 ${itemsToAdd.length} 张图片加入砰~`);
    } else {
      alert('选中的图片已在砰~中');
    }
    setSelectedImageIds(new Set());
    setIsSelectMode(false);
  };

  const handleBatchAddTags = () => {
    if (selectedImageIds.size === 0) return;
    setBatchTagInput({ isOpen: true, value: '' });
  };

  const confirmBatchAddTags = async () => {
    const { value: newTagsStr } = batchTagInput;
    if (newTagsStr) {
      const newTags = newTagsStr.split(/[,，]/).map(t => t.trim()).filter(Boolean);
      if (newTags.length > 0) {
        for (const id of Array.from(selectedImageIds)) {
          const img = images.find(img => img.id === id);
          if (img) {
            const currentTags = img.custom_tags || [];
            const mergedTags = Array.from(new Set([...currentTags, ...newTags]));
            await updateImage(id, { custom_tags: mergedTags });
          }
        }
        setIsSelectMode(false);
        setSelectedImageIds(new Set());
      }
    }
    setBatchTagInput({ isOpen: false, value: '' });
  };

  // Get all existing unique custom tags across all images for the suggestion list
  const allExistingTags = useMemo(() => {
    const tagSet = new Set<string>();
    images.forEach(img => {
      if (img.custom_tags) {
        img.custom_tags.forEach(t => tagSet.add(t));
      }
    });
    return Array.from(tagSet);
  }, [images]);

  const handleToggleBatchTag = (tag: string) => {
    setBatchTagInput(prev => {
      const currentTags = prev.value.split(/[,，]/).map(t => t.trim()).filter(Boolean);
      if (currentTags.includes(tag)) {
        return { ...prev, value: currentTags.filter(t => t !== tag).join(', ') };
      } else {
        return { ...prev, value: [...currentTags, tag].join(', ') };
      }
    });
  };

  const handleAddToPing = (e: React.MouseEvent, img: ImageItem) => {
    e.stopPropagation();
    
    // Check if already in ping
    if (pingItems.some(item => item.id === img.id)) {
      alert('该图片已在砰~中');
      return;
    }
    
    setPingItems(prev => [
      ...prev, 
      { 
        id: img.id, 
        type: 'image', 
        content: img.storage_path 
      }
    ]);
    
    // Optional: Add toast notification here
  };

  const handleSaveEdit = async () => {
    if (!editingField) return;
    const { id, field } = editingField;
    
    if (field === 'filename') {
      if (editValue.trim()) {
        await updateImage(id, { filename: editValue.trim() });
      }
    } else if (field === 'tags') {
      const newTags = editValue.split(/[,，]/).map(t => t.trim()).filter(Boolean);
      await updateImage(id, { custom_tags: newTags });
    }
    setEditingField(null);
  };

  const getDisplayTags = (img: ImageItem) => {
    // Collect tags from custom tags and AI tags
    const allTags = [
      ...(img.tags?.map(t => translateTag(t.tag_value)) || []),
      ...(img.custom_tags || [])
    ].filter(Boolean);
    
    // Deduplicate and return array (max 3 tags for visual cleanliness on hover)
    return Array.from(new Set(allTags)).slice(0, 3);
  };

  const tabs = ['全部', '标签', '名称', '功能', '风格', '色系', '尺寸'];

  // Legacy English to Chinese mapping for old indexedDB data
  const legacyTranslationMap: Record<string, string> = {
    'cyberpunk': '赛博朋克',
    'flat': '扁平化',
    'glassmorphism': '玻璃拟态',
    'retro': '复古',
    'minimalism': '极简主义',
    'skeuomorphism': '拟物化',
    'warm': '红',
    'cold': '蓝',
    'neutral': '黑白',
    'high_saturation': '紫',
    'low_saturation': '黄',
    'landing_page': '登录页',
    'banner': '横幅',
    'icon': '图标',
    'illustration': '插画',
    'ui_component': '界面组件',
    'color_scheme': '配色方案'
  };

  const translateTag = (val: string) => legacyTranslationMap[val?.toLowerCase?.()] || val;

  useEffect(() => {
    loadImages();
  }, [loadImages]);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;
    
    setUploading(true);
    try {
      for (const file of acceptedFiles) {
        const reader = new FileReader();
        const dataUrl = await new Promise<string>((resolve) => {
          reader.onload = (e) => resolve(e.target?.result as string);
          reader.readAsDataURL(file);
        });

        // Get image dimensions
        const img = new Image();
        const dimensions = await new Promise<{width: number, height: number}>((resolve) => {
          img.onload = () => resolve({ width: img.width, height: img.height });
          img.src = dataUrl;
        });

        const id = crypto.randomUUID();
        const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
        // Extract original filename without extension, or fallback to file.name
        const originalName = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
        const filename = originalName;

        const aiData = await analyzeImage(filename, dimensions.width, dimensions.height, dataUrl);

        const newImage: ImageItem = {
          id,
          user_id: 'user_1',
          filename,
          storage_path: dataUrl,
          created_at: new Date().toISOString(),
          file_size: file.size,
          width: dimensions.width,
          height: dimensions.height,
          aspect_ratio: aiData.aspect_ratio,
          color_tone: aiData.color_tone as any,
          extracted_colors: aiData.extracted_colors,
          style: aiData.style as any,
          function_type: aiData.function_type as any,
          ocr_text: aiData.ocr_text,
          semantic_description: aiData.semantic_description,
          tags: aiData.tags.map((t, idx) => ({ ...t, id: `tag_${id}_${idx}`, image_id: id })),
        };

        await addImage(newImage);
      }
    } catch (error) {
      console.error('Failed to upload', error);
      alert('上传失败，请重试');
    } finally {
      setUploading(false);
    }
  }, [addImage]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.png', '.jpg', '.webp', '.gif']
    }
  });

  const filteredImages = useMemo(() => {
    let result = [...images].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    // 1. Similar Image Search (图搜图) overrides text search temporarily
    if (similarImageRef) {
      // Mock similarity logic: matches style or color or aspect_ratio
      return result.filter(img => 
        img.id !== similarImageRef.id && (
          img.style === similarImageRef.style ||
          img.color_tone === similarImageRef.color_tone ||
          img.aspect_ratio === similarImageRef.aspect_ratio
        )
      );
    }

    // 2. Text/Vibe Search
    if (!searchQuery.trim()) return result;
    const q = searchQuery.toLowerCase();
    
    // Mock Natural Language Processing (Fuzzy Search)
    // Strip common Chinese filler words to extract core intents
    const fillerWords = ['画面', '中有', '的', '图片', '照片', '帮我找', '搜索', '有没有', '包含', '一张', '我想看'];
    let keywords = q;
    fillerWords.forEach(word => {
      keywords = keywords.split(word).join(' ');
    });
    
    const searchTerms = keywords.split(/\s+/).filter(Boolean);
    if (searchTerms.length === 0) searchTerms.push(q);

    return result.filter(img => {
      // 1. Prioritize exact/substring matches for OCR and filename
      // Also apply a basic typo correction for specific known errors like "蝉吗妈" -> "蝉妈妈"
      // Remove any whitespace to handle searches like "蝉 妈 妈"
      const normalizedQ = q.replace(/\s+/g, '').replace('蝉吗妈', '蝉妈妈');
      const normalizedOcr = img.ocr_text ? img.ocr_text.replace(/\s+/g, '').toLowerCase() : '';
      const normalizedFilename = img.filename ? img.filename.replace(/\s+/g, '').toLowerCase() : '';

      if (normalizedOcr && normalizedOcr.includes(normalizedQ)) return true;
      if (normalizedFilename && normalizedFilename.includes(normalizedQ)) return true;

      // Semantic Enrichment Simulation for Mock AI
      // Since we only have static mock keywords for existing images, we dynamically expand 
      // visual traits (like aspect ratio and implicit contexts) into natural language terms.
      const getSemanticExpansion = (image: ImageItem) => {
        const traits = [];
        // Aspect ratio heuristic mapping
        if (image.aspect_ratio === '竖图') {
          traits.push('竖屏', '长图');
        } else if (image.aspect_ratio === '横图') {
          traits.push('横屏', '宽图');
        } else {
          traits.push('方图');
        }

        return traits.join(' ');
      };

      const textToSearch = [
        img.filename,
        translateTag(img.color_tone || ''),
        translateTag(img.style || ''),
        translateTag(img.function_type || ''),
        img.aspect_ratio,
        img.ocr_text,
        img.semantic_description,
        ...(img.tags?.map(t => translateTag(t.tag_value)) || []),
        ...(img.custom_tags || []),
        getSemanticExpansion(img) // Include dynamically inferred semantic traits
      ].filter(Boolean).join(' ').toLowerCase();

      // If there are search terms, check if ALL terms match to provide an accurate "AND" search
      // (This prevents a search for "手机" from matching images that just have "手" or unrelated tags)
      return searchTerms.every(term => {
        const normalizedTerm = term.replace('蝉吗妈', '蝉妈妈');
        return textToSearch.includes(normalizedTerm);
      });
    });
  }, [images, searchQuery, similarImageRef]);

  const groupedImages = useMemo(() => {
    if (activeTab === '全部') return null; // Don't group if '全部'
    
    const groups: Record<string, ImageItem[]> = {};
    filteredImages.forEach(img => {
      let keys: string[] = [];
      
      switch (activeTab) {
        case '名称':
          const firstChar = img.filename.charAt(0).toUpperCase();
          // Take first 3 characters for clustering, or fallback to first char if too short
          const prefix = img.filename.length >= 3 ? img.filename.substring(0, 3) : (/[A-Z]/.test(firstChar) ? firstChar : '#');
          keys = [prefix];
          break;
        case '标签':
          if (img.tags && img.tags.length > 0) {
            keys = img.tags.map(t => translateTag(t.tag_value));
          } else {
            keys = ['未标签'];
          }
          break;
        case '色系':
          keys = [translateTag(img.color_tone || '未知色系')];
          break;
        case '风格':
          keys = [translateTag(img.style || '未知风格')];
          break;
        case '功能':
          keys = [translateTag(img.function_type || '未知功能')];
          break;
        case '尺寸':
          keys = [img.aspect_ratio || '未知尺寸'];
          break;
        default:
          keys = ['全部图片'];
      }

      keys.forEach(key => {
        if (!groups[key]) groups[key] = [];
        groups[key].push(img);
      });
    });
    return groups;
  }, [filteredImages, activeTab]);

  const handleCopyImage = async (e: React.MouseEvent, img: ImageItem) => {
    e.stopPropagation();
    try {
      const response = await fetch(img.storage_path);
      const blob = await response.blob();
      await navigator.clipboard.write([
        new ClipboardItem({
          [blob.type]: blob
        })
      ]);
      // Optional: Add a small visual feedback here if desired
    } catch (err) {
      console.error('Failed to copy image:', err);
      alert('复制图片失败，您的浏览器可能不支持此操作');
    }
  };

  const getZoomColumnsClass = () => {
    switch (zoomLevel) {
      case 1: return 'columns-4 md:columns-6 lg:columns-8 gap-3'; // Tiny
      case 2: return 'columns-3 md:columns-5 lg:columns-6 gap-4'; // Small
      case 3: return 'columns-2 md:columns-3 lg:columns-4 gap-6'; // Normal (default)
      case 4: return 'columns-1 md:columns-2 lg:columns-3 gap-8'; // Large
      case 5: return 'columns-1 md:columns-2 gap-10'; // Huge
      default: return 'columns-2 md:columns-3 lg:columns-4 gap-6';
    }
  };

  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    const clipboardItems = e.clipboardData.items;
    const filesToUpload: File[] = [];

    for (const item of clipboardItems) {
      if (item.type.indexOf('image') !== -1) {
        const file = item.getAsFile();
        if (file) {
          // If pasting a file without a proper name (like a screenshot), give it a timestamped name
          if (file.name === 'image.png' || !file.name) {
            const newFile = new File([file], `截屏_${new Date().getTime()}.png`, { type: file.type });
            filesToUpload.push(newFile);
          } else {
            filesToUpload.push(file);
          }
        }
      }
    }

    if (filesToUpload.length > 0) {
      onDrop(filesToUpload);
    }
  }, [onDrop]);

  return (
    <div 
      className="h-full flex flex-col px-10 overflow-y-auto custom-scrollbar focus:outline-none"
      onPaste={handlePaste}
      tabIndex={0} // Allows the div to receive focus to capture paste events globally
    >
      {/* Upload Area */}
      <div 
        {...getRootProps()} 
        className={`relative mx-auto w-full max-w-4xl shrink-0 border border-dashed rounded-2xl py-12 flex flex-col items-center justify-center transition-colors cursor-pointer mt-6 mb-8 overflow-hidden
          ${uploading 
            ? 'border-transparent' 
            : isDragActive 
              ? 'border-[#9c39ff] bg-[#9c39ff]/10' 
              : 'border-white/10 bg-[#1D1E24]/30 hover:bg-white/5'
          }`}
      >
        <input {...getInputProps()} />
        {uploading ? (
          <div className="absolute inset-0 z-10 w-full h-full flex flex-col items-center justify-center rounded-2xl overflow-hidden bg-gradient-to-r from-[#20B2AA] via-[#7B61FF] to-[#9c39ff]">
            {/* Sweep light sheen effect */}
            <div className="absolute top-0 bottom-0 w-[50%] bg-gradient-to-r from-transparent via-white/30 to-transparent -skew-x-[20deg] animate-sweep" />

            <div className="relative z-10 flex flex-col items-center">
              {/* Custom neon spinner */}
              <div className="relative w-8 h-8 mb-3">
                <div className="absolute inset-0 rounded-full border-[3px] border-white/20"></div>
                <div className="absolute inset-0 rounded-full border-[3px] border-transparent border-t-white border-r-white/80 animate-spin"></div>
              </div>
              <p className="font-medium text-[14px] text-white tracking-wide shadow-black drop-shadow-sm">
                AI 正在智能解析...
              </p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center text-slate-300 z-10">
            <div className="text-3xl font-light mb-1 text-white/60">+</div>
            <p className="font-medium text-white/80 mb-1 text-sm">
              点击上传，或拖拽图片到这里
            </p>
            <p className="text-xs text-white/50">支持 Ctrl+V 粘贴 (需选中此区域)</p>
          </div>
        )}
      </div>

      {!selectedGroup && !searchQuery.trim() && !similarImageRef ? (
        <>
          {/* View Tabs (Sticky) */}
          <div className="sticky top-0 z-20 bg-transparent backdrop-blur-xl flex items-center justify-between py-4 mb-6 border-b border-white/5 -mx-10 px-10">
            <div className="flex-1"></div> {/* Left spacer */}
            <div className="flex items-center justify-center space-x-3 flex-[2]">
              {tabs.map((tab, idx) => (
                <button 
                  key={idx}
                  onClick={() => {
                    setActiveTab(tab);
                    setVisibleCount(20); // Reset pagination
                  }}
                  className={`px-4 py-1.5 text-sm rounded-lg transition-colors border whitespace-nowrap ${
                    activeTab === tab 
                      ? 'border-[#9c39ff] bg-[#9c39ff]/10 text-white font-medium shadow-[0_0_10px_rgba(156,57,255,0.2)]' 
                      : 'border-white/10 bg-white/5 text-slate-300 hover:bg-white/10'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
            <div className="flex-1 flex justify-end gap-3">
              {isSelectMode ? (
                <button 
                  onClick={() => {
                    setIsSelectMode(false);
                    setSelectedImageIds(new Set());
                  }}
                  className="px-4 py-1.5 text-white/70 hover:text-white text-sm font-medium transition-colors"
                >
                  取消
                </button>
              ) : (
                <>
                  {activeTab !== '全部' && !selectedGroup && (
                    <div className="flex items-center bg-black/40 rounded-lg p-1 border border-white/10">
                      <button 
                        onClick={() => setViewMode('grid')} 
                        className={`p-1.5 rounded-md transition-colors ${viewMode === 'grid' ? 'bg-white/20 text-white' : 'text-white/50 hover:text-white/80'}`} 
                        title="图钉视图"
                      >
                        <LayoutGrid className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => setViewMode('list')} 
                        className={`p-1.5 rounded-md transition-colors ${viewMode === 'list' ? 'bg-white/20 text-white' : 'text-white/50 hover:text-white/80'}`} 
                        title="列表视图"
                      >
                        <List className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                  {(activeTab === '全部' || selectedGroup) && (
                    <button 
                      onClick={() => setIsSelectMode(true)}
                      className="px-4 py-1.5 border border-[#9c39ff]/50 hover:bg-[#9c39ff]/10 text-[#9c39ff] hover:text-[#b469ff] rounded-lg text-sm font-medium transition-colors"
                    >
                      批量管理
                    </button>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Folder Grid or All Images */}
          {isLoading ? (
            <div className="flex-1 flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-[#9c39ff]" />
            </div>
          ) : images.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center py-20 text-slate-500">
              <p>暂无灵感图片，快去上传吧！</p>
            </div>
          ) : activeTab === '全部' ? (
            <div className="pb-24 max-w-6xl mx-auto w-full">
              <div className="columns-2 md:columns-3 lg:columns-4 gap-6 space-y-6">
                {filteredImages.slice(0, visibleCount).map((img) => (
                  <div 
                key={img.id} 
                className={`break-inside-avoid cursor-pointer group relative ${isSelectMode && selectedImageIds.has(img.id) ? 'ring-2 ring-[#9c39ff] rounded-xl' : ''}`}
                onClick={(e) => {
                  if (isSelectMode) {
                    handleToggleImageSelection(e, img.id);
                  } else {
                    if (editingField?.id === img.id) {
                      e.stopPropagation();
                      setEditingField(null);
                    } else {
                      setSelectedImage(img);
                    }
                  }
                }}
                onContextMenu={(e) => {
                  if (isSelectMode) return;
                  e.preventDefault();
                  setContextMenu({ x: e.pageX, y: e.pageY, img });
                }}
              >
                {/* Checkbox for Select Mode */}
                {isSelectMode && (
                  <div className="absolute top-3 left-3 z-50">
                    <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${
                      selectedImageIds.has(img.id) 
                        ? 'bg-[#9c39ff] border-[#9c39ff]' 
                        : 'bg-black/40 border-white/40 hover:border-white'
                    }`}>
                      {selectedImageIds.has(img.id) && <Check className="w-3.5 h-3.5 text-white" />}
                    </div>
                  </div>
                )}
                
                <div className="rounded-xl overflow-hidden bg-slate-900 shadow-lg w-full relative">
                  <img 
                    src={img.storage_path} 
                    alt={img.filename}
                    className="w-full h-auto object-cover opacity-90 group-hover:opacity-100 transition-opacity"
                  />
                </div>
                
                {/* Add to Ping Action */}
                {!isSelectMode && (
                  <>
                    <button 
                      onClick={(e) => {
                        if (pingItems.some(item => item.id === img.id)) {
                          e.stopPropagation();
                          return; // Do nothing if already added
                        }
                        handleAddToPing(e, img);
                      }}
                      disabled={pingItems.some(item => item.id === img.id)}
                      className={`absolute top-3 right-3 w-6 h-6 rounded-full flex items-center justify-center transition-all z-50 shadow-md backdrop-blur-md opacity-0 group-hover:opacity-100
                        ${pingItems.some(item => item.id === img.id) 
                          ? 'bg-black/40 text-white/50 cursor-not-allowed' 
                          : 'bg-black/60 hover:bg-[#9c39ff]/90 text-white cursor-pointer'
                        }`}
                      title={pingItems.some(item => item.id === img.id) ? "已在砰~中" : "加入灵感碰撞"}
                    >
                      <Zap className={`w-3 h-3 ${pingItems.some(item => item.id === img.id) ? 'fill-current' : ''}`} />
                    </button>
                    
                    <div className={`absolute top-3 left-3 right-10 flex flex-col gap-1.5 items-start transition-opacity z-40 ${editingField?.id === img.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                    {/* Core Colors */}
                    {img.extracted_colors && img.extracted_colors.length > 0 && (
                      <div className="flex gap-1.5 mb-0.5 px-1 relative z-40">
                        {img.extracted_colors.slice(0, 5).map((color, i) => (
                          <div 
                            key={i} 
                            className="w-3.5 h-3.5 rounded-full shadow-[0_2px_5px_rgba(0,0,0,0.2)] border border-white/40" 
                            style={{ backgroundColor: color }} 
                          />
                        ))}
                      </div>
                    )}

                    {/* Tags */}
                    <div className="relative w-max max-w-[200px] z-40 flex flex-col gap-1.5">
                      {editingField?.id === img.id && editingField.field === 'tags' ? (
                        <input
                          autoFocus
                          value={editValue}
                          onChange={e => setEditValue(e.target.value)}
                          onClick={e => e.stopPropagation()}
                          onBlur={handleSaveEdit}
                          onKeyDown={e => {
                            if (e.key === 'Enter') handleSaveEdit();
                            if (e.key === 'Escape') setEditingField(null);
                          }}
                          className="block w-full px-3 py-1.5 bg-white/60 backdrop-blur-xl text-slate-900 border border-white/60 shadow-[0_4px_10px_rgba(0,0,0,0.15)] rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#9c39ff]/50"
                        />
                      ) : (
                        getDisplayTags(img).length > 0 ? (
                          getDisplayTags(img).map((tag, idx) => (
                            <span 
                              key={idx}
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingField({ id: img.id, field: 'tags' });
                                // When editing, we want to show all tags joined by comma so user can edit the full list
                                const allTagsString = Array.from(new Set([
                                  ...(img.tags?.map(t => translateTag(t.tag_value)) || []),
                                  ...(img.custom_tags || [])
                                ].filter(Boolean))).join(', ');
                                setEditValue(allTagsString);
                              }}
                              className="block px-3 py-1.5 bg-white/20 backdrop-blur-md backdrop-brightness-75 text-white border border-white/30 shadow-[0_4px_10px_rgba(0,0,0,0.15)] rounded-lg text-sm font-medium break-words whitespace-normal cursor-text hover:bg-white/30 transition-colors"
                              title="点击编辑所有标签"
                            >
                              {tag}
                            </span>
                          ))
                        ) : (
                          <span 
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingField({ id: img.id, field: 'tags' });
                              setEditValue('');
                            }}
                            className="block px-3 py-1.5 bg-white/20 backdrop-blur-md backdrop-brightness-75 text-white border border-white/30 shadow-[0_4px_10px_rgba(0,0,0,0.15)] rounded-lg text-sm font-medium break-words whitespace-normal cursor-text hover:bg-white/30 transition-colors"
                            title="点击添加标签"
                          >
                            添加标签...
                          </span>
                        )
                      )}
                    </div>

                    {/* Filename */}
                    <div className="relative w-max max-w-[200px] z-40">
                      {editingField?.id === img.id && editingField.field === 'filename' ? (
                        <input
                          autoFocus
                          value={editValue}
                          onChange={e => setEditValue(e.target.value)}
                          onClick={e => e.stopPropagation()}
                          onBlur={handleSaveEdit}
                          onKeyDown={e => {
                            if (e.key === 'Enter') handleSaveEdit();
                            if (e.key === 'Escape') setEditingField(null);
                          }}
                          className="block w-full px-3 py-1.5 bg-white/60 backdrop-blur-xl text-slate-900 border border-white/60 shadow-[0_4px_10px_rgba(0,0,0,0.15)] rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#9c39ff]/50"
                        />
                      ) : (
                        <span 
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingField({ id: img.id, field: 'filename' });
                            setEditValue(img.filename);
                          }}
                          className="block px-3 py-1.5 bg-white/20 backdrop-blur-md backdrop-brightness-75 text-white border border-white/30 shadow-[0_4px_10px_rgba(0,0,0,0.15)] rounded-lg text-sm font-medium break-words whitespace-normal cursor-text hover:bg-white/30 transition-colors"
                          title="点击编辑名称"
                        >
                          {img.filename}
                        </span>
                      )}
                    </div>
                  </div>
                </>
              )}
                
              {/* Show OCR match if searching */}
              {!isSelectMode && searchQuery.trim() && img.ocr_text && (
                  (() => {
                    const normalizedSearch = searchQuery.trim().toLowerCase().replace(/\s+/g, '').replace('蝉吗妈', '蝉妈妈');
                    const normalizedOcr = img.ocr_text.replace(/\s+/g, '').toLowerCase();
                    return normalizedOcr.includes(normalizedSearch);
                  })()
                ) && (
                  <div className="absolute bottom-3 left-3 right-3 flex opacity-0 group-hover:opacity-100 transition-opacity z-50">
                    <span className="px-2.5 py-1.5 bg-blue-500/90 backdrop-blur-md text-white rounded text-xs font-medium shadow-sm truncate w-full">
                      📝 识别文字: {img.ocr_text}
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
          {visibleCount < filteredImages.length && (
            <div className="flex justify-center mt-12">
              <button 
                onClick={() => setVisibleCount(prev => prev + 20)}
                className="px-6 py-2 rounded-full border border-white/10 bg-white/5 text-white/70 hover:bg-white/10 hover:text-white transition-colors"
              >
                加载更多
              </button>
            </div>
          )}
        </div>
      ) : (
            <div className="pb-24">
              {viewMode === 'grid' ? (
                <>
                  {/* Global SVG Defs for the 3D Pin to avoid duplication and clipping */}
                  <svg width="0" height="0" className="absolute pointer-events-none">
                    <defs>
                      <radialGradient id="pinPurple" cx="30%" cy="30%" r="70%" fx="25%" fy="25%">
                        <stop offset="0%" stopColor="#d8b4fe" />
                        <stop offset="15%" stopColor="#c084fc" />
                        <stop offset="60%" stopColor="#9333ea" />
                        <stop offset="100%" stopColor="#581c87" />
                      </radialGradient>
                      <linearGradient id="pinMetal" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#888" />
                        <stop offset="35%" stopColor="#fff" />
                        <stop offset="65%" stopColor="#aaa" />
                        <stop offset="100%" stopColor="#444" />
                      </linearGradient>
                      <filter id="shadowBlur">
                        <feGaussianBlur stdDeviation="1.5" />
                      </filter>
                    </defs>
                  </svg>
                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-x-8 gap-y-12 max-w-6xl mx-auto">
                  {Object.entries(groupedImages).sort(([a], [b]) => a.localeCompare(b)).map(([groupName, imgs], idx) => (
                    <div 
                      key={groupName}
                      onClick={() => setSelectedGroup(groupName)}
                      className="group cursor-pointer flex flex-col items-center relative"
                    >
                      <div className="relative w-full aspect-square max-w-[160px] mx-auto">
                        {/* Background stacked card */}
                        <div className="absolute inset-0 rounded-xl border-2 border-white bg-black/20 translate-x-2 translate-y-2 rotate-[-4deg] opacity-60"></div>
                        
                        {/* Main card */}
                        <div className="absolute inset-0 rounded-xl border-2 border-white overflow-hidden shadow-[0_0_15px_rgba(255,255,255,0.2)] bg-black">
                          {imgs.length > 0 ? (
                            <img src={imgs[0].storage_path} alt="" className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                          ) : (
                            <div className="w-full h-full bg-slate-900"></div>
                          )}
                        </div>

                        {/* Pill badge */}
                        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-[110%] flex justify-center">
                    <div className="bg-gradient-to-b from-[#7828c8] to-[#5a1c9e] text-white text-xs font-medium px-4 py-1.5 rounded-lg border border-white/10 shadow-[0_4px_10px_rgba(0,0,0,0.5)] truncate max-w-full text-center whitespace-nowrap">
                      {groupName} ({imgs.length})
                    </div>
                  </div>
                        
                        {/* 3D Pin icon */}
                        <div className="absolute -top-3 -right-3 w-8 h-8 z-30 drop-shadow-xl pointer-events-none group-hover:scale-110 transition-transform origin-bottom">
                          <svg viewBox="0 0 60 60" fill="none" xmlns="http://www.w3.org/2000/svg">
                            {/* Cast shadow on the card */}
                            <ellipse cx="26" cy="46" rx="5" ry="2.5" fill="rgba(0,0,0,0.4)" filter="url(#shadowBlur)" />
                            {/* Extended shadow from the needle/head */}
                            <path d="M26 46 L40 34 L45 38 Z" fill="rgba(0,0,0,0.15)" filter="url(#shadowBlur)" />
                            
                            <g transform="rotate(-15, 26, 46)">
                              {/* Needle */}
                              <path d="M24 22 L24 44 C24 46 28 46 28 44 L28 22 Z" fill="url(#pinMetal)" />
                              {/* Pin Head */}
                              <circle cx="26" cy="14" r="14" fill="url(#pinPurple)" />
                              {/* Highlight reflection */}
                              <ellipse cx="21" cy="9" rx="5" ry="2" fill="white" opacity="0.6" transform="rotate(-30 21 9)" />
                            </g>
                          </svg>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                </>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-w-6xl mx-auto">
                  {Object.entries(groupedImages).sort(([a], [b]) => a.localeCompare(b)).map(([groupName, imgs]) => (
                    <div 
                      key={groupName}
                      onClick={() => setSelectedGroup(groupName)}
                      className="flex items-center px-4 py-2.5 bg-[#1D1E24]/60 hover:bg-white/10 rounded-xl cursor-pointer transition-colors border border-white/5"
                    >
                      <div className="w-8 h-8 rounded bg-[#3b82f6] flex items-center justify-center shrink-0 mr-3 shadow-sm">
                        <Folder className="w-4 h-4 text-white fill-white/20" />
                      </div>
                      <div className="flex-1 min-w-0 flex items-center justify-between mr-2">
                        <h3 className="text-white font-medium truncate text-sm">{groupName}</h3>
                        <span className="text-xs text-white/40 shrink-0 ml-4">{imgs.length} 项</span>
                      </div>
                      <ChevronRight className="w-4 h-4 text-white/30 shrink-0" />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      ) : (
        /* Waterfall View (Secondary Page or Search Results) */
        <div className="flex-1 flex flex-col mt-4 max-w-6xl mx-auto w-full pb-24 relative">
          <div className="sticky top-0 z-20 bg-transparent backdrop-blur-xl flex items-center justify-between py-4 mb-8 border-b border-white/5 -mx-10 px-10">
            {!searchQuery.trim() && !similarImageRef ? (
              <>
                <button 
                  onClick={() => setSelectedGroup(null)}
                  className="flex items-center px-3 py-1.5 text-sm bg-white/10 hover:bg-white/20 text-white rounded-md transition-colors"
                >
                  <ArrowLeft className="w-4 h-4 mr-1" />
                  返回
                </button>
                <h2 className="font-medium text-white absolute left-1/2 -translate-x-1/2">
                  {selectedGroup} ({groupedImages?.[selectedGroup || '']?.length || 0})
                </h2>
                
                {/* Zoom Control */}
                <div className="flex items-center bg-black/40 rounded-full px-3 py-1.5 border border-white/10">
                  <span className="text-white/40 text-xs mr-2 font-medium">预览大小</span>
                  <input 
                    type="range" 
                    min="1" 
                    max="5" 
                    step="1"
                    value={zoomLevel}
                    onChange={(e) => setZoomLevel(parseInt(e.target.value))}
                    className="w-24 h-1 bg-white/20 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-[#9c39ff] [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:shadow-[0_0_10px_rgba(156,57,255,0.8)]"
                  />
                </div>
              </>
            ) : similarImageRef ? (
              <>
                <button 
                  onClick={() => setSimilarImageRef(null)}
                  className="flex items-center px-3 py-1.5 text-sm bg-white/10 hover:bg-white/20 text-white rounded-md transition-colors shrink-0"
                >
                  返回
                </button>
                <div className="flex flex-col items-center">
                  <h2 className="font-medium text-white">
                    找到 {filteredImages.length} 张相似图片
                  </h2>
                  <p className="text-xs text-white/50 mt-1">基于视觉大模型，相似度维度：风格、色调、构图</p>
                </div>
                <div className="w-[70px]"></div> {/* Spacer */}
              </>
            ) : (
              <h2 className="font-medium text-white w-full text-center">
                搜索结果: "{searchQuery}" ({filteredImages.length} 张图片)
              </h2>
            )}
          </div>
          
          {filteredImages.length === 0 && (searchQuery.trim() || similarImageRef) ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-500">
              <p>没有找到相关图片</p>
            </div>
          ) : (
            <>
              <div className={`${getZoomColumnsClass()} space-y-6`}>
              {(searchQuery.trim() || similarImageRef ? filteredImages : (groupedImages?.[selectedGroup!] || [])).map((img) => (
              <div 
                key={img.id} 
                className={`break-inside-avoid cursor-pointer group relative ${isSelectMode && selectedImageIds.has(img.id) ? 'ring-2 ring-[#9c39ff] rounded-xl' : ''}`}
                onClick={(e) => {
                  if (isSelectMode) {
                    handleToggleImageSelection(e, img.id);
                  } else {
                    if (editingField?.id === img.id) {
                      e.stopPropagation();
                      setEditingField(null);
                    } else {
                      setSelectedImage(img);
                    }
                  }
                }}
                onContextMenu={(e) => {
                  if (isSelectMode) return;
                  e.preventDefault();
                  setContextMenu({ x: e.pageX, y: e.pageY, img });
                }}
              >
                {/* Checkbox for Select Mode */}
                {isSelectMode && (
                  <div className="absolute top-3 left-3 z-50">
                    <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${
                      selectedImageIds.has(img.id) 
                        ? 'bg-[#9c39ff] border-[#9c39ff]' 
                        : 'bg-black/40 border-white/40 hover:border-white'
                    }`}>
                      {selectedImageIds.has(img.id) && <Check className="w-3.5 h-3.5 text-white" />}
                    </div>
                  </div>
                )}
                
                <div className="rounded-xl overflow-hidden bg-slate-900 shadow-lg w-full relative">
                  <img 
                    src={img.storage_path} 
                    alt={img.filename}
                    className="w-full h-auto object-cover opacity-90 group-hover:opacity-100 transition-opacity"
                  />
                </div>
                
                {/* Conditional Actions/Tags based on mode */}
                {!isSelectMode && (
                  <>
                    {/* Add to Ping Action */}
                    <button 
                      onClick={(e) => {
                        if (pingItems.some(item => item.id === img.id)) {
                          e.stopPropagation();
                          return; // Do nothing if already added
                        }
                        handleAddToPing(e, img);
                      }}
                      disabled={pingItems.some(item => item.id === img.id)}
                      className={`absolute top-3 right-3 w-6 h-6 rounded-full flex items-center justify-center transition-all z-50 shadow-md backdrop-blur-md opacity-0 group-hover:opacity-100
                        ${pingItems.some(item => item.id === img.id) 
                          ? 'bg-black/40 text-white/50 cursor-not-allowed' 
                          : 'bg-black/60 hover:bg-[#9c39ff]/90 text-white cursor-pointer'
                        }`}
                      title={pingItems.some(item => item.id === img.id) ? "已在砰~中" : "加入灵感碰撞"}
                    >
                      <Zap className={`w-3 h-3 ${pingItems.some(item => item.id === img.id) ? 'fill-current' : ''}`} />
                    </button>
                    
                    <div className={`absolute top-3 left-3 right-10 flex flex-col gap-1.5 items-start transition-opacity z-40 ${editingField?.id === img.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                      {/* Core Colors */}
                      {img.extracted_colors && img.extracted_colors.length > 0 && (
                        <div className="flex gap-1.5 mb-0.5 px-1 relative z-40">
                          {img.extracted_colors.slice(0, 5).map((color, i) => (
                            <div 
                              key={i} 
                              className="w-3.5 h-3.5 rounded-full shadow-[0_2px_5px_rgba(0,0,0,0.2)] border border-white/40" 
                              style={{ backgroundColor: color }} 
                            />
                          ))}
                        </div>
                      )}

                      {/* Tags */}
                      <div className="relative w-max max-w-[200px] z-40 flex flex-col gap-1.5">
                        {editingField?.id === img.id && editingField.field === 'tags' ? (
                          <input
                            autoFocus
                            value={editValue}
                            onChange={e => setEditValue(e.target.value)}
                            onClick={e => e.stopPropagation()}
                            onBlur={handleSaveEdit}
                            onKeyDown={e => {
                              if (e.key === 'Enter') handleSaveEdit();
                              if (e.key === 'Escape') setEditingField(null);
                            }}
                            className="block w-full px-3 py-1.5 bg-white/60 backdrop-blur-xl text-slate-900 border border-white/60 shadow-[0_4px_10px_rgba(0,0,0,0.15)] rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#9c39ff]/50"
                          />
                        ) : (
                          getDisplayTags(img).length > 0 ? (
                            getDisplayTags(img).map((tag, idx) => (
                              <span 
                                key={idx}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditingField({ id: img.id, field: 'tags' });
                                  // When editing, we want to show all tags joined by comma so user can edit the full list
                                  const allTagsString = Array.from(new Set([
                                    ...(img.tags?.map(t => translateTag(t.tag_value)) || []),
                                    ...(img.custom_tags || [])
                                  ].filter(Boolean))).join(', ');
                                  setEditValue(allTagsString);
                                }}
                                className="block px-3 py-1.5 bg-white/20 backdrop-blur-md backdrop-brightness-75 text-white border border-white/30 shadow-[0_4px_10px_rgba(0,0,0,0.15)] rounded-lg text-sm font-medium break-words whitespace-normal cursor-text hover:bg-white/30 transition-colors"
                                title="点击编辑所有标签"
                              >
                                {tag}
                              </span>
                            ))
                          ) : (
                            <span 
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingField({ id: img.id, field: 'tags' });
                                setEditValue('');
                              }}
                              className="block px-3 py-1.5 bg-white/20 backdrop-blur-md backdrop-brightness-75 text-white border border-white/30 shadow-[0_4px_10px_rgba(0,0,0,0.15)] rounded-lg text-sm font-medium break-words whitespace-normal cursor-text hover:bg-white/30 transition-colors"
                              title="点击添加标签"
                            >
                              添加标签...
                            </span>
                          )
                        )}
                      </div>

                      {/* Filename */}
                      <div className="relative w-max max-w-[200px] z-40">
                        {editingField?.id === img.id && editingField.field === 'filename' ? (
                          <input
                            autoFocus
                            value={editValue}
                            onChange={e => setEditValue(e.target.value)}
                            onClick={e => e.stopPropagation()}
                            onBlur={handleSaveEdit}
                            onKeyDown={e => {
                              if (e.key === 'Enter') handleSaveEdit();
                              if (e.key === 'Escape') setEditingField(null);
                            }}
                            className="block w-full px-3 py-1.5 bg-white/60 backdrop-blur-xl text-slate-900 border border-white/60 shadow-[0_4px_10px_rgba(0,0,0,0.15)] rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#9c39ff]/50"
                          />
                        ) : (
                          <span 
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingField({ id: img.id, field: 'filename' });
                              setEditValue(img.filename);
                            }}
                            className="block px-3 py-1.5 bg-white/20 backdrop-blur-md backdrop-brightness-75 text-white border border-white/30 shadow-[0_4px_10px_rgba(0,0,0,0.15)] rounded-lg text-sm font-medium break-words whitespace-normal cursor-text hover:bg-white/30 transition-colors"
                            title="点击编辑名称"
                          >
                            {img.filename}
                          </span>
                        )}
                      </div>
                    </div>
                  </>
                )}
                
                {/* Show OCR match if searching */}
                {!isSelectMode && searchQuery.trim() && img.ocr_text && (
                  (() => {
                    const normalizedSearch = searchQuery.trim().toLowerCase().replace(/\s+/g, '').replace('蝉吗妈', '蝉妈妈');
                    const normalizedOcr = img.ocr_text.replace(/\s+/g, '').toLowerCase();
                    return normalizedOcr.includes(normalizedSearch);
                  })()
                ) && (
                  <div className="absolute bottom-3 left-3 right-3 flex opacity-0 group-hover:opacity-100 transition-opacity z-50">
                    <span className="px-2.5 py-1.5 bg-blue-500/90 backdrop-blur-md text-white rounded text-xs font-medium shadow-sm truncate w-full">
                      📝 识别文字: {img.ocr_text}
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
          {visibleCount < filteredImages.length && (
            <div className="flex justify-center mt-12">
              <button 
                onClick={() => setVisibleCount(prev => prev + 20)}
                className="px-6 py-2 rounded-full border border-white/10 bg-white/5 text-white/70 hover:bg-white/10 hover:text-white transition-colors"
              >
                加载更多
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )}

  {/* Bottom Action Bar or Search Bar */}
  {isSelectMode ? (
    <div className="fixed bottom-8 left-1/2 -translate-x-1/2 w-max z-50 animate-in slide-in-from-bottom-4">
      <div className="flex items-center gap-3 px-6 py-3 bg-[#1D1E24]/90 backdrop-blur-xl border border-white/10 rounded-full shadow-[0_8px_30px_rgb(0,0,0,0.6)]">
        <span className="text-white/70 text-sm mr-2 font-medium">已选择 {selectedImageIds.size} 项</span>
        <button 
          onClick={handleBatchAddToPing}
          disabled={selectedImageIds.size === 0}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center shadow-lg ${
            selectedImageIds.size > 0 
              ? 'bg-[#9c39ff] hover:bg-[#8b2be6] text-white shadow-[#9c39ff]/20' 
              : 'bg-white/10 text-white/30 cursor-not-allowed'
          }`}
        >
          <Zap className="w-4 h-4 mr-1.5" />
          加入砰
        </button>
        <button 
          onClick={handleBatchAddTags}
          disabled={selectedImageIds.size === 0}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center ${
            selectedImageIds.size > 0 
              ? 'bg-blue-500/80 hover:bg-blue-600 text-white' 
              : 'bg-white/10 text-white/30 cursor-not-allowed'
          }`}
        >
          <Tag className="w-4 h-4 mr-1.5" />
          添加标签
        </button>
        <button 
          onClick={handleBatchDelete}
          disabled={selectedImageIds.size === 0}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center ${
            selectedImageIds.size > 0 
              ? 'bg-red-500/80 hover:bg-red-600 text-white' 
              : 'bg-white/10 text-white/30 cursor-not-allowed'
          }`}
        >
          <Trash2 className="w-4 h-4 mr-1.5" />
          删除
        </button>
      </div>
    </div>
  ) : (
    <SearchBar />
  )}

  {/* Context Menu */}
  {contextMenu && (
    <div 
      className="fixed z-[100] w-48 bg-[#1D1E24]/95 backdrop-blur-xl border border-white/10 rounded-xl shadow-[0_8px_30px_rgb(0,0,0,0.6)] py-1.5"
      style={{ top: Math.min(contextMenu.y, window.innerHeight - 150), left: Math.min(contextMenu.x, window.innerWidth - 200) }}
    >
      <button 
        onClick={(e) => {
          e.stopPropagation();
          handleAddToPing(e, contextMenu.img);
          setContextMenu(null);
        }}
        className="w-full text-left px-4 py-2 text-sm text-white/80 hover:text-white hover:bg-white/10 transition-colors flex items-center"
      >
        <Zap className="w-4 h-4 mr-2 text-[#9c39ff]" />
        加入砰
      </button>
      <button 
        onClick={(e) => {
          e.stopPropagation();
          setSimilarImageRef(contextMenu.img);
          setContextMenu(null);
        }}
        className="w-full text-left px-4 py-2 text-sm text-white/80 hover:text-white hover:bg-white/10 transition-colors flex items-center"
      >
        <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        查找相似图片
      </button>
      <div className="h-px bg-white/10 my-1.5 mx-2"></div>
      <button 
        onClick={(e) => {
          e.stopPropagation();
          if(window.confirm('确定要删除这张图片吗？')) {
            deleteImage(contextMenu.img.id);
          }
          setContextMenu(null);
        }}
        className="w-full text-left px-4 py-2 text-sm text-red-400 hover:text-red-300 hover:bg-red-400/10 transition-colors flex items-center"
      >
        <Trash2 className="w-4 h-4 mr-2" />
        删除图片
      </button>
    </div>
  )}

  {selectedImage && (
    <ImageModal 
      image={selectedImage} 
      onClose={() => setSelectedImage(null)}
      onFindSimilar={(img) => {
        setSimilarImageRef(img);
        setSelectedImage(null);
      }}
    />
  )}

  {/* Batch Tag Input Modal */}
  {batchTagInput.isOpen && (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-[#1D1E24] border border-white/10 p-6 rounded-2xl shadow-2xl w-[400px]">
        <h3 className="text-lg font-medium text-white mb-4">批量添加标签</h3>
        <p className="text-white/50 text-sm mb-4">为选中的 {selectedImageIds.size} 张图片添加标签，多个标签用逗号分隔</p>
        <input
          autoFocus
          type="text"
          value={batchTagInput.value}
          onChange={(e) => setBatchTagInput(prev => ({ ...prev, value: e.target.value }))}
          onKeyDown={(e) => {
            if (e.key === 'Enter') confirmBatchAddTags();
            if (e.key === 'Escape') setBatchTagInput({ isOpen: false, value: '' });
          }}
          placeholder="例如：赛博朋克, UI设计, 移动端..."
          className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder-white/30 focus:outline-none focus:border-[#9c39ff] transition-colors mb-4"
        />
        
        {allExistingTags.length > 0 && (
          <div className="mb-6">
            <p className="text-white/40 text-xs mb-2">或选择已有标签：</p>
            <div className="flex flex-wrap gap-2 max-h-[120px] overflow-y-auto pr-2 custom-scrollbar">
              {allExistingTags.map(tag => {
                const isSelected = batchTagInput.value.split(/[,，]/).map(t => t.trim()).includes(tag);
                return (
                  <button
                    key={tag}
                    onClick={() => handleToggleBatchTag(tag)}
                    className={`px-3 py-1 rounded-full text-xs transition-colors border ${
                      isSelected 
                        ? 'bg-[#9c39ff]/20 text-[#9c39ff] border-[#9c39ff]/50' 
                        : 'bg-white/5 text-white/60 border-transparent hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    {tag}
                  </button>
                );
              })}
            </div>
          </div>
        )}
        
        <div className="flex justify-end gap-3">
          <button
            onClick={() => setBatchTagInput({ isOpen: false, value: '' })}
            className="px-4 py-2 rounded-lg text-sm font-medium text-white/70 hover:text-white hover:bg-white/10 transition-colors"
          >
            取消
          </button>
          <button
            onClick={confirmBatchAddTags}
            disabled={!batchTagInput.value.trim()}
            className="px-4 py-2 bg-[#9c39ff] hover:bg-[#8b2be6] disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium transition-colors"
          >
            确定添加
          </button>
        </div>
      </div>
    </div>
  )}
</div>
  );
}
