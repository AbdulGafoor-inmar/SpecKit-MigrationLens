'use client';

import {
  CheckCircle2,
  XCircle,
  Loader2,
  Circle,
  SkipForward,
  ExternalLink,
  Sparkles,
  GitPullRequest,
  FileCode,
  Bug,
  GitBranch,
  Shield,
  X,
  Zap,
} from 'lucide-react';
import type { AutoFixStep, AutoFixStepStatus } from '@/lib/types';

interface AutoFixModalProps {
  /** Whether the modal is visible */
  open: boolean;
  /** Close the modal */
  onClose: () => void;
  /** Repository name */
  repoName: string;
  /** Number of failing rules being fixed */
  failingRulesCount: number;
  /** Current pipeline steps with live status */
  steps: AutoFixStep[];
  /** Whether the pipeline is running */
  running: boolean;
  /** Whether the pipeline has completed */
  done: boolean;
  /** Error message */
  error: string | null;
  /** Story URL */
  storyUrl: string | null;
  /** PR URL */
  prUrl: string | null;
  /** Review verdict */
  reviewVerdict: string | null;
  /** Review score */
  reviewScore: number | null;
  /** Files changed */
  filesChanged: string[];
  /** Cancel the pipeline */
  onCancel: () => void;
}

const stepIcons: Record<number, typeof Bug> = {
  1: Bug,
  2: Sparkles,
  3: GitBranch,
  4: FileCode,
  5: GitPullRequest,
  6: Shield,
};

function StepStatusIcon({ status }: { status: AutoFixStepStatus }) {
  switch (status) {
    case 'completed':
      return <CheckCircle2 className="h-5 w-5 text-teal" />;
    case 'failed':
      return <XCircle className="h-5 w-5 text-sunset" />;
    case 'running':
      return <Loader2 className="h-5 w-5 text-plum animate-spin" />;
    case 'skipped':
      return <SkipForward className="h-5 w-5 text-frost-dark" />;
    default:
      return <Circle className="h-5 w-5 text-frost" />;
  }
}

function stepStatusColor(status: AutoFixStepStatus): string {
  switch (status) {
    case 'completed':
      return 'border-teal/30 bg-teal-50';
    case 'failed':
      return 'border-sunset/30 bg-sunset-50';
    case 'running':
      return 'border-plum/30 bg-plum-50';
    case 'skipped':
      return 'border-frost bg-surface-tertiary';
    default:
      return 'border-frost bg-white';
  }
}

