'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, ScanLine, FileBarChart, Settings, BookOpen, Columns } from 'lucide-react';
import { clsx } from 'clsx';

const navItems = [
  { label: 'Dashboard', href: '/', icon: LayoutDashboard },
  { label: 'Wiki', href: '/wiki', icon: BookOpen },
  { label: 'Boards', href: '/boards', icon: Columns },
  { label: 'Scan', href: '/scan', icon: ScanLine },
  { label: 'Reports', href: '/reports', icon: FileBarChart },
  { label: 'Settings', href: '/settings', icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="glass-sidebar fixed left-0 top-0 z-30 flex h-full w-16 flex-col items-center py-6 gap-2 lg:w-56 lg:items-start lg:px-4">
      {/* Logo icon for small screens */}
      <div className="mb-8 flex h-10 w-10 items-center justify-center rounded-xl bg-accent-blue/20 lg:hidden">
        <LayoutDashboard className="h-5 w-5 text-accent-blue" />
      </div>

      {/* Brand for large screens */}
      <div className="mb-8 hidden lg:block">
        <h2 className="text-sm font-bold gradient-text tracking-wide">MIGRATION</h2>
        <h2 className="text-sm font-bold text-white -mt-0.5">LENS</h2>
      </div>

      <nav className="flex flex-col gap-1 w-full">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={clsx(
                'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200',
                'lg:w-full',
                isActive
                  ? 'bg-accent-blue/15 text-accent-blue shadow-glow'
                  : 'text-slate-400 hover:text-white hover:bg-white/[0.06]',
              )}
            >
              <Icon className="h-5 w-5 shrink-0" />
              <span className="hidden lg:inline">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
