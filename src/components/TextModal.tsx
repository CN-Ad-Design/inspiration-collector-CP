import { X } from 'lucide-react';
import TextareaAutosize from 'react-textarea-autosize';
import { NoteItem } from '../types';
import { useNoteStore } from '../store/useNoteStore';
import { useState, useRef } from 'react';
import { mockAiExtractNoteTags } from '../utils/mockAi';

interface TextModalProps {
  note: NoteItem;
  onClose: () => void;
}

export default function TextModal({ note, onClose }: TextModalProps) {
  const { updateNote } = useNoteStore();
  const [content, setContent] = useState(note.content);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleChange = (val: string) => {
    setContent(val);
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(async () => {
      const firstLine = val.split('\n')[0].trim() || `灵感想法`;
      let newTags = note.tags || [];
      if (val.length > 10) {
        const aiTags = await mockAiExtractNoteTags(val);
        newTags = aiTags.map((t, idx) => ({ 
          ...t, 
          id: `note_tag_${note.id}_${idx}`, 
          note_id: note.id
        }));
      }
      updateNote(note.id, {
        title: firstLine.substring(0, 20),
        content: val,
        tags: newTags,
        updated_at: new Date().toISOString()
      });
    }, 1000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-[#1D1E24] border border-white/10 rounded-2xl w-full max-w-2xl h-[70vh] flex flex-col shadow-2xl relative" onClick={e => e.stopPropagation()}>
        <button onClick={onClose} className="absolute top-4 right-4 text-white/50 hover:text-white transition-colors">
          <X className="w-5 h-5" />
        </button>
        <div className="p-6 border-b border-white/5 flex items-center">
          <h3 className="text-white font-medium">编辑便签</h3>
        </div>
        <div className="flex-1 p-6 overflow-y-auto custom-scrollbar">
          <TextareaAutosize
            value={content}
            onChange={(e) => handleChange(e.target.value)}
            className="w-full bg-transparent resize-none outline-none text-white/90 leading-relaxed text-sm min-h-full"
            autoFocus
          />
        </div>
      </div>
    </div>
  );
}
