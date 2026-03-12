'use client';

import { useState } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';
import { useWikiList, useWikiPage, useWikiPages } from '@/hooks/useWiki';
import { BookOpen, ChevronRight, FileText, Loader2, AlertCircle } from 'lucide-react';
import { clsx } from 'clsx';
import type { WikiPage as WikiPageType } from '@/lib/types';

export default function WikiBrowserPage() {
  const { wikis, loading: wikisLoading, error: wikisError, refresh } = useWikiList();
  const [selectedWiki, setSelectedWiki] = useState<string>('');
  const [selectedPath, setSelectedPath] = useState<string>('/');

  const { data: pageTree, loading: pagesLoading } = useWikiPages(selectedWiki);
  const { page, loading: pageLoading, error: pageError } = useWikiPage(selectedWiki, selectedPath);

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 ml-16 lg:ml-56">
        <Header onRefresh={refresh} />

        <main className="px-6 py-6 space-y-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500/20">
              <BookOpen className="h-5 w-5 text-purple-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Wiki Browser</h2>
              <p className="text-sm text-slate-400">Browse Azure DevOps wiki pages</p>
            </div>
          </div>

          {/* Wiki selector */}
          {wikisLoading ? (
            <div className="flex items-center gap-2 text-slate-400">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading wikis...
            </div>
          ) : wikisError ? (
            <div className="glass-card p-4 flex items-center gap-2 text-rose-400">
              <AlertCircle className="h-4 w-4" /> {wikisError}
            </div>
          ) : (
            <div className="flex gap-2 flex-wrap">
              {wikis.map((wiki) => (
                <button
                  key={wiki.id}
                  onClick={() => {
                    setSelectedWiki(wiki.id);
                    setSelectedPath('/');
                  }}
                  className={clsx(
                    'rounded-xl px-4 py-2 text-sm font-medium border transition-all',
                    selectedWiki === wiki.id
                      ? 'bg-purple-500/20 border-purple-500/40 text-purple-300'
                      : 'bg-white/[0.04] border-white/[0.08] text-slate-300 hover:bg-white/[0.08]',
                  )}
                >
                  <BookOpen className="h-3.5 w-3.5 inline mr-1.5" />
                  {wiki.name}
                  <span className="ml-2 text-xs text-slate-500">({wiki.type})</span>
                </button>
              ))}
              {wikis.length === 0 && (
                <p className="text-sm text-slate-500">
                  No wikis found. Configure your ADO project in settings.
                </p>
              )}
            </div>
          )}

          {/* Content area — tree + page */}
          {selectedWiki && (
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              {/* Page tree sidebar */}
              <div className="glass-card p-4 lg:col-span-1 max-h-[70vh] overflow-y-auto">
                <h3 className="text-sm font-semibold text-slate-300 mb-3">Pages</h3>
                {pagesLoading ? (
                  <div className="flex items-center gap-2 text-slate-400 text-sm">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading...
                  </div>
                ) : (
                  <PageTree
                    pages={pageTree?.pages ?? []}
                    selectedPath={selectedPath}
                    onSelect={setSelectedPath}
                  />
                )}
              </div>

              {/* Page content */}
              <div className="glass-card p-6 lg:col-span-3 max-h-[70vh] overflow-y-auto">
                {pageLoading ? (
                  <div className="flex items-center gap-2 text-slate-400">
                    <Loader2 className="h-4 w-4 animate-spin" /> Loading page...
                  </div>
                ) : pageError ? (
                  <div className="text-rose-400 flex items-center gap-2">
                    <AlertCircle className="h-4 w-4" /> {pageError}
                  </div>
                ) : page ? (
                  <div>
                    <h3 className="text-lg font-bold text-white mb-4">{page.path}</h3>
                    <div className="prose prose-invert prose-sm max-w-none whitespace-pre-wrap text-slate-300 leading-relaxed">
                      {page.content || (
                        <span className="text-slate-500 italic">No content</span>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="text-slate-500 text-sm">
                    Select a page from the tree to view its content.
                  </div>
                )}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

/* ── Recursive page tree component ── */

function PageTree({
  pages,
  selectedPath,
  onSelect,
  depth = 0,
}: {
  pages: WikiPageType[];
  selectedPath: string;
  onSelect: (path: string) => void;
  depth?: number;
}) {
  return (
    <ul className="space-y-0.5">
      {pages.map((p) => (
        <li key={p.path}>
          <button
            onClick={() => onSelect(p.path)}
            className={clsx(
              'flex items-center gap-1.5 w-full text-left text-sm rounded-lg px-2 py-1.5 transition-colors',
              selectedPath === p.path
                ? 'bg-purple-500/15 text-purple-300'
                : 'text-slate-400 hover:text-white hover:bg-white/[0.06]',
            )}
            style={{ paddingLeft: `${depth * 12 + 8}px` }}
          >
            {p.sub_pages.length > 0 ? (
              <ChevronRight className="h-3 w-3 shrink-0" />
            ) : (
              <FileText className="h-3 w-3 shrink-0" />
            )}
            <span className="truncate">{p.path.split('/').pop() || p.path}</span>
          </button>
          {p.sub_pages.length > 0 && (
            <PageTree
              pages={p.sub_pages}
              selectedPath={selectedPath}
              onSelect={onSelect}
              depth={depth + 1}
            />
          )}
        </li>
      ))}
    </ul>
  );
}