export function AutoFixModal({
  open,
  onClose,
  repoName,
  failingRulesCount,
  steps,
  running,
  done,
  error,
  storyUrl,
  prUrl,
  reviewVerdict,
  reviewScore,
  filesChanged,
  onCancel,
}: AutoFixModalProps) {
  if (!open) return null;

  const completedSteps = steps.filter((s) => s.status === 'completed').length;
  const failedSteps = steps.filter((s) => s.status === 'failed').length;
  const totalSteps = steps.length;
  const progressPercent = Math.round((completedSteps / totalSteps) * 100);

  const pipelineStatus =
    running
      ? 'running'
      : done && failedSteps === 0
        ? 'success'
        : done && completedSteps > 0
          ? 'partial'
          : done
            ? 'failed'
            : 'idle';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-plum-dark/40 backdrop-blur-sm"
        onClick={!running ? onClose : undefined}
      />

      {/* Modal */}
      <div className="relative w-full max-w-lg rounded-2xl border border-frost bg-white shadow-2xl shadow-plum/10 overflow-hidden">
        {/* Animated top gradient */}
        <div
          className={`h-1 ${
            running
              ? 'bg-gradient-to-r from-plum via-teal to-plum animate-pulse'
              : pipelineStatus === 'success'
                ? 'bg-teal'
                : pipelineStatus === 'partial'
                  ? 'bg-goldenrod'
                  : pipelineStatus === 'failed'
                    ? 'bg-sunset'
                    : 'bg-frost'
          }`}
        />

        {/* Header */}
        <div className="px-6 pt-5 pb-4 flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-gradient-to-br from-plum-50 to-teal-50 border border-plum-100">
                <Zap className="h-4 w-4 text-plum" />
              </div>
              <h2 className="text-base font-semibold text-plum-dark">AI Auto-Fix Pipeline</h2>
            </div>
            <p className="text-xs text-frost-dark mt-1.5">
              {repoName} · {failingRulesCount} compliance{' '}
              {failingRulesCount === 1 ? 'rule' : 'rules'} to fix
            </p>
          </div>
          {!running && (
            <button
              onClick={onClose}
              className="p-1 rounded-lg text-frost-dark hover:text-plum-dark hover:bg-surface-tertiary transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Progress bar */}
        {running && (
          <div className="px-6 pb-3">
            <div className="h-1.5 rounded-full bg-surface-tertiary overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-plum to-teal transition-all duration-700 ease-out"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <p className="text-[10px] text-frost-dark mt-1 text-right">
              {completedSteps}/{totalSteps} steps
            </p>
          </div>
        )}

        {/* Error message */}
        {error && (
          <div className="mx-6 mb-3 rounded-xl border border-sunset/20 bg-sunset-50 px-4 py-3">
            <p className="text-xs text-sunset">{error}</p>
          </div>
        )}

        {/* Steps */}
        <div className="px-6 pb-4 space-y-2 max-h-[360px] overflow-y-auto">
          {steps.map((step) => {
            const Icon = stepIcons[step.step] || Circle;
            return (
              <div
                key={step.step}
                className={`rounded-xl border px-4 py-3 transition-all duration-300 ${stepStatusColor(
                  step.status,
                )}`}
              >
                <div className="flex items-center gap-3">
                  <StepStatusIcon status={step.status} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <Icon className="h-3.5 w-3.5 text-frost-dark shrink-0" />
                      <span className="text-sm font-medium text-plum-dark">
                        Step {step.step}: {step.name}
                      </span>
                    </div>
                    {step.details && (
                      <p
                        className={`text-xs mt-0.5 ml-[22px] ${
                          step.status === 'failed'
                            ? 'text-sunset'
                            : step.status === 'completed'
                              ? 'text-teal'
                              : 'text-frost-dark'
                        }`}
                      >
                        {step.details}
                      </p>
                    )}
                  </div>
                  {step.url && step.status === 'completed' && (
                    <a
                      href={step.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="shrink-0 p-1 rounded text-plum hover:text-teal transition-colors"
                      title="Open in ADO"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Result Links */}
        {done && (storyUrl || prUrl) && (
          <div className="px-6 pb-4">
            <div className="rounded-xl border border-frost bg-surface-secondary p-4 space-y-3">
              {/* Verdict */}
              {reviewVerdict && (
                <div className="flex items-center gap-2">
                  <Shield
                    className={`h-4 w-4 ${
                      reviewVerdict === 'APPROVE'
                        ? 'text-teal'
                        : reviewVerdict === 'BLOCK'
                          ? 'text-sunset'
                          : 'text-goldenrod'
                    }`}
                  />
                  <span className="text-sm text-plum-dark font-medium">
                    Review: {reviewVerdict}
                  </span>
                  {reviewScore !== null && (
                    <span className="text-xs text-frost-dark">
                      ({reviewScore}% confidence)
                    </span>
                  )}
                </div>
              )}

              {/* Files changed */}
              {filesChanged.length > 0 && (
                <div>
                  <p className="text-xs text-frost-dark mb-1">Files modified:</p>
                  <div className="flex flex-wrap gap-1.5">
                    {filesChanged.map((f) => (
                      <span
                        key={f}
                        className="text-[10px] px-1.5 py-0.5 rounded bg-surface-tertiary text-plum-dark/80 font-mono"
                      >
                        {f.split('/').pop()}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Action links */}
              <div className="flex gap-2 pt-1">
                {storyUrl && (
                  <a
                    href={storyUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium bg-goldenrod-50 text-goldenrod border border-goldenrod/20 hover:bg-goldenrod-100 transition-all"
                  >
                    <Bug className="h-3 w-3" /> View Story
                    <ExternalLink className="h-3 w-3" />
                  </a>
                )}
                {prUrl && (
                  <a
                    href={prUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium bg-plum-50 text-plum border border-plum/20 hover:bg-plum-100 transition-all"
                  >
                    <GitPullRequest className="h-3 w-3" /> View PR
                    <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="px-6 py-4 border-t border-frost flex justify-end gap-2">
          {running ? (
            <button
              onClick={onCancel}
              className="inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-medium text-sunset bg-sunset-50 border border-sunset/20 hover:bg-sunset-100 transition-all"
            >
              Cancel
            </button>
          ) : (
            <button
              onClick={onClose}
              className="inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-medium text-plum-dark bg-surface-tertiary border border-frost hover:bg-frost transition-all"
            >
              Close
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
