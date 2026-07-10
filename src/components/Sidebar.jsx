import React, { useEffect, useState } from 'react';
import { getAllSessions, deleteSession } from '../utils/db';
import { usePhoto } from '../context/PhotoContext';
import { History, Trash2, Clock, Image as ImageIcon, LayoutGrid, ChevronRight } from 'lucide-react';
import Button from './Common/Button';

const Sidebar = () => {
  const [sessions, setSessions] = useState([]);
  const [isOpen, setIsOpen] = useState(true);
  const { loadSession, resetAll, historyVersion } = usePhoto();

  const loadData = async () => {
    const data = await getAllSessions();
    setSessions(data);
  };

  useEffect(() => {
    loadData();
  }, [historyVersion]);

  const handleDelete = async (e, id) => {
    e.stopPropagation();
    await deleteSession(id);
    loadData();
  };

  const handleLoad = (session) => {
    loadSession(session);
  };

  if (!isOpen) {
    return (
      <button 
        onClick={() => setIsOpen(true)}
        className="fixed left-0 top-1/2 -translate-y-1/2 z-40 bg-slate-900 border border-slate-700 border-l-0 p-2 rounded-r-xl shadow-xl hover:bg-slate-800 transition-colors"
      >
        <ChevronRight className="w-5 h-5 text-slate-400" />
      </button>
    );
  }

  return (
    <div className="w-80 bg-slate-950/80 border-r border-slate-800 flex flex-col h-full shrink-0 relative backdrop-blur-xl">
      <div className="p-4 border-b border-slate-800 flex items-center justify-between">
        <h2 className="text-sm font-bold text-white flex items-center gap-2">
          <History className="w-4 h-4 text-blue-500" />
          Session History
        </h2>
        <button onClick={() => setIsOpen(false)} className="text-slate-500 hover:text-slate-300 transition-colors">
          <ChevronRight className="w-5 h-5 rotate-180" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-3 custom-scrollbar">
        {sessions.length === 0 ? (
          <div className="text-center p-6 text-slate-500 text-sm mt-10">
            <History className="w-10 h-10 mx-auto mb-3 opacity-20" />
            No saved sessions yet. Generate a passport photo to see it here!
          </div>
        ) : (
          sessions.map(session => (
            <div 
              key={session.id} 
              onClick={() => handleLoad(session)}
              className="bg-slate-900/50 hover:bg-slate-900 border border-slate-800/80 hover:border-blue-500/50 rounded-xl p-3 cursor-pointer transition-all group relative"
            >
              <div className="flex gap-3">
                {/* Thumbnails */}
                <div className="flex -space-x-2 shrink-0">
                  {session.images.map((img, idx) => (
                    <div key={idx} className="w-10 h-10 rounded-lg overflow-hidden border-2 border-slate-900 bg-slate-800">
                      <img src={img.original} alt="thumb" className="w-full h-full object-cover" />
                    </div>
                  ))}
                </div>
                
                <div className="flex flex-col min-w-0 flex-1">
                  <div className="text-xs font-semibold text-slate-200 flex items-center justify-between">
                    <span className="truncate">
                      {new Date(session.createdAt).toLocaleDateString()}
                    </span>
                    <button 
                      onClick={(e) => handleDelete(e, session.id)}
                      className="opacity-0 group-hover:opacity-100 p-1 text-rose-500 hover:bg-rose-500/20 rounded transition-all"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  
                  <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1 text-[10px] text-slate-400">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(session.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                    </span>
                    <span className="flex items-center gap-1">
                      <ImageIcon className="w-3 h-3" />
                      {session.images.length} Photo{session.images.length > 1 ? 's' : ''}
                    </span>
                    <span className="flex items-center gap-1">
                      <LayoutGrid className="w-3 h-3" />
                      {session.sheetSize?.name}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="p-4 border-t border-slate-800">
        <Button onClick={resetAll} variant="secondary" className="w-full py-2.5 text-xs">
          Start New Session
        </Button>
      </div>
    </div>
  );
};

export default Sidebar;
