'use client';

import { useState } from 'react';
import {
  CheckCircle2,
  XCircle,
  MinusCircle,
  ChevronDown,
  ChevronRight,
  AlertTriangle,
  FileCode,
  Code2,
  ListChecks,
  Info,
} from 'lucide-react';
import { GlassCard, SeverityBadge } from '@/components/ui';
import type { DashboardSummary, ComplianceResult, Severity } from '@/lib/types';

interface RuleBreakdownProps {
  data: DashboardSummary;
}

function StatusIcon({ status }: { status: string }) {
  if (status === 'pass')
    return <CheckCircle2 className="h-4.5 w-4.5 text-teal shrink-0" />;
  if (status === 'fail')
    return <XCircle className="h-4.5 w-4.5 text-sunset shrink-0" />;
  return <MinusCircle className="h-4.5 w-4.5 text-frost-dark shrink-0" />;
}

function StatusLabel({ status }: { status: string }) {
  if (status === 'pass')
    return (
      <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-teal-50 text-teal border border-teal-200">
        Pass
      </span>
    );
  if (status === 'fail')
    return (
      <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-sunset-50 text-sunset border border-sunset-200">
        Fail
      </span>
    );
  return (
    <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-surface-tertiary text-frost-dark border border-frost">
      N/A
    </span>
  );
}

