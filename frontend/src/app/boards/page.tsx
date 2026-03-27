'use client';

import { useState } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';
import { useBoardList, useBoardDetail, useWorkItems } from '@/hooks/useBoards';
import {
  Columns,
  Loader2,
  AlertCircle,
  ExternalLink,
  Tag,
  User,
  Clock,
} from 'lucide-react';
import { clsx } from 'clsx';
import type { WorkItemInfo } from '@/lib/types';

const STATE_COLORS: Record<string, string> = {
  New: 'bg-plum-50 text-plum',
  Active: 'bg-amber-50 text-amber-700',
  Resolved: 'bg-teal-50 text-teal',
  Closed: 'bg-surface-tertiary text-frost-dark',
  Removed: 'bg-sunset-50 text-sunset',
};

const PRIORITY_LABELS: Record<number, { label: string; color: string }> = {
  1: { label: 'P1', color: 'text-red-600' },
  2: { label: 'P2', color: 'text-sunset' },
  3: { label: 'P3', color: 'text-plum' },
  4: { label: 'P4', color: 'text-frost-dark' },
};

export default function BoardsPage() {
  const { boards, loading: boardsLoading, error: boardsError, refresh } = useBoardList();
  const [selectedBoard, setSelectedBoard] = useState<string>('');
  const [viewMode, setViewMode] = useState<'board' | 'list'>('list');

  const { data: boardDetail, loading: detailLoading } = useBoardDetail(selectedBoard);
  const { data: workItems, loading: itemsLoading, error: itemsError } = useWorkItems();

  return (
    <div className="flex min-h-screen bg-mesh">
      <Sidebar />
      <div className="flex-1 ml-16 lg:ml-60">
        <Header onRefresh={refresh} />

        <main className="px-6 py-6 space-y-6">
          {/* Page header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-50">
                <Columns className="h-5 w-5 text-teal" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-plum-dark">Boards & Work Items</h2>
                <p className="text-sm text-frost-dark">
                  Azure DevOps boards, stories, and work items
                </p>
              </div>
            </div>

            {/* View toggle */}
            <div className="flex rounded-xl border border-frost overflow-hidden">
              <button
                onClick={() => setViewMode('list')}
                className={clsx(
                  'px-3 py-1.5 text-xs font-medium transition-colors',
                  viewMode === 'list'
                    ? 'bg-plum-50 text-plum'
                    : 'text-frost-dark hover:text-plum-dark',
                )}
              >
                List
              </button>
              <button
                onClick={() => setViewMode('board')}
                className={clsx(
                  'px-3 py-1.5 text-xs font-medium transition-colors',
                  viewMode === 'board'
                    ? 'bg-plum-50 text-plum'
                    : 'text-frost-dark hover:text-plum-dark',
                )}
              >
                Board
              </button>
            </div>
          </div>

          {/* Board selector */}
          {boardsLoading ? (
            <div className="flex items-center gap-2 text-frost-dark">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading boards...
            </div>
          ) : boardsError ? (
            <div className="brand-card p-4 flex items-center gap-2 text-sunset">
              <AlertCircle className="h-4 w-4" /> {boardsError}
            </div>
          ) : (
            <div className="flex gap-2 flex-wrap">
              {boards.map((board) => (
                <button
                  key={board.id}
                  onClick={() => setSelectedBoard(board.name)}
                  className={clsx(
                    'rounded-xl px-4 py-2 text-sm font-medium border transition-all',
                    selectedBoard === board.name
                      ? 'bg-plum-50 border-plum-200 text-plum'
                      : 'bg-white border-frost text-plum-dark/80 hover:bg-surface-secondary',
                  )}
                >
                  {board.name}
                </button>
              ))}
            </div>
          )}

          {/* Board view */}
          {viewMode === 'board' && selectedBoard && boardDetail && (
            <div className="overflow-x-auto">
              <div className="flex gap-4 min-w-max pb-4">
                {boardDetail.columns.map((col) => {
                  const colItems = boardDetail.work_items.filter((wi) => {
                    const stateMapping = col.state_mappings[wi.work_item_type] ?? '';
                    return wi.state === col.name || wi.state === stateMapping;
                  });

                  return (
                    <div
                      key={col.id}
                      className="brand-card w-72 p-4 space-y-3 flex-shrink-0"
                    >
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-semibold text-plum-dark">
                          {col.name}
                        </h4>
                        <span className="text-xs text-frost-dark">
                          {colItems.length}
                          {col.item_limit > 0 && ` / ${col.item_limit}`}
                        </span>
                      </div>
                      <div className="space-y-2">
                        {colItems.map((wi) => (
                          <WorkItemCard key={wi.id} item={wi} />
                        ))}
                        {colItems.length === 0 && (
                          <p className="text-xs text-frost-dark text-center py-4">
                            No items
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Loading detail */}
          {viewMode === 'board' && selectedBoard && detailLoading && (
            <div className="flex items-center gap-2 text-frost-dark">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading board...
            </div>
          )}

          {/* List view — all work items */}
          {viewMode === 'list' && (
            <div className="brand-card overflow-hidden">
              {itemsLoading ? (
                <div className="p-6 flex items-center gap-2 text-frost-dark">
                  <Loader2 className="h-4 w-4 animate-spin" /> Loading work items...
                </div>
              ) : itemsError ? (
                <div className="p-6 flex items-center gap-2 text-sunset">
                  <AlertCircle className="h-4 w-4" /> {itemsError}
                </div>
              ) : (
                <div>
                  <div className="px-6 py-3 border-b border-frost">
                    <p className="text-sm text-frost-dark">
                      {workItems?.count ?? 0} work items
                    </p>
                  </div>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-frost text-frost-dark text-xs uppercase tracking-wider">
                        <th className="px-6 py-3 text-left">ID</th>
                        <th className="px-6 py-3 text-left">Title</th>
                        <th className="px-6 py-3 text-left">Type</th>
                        <th className="px-6 py-3 text-left">State</th>
                        <th className="px-6 py-3 text-left">Priority</th>
                        <th className="px-6 py-3 text-left">Assigned To</th>
                        <th className="px-6 py-3 text-left">Tags</th>
                        <th className="px-6 py-3 text-left">Updated</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-frost/50">
                      {(workItems?.work_items ?? []).map((wi) => (
                        <WorkItemRow key={wi.id} item={wi} />
                      ))}
                      {(workItems?.work_items ?? []).length === 0 && (
                        <tr>
                          <td
                            colSpan={8}
                            className="px-6 py-8 text-center text-frost-dark"
                          >
                            No work items found. Configure your ADO project to get
                            started.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

/* ── Work Item Card (board view) ── */

function WorkItemCard({ item }: { item: WorkItemInfo }) {
  const pri = PRIORITY_LABELS[item.priority];
  const stateCls = STATE_COLORS[item.state] ?? 'bg-slate-500/20 text-slate-300';

  return (
    <div className="rounded-xl bg-white border border-frost p-3 space-y-2 hover:bg-surface-secondary transition-colors">
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm text-plum-dark font-medium leading-tight line-clamp-2">
          {item.title}
        </p>
        {item.url && (
          <a
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-frost-dark hover:text-plum shrink-0"
          >
            <ExternalLink className="h-3 w-3" />
          </a>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-1.5 text-xs">
        <span className="text-frost-dark">#{item.id}</span>
        <span className={clsx('rounded-full px-2 py-0.5', stateCls)}>
          {item.state}
        </span>
        {pri && <span className={pri.color}>{pri.label}</span>}
      </div>
      {item.assigned_to && (
        <div className="flex items-center gap-1 text-xs text-frost-dark">
          <User className="h-3 w-3" />
          <span className="truncate">{item.assigned_to}</span>
        </div>
      )}
      {item.tags && (
        <div className="flex items-center gap-1 text-xs text-frost-dark">
          <Tag className="h-3 w-3" />
          <span className="truncate">{item.tags}</span>
        </div>
      )}
    </div>
  );
}

/* ── Work Item Row (list view) ── */

function WorkItemRow({ item }: { item: WorkItemInfo }) {
  const pri = PRIORITY_LABELS[item.priority];
  const stateCls = STATE_COLORS[item.state] ?? 'bg-slate-500/20 text-slate-300';

  return (
    <tr className="hover:bg-plum-50/50 transition-colors">
      <td className="px-6 py-3">
        {item.url ? (
          <a
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-plum hover:underline"
          >
            #{item.id}
          </a>
        ) : (
          <span className="text-frost-dark">#{item.id}</span>
        )}
      </td>
      <td className="px-6 py-3 text-plum-dark font-medium max-w-xs truncate">
        {item.title}
      </td>
      <td className="px-6 py-3 text-frost-dark">{item.work_item_type}</td>
      <td className="px-6 py-3">
        <span className={clsx('rounded-full px-2 py-0.5 text-xs', stateCls)}>
          {item.state}
        </span>
      </td>
      <td className="px-6 py-3">
        {pri ? <span className={clsx('text-xs font-medium', pri.color)}>{pri.label}</span> : '—'}
      </td>
      <td className="px-6 py-3 text-frost-dark max-w-[120px] truncate">
        {item.assigned_to || '—'}
      </td>
      <td className="px-6 py-3 text-frost-dark max-w-[140px] truncate">
        {item.tags || '—'}
      </td>
      <td className="px-6 py-3 text-frost-dark text-xs">
        {item.changed_date
          ? new Date(item.changed_date).toLocaleDateString()
          : '—'}
      </td>
    </tr>
  );
}
