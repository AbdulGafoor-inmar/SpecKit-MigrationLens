'use client';

import { useState, useCallback, useRef } from 'react';
import type { AutoFixStep, AutoFixRequest, AutoFixStepStatus } from '@/lib/types';
import { getAutoFixStreamUrl } from '@/lib/api';

/**
 * Initial step states for the 6-step pipeline.
 */
const INITIAL_STEPS: AutoFixStep[] = [
  { step: 1, name: 'Create Work Item', status: 'pending', details: '', url: '', data: {} },
  { step: 2, name: 'Generate AI Fixes', status: 'pending', details: '', url: '', data: {} },
  { step: 3, name: 'Create Branch', status: 'pending', details: '', url: '', data: {} },
  { step: 4, name: 'Push Changes', status: 'pending', details: '', url: '', data: {} },
  { step: 5, name: 'Create Pull Request', status: 'pending', details: '', url: '', data: {} },
  { step: 6, name: 'AI PR Review', status: 'pending', details: '', url: '', data: {} },
];

interface AutoFixState {
  /** Current pipeline steps with live status */
  steps: AutoFixStep[];
  /** Whether the pipeline is currently running */
  running: boolean;
  /** Whether the pipeline has completed (success or partial) */
  done: boolean;
  /** Error message if the pipeline failed to start */
  error: string | null;
  /** Story URL from Step 1 */
  storyUrl: string | null;
  /** PR URL from Step 5 */
  prUrl: string | null;
  /** PR ID from Step 5 */
  prId: number | null;
  /** Work Item ID from Step 1 */
  storyId: number | null;
  /** Review verdict from Step 6 */
  reviewVerdict: string | null;
  /** Review confidence from Step 6 */
  reviewScore: number | null;
  /** Files changed from Step 2 */
  filesChanged: string[];
}

export function useAutoFix(repoId: string) {
  const [state, setState] = useState<AutoFixState>({
    steps: INITIAL_STEPS,
    running: false,
    done: false,
    error: null,
    storyUrl: null,
    prUrl: null,
    prId: null,
    storyId: null,
    reviewVerdict: null,
    reviewScore: null,
    filesChanged: [],
  });

  const abortRef = useRef<AbortController | null>(null);

  const startAutoFix = useCallback(
    async (request: AutoFixRequest = {}) => {
      // Reset state
      setState({
        steps: INITIAL_STEPS.map((s) => ({ ...s })),
        running: true,
        done: false,
        error: null,
        storyUrl: null,
        prUrl: null,
        prId: null,
        storyId: null,
        reviewVerdict: null,
        reviewScore: null,
        filesChanged: [],
      });

      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const url = getAutoFixStreamUrl(repoId);
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(request),
          signal: controller.signal,
        });

        if (!response.ok) {
          const text = await response.text().catch(() => '');
          setState((prev) => ({
            ...prev,
            running: false,
            error: `Failed to start pipeline: ${response.status} ${text}`,
          }));
          return;
        }

        const reader = response.body?.getReader();
        if (!reader) {
          setState((prev) => ({
            ...prev,
            running: false,
            error: 'No response stream available',
          }));
          return;
        }

        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { value, done: streamDone } = await reader.read();
          if (streamDone) break;

          buffer += decoder.decode(value, { stream: true });

          // Process complete SSE events (separated by \n\n)
          const events = buffer.split('\n\n');
          buffer = events.pop() || ''; // Keep incomplete event in buffer

          for (const event of events) {
            if (!event.trim()) continue;

            // Parse SSE event
            const lines = event.split('\n');
            let eventType = 'message';
            let eventData = '';

            for (const line of lines) {
              if (line.startsWith('event: ')) {
                eventType = line.slice(7).trim();
              } else if (line.startsWith('data: ')) {
                eventData = line.slice(6);
              }
            }

            if (!eventData) continue;

            try {
              const parsed = JSON.parse(eventData);

              if (eventType === 'done') {
                // Final event — pipeline complete
                setState((prev) => ({ ...prev, running: false, done: true }));
              } else {
                // Step update event
                const stepUpdate = parsed as AutoFixStep;

                setState((prev) => {
                  const newSteps = prev.steps.map((s) =>
                    s.step === stepUpdate.step ? { ...s, ...stepUpdate } : s,
                  );

                  const newState = { ...prev, steps: newSteps };

                  // Extract key info from completed steps
                  if (stepUpdate.status === 'completed') {
                    if (stepUpdate.step === 1 && stepUpdate.url) {
                      newState.storyUrl = stepUpdate.url;
                      newState.storyId = (stepUpdate.data?.work_item_id as number) || null;
                    }
                    if (stepUpdate.step === 2 && stepUpdate.data?.files) {
                      newState.filesChanged = stepUpdate.data.files as string[];
                    }
                    if (stepUpdate.step === 5 && stepUpdate.url) {
                      newState.prUrl = stepUpdate.url;
                      newState.prId = (stepUpdate.data?.pr_id as number) || null;
                    }
                    if (stepUpdate.step === 6) {
                      newState.reviewVerdict = (stepUpdate.data?.verdict as string) || null;
                      newState.reviewScore = (stepUpdate.data?.confidence as number) || null;
                    }
                  }

                  // Check if step 0 failed (initialization error)
                  if (stepUpdate.step === 0 && stepUpdate.status === 'failed') {
                    newState.error = stepUpdate.details;
                    newState.running = false;
                  }

                  return newState;
                });
              }
            } catch {
              // Ignore malformed events
            }
          }
        }

        // Stream ended normally
        setState((prev) => {
          // Only mark done if we actually received events
          const anyCompleted = prev.steps.some((s) => s.status === 'completed' || s.status === 'failed');
          return { ...prev, running: false, done: true, error: anyCompleted ? prev.error : prev.error || null };
        });
      } catch (err: unknown) {
        if (err instanceof Error && err.name === 'AbortError') {
          setState((prev) => ({ ...prev, running: false, error: 'Pipeline cancelled' }));
        } else {
          // ERR_INCOMPLETE_CHUNKED_ENCODING and fetch failures show up as TypeError
          const message =
            err instanceof TypeError
              ? 'Connection to server lost. The backend may have crashed — check the server logs.'
              : err instanceof Error
                ? err.message
                : 'Unknown error';
          setState((prev) => ({
            ...prev,
            running: false,
            error: `Pipeline error: ${message}`,
          }));
        }
      }
    },
    [repoId],
  );

  const cancel = useCallback(() => {
    abortRef.current?.abort();
    setState((prev) => ({ ...prev, running: false }));
  }, []);

  const reset = useCallback(() => {
    setState({
      steps: INITIAL_STEPS.map((s) => ({ ...s })),
      running: false,
      done: false,
      error: null,
      storyUrl: null,
      prUrl: null,
      prId: null,
      storyId: null,
      reviewVerdict: null,
      reviewScore: null,
      filesChanged: [],
    });
  }, []);

  return {
    ...state,
    startAutoFix,
    cancel,
    reset,
  };
}
