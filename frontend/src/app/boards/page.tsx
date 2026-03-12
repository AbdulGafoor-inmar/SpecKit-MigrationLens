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
  New: 'bg-blue-500/20 text-blue-300',
  Active: 'bg-amber-500/20 text-amber-300',
  Resolved: 'bg-emerald-500/20 text-emerald-300',
  Closed: 'bg-slate-500/20 text-slate-300',
  Removed: 'bg-rose-500/20 text-rose-300',
};

const PRIORITY_LABELS: Record<number, { label: string; color: string }> = {
  1: { label: 'P1', color: 'text-rose-400' },
  2: { label: 'P2', color: 'text-amber-400' },
  3: { label: 'P3', color: 'text-blue-400' },
  4: { label: 'P4', color: 'text-slate-400' },
};

export default function BoardsPage() {
  const { boards, loading: boardsLoading, error: boardsError, refresh } = useBoardList();
  const [selectedBoard, setSelectedBoard] = useState<string>('');
  const [viewMode, setViewMode] = useState<'board' | 'list'>('list');

  const { data: boardDetail, loading: detailLoading } = useBoardDetail(selectedBoard);
  const { data: workItems, loading: itemsLoading, error: itemsError } = useWorkItems();

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 ml-16 lg:ml-56">
        <Header onRefresh={refresh} />

        <main className="px-6 py-6 space-y-6">
          {/* Page header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-500/20">
                <Columns className="h-5 w-5 text-cyan-400" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Boards & Work Items</h2>
                <p className="text-sm text-slate-400">
                  Azure DevOps boards, stories, and work items
                </p>
              </div>
            </div>

            {/* View toggle */}
            <div className="flex rounded-xl border border-white/[0.08] overflow-hidden">
              <button
                onClick={() => setViewMode('list')}
                className={clsx(
                  'px-3 py-1.5 text-xs font-medium transition-colors',
                  viewMode === 'list'
                    ? 'bg-cyan-500/20 text-cyan-300'
                    : 'text-slate-400 hover:text-white',
                )}
              >
                List
              </button>
              <button
                onClick={() => setViewMode('board')}
                className={clsx(
                  'px-3 py-1.5 text-xs font-medium transition-colors',
                  viewMode === 'board'
                    ? 'bg-cyan-500/20 text-cyan-300'
                    : 'text-slate-400 hover:text-white',
                )}
              >
                Board
              </button>
            </div>
          </div>

          {/* Board selector */}
          {boardsLoading ? (
            <div className="flex items-center gap-2 text-slate-400">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading boards...
            </div>
          ) : boardsError ? (
            <div className="glass-card p-4 flex items-center gap-2 text-rose-400">
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
                      ? 'bg-cyan-500/20 border-cyan-500/40 text-cyan-300'
                      : 'bg-white/[0.04] border-white/[0.08] text-slate-300 hover:bg-white/[0.08]',
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
                      className="glass-card w-72 p-4 space-y-3 flex-shrink-0"
                    >
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-semibold text-white">
                          {col.name}
                        </h4>
                        <span className="text-xs text-slate-500">
                          {colItems.length}
                          {col.item_limit > 0 && ` / ${col.item_limit}`}
                        </span>
                      </div>
                      <div className="space-y-2">
                        {colItems.map((wi) => (
                          <WorkItemCard key={wi.id} item={wi} />
                        ))}
                        {colItems.length === 0 && (
                          <p className="text-xs text-slate-600 text-center py-4">
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
            <div className="flex items-center gap-2 text-slate-400">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading board...
            </div>
          )}

          {/* List view — all work items */}
          {viewMode === 'list' && (
            <div className="glass-card overflow-hidden">
              {itemsLoading ? (
                <div className="p-6 flex items-center gap-2 text-slate-400">
                  <Loader2 className="h-4 w-4 animate-spin" /> Loading work items...
                </div>
              ) : itemsError ? (
                <div className="p-6 flex items-center gap-2 text-rose-400">
                  <AlertCircle className="h-4 w-4" /> {itemsError}
                </div>
              ) : (
                <div>
                  <div className="px-6 py-3 border-b border-white/[0.06]">
                    <p className="text-sm text-slate-400">
                      {workItems?.count ?? 0} work items
                    </p>
                  </div>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-white/[0.06] text-slate-500 text-xs uppercase tracking-wider">
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
                    <tbody className="divide-y divide-white/[0.04]">
                      {(workItems?.work_items ?? []).map((wi) => (
                        <WorkItemRow key={wi.id} item={wi} />
                      ))}
                      {(workItems?.work_items ?? []).length === 0 && (
                        <tr>
                          <td
                            colSpan={8}
                            className="px-6 py-8 text-center text-slate-500"
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
    <div className="rounded-xl bg-white/[0.04] border border-white/[0.06] p-3 space-y-2 hover:bg-white/[0.07] transition-colors">
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm text-white font-medium leading-tight line-clamp-2">
          {item.title}
        </p>
        {item.url && (
          <a
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-slate-500 hover:text-white shrink-0"
          >
            <ExternalLink className="h-3 w-3" />
          </a>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-1.5 text-xs">
        <span className="text-slate-500">#{item.id}</span>
        <span className={clsx('rounded-full px-2 py-0.5', stateCls)}>
          {item.state}
        </span>
        {pri && <span className={pri.color}>{pri.label}</span>}
      </div>
      {item.assigned_to && (
        <div className="flex items-center gap-1 text-xs text-slate-500">
          <User className="h-3 w-3" />
          <span className="truncate">{item.assigned_to}</span>
        </div>
      )}
      {item.tags && (
        <div className="flex items-center gap-1 text-xs text-slate-500">
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
    <tr className="hover:bg-white/[0.03] transition-colors">
      <td className="px-6 py-3">
        {item.url ? (
          <a
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-cyan-400 hover:underline"
          >
            #{item.id}
          </a>
        ) : (
          <span className="text-slate-400">#{item.id}</span>
        )}
      </td>
      <td className="px-6 py-3 text-white font-medium max-w-xs truncate">
        {item.title}
      </td>
      <td className="px-6 py-3 text-slate-400">{item.work_item_type}</td>
      <td className="px-6 py-3">
        <span className={clsx('rounded-full px-2 py-0.5 text-xs', stateCls)}>
          {item.state}
        </span>
      </td>
      <td className="px-6 py-3">
        {pri ? <span className={clsx('text-xs font-medium', pri.color)}>{pri.label}</span> : '—'}
      </td>
      <td className="px-6 py-3 text-slate-400 max-w-[120px] truncate">
        {item.assigned_to || '—'}
      </td>
      <td className="px-6 py-3 text-slate-500 max-w-[140px] truncate">
        {item.tags || '—'}
      </td>
      <td className="px-6 py-3 text-slate-500 text-xs">
        {item.changed_date
          ? new Date(item.changed_date).toLocaleDateString()
          : '—'}
      </td>
    </tr>
  );
}
