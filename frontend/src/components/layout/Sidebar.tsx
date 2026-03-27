'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, ScanLine, FileBarChart, Settings, GitPullRequest, Hexagon } from 'lucide-react';
import { clsx } from 'clsx';

const navItems = [
  { label: 'Dashboard', href: '/', icon: LayoutDashboard },
  { label: 'Scan', href: '/scan', icon: ScanLine },
  { label: 'Reports', href: '/reports', icon: FileBarChart },
  { label: 'PR Review', href: '/pr-review', icon: GitPullRequest },
  { label: 'Settings', href: '/settings', icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="brand-sidebar fixed left-0 top-0 z-30 flex h-full w-16 flex-col items-center py-6 gap-1 lg:w-60 lg:items-start lg:px-4">
      {/* Logo icon for small screens */}
      <div className="mb-8 flex h-10 w-10 items-center justify-center rounded-xl bg-plum-50 lg:hidden">
        <Hexagon className="h-5 w-5 text-plum" />
      </div>

      {/* Brand for large screens */}
      <div className="mb-8 hidden lg:flex items-center gap-3 px-2">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-plum to-teal">
          <Hexagon className="h-5 w-5 text-white" />
        </div>
        <div>
          <h2 className="text-xs font-bold gradient-text tracking-[0.2em]">MIGRATION</h2>
          <h2 className="text-[10px] font-semibold text-frost-dark tracking-[0.25em] -mt-0.5">LENS</h2>
        </div>
      </div>

      {/* Separator */}
      <div className="w-8 lg:w-full h-px bg-gradient-to-r from-transparent via-frost to-transparent mb-3" />

      <nav className="flex flex-col gap-0.5 w-full">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={clsx(
                'group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-medium transition-all duration-200',
                'lg:w-full',
                isActive
                  ? 'bg-plum-50 text-plum'
                  : 'text-frost-dark hover:text-plum-dark hover:bg-surface-tertiary',
              )}
            >
              {/* Active left bar */}
              {isActive && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-gradient-to-b from-plum to-teal" />
              )}
              <Icon className={clsx(
                'h-[18px] w-[18px] shrink-0 transition-colors duration-200',
                isActive ? 'text-plum' : 'text-frost-dark group-hover:text-plum-700',
              )} />
              <span className="hidden lg:inline">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Bottom version */}
      <div className="mt-auto w-8 lg:w-full flex flex-col items-center lg:items-start gap-3">
        <div className="w-full h-px bg-gradient-to-r from-transparent via-frost to-transparent" />
        <span className="text-[9px] text-frost-dark font-mono tracking-wider lg:px-2">v1.0.0</span>
      </div>
    </aside>
  );
}
