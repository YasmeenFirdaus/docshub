"use client";

import React, { useState, useEffect } from 'react';
import { Search, FileText, Sparkles, CornerDownLeft, Clock, Command, LayoutList } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useDebounce } from 'use-debounce';

interface SearchHit {
  id: string;
  title: string;
  status: string;
  updated_at: string;
  snippet?: string;
  is_favorite?: boolean;
}

export const OmniSearch: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [useAI, setUseAI] = useState(false);
  const [debouncedQuery] = useDebounce(query, 250);
  const router = useRouter();

  const [hits, setHits] = useState<SearchHit[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') { 
        e.preventDefault(); 
        setIsOpen(prev => !prev); 
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);

  useEffect(() => {
    async function search() {
      if (debouncedQuery.length < 2) {
        setHits([]);
        return;
      }
      setIsLoading(true);
      try {
        const res = await fetch(`/api/documents?search=${encodeURIComponent(debouncedQuery)}`);
        const data = await res.json();
        setHits(data.documents || []);
      } catch (err) {
        console.error("Search failed:", err);
      } finally {
        setIsLoading(false);
      }
    }
    search();
  }, [debouncedQuery, useAI]);

  const handleSelectDocument = (id: string) => {
    router.push(`/document/${id}`);
    setIsOpen(false);
  };

  useEffect(() => {
    const handleNav = (e: KeyboardEvent) => {
      if (!isOpen || hits.length === 0) return;
      if (e.key === 'ArrowDown') { e.preventDefault(); setSelectedIndex((prev) => (prev + 1) % hits.length); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); setSelectedIndex((prev) => (prev - 1 + hits.length) % hits.length); }
      else if (e.key === 'Enter') { 
        e.preventDefault(); 
        if (hits[selectedIndex]) { 
          handleSelectDocument(hits[selectedIndex].id); 
        } 
      }
      else if (e.key === 'Escape') setIsOpen(false);
    };
    window.addEventListener('keydown', handleNav);
    return () => window.removeEventListener('keydown', handleNav);
  }, [isOpen, hits, selectedIndex, router]);

  useEffect(() => setSelectedIndex(0), [debouncedQuery]);

  if (!isOpen) return null;

  return (
    <>
      <div 
        onClick={() => setIsOpen(false)} 
        className="fixed inset-0 bg-[#1E293B]/10 backdrop-blur-sm z-50 animate-in fade-in duration-200" 
      />
      <div 
        className="fixed top-[15%] left-1/2 -translate-x-1/2 w-full max-w-2xl bg-white border border-slate-200/80 rounded-2xl shadow-2xl overflow-hidden z-50 animate-in zoom-in-95 fade-in duration-200"
      >
        <div className="flex items-center px-4 py-2 border-b border-slate-100 bg-white relative">
          <Search className="w-5 h-5 text-slate-400 shrink-0" />
          <input type="text" value={query} onChange={(e) => setQuery(e.target.value)}
            placeholder="Search, run a command, or ask a question..."
            className="w-full px-3 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:outline-none bg-transparent" autoFocus />
          
          <div className="flex items-center gap-2 shrink-0">
            <button 
              onClick={() => setUseAI(!useAI)}
              title="Toggle AI Semantic Search"
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-medium transition-all ${
                useAI 
                  ? 'bg-[#78C6C9]/12 border-[#78C6C9]/45 text-[#256D85] shadow-sm' 
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300 shadow-sm'
              }`}
            >
              <span>Ask AI</span>
              <Sparkles className={`w-3.5 h-3.5 ${useAI ? 'text-[#256D85]' : 'text-[#256D85]'}`} />
            </button>
            <div className="flex items-center gap-1 text-[10px] font-bold text-slate-400 bg-slate-50 px-2 py-1 rounded-md border border-slate-200/50 hidden sm:flex">
              <Command className="w-3 h-3" /><span>Esc</span>
            </div>
          </div>
        </div>
        <div className="max-h-[60vh] overflow-y-auto bg-white">
          {query.length < 2 ? (
            <div className="p-8 text-center text-slate-400 text-xs flex flex-col items-center gap-2">
              <Clock className="w-5 h-5 text-slate-300" />
              <span>Type at least 2 characters to search.</span>
            </div>
          ) : isLoading ? (
            <div className="p-4 space-y-2">
              {[...Array(3)].map((_, i) => <div key={i} className="h-10 w-full bg-slate-100 rounded-xl animate-pulse" />)}
            </div>
          ) : hits.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs">
              No results found for "{query}".
            </div>
          ) : (
            <div className="p-2">
              <div className="px-3 py-2 text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                <LayoutList className="w-3.5 h-3.5" /> Results
              </div>
              <div className="space-y-0.5">
                {hits.map((hit, index) => {
                  const isSelected = index === selectedIndex;
                  return (
                    <div key={hit.id} onClick={() => handleSelectDocument(hit.id)}
                      className={`w-full group text-left px-3 py-2 rounded-lg flex flex-col justify-center transition-all cursor-pointer ${
                        isSelected ? 'bg-slate-100/70' : 'bg-transparent hover:bg-slate-50'
                      }`}>
                      
                      <div className="flex items-center justify-between w-full">
                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                          <div className={`shrink-0 flex items-center justify-center w-5 h-5 rounded-full ${isSelected ? 'bg-[#256D85] text-white shadow-sm' : 'border border-[#78C6C9]/45 text-[#256D85] bg-[#78C6C9]/12'}`}>
                            <FileText className="w-3 h-3" />
                          </div>

                          <span className="text-[13px] font-medium text-slate-700 truncate">{hit.title}</span>
                          
                          <div className="flex items-center gap-1 shrink-0 opacity-80">
                             <span className="text-[11px] text-slate-400">in <span className="font-medium text-slate-500">{hit.status}</span></span>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 shrink-0 ml-4">
                          {isSelected && <CornerDownLeft className="w-3 h-3 text-slate-400 hidden sm:block" />}
                        </div>
                      </div>

                      {hit.snippet && (
                        <div className="mt-1 ml-7 mr-4 text-xs text-slate-500 truncate" dangerouslySetInnerHTML={{__html: hit.snippet}} />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};