function RuleRow({ rule }: { rule: ComplianceResult }) {
  const [expanded, setExpanded] = useState(false);
  const isFail = rule.status === 'fail';
  const isNA = rule.status === 'na';
  const isPass = rule.status === 'pass';

  return (
    <div
      className={`border rounded-xl overflow-hidden transition-all ${
        isFail
          ? 'border-sunset-200/60 bg-sunset-50/20'
          : isPass
          ? 'border-teal-200/60 bg-teal-50/20'
          : 'border-frost bg-surface-secondary/50'
      }`}
    >
      {/* Header — always visible */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-surface-secondary/50 transition-colors"
      >
        <StatusIcon status={rule.status} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[13px] font-medium text-plum-dark">
              {rule.rule_name}
            </span>
            <StatusLabel status={rule.status} />
            <SeverityBadge severity={rule.severity as Severity} />
            <span className="text-[10px] text-frost-dark font-mono">
              {rule.rule_id}
            </span>
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-[10px] text-frost-dark">{rule.category}</span>
            {rule.file_path && (
              <>
                <span className="text-frost-dark/30">·</span>
                <span className="text-[10px] text-frost-dark flex items-center gap-1">
                  <FileCode className="h-2.5 w-2.5" />
                  {rule.file_path}
                  {rule.line_number && (
                    <span className="text-plum">L{rule.line_number}</span>
                  )}
                </span>
              </>
            )}
          </div>
        </div>
        {expanded ? (
          <ChevronDown className="h-4 w-4 text-frost-dark shrink-0" />
        ) : (
          <ChevronRight className="h-4 w-4 text-frost-dark shrink-0" />
        )}
      </button>

      {/* Expanded details */}
      {expanded && (
        <div className="px-4 pb-4 space-y-3 border-t border-frost/50">
          {/* Details / Reason */}
          {rule.details && (
            <div className="mt-3">
              <p
                className={`text-[10px] font-semibold uppercase tracking-wider mb-1 ${
                  isFail
                    ? 'text-sunset'
                    : isPass
                    ? 'text-teal'
                    : 'text-frost-dark'
                }`}
              >
                {isFail ? 'Issue Found' : isPass ? 'Verification' : 'Reason (N/A)'}
              </p>
              <div
                className={`rounded-lg px-3 py-2 text-sm ${
                  isFail
                    ? 'bg-sunset-50 border border-sunset-200 text-sunset-dark'
                    : isPass
                    ? 'bg-teal-50 border border-teal-200 text-teal-700'
                    : 'bg-surface-tertiary border border-frost text-frost-dark'
                }`}
              >
                {isNA && (
                  <Info className="h-3.5 w-3.5 inline mr-1.5 -mt-0.5 opacity-60" />
                )}
                {rule.details}
              </div>
            </div>
          )}

          {/* Current code */}
          {rule.current_code && (
            <div>
              <p className="text-[10px] font-semibold text-frost-dark uppercase tracking-wider mb-1">
                Current Code
              </p>
              <div className="bg-surface-tertiary rounded-lg px-3 py-2 font-mono text-xs text-plum-dark overflow-x-auto whitespace-pre-wrap">
                <code>{rule.current_code}</code>
              </div>
            </div>
          )}

          {/* Suggested fix */}
          {rule.suggested_fix && (
            <div>
              <p className="text-[10px] font-semibold text-teal uppercase tracking-wider mb-1 flex items-center gap-1.5">
                <Code2 className="h-3 w-3" /> Suggested Fix
              </p>
              <div className="bg-teal-50 border border-teal-200 rounded-lg px-3 py-2 font-mono text-xs text-teal-700 overflow-x-auto whitespace-pre-wrap">
                <code>{rule.suggested_fix}</code>
              </div>
            </div>
          )}

          {/* Migration guide */}
          {rule.migration_guide && (
            <div>
              <p className="text-[10px] font-semibold text-plum uppercase tracking-wider mb-1 flex items-center gap-1.5">
                <ListChecks className="h-3 w-3" /> Migration Steps
              </p>
              <div className="bg-plum-50 border border-plum-200 rounded-lg px-3 py-2 text-xs text-plum-dark/80 whitespace-pre-wrap leading-relaxed">
                {rule.migration_guide}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function RuleBreakdown({ data }: RuleBreakdownProps) {
  const [filter, setFilter] = useState<'all' | 'fail' | 'pass' | 'na'>('all');

  // Collect all compliance_results from all repos
  const allRules: { repoName: string; rules: ComplianceResult[] }[] = [];
  for (const repo of data.repositories) {
    const rules = repo.compliance_results ?? [];
    if (rules.length > 0) {
      allRules.push({ repoName: repo.repository.name, rules });
    }
  }

  return (
    <div className="space-y-5">
      {allRules.map(({ repoName, rules }) => {
        const filtered =
          filter === 'all' ? rules : rules.filter((r) => r.status === filter);
        const passCount = rules.filter((r) => r.status === 'pass').length;
        const failCount = rules.filter((r) => r.status === 'fail').length;
        const naCount = rules.filter((r) => r.status === 'na').length;

        return (
          <GlassCard key={repoName} hover={false} className="!p-0 overflow-hidden">
            {/* Header */}
            <div className="px-6 py-4 border-b border-frost flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-3">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-plum-50">
                  <ListChecks className="h-3.5 w-3.5 text-plum" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-plum-dark">
                    All Compliance Rules — {repoName}
                  </h3>
                  <p className="text-[11px] text-frost-dark mt-0.5">
                    {rules.length} rules total ·{' '}
                    <span className="text-teal">{passCount} pass</span> ·{' '}
                    <span className="text-sunset">{failCount} fail</span> ·{' '}
                    <span className="text-frost-dark">{naCount} N/A</span>
                  </p>
                </div>
              </div>

              {/* Filter tabs */}
              <div className="flex items-center gap-1 bg-surface-tertiary rounded-lg p-0.5">
                {(
                  [
                    { key: 'all', label: `All (${rules.length})` },
                    { key: 'fail', label: `Fail (${failCount})` },
                    { key: 'pass', label: `Pass (${passCount})` },
                    { key: 'na', label: `N/A (${naCount})` },
                  ] as const
                ).map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => setFilter(tab.key)}
                    className={`text-[11px] font-medium px-3 py-1 rounded-md transition-all ${
                      filter === tab.key
                        ? 'bg-white text-plum-dark shadow-sm'
                        : 'text-frost-dark hover:text-plum-dark'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Rules list */}
            <div className="p-4 space-y-2">
              {filtered.length === 0 ? (
                <p className="text-sm text-frost-dark text-center py-6">
                  No rules match this filter.
                </p>
              ) : (
                filtered.map((rule) => (
                  <RuleRow key={rule.rule_id} rule={rule} />
                ))
              )}
            </div>
          </GlassCard>
        );
      })}

      {allRules.length === 0 && (
        <GlassCard hover={false}>
          <p className="text-sm text-frost-dark text-center py-8">
            No compliance results available. Run a scan to see rule details.
          </p>
        </GlassCard>
      )}
    </div>
  );
}
