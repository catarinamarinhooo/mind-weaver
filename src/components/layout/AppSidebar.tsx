import { NavLink, useLocation } from "react-router-dom";
import {
  Bell,
  BookOpen,
  Brain,
  Briefcase,
  ChevronLeft,
  ChevronRight,
  Compass,
  Eye,
  GitBranch,
  Hash,
  Heart,
  LayoutDashboard,
  Library,
  Lightbulb,
  MessageCircle,
  PenLine,
  Quote,
  Search,
  Shield,
  Sparkles,
  History,
} from "lucide-react";
import { getUserProfile } from "@/lib/userProfile";
import { cn } from "@/lib/utils";

const baseNavItems = [
  { label: "Dashboard", path: "/", icon: LayoutDashboard },
  { label: "Capture", path: "/capture", icon: PenLine },
  { label: "Library", path: "/library", icon: Library },
  { label: "Thoughts", path: "/thoughts", icon: Brain },
  { label: "Business Ideas", path: "/business-ideas", icon: Lightbulb },
  { label: "Work Ideas", path: "/work-ideas", icon: Briefcase },
  { label: "Personal Ideas", path: "/personal-ideas", icon: Heart },
  { label: "Topics", path: "/topics", icon: Hash },
  { label: "Glossary", path: "/glossary", icon: BookOpen },
  { label: "Quotes", path: "/quotes", icon: Quote },
  { label: "Watchlists", path: "/watchlists", icon: Eye },
  { label: "Discovery", path: "/discovery", icon: Compass },
  { label: "Updates", path: "/updates", icon: Bell },
  { label: "Connections", path: "/connections", icon: GitBranch },
  { label: "Recommended Links", path: "/recommendations", icon: Sparkles },
  { label: "AI History", path: "/ai-history", icon: History },
  { label: "Search", path: "/search", icon: Search },
  { label: "Ask AI", path: "/ask", icon: MessageCircle },
];

interface AppSidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export function AppSidebar({ collapsed, onToggle }: AppSidebarProps) {
  const location = useLocation();
  const profile = getUserProfile();
  const navItems = profile.isAdmin
    ? [...baseNavItems, { label: "Admin", path: "/admin", icon: Shield }]
    : baseNavItems;

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 z-40 flex h-screen flex-col border-r border-sidebar-border bg-sidebar transition-all duration-200",
        collapsed ? "w-16" : "w-56"
      )}
    >
      <div className="flex h-14 items-center border-b border-sidebar-border px-4">
        {!collapsed && (
          <span className="text-lg font-semibold tracking-tight text-sidebar-primary">
            CortexKnows
          </span>
        )}
        {collapsed && <span className="mx-auto text-lg font-bold text-sidebar-primary">C</span>}
      </div>

      <nav className="flex-1 space-y-0.5 overflow-y-auto px-2 py-3">
        {navItems.map((item) => {
          const isActive =
            location.pathname === item.path ||
            (item.path !== "/" && location.pathname.startsWith(item.path));

          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={cn(
                "sidebar-nav-item",
                isActive && "active",
                collapsed && "justify-center px-0"
              )}
              title={collapsed ? item.label : undefined}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </NavLink>
          );
        })}
      </nav>

      <button
        onClick={onToggle}
        className="flex h-10 items-center justify-center border-t border-sidebar-border text-sidebar-muted transition-colors hover:text-sidebar-primary"
      >
        {collapsed ? (
          <ChevronRight className="h-4 w-4" />
        ) : (
          <ChevronLeft className="h-4 w-4" />
        )}
      </button>
    </aside>
  );
}
