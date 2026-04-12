import { ImageItem } from '../types';
import { Trash2, Download } from 'lucide-react';
import { useImageStore } from '../store/useImageStore';

interface ImageCardProps {
  image: ImageItem;
  onClick: (image: ImageItem) => void;
}

export default function ImageCard({ image, onClick }: ImageCardProps) {
  const { deleteImage } = useImageStore();

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm('确定删除这张图片吗？')) {
      deleteImage(image.id);
    }
  };

  const handleDownload = (e: React.MouseEvent) => {
    e.stopPropagation();
    const a = document.createElement('a');
    a.href = image.storage_path;
    a.download = image.filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div 
      className="group relative mb-4 break-inside-avoid cursor-pointer overflow-hidden rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm hover:shadow-md transition-all"
      onClick={() => onClick(image)}
    >
      <img 
        src={image.storage_path} 
        alt={image.filename} 
        className="w-full object-cover"
        loading="lazy"
      />
      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-3">
        <div className="flex justify-end space-x-2">
          <button 
            onClick={handleDownload}
            className="p-1.5 bg-white/20 hover:bg-white/40 text-white rounded backdrop-blur-sm transition-colors"
            title="下载"
          >
            <Download className="w-4 h-4" />
          </button>
          <button 
            onClick={handleDelete}
            className="p-1.5 bg-white/20 hover:bg-red-500/80 text-white rounded backdrop-blur-sm transition-colors"
            title="删除"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
        <div>
          <h3 className="text-white font-medium truncate text-sm mb-1" title={image.filename}>
            {image.filename}
          </h3>
          <div className="flex flex-wrap gap-1">
            {image.tags?.slice(0, 3).map((tag, idx) => (
              <span key={idx} className="px-1.5 py-0.5 bg-white/20 backdrop-blur-sm text-white text-xs rounded">
                {tag.tag_value}
              </span>
            ))}
            {(image.tags?.length || 0) > 3 && (
              <span className="px-1.5 py-0.5 bg-white/20 backdrop-blur-sm text-white text-xs rounded">
                +{(image.tags?.length || 0) - 3}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
