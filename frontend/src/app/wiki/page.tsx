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
    <div className="flex min-h-screen bg-mesh">
      <Sidebar />
      <div className="flex-1 ml-16 lg:ml-60">
        <Header onRefresh={refresh} />

        <main className="px-6 py-6 space-y-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-plum-50">
              <BookOpen className="h-5 w-5 text-plum" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-plum-dark">Wiki Browser</h2>
              <p className="text-sm text-frost-dark">Browse Azure DevOps wiki pages</p>
            </div>
          </div>

          {/* Wiki selector */}
          {wikisLoading ? (
            <div className="flex items-center gap-2 text-frost-dark">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading wikis...
            </div>
          ) : wikisError ? (
            <div className="brand-card p-4 flex items-center gap-2 text-sunset">
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
                      ? 'bg-plum-50 border-plum-200 text-plum'
                      : 'bg-white border-frost text-plum-dark/80 hover:bg-surface-secondary',
                  )}
                >
                  <BookOpen className="h-3.5 w-3.5 inline mr-1.5" />
                  {wiki.name}
                  <span className="ml-2 text-xs text-frost-dark">({wiki.type})</span>
                </button>
              ))}
              {wikis.length === 0 && (
                <p className="text-sm text-frost-dark">
                  No wikis found. Configure your ADO project in settings.
                </p>
              )}
            </div>
          )}

          {/* Content area — tree + page */}
          {selectedWiki && (
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              {/* Page tree sidebar */}
              <div className="brand-card p-4 lg:col-span-1 max-h-[70vh] overflow-y-auto">
                <h3 className="text-sm font-semibold text-plum-dark/80 mb-3">Pages</h3>
                {pagesLoading ? (
                  <div className="flex items-center gap-2 text-frost-dark text-sm">
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
              <div className="brand-card p-6 lg:col-span-3 max-h-[70vh] overflow-y-auto">
                {pageLoading ? (
                  <div className="flex items-center gap-2 text-frost-dark">
                    <Loader2 className="h-4 w-4 animate-spin" /> Loading page...
                  </div>
                ) : pageError ? (
                  <div className="text-sunset flex items-center gap-2">
                    <AlertCircle className="h-4 w-4" /> {pageError}
                  </div>
                ) : page ? (
                  <div>
                    <h3 className="text-lg font-bold text-plum-dark mb-4">{page.path}</h3>
                    <div className="prose prose-sm max-w-none whitespace-pre-wrap text-plum-dark/80 leading-relaxed">
                      {page.content || (
                        <span className="text-frost-dark italic">No content</span>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="text-frost-dark text-sm">
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
                ? 'bg-plum-50 text-plum'
                : 'text-frost-dark hover:text-plum-dark hover:bg-surface-secondary',
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
