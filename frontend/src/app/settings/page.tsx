'use client';

import { Sidebar } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';
import { useSettings } from '@/hooks/useSettings';
import {
  Settings,
  Loader2,
  AlertCircle,
  Globe,
  Key,
  Server,
  FolderOpen,
  Clock,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import { clsx } from 'clsx';

export default function SettingsPage() {
  const { settings, loading, error, refresh } = useSettings();

  return (
    <div className="flex min-h-screen bg-mesh">
      <Sidebar />
      <div className="flex-1 ml-16 lg:ml-60">
        <Header onRefresh={refresh} />

        <main className="px-6 py-6 space-y-6">
          {/* Page header */}
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-surface-tertiary">
              <Settings className="h-5 w-5 text-frost-dark" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-plum-dark">Settings</h2>
              <p className="text-sm text-frost-dark">
                Current application configuration (read-only)
              </p>
            </div>
          </div>

          {/* Loading */}
          {loading && (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-plum" />
            </div>
          )}

          {/* Error */}
          {!loading && error && (
            <div className="brand-card p-6 flex items-center gap-3 text-sunset">
              <AlertCircle className="h-5 w-5 shrink-0" />
              <span className="text-sm">{error}</span>
            </div>
          )}

          {/* Settings content */}
          {!loading && settings && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Azure DevOps */}
              <div className="brand-card p-6 space-y-4">
                <div className="flex items-center gap-2 mb-2">
                  <Globe className="h-4 w-4 text-plum" />
                  <h3 className="text-sm font-semibold text-plum-dark">Azure DevOps</h3>
                </div>

                <SettingRow label="Organization" value={settings.ado_organization} />
                <SettingRow label="Project" value={settings.ado_project} />
                <SettingRow label="Base URL" value={settings.ado_base_url} />
                <SettingRow
                  label="PAT Token"
                  value={
                    settings.has_pat ? (
                      <span className="inline-flex items-center gap-1 text-teal">
                        <CheckCircle2 className="h-3.5 w-3.5" /> Configured
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-sunset">
                        <XCircle className="h-3.5 w-3.5" /> Not set
                      </span>
                    )
                  }
                />
              </div>

              {/* Server */}
              <div className="brand-card p-6 space-y-4">
                <div className="flex items-center gap-2 mb-2">
                  <Server className="h-4 w-4 text-plum" />
                  <h3 className="text-sm font-semibold text-plum-dark">Server</h3>
                </div>

                <SettingRow label="Backend URL" value={settings.backend_url} />
                <SettingRow label="CORS Origins" value={settings.cors_origins} />
              </div>

              {/* Cache */}
              <div className="brand-card p-6 space-y-4">
                <div className="flex items-center gap-2 mb-2">
                  <FolderOpen className="h-4 w-4 text-amber-500" />
                  <h3 className="text-sm font-semibold text-plum-dark">Cache</h3>
                </div>

                <SettingRow label="Cache Directory" value={settings.cache_dir} />
                <SettingRow
                  label="Cache TTL"
                  value={`${settings.cache_ttl}s (${(settings.cache_ttl / 60).toFixed(0)} min)`}
                />
              </div>

              {/* Info */}
              <div className="brand-card p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Key className="h-4 w-4 text-teal" />
                  <h3 className="text-sm font-semibold text-plum-dark">Configuration</h3>
                </div>
                <p className="text-sm text-frost-dark leading-relaxed">
                  Settings are loaded from environment variables and the{' '}
                  <code className="text-xs px-1.5 py-0.5 rounded bg-surface-tertiary text-plum-dark">
                    .env
                  </code>{' '}
                  file in the backend directory. To modify settings, update the{' '}
                  <code className="text-xs px-1.5 py-0.5 rounded bg-surface-tertiary text-plum-dark">
                    .env
                  </code>{' '}
                  file and restart the backend server.
                </p>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

function SettingRow({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-2 border-b border-frost/50 last:border-0">
      <span className="text-sm text-frost-dark shrink-0">{label}</span>
      <span className="text-sm text-plum-dark font-medium text-right truncate">
        {typeof value === 'string' ? value || '—' : value}
      </span>
    </div>
  );
}
