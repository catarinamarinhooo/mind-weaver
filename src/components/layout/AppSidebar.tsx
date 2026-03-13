import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, PenLine, Library, Brain, Lightbulb,
  Briefcase, Heart, Hash, BookOpen, Eye, Compass,
  Search, MessageCircle, Quote, ChevronLeft, ChevronRight,
} from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';

const navItems = [
  { label: 'Dashboard', path: '/', icon: LayoutDashboard },
  { label: 'Capture', path: '/capture', icon: PenLine },
  { label: 'Library', path: '/library', icon: Library },
  { label: 'Thoughts', path: '/thoughts', icon: Brain },
  { label: 'Business Ideas', path: '/business-ideas', icon: Lightbulb },
  { label: 'Work Ideas', path: '/work-ideas', icon: Briefcase },
  { label: 'Personal Ideas', path: '/personal-ideas', icon: Heart },
  { label: 'Topics', path: '/topics', icon: Hash },
  { label: 'Glossary', path: '/glossary', icon: BookOpen },
  { label: 'Quotes', path: '/quotes', icon: Quote },
  { label: 'Watchlists', path: '/watchlists', icon: Eye },
  { label: 'Discovery', path: '/discovery', icon: Compass },
  { label: 'Search', path: '/search', icon: Search },
  { label: 'Ask AI', path: '/ask', icon: MessageCircle },
];

interface AppSidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export function AppSidebar({ collapsed, onToggle }: AppSidebarProps) {
  const location = useLocation();

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 h-screen z-40 flex flex-col transition-all duration-200 bg-sidebar border-r border-sidebar-border',
        collapsed ? 'w-16' : 'w-56'
      )}
    >
      {/* Logo */}
      <div className="h-14 flex items-center px-4 border-b border-sidebar-border">
        {!collapsed && (
          <span className="text-lg font-semibold text-sidebar-primary tracking-tight">
            Cortex
          </span>
        )}
        {collapsed && (
          <span className="text-lg font-bold text-sidebar-primary mx-auto">C</span>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path ||
            (item.path !== '/' && location.pathname.startsWith(item.path));

          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={cn(
                'sidebar-nav-item',
                isActive && 'active',
                collapsed && 'justify-center px-0'
              )}
              title={collapsed ? item.label : undefined}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </NavLink>
          );
        })}
      </nav>

      {/* Collapse toggle */}
      <button
        onClick={onToggle}
        className="h-10 flex items-center justify-center border-t border-sidebar-border text-sidebar-muted hover:text-sidebar-primary transition-colors"
      >
        {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
      </button>
    </aside>
  );
}
