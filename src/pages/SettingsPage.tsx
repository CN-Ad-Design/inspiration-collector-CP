import { useRef } from 'react';
import { useThemeStore } from '../store/useThemeStore';
import { storage } from '../utils/storage';
import { useImageStore } from '../store/useImageStore';
import { useNoteStore } from '../store/useNoteStore';
import { Download, Upload, Monitor, Sun, Moon } from 'lucide-react';

export default function SettingsPage() {
  const { theme, setTheme } = useThemeStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { loadImages } = useImageStore();
  const { loadNotes } = useNoteStore();

  const handleExport = async () => {
    try {
      const data = await storage.exportData();
      const blob = new Blob([data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `inspiration_backup_${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      alert('导出失败');
      console.error(e);
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const jsonData = event.target?.result as string;
        await storage.importData(jsonData);
        await loadImages();
        await loadNotes();
        alert('导入成功！');
      } catch (err) {
        alert('导入失败：文件格式不正确');
        console.error(err);
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="h-full flex flex-col max-w-3xl mx-auto w-full pt-8">
      <h1 className="text-3xl font-bold mb-8">设置</h1>
      
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-8 space-y-10 shadow-sm">
        {/* Appearance */}
        <div>
          <h2 className="text-xl font-semibold mb-6 flex items-center">
            外观设置
          </h2>
          <div className="grid grid-cols-3 gap-4">
            <button
              onClick={() => setTheme('light')}
              className={`p-4 rounded-xl border-2 flex flex-col items-center gap-3 transition-colors ${
                theme === 'light' ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-500/10' : 'border-slate-200 dark:border-slate-700 hover:border-indigo-300'
              }`}
            >
              <Sun className={`w-8 h-8 ${theme === 'light' ? 'text-indigo-500' : 'text-slate-400'}`} />
              <span className="font-medium">浅色模式</span>
            </button>
            <button
              onClick={() => setTheme('dark')}
              className={`p-4 rounded-xl border-2 flex flex-col items-center gap-3 transition-colors ${
                theme === 'dark' ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-500/10' : 'border-slate-200 dark:border-slate-700 hover:border-indigo-300'
              }`}
            >
              <Moon className={`w-8 h-8 ${theme === 'dark' ? 'text-indigo-500' : 'text-slate-400'}`} />
              <span className="font-medium">深色模式</span>
            </button>
            <button
              onClick={() => setTheme('system')}
              className={`p-4 rounded-xl border-2 flex flex-col items-center gap-3 transition-colors ${
                theme === 'system' ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-500/10' : 'border-slate-200 dark:border-slate-700 hover:border-indigo-300'
              }`}
            >
              <Monitor className={`w-8 h-8 ${theme === 'system' ? 'text-indigo-500' : 'text-slate-400'}`} />
              <span className="font-medium">跟随系统</span>
            </button>
          </div>
        </div>

        <hr className="border-slate-200 dark:border-slate-700" />

        {/* Data Management */}
        <div>
          <h2 className="text-xl font-semibold mb-4">数据管理</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 leading-relaxed">
            您的灵感数据默认安全地保存在本地浏览器中（IndexedDB）。<br/>
            为了防止数据丢失，建议您定期导出备份数据。如果您在其他设备上使用，可以通过导入功能恢复数据。
          </p>
          <div className="flex flex-wrap gap-4">
            <button 
              onClick={handleExport}
              className="flex items-center px-6 py-3 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 font-medium transition-colors shadow-sm"
            >
              <Download className="w-5 h-5 mr-2" />
              导出备份数据 (.json)
            </button>
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center px-6 py-3 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 font-medium transition-colors shadow-sm"
            >
              <Upload className="w-5 h-5 mr-2" />
              从备份文件导入
            </button>
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleImport} 
              accept=".json" 
              className="hidden" 
            />
          </div>
        </div>
      </div>
    </div>
  );
}
