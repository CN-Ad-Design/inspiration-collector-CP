import { Search } from 'lucide-react';
import { useSearchStore } from '../store/useSearchStore';

export default function SearchBar() {
  const { searchQuery, setSearchQuery } = useSearchStore();

  return (
    <div className="fixed bottom-8 left-1/2 -translate-x-1/2 w-full max-w-sm z-50 pointer-events-none">
      <div className="relative flex items-center pointer-events-auto">
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
          <Search className="h-4 w-4 text-slate-400" />
        </div>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="block w-full pl-10 pr-4 py-2.5 bg-[#1D1E24]/80 backdrop-blur-xl border border-white/10 rounded-full leading-5 text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-[#9c39ff] focus:border-[#9c39ff] text-sm transition-all shadow-[0_8px_30px_rgb(0,0,0,0.6)] hover:bg-[#1D1E24]"
          placeholder="搜索灵感..."
        />
      </div>
    </div>
  );
}
