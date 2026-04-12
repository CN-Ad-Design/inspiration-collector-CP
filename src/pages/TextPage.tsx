import { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import TextareaAutosize from 'react-textarea-autosize';
import { Sparkles, ArrowLeft, Network, Pin, Loader2, Maximize, Minimize, Copy, LayoutGrid, List, Zap, Trash2, Check } from 'lucide-react';
import { useNoteStore } from '../store/useNoteStore';
import { usePingStore } from '../store/usePingStore';
import { NoteItem, InsightData } from '../types';
import { mockAiExtractNoteTags, mockAiGenerateInsights } from '../utils/mockAi';
import { format } from 'date-fns';
import ForceGraph2D from 'react-force-graph-2d';
import { useSearchStore } from '../store/useSearchStore';
import SearchBar from '../components/SearchBar';
import TextModal from '../components/TextModal';

export default function TextPage() {
  const { notes, isLoading, loadNotes, addNote, updateNote, deleteNote } = useNoteStore();
  const { searchQuery } = useSearchStore();
  const { items: pingItems, setItems: setPingItems } = usePingStore();
  
  const [editingNote, setEditingNote] = useState<NoteItem | null>(null);
  const [activeTag, setActiveTag] = useState<string>('全部');
  const [draftContent, setDraftContent] = useState('');

  // Insight View State
  const [isInsightView, setIsInsightView] = useState(false);
  const [isGeneratingInsights, setIsGeneratingInsights] = useState(false);
  const [insightData, setInsightData] = useState<InsightData | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    loadNotes();
  }, [loadNotes]);

  // Extract all unique tags
  const allTags = Array.from(new Set(notes.flatMap(n => n.tags?.map(t => t.tag_name) || [])));
  const tabs = ['全部', ...allTags.map(t => `#${t}`)];

  const filteredNotes = useMemo(() => {
    let result = activeTag === '全部'
      ? notes
      : notes.filter(n => n.tags?.some(t => `#${t.tag_name}` === activeTag));
      
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(n => 
        n.title.toLowerCase().includes(q) ||
        n.content.toLowerCase().includes(q) ||
        n.tags?.some(t => t.tag_name.toLowerCase().includes(q))
      );
    }
    
    // Sort by pinned then date
    return result.sort((a, b) => {
      if (a.is_pinned && !b.is_pinned) return -1;
      if (!a.is_pinned && b.is_pinned) return 1;
      return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
    });
  }, [notes, activeTag, searchQuery]);

  const handleDraftSave = async () => {
    if (!draftContent.trim()) return;
    
    // Split content by newline to separate title and body
    const lines = draftContent.split('\n');
    let title = lines[0].trim();
    let content = draftContent;

    // If there is only one line or the user didn't explicitly write a multi-line note
    // Or if we want to extract the first sentence as title and use the rest as content
    if (lines.length === 1) {
      // Try to split by punctuation to find the first sentence
      const sentenceMatch = draftContent.match(/^[^.!?。！？]+[.!?。！？]?/);
      if (sentenceMatch) {
        title = sentenceMatch[0].trim().substring(0, 30); // Limit title length
      } else {
        title = draftContent.substring(0, 30);
      }
    } else {
      // If there are multiple lines, first line is title, rest is content
      // If the first line is very long, we might still want to truncate it for the title
      if (title.length > 30) {
        title = title.substring(0, 30) + '...';
      }
    }

    const newNote: NoteItem = {
      id: crypto.randomUUID(),
      user_id: '', // Will be overridden in store by current user id
      title: title || '新灵感',
      content: content,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      tags: []
    };
    await addNote(newNote);
    setDraftContent('');
    
    // Also extract tags in background
    const tags = await mockAiExtractNoteTags(content);
    updateNote(newNote.id, {
      tags: tags.map((t, i) => ({ ...t, id: `note_tag_${newNote.id}_${i}`, note_id: newNote.id }))
    });
  };

  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedNoteIds, setSelectedNoteIds] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const handleToggleNoteSelection = (e: React.MouseEvent, noteId: string) => {
    if (!isSelectMode) return;
    setSelectedNoteIds(prev => {
      const next = new Set(prev);
      if (next.has(noteId)) next.delete(noteId);
      else next.add(noteId);
      return next;
    });
  };

  const handleBatchDelete = async () => {
    if (selectedNoteIds.size === 0) return;
    if (window.confirm(`确定要删除选中的 ${selectedNoteIds.size} 条便签吗？`)) {
      for (const id of Array.from(selectedNoteIds)) {
        await deleteNote(id);
      }
      setSelectedNoteIds(new Set());
      setIsSelectMode(false);
    }
  };

  const handleBatchAddToPing = () => {
    if (selectedNoteIds.size === 0) return;
    const itemsToAdd = Array.from(selectedNoteIds)
      .filter(id => !pingItems.some(item => item.id === id))
      .map(id => {
        const note = notes.find(n => n.id === id);
        return note ? { id: note.id, type: 'text' as const, content: note.content } : null;
      })
      .filter(Boolean) as any[];

    if (itemsToAdd.length > 0) {
      setPingItems(prev => [...prev, ...itemsToAdd]);
      alert(`已成功将 ${itemsToAdd.length} 条便签加入砰~`);
    } else {
      alert('选中的便签已在砰~中');
    }
    setSelectedNoteIds(new Set());
    setIsSelectMode(false);
  };

  const handleGenerateInsights = async () => {
    setIsGeneratingInsights(true);
    try {
      const targetNotes = selectedNoteIds.size > 0 
        ? filteredNotes.filter(n => selectedNoteIds.has(n.id))
        : filteredNotes;

      const noteIds = targetNotes.map(n => n.id);
      const noteTitles = targetNotes.map(n => n.title);
      const data = await mockAiGenerateInsights(noteIds, noteTitles);
      setInsightData(data);
    } catch (error) {
      console.error('Failed to generate insights', error);
      alert('生成洞察失败，请重试');
    } finally {
      setIsGeneratingInsights(false);
    }
  };

  // Force Graph data and resize observer
  const graphContainerRef = useRef<HTMLDivElement>(null);
  const [graphDimensions, setGraphDimensions] = useState({ width: 0, height: 0 });

  useEffect(() => {
    if (!graphContainerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      if (entries[0]) {
        const { width, height } = entries[0].contentRect;
        setGraphDimensions({ width, height });
      }
    });
    observer.observe(graphContainerRef.current);
    return () => observer.disconnect();
  }, [isInsightView, isFullscreen]);

  const graphData = useMemo(() => {
    if (!insightData) return { nodes: [], links: [] };
    // Deep clone to prevent react-force-graph from mutating state directly
    return {
      nodes: insightData.nodes.map(n => ({ ...n })),
      links: insightData.edges.map(e => ({ ...e }))
    };
  }, [insightData]);

  const paintNode = useCallback((node: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
    const label = node.label as string;
    const isTag = node.type === 'tag';
    const fontSize = isTag ? 14 / globalScale : 12 / globalScale;
    ctx.font = `${fontSize}px "PingFang SC", "Helvetica Neue", Helvetica, Arial, sans-serif`;
    
    if (isTag) {
      // Purple Theme Node
      const r = 24 / globalScale;
      ctx.beginPath();
      ctx.arc(node.x, node.y, r, 0, 2 * Math.PI, false);
      ctx.fillStyle = '#4f46e5';
      ctx.shadowColor = '#4f46e5';
      ctx.shadowBlur = 20 / globalScale;
      ctx.fill();
      ctx.shadowBlur = 0; // reset
      
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#ffffff';
      
      // Simple text wrapping for tags if needed, usually short
      ctx.fillText(label, node.x, node.y);
    } else {
      // Beige Note Node
      const maxLength = 16;
      const displayLabel = label.length > maxLength ? label.substring(0, maxLength) + '...' : label;
      
      const textWidth = ctx.measureText(displayLabel).width;
      const paddingX = 12 / globalScale;
      const paddingY = 8 / globalScale;
      const bckgDimensions = [textWidth + paddingX * 2, fontSize + paddingY * 2];
      
      ctx.fillStyle = '#FDFBF7'; // Beige color
      ctx.beginPath();
      // Use roundRect if available
      if (ctx.roundRect) {
        ctx.roundRect(
          node.x - bckgDimensions[0] / 2, 
          node.y - bckgDimensions[1] / 2, 
          bckgDimensions[0], 
          bckgDimensions[1], 
          4 / globalScale
        );
      } else {
        ctx.rect(
          node.x - bckgDimensions[0] / 2, 
          node.y - bckgDimensions[1] / 2, 
          bckgDimensions[0], 
          bckgDimensions[1]
        );
      }
      ctx.fill();
      
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#1F2937'; // Dark gray text
      ctx.fillText(displayLabel, node.x, node.y);
    }
  }, []);

  // Automatically generate insights when entering insight view if not generated
  useEffect(() => {
    if (isInsightView && !insightData && !isGeneratingInsights && notes.length > 0) {
      handleGenerateInsights();
    }
  }, [isInsightView, insightData, notes.length]);


  const handleCopyText = async (e: React.MouseEvent, note: NoteItem) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(note.content);
    } catch (err) {
      console.error('Failed to copy text:', err);
    }
  };

  const handleAddToPing = (e: React.MouseEvent, note: NoteItem) => {
    e.stopPropagation();
    if (pingItems.some(item => item.id === note.id)) {
      alert('该便签已在砰~中');
      return;
    }
    setPingItems(prev => [
      ...prev, 
      { 
        id: note.id, 
        type: 'text', 
        content: note.content 
      }
    ]);
  };

  if (isInsightView) {
    return (
      <div className="h-full flex flex-col px-10 pt-6 relative">
        <div className="flex items-center justify-between mb-6 z-10">
          <button 
            onClick={() => setIsInsightView(false)}
            className="flex items-center px-3 py-1.5 text-sm bg-white/10 hover:bg-white/20 text-white rounded-md transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            返回
          </button>
          <h2 className="text-xl font-bold text-white flex items-center">
            <Sparkles className="w-5 h-5 mr-2 text-[#4f46e5]" />
            灵感知识图谱
          </h2>
          {insightData && (
            <div className="text-sm text-white/50 ml-4 flex items-center mt-1">
              {insightData.stats.themes} 个主题 · {insightData.stats.notes} 条便签 · {insightData.stats.relations} 条关联
            </div>
          )}
          <div className="w-[70px]"></div> {/* Spacer for balance */}
        </div>

        <div className="flex-1 flex overflow-hidden">
          
          {/* Graph Area (Left) */}
          <div className={`flex-[2] bg-[#0A0A0F] relative overflow-hidden transition-all duration-300 ${isFullscreen ? 'fixed inset-0 z-50' : 'rounded-2xl border border-white/5 mr-6'}`}>
            <button 
              onClick={() => setIsFullscreen(!isFullscreen)} 
              className="absolute top-4 right-4 z-10 p-2 bg-white/5 rounded hover:bg-white/10 text-white backdrop-blur-sm transition-colors"
            >
              {isFullscreen ? <Minimize className="w-4 h-4"/> : <Maximize className="w-4 h-4"/>}
            </button>
            {isGeneratingInsights ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-[#4f46e5]">
                <Loader2 className="w-10 h-10 animate-spin mb-4" />
                <p className="font-medium text-white/80">AI 正在深度分析您的灵感网络...</p>
              </div>
            ) : insightData ? (
              <div className="w-full h-full" ref={graphContainerRef}>
                {graphDimensions.width > 0 && graphDimensions.height > 0 && (
                  <ForceGraph2D
                    width={graphDimensions.width}
                    height={graphDimensions.height}
                    graphData={graphData}
                    nodeCanvasObject={paintNode}
                    nodeRelSize={8}
                    linkColor={() => 'rgba(255,255,255,0.2)'}
                    linkWidth={1}
                    d3VelocityDecay={0.3}
                    cooldownTicks={100}
                    backgroundColor="transparent"
                  />
                )}
              </div>
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400">
                <Network className="w-16 h-16 mb-4 opacity-20" />
                <p>暂无数据</p>
              </div>
            )}
          </div>

          {/* Right Info Panel */}
          {!isFullscreen && (
            <div className="flex-1 bg-[#15161C] rounded-2xl border border-white/5 flex flex-col overflow-hidden max-w-[400px]">
              <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
                
                {/* Section 1: Overall Insight */}
                <div className="mb-8 bg-[#1A1B23] p-5 rounded-xl border border-white/5 shadow-lg">
                  <h3 className="font-semibold text-lg mb-3 flex items-center text-white">
                    <Sparkles className="w-4 h-4 mr-2 text-[#4f46e5]" />
                    总体洞察
                  </h3>
                  <p className="text-sm text-white/70 leading-relaxed">
                    {insightData?.overall_insight || '正在分析中...'}
                  </p>
                </div>

                {/* Section 2: Creative Opportunities */}
                <div>
                  <h3 className="font-semibold text-base mb-4 flex items-center text-white/90 px-1">
                    <div className="w-4 h-4 rounded-full bg-[#4f46e5]/20 flex items-center justify-center mr-2">
                      <div className="w-1.5 h-1.5 bg-[#4f46e5] rounded-full shadow-[0_0_8px_#4f46e5]"></div>
                    </div>
                    创意机会点
                  </h3>
                  
                  <div className="space-y-4">
                    {insightData?.opportunities?.map((opp, idx) => (
                      <div key={idx} className="p-5 bg-[#1A1B23] rounded-xl border border-white/5 shadow-md hover:border-[#4f46e5]/30 transition-colors group">
                        <h4 className="font-medium text-white mb-2 text-sm group-hover:text-[#4f46e5] transition-colors">{opp.title}</h4>
                        <p className="text-[13px] text-white/60 leading-relaxed mb-4 line-clamp-4">
                          {opp.content}
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {opp.related_notes.map((nId, nIdx) => (
                            <span key={nIdx} className="px-2 py-1 text-[10px] text-[#4f46e5] border border-[#4f46e5]/30 bg-[#4f46e5]/10 rounded-md">
                              便签 {nIdx + 1}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                    
                    {!insightData && (
                      <div className="text-white/40 text-sm flex items-center justify-center h-20">
                        正在挖掘机会点...
                      </div>
                    )}
                  </div>
                </div>

              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col px-10 pt-6">
      {/* Top Header / Tabs */}
      <div className="flex items-center justify-between mb-8 shrink-0">
        <div className="flex items-center gap-4 w-full">
          <div className="flex flex-wrap gap-2 items-center flex-1">
            {tabs.map((tab, idx) => (
              <button 
                key={idx}
                onClick={() => {
                  setActiveTag(tab);
                  setSelectedNoteIds(new Set()); // clear selection when changing tabs
                  setIsSelectMode(false);
                }}
                className={`px-3 py-1.5 text-xs rounded-full transition-colors border whitespace-nowrap ${
                  activeTag === tab 
                    ? 'border-[#9c39ff] bg-[#9c39ff] text-white font-medium' 
                    : 'border-transparent bg-white/5 text-white/70 hover:bg-white/10'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3">
            {isSelectMode ? (
              <>
                <button 
                  onClick={() => {
                    setIsSelectMode(false);
                    setSelectedNoteIds(new Set());
                  }}
                  className="px-4 py-1.5 text-white/70 hover:text-white text-sm font-medium transition-colors"
                >
                  取消
                </button>
              </>
            ) : (
              <>
                <button 
                  onClick={() => setIsSelectMode(true)}
                  className="px-4 py-1.5 border border-[#9c39ff]/50 hover:bg-[#9c39ff]/10 text-[#9c39ff] hover:text-[#b469ff] rounded-lg text-sm font-medium transition-colors"
                >
                  选择便签
                </button>
                <button 
                  onClick={() => setIsInsightView(true)}
                  className="flex items-center px-4 py-1.5 bg-[#9c39ff] hover:bg-[#8b2be6] text-white rounded-lg text-sm font-medium transition-colors shadow-[0_0_15px_rgba(156,57,255,0.4)]"
                >
                  <Sparkles className="w-4 h-4 mr-1.5" />
                  全局灵感洞察
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex gap-6 pb-0 overflow-hidden">
        {/* Left Column (Notes) */}
        <div className="flex-[2] overflow-y-auto pr-2 pb-32 custom-scrollbar">
          {/* Top Bar for Notes Grid */}
          <div className="flex justify-end mb-4">
            {/* View Toggle */}
            {!isSelectMode && (
              <div className="flex items-center bg-black/40 rounded-lg p-1 border border-white/10">
                <button 
                  onClick={() => setViewMode('grid')} 
                  className={`p-1.5 rounded-md transition-colors ${viewMode === 'grid' ? 'bg-white/20 text-white' : 'text-white/50 hover:text-white/80'}`} 
                  title="便签视图"
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
          </div>
          
          <div className={viewMode === 'grid' ? "grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6 items-start" : "flex flex-col"}>
            
            {/* Notes Grid / List */}
            {filteredNotes.map((note) => (
              <div
                key={note.id}
                onClick={(e) => {
                  if (isSelectMode) {
                    handleToggleNoteSelection(e, note.id);
                  } else {
                    setEditingNote(note);
                  }
                }}
                className={`group relative cursor-pointer transition-all duration-200 
                  ${viewMode === 'grid' 
                    ? 'flex flex-col p-5 rounded-2xl border shadow-sm hover:shadow-md h-[180px]' 
                    : 'flex flex-row items-center gap-4 h-auto py-5 border-b border-white/5 last:border-b-0 hover:bg-white/5 rounded-none'
                  }
                  ${viewMode === 'grid' && selectedNoteIds.has(note.id) 
                    ? 'border-[#4f46e5] bg-[#EAE2F3] shadow-[0_0_15px_rgba(79,70,229,0.3)]' 
                    : viewMode === 'grid' 
                      ? 'border-transparent bg-[#EAE2F3] hover:border-[#4f46e5]/50'
                      : selectedNoteIds.has(note.id) ? 'bg-[#9c39ff]/10' : 'bg-transparent'
                  }`}
              >
                {/* Selection Checkbox */}
                {isSelectMode && (
                  <div 
                    className={`absolute ${viewMode === 'grid' ? 'top-2 left-2' : 'top-1/2 -translate-y-1/2 left-4'} w-5 h-5 rounded border flex items-center justify-center transition-all z-20 ${
                      selectedNoteIds.has(note.id)
                        ? 'border-[#4f46e5] bg-[#4f46e5]'
                        : 'border-slate-400/50 bg-white/40 opacity-0 group-hover:opacity-100 hover:border-[#4f46e5]'
                    }`}
                  >
                    {selectedNoteIds.has(note.id) && (
                      <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                )}

                {/* Top Left Delete */}
                {!isSelectMode && (
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      if(window.confirm('确认删除该便签吗？')) {
                        deleteNote(note.id);
                      }
                    }}
                    className={`absolute ${viewMode === 'grid' ? 'top-2 left-2' : 'top-1/2 -translate-y-1/2 left-2'} w-4 h-4 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10 shadow-sm hover:bg-red-600`}
                    title="删除便签"
                  >
                    <div className="w-2 h-[1.5px] bg-white rounded-full"></div>
                  </button>
                )}
                
                {/* Top Right Actions */}
                {!isSelectMode && (
                  <div className={`absolute ${viewMode === 'grid' ? 'top-2 right-2 flex-col' : 'top-1/2 -translate-y-1/2 right-2 flex-row'} flex gap-1.5 z-10`}>
                    <button 
                      onClick={(e) => {
                        if (pingItems.some(item => item.id === note.id)) {
                          e.stopPropagation();
                          return;
                        }
                        handleAddToPing(e, note);
                      }}
                      disabled={pingItems.some(item => item.id === note.id)}
                      className={`w-6 h-6 rounded-full flex items-center justify-center transition-all z-50 opacity-0 group-hover:opacity-100 ${pingItems.some(item => item.id === note.id) ? 'text-white/50 bg-black/40 cursor-not-allowed' : 'text-slate-400 hover:text-white hover:bg-[#9c39ff]/90 cursor-pointer'}`}
                      title={pingItems.some(item => item.id === note.id) ? "已在砰~中" : "加入灵感碰撞"}
                    >
                      <Zap className={`w-3 h-3 ${pingItems.some(item => item.id === note.id) ? 'fill-current' : ''}`} />
                    </button>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        updateNote(note.id, { is_pinned: !note.is_pinned });
                      }}
                      className={`w-6 h-6 rounded-full flex items-center justify-center transition-opacity ${note.is_pinned ? 'opacity-100 text-[#4f46e5]' : 'opacity-0 group-hover:opacity-100 text-slate-400 hover:text-[#4f46e5]'}`}
                      title={note.is_pinned ? "取消置顶" : "置顶便签"}
                    >
                      <Pin className={`w-3.5 h-3.5 ${note.is_pinned ? 'fill-current' : ''} rotate-45`} />
                    </button>
                  </div>
                )}

                {viewMode === 'grid' ? (
                  <>
                    <div className="flex flex-col flex-1 mt-1">
                      <h4 className="font-bold text-slate-900 mb-3 truncate pr-8 text-[14px] leading-tight">{note.title}</h4>
                      <p className="text-[12px] text-slate-600 line-clamp-4 leading-relaxed flex-1 whitespace-pre-wrap font-normal">
                        {note.content || '...'}
                      </p>
                    </div>
                    
                    <div className="flex items-center justify-between mt-2 pt-2">
                      <div className="flex flex-wrap gap-2">
                        {note.tags?.slice(0, 2).map((t, idx) => (
                          <span key={idx} className="px-2.5 py-1 text-[11px] text-slate-600 bg-[#DFC4E6]/50 rounded-full font-medium">
                            #{t.tag_name}
                          </span>
                        ))}
                      </div>
                      <div className="text-[11px] text-slate-400 font-medium">
                        {format(new Date(note.updated_at), 'yyyy-MM-dd HH:mm')}
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div className={`flex-1 min-w-0 flex items-center gap-4 ${isSelectMode ? 'ml-6' : 'ml-4'} mr-14`}>
                      <div className="flex-1 min-w-0">
                         <h4 className="font-bold text-slate-200 truncate text-[14px] leading-tight mb-1.5">{note.title}</h4>
                         <p className="text-[12px] text-slate-400 truncate font-normal">
                           {format(new Date(note.updated_at), 'yyyy/MM/dd')} &nbsp;&nbsp; {note.content?.replace(/\n/g, ' ') || '...'}
                         </p>
                      </div>
                    </div>
                  </>
                )}
              </div>
            ))}
            
            {filteredNotes.length === 0 && !isLoading && (
              <div className="col-span-full flex flex-col items-center justify-center py-20 text-slate-500">
                <p>暂无灵感便签，在右侧输入框直接创建</p>
              </div>
            )}
          </div>
        </div>

        {/* Right Column (Note Composer) */}
        {!isSelectMode && (
          <div className="w-[320px] shrink-0 h-full">
            <div className="flex flex-col p-6 rounded-2xl border border-white/5 bg-[#17191F] shadow-sm h-[calc(100%-24px)] relative overflow-hidden focus-within:shadow-[0_0_20px_rgba(79,70,229,0.15)] transition-shadow">
              <div className="flex justify-between items-center mb-6">
                <span className="text-sm text-slate-400 font-medium">
                  新建便签
                </span>
              </div>
              <TextareaAutosize
                value={draftContent}
                onChange={(e) => setDraftContent(e.target.value)}
                placeholder="标题...&#10;写下你的想法..."
                className="w-full bg-transparent resize-none outline-none text-slate-200 placeholder:text-slate-500 leading-relaxed flex-1 custom-scrollbar font-medium"
                style={{
                  fontSize: draftContent ? (draftContent.includes('\n') ? '12px' : '14px') : '14px',
                }}
              />
              <div className="absolute bottom-6 right-6 flex items-center gap-4">
                <button 
                  onClick={() => setDraftContent('')}
                  className="text-sm text-slate-500 hover:text-slate-300 transition-colors"
                >
                  取消
                </button>
                <button 
                  onClick={handleDraftSave}
                  disabled={!draftContent.trim()}
                  className="px-5 py-2 bg-[#9c39ff] text-white rounded-full text-sm font-medium hover:bg-[#8b2be6] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  保存
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {editingNote && (
        <TextModal note={editingNote} onClose={() => setEditingNote(null)} />
      )}
      
      {/* Bottom Action Bar or Search Bar */}
      {isSelectMode ? (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 w-max z-50 animate-in slide-in-from-bottom-4">
          <div className="flex items-center gap-3 px-6 py-3 bg-[#1D1E24]/90 backdrop-blur-xl border border-white/10 rounded-full shadow-[0_8px_30px_rgb(0,0,0,0.6)]">
            <span className="text-white/70 text-sm mr-2 font-medium">已选择 {selectedNoteIds.size} 项</span>
            <button 
              onClick={() => setIsInsightView(true)}
              disabled={selectedNoteIds.size === 0}
              className={`flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-lg
                ${selectedNoteIds.size > 0 
                  ? 'bg-indigo-500/80 hover:bg-indigo-600 text-white' 
                  : 'bg-white/10 text-white/30 cursor-not-allowed'
                }`}
            >
              <Sparkles className="w-4 h-4 mr-1.5" />
              分析
            </button>
            <button 
              onClick={handleBatchAddToPing}
              disabled={selectedNoteIds.size === 0}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center shadow-lg ${
                selectedNoteIds.size > 0 
                  ? 'bg-[#9c39ff] hover:bg-[#8b2be6] text-white shadow-[#9c39ff]/20' 
                  : 'bg-white/10 text-white/30 cursor-not-allowed'
              }`}
            >
              <Zap className="w-4 h-4 mr-1.5" />
              加入砰
            </button>
            <button 
              onClick={handleBatchDelete}
              disabled={selectedNoteIds.size === 0}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center ${
                selectedNoteIds.size > 0 
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
        !isInsightView && <SearchBar />
      )}
    </div>
  );
}
