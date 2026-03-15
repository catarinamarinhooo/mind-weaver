import { Bell, LogOut, Plus, Search, Settings, Shield, User } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { QuickAddModal } from "@/components/shared/QuickAddModal";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatAlertTime, getAppAlerts, getAlertsEventName, getUnreadAlertsCount, markAlertsSeen, type AppAlert } from "@/lib/alerts";
import { getAuthEventName, logoutUser } from "@/lib/auth";
import { getUserProfile, getUserProfileEventName } from "@/lib/userProfile";

export function TopBar() {
  const [searchQuery, setSearchQuery] = useState("");
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [profile, setProfile] = useState(getUserProfile());
  const [alerts, setAlerts] = useState<AppAlert[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    const syncProfile = () => setProfile(getUserProfile());
    const syncAlerts = () => {
      void (async () => {
        try {
          const data = await getAppAlerts();
          setAlerts(data.slice(0, 6));
          setUnreadCount(getUnreadAlertsCount(data));
        } catch {
          setAlerts([]);
          setUnreadCount(0);
        }
      })();
    };

    syncProfile();
    syncAlerts();
    window.addEventListener(getUserProfileEventName(), syncProfile);
    window.addEventListener(getAuthEventName(), syncProfile);
    window.addEventListener(getAlertsEventName(), syncAlerts);
    window.addEventListener("focus", syncProfile);
    window.addEventListener("focus", syncAlerts);
    return () => {
      window.removeEventListener(getUserProfileEventName(), syncProfile);
      window.removeEventListener(getAuthEventName(), syncProfile);
      window.removeEventListener(getAlertsEventName(), syncAlerts);
      window.removeEventListener("focus", syncProfile);
      window.removeEventListener("focus", syncAlerts);
    };
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery)}`);
    }
  };

  return (
    <>
      <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border bg-card px-4">
        <form onSubmit={handleSearch} className="max-w-xl flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search everything..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-9 w-full rounded-md border-0 bg-secondary pl-9 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        </form>

        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="text-muted-foreground hover:text-foreground"
            onClick={() => setQuickAddOpen(true)}
          >
            <Plus className="h-5 w-5" />
          </Button>
          <DropdownMenu
            onOpenChange={(open) => {
              if (open) {
                markAlertsSeen();
                setUnreadCount(0);
              }
            }}
          >
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="relative text-muted-foreground hover:text-foreground"
              >
                <Bell className="h-4 w-4" />
                {unreadCount > 0 && (
                  <span className="absolute right-1 top-1 inline-flex min-h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-semibold text-accent-foreground">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80">
              <DropdownMenuLabel>Latest updates</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {alerts.length === 0 ? (
                <div className="px-3 py-2 text-sm text-muted-foreground">
                  No fresh updates yet.
                </div>
              ) : (
                alerts.map((alert) => (
                  <DropdownMenuItem
                    key={alert.id}
                    className="flex cursor-pointer flex-col items-start gap-1 py-3"
                    onClick={() => navigate(alert.path)}
                  >
                    <div className="w-full text-sm font-medium text-foreground">{alert.title}</div>
                    <div className="line-clamp-2 text-xs text-muted-foreground">{alert.description}</div>
                    <div className="text-[11px] text-muted-foreground">
                      {alert.sourceLabel} · {formatAlertTime(alert.createdAt)}
                    </div>
                  </DropdownMenuItem>
                ))
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate("/updates")}>
                View all updates
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="text-muted-foreground hover:text-foreground"
              >
                <Avatar className="h-8 w-8 border border-border">
                  <AvatarImage src={profile.avatarDataUrl || undefined} alt={profile.nickname} />
                  <AvatarFallback>
                    {(profile.nickname || "CK").slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                <div className="flex flex-col">
                  <span>{profile.nickname || "CortexKnows User"}</span>
                  <span className="text-xs font-normal text-muted-foreground">
                    {profile.email}
                  </span>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate("/user")}>
                <User className="mr-2 h-4 w-4" />
                User Area
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate("/user")}>
                <Settings className="mr-2 h-4 w-4" />
                Settings
              </DropdownMenuItem>
              {profile.isAdmin && (
                <DropdownMenuItem onClick={() => navigate("/admin")}>
                  <Shield className="mr-2 h-4 w-4" />
                  Admin
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => {
                  void (async () => {
                    await logoutUser();
                    setProfile(getUserProfile());
                    navigate("/login");
                  })();
                }}
              >
                <LogOut className="mr-2 h-4 w-4" />
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <QuickAddModal open={quickAddOpen} onClose={() => setQuickAddOpen(false)} />
    </>
  );
}
