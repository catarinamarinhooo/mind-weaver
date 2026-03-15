import { useEffect, useState } from "react";
import { Shield, Trash2, UserPlus } from "lucide-react";
import { ContentCard } from "@/components/shared/ContentCard";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  createAdminUser,
  deleteAdminUser,
  getAdminUsers,
  updateAdminUser,
} from "@/lib/auth";
import { getUserProfile, type UserProfile } from "@/lib/userProfile";

const AdminPage = () => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const currentUser = getUserProfile();

  const [form, setForm] = useState({
    email: "",
    password: "",
    nickname: "",
    fullName: "",
    isAdmin: false,
  });

  const loadUsers = async () => {
    try {
      setLoading(true);
      setError("");
      setUsers(await getAdminUsers());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load users.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadUsers();
  }, []);

  const handleCreateUser = async () => {
    if (!form.email.trim() || !form.password.trim() || !form.nickname.trim()) {
      setError("Email, password and nickname are required.");
      return;
    }
    try {
      setError("");
      setMessage("");
      const created = await createAdminUser({
        email: form.email.trim(),
        password: form.password.trim(),
        nickname: form.nickname.trim(),
        full_name: form.fullName.trim() || null,
        is_admin: form.isAdmin,
        is_active: true,
      });
      setUsers((current) => [created, ...current]);
      setForm({
        email: "",
        password: "",
        nickname: "",
        fullName: "",
        isAdmin: false,
      });
      setMessage("User created successfully.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create user.");
    }
  };

  const toggleAdmin = async (user: UserProfile) => {
    try {
      setError("");
      const updated = await updateAdminUser(user.id!, {
        is_admin: !user.isAdmin,
      });
      setUsers((current) => current.map((item) => (item.id === updated.id ? updated : item)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update admin role.");
    }
  };

  const toggleActive = async (user: UserProfile) => {
    try {
      setError("");
      const updated = await updateAdminUser(user.id!, {
        is_active: !user.isActive,
      });
      setUsers((current) => current.map((item) => (item.id === updated.id ? updated : item)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update account status.");
    }
  };

  const handleDeleteUser = async (user: UserProfile) => {
    if (!user.id || !window.confirm(`Delete ${user.email}?`)) {
      return;
    }
    try {
      setError("");
      await deleteAdminUser(user.id);
      setUsers((current) => current.filter((item) => item.id !== user.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete user.");
    }
  };

  if (!currentUser.isAdmin) {
    return (
      <div className="max-w-4xl mx-auto">
        <ContentCard hover={false}>
          <div className="text-sm text-muted-foreground">
            Administrator access is required to view this area.
          </div>
        </ContentCard>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <PageHeader
        title="Admin"
        description="Create accounts, grant admin access, deactivate users, and manage CortexKnows access"
      />

      {message && (
        <div className="rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
          {message}
        </div>
      )}
      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      <ContentCard hover={false} className="space-y-4">
        <div className="flex items-center gap-2 text-base font-semibold text-foreground">
          <UserPlus className="h-4 w-4 text-accent" />
          Create User
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <Input
            placeholder="Email"
            value={form.email}
            onChange={(e) => setForm((current) => ({ ...current, email: e.target.value }))}
          />
          <Input
            placeholder="Temporary password"
            type="password"
            value={form.password}
            onChange={(e) => setForm((current) => ({ ...current, password: e.target.value }))}
          />
          <Input
            placeholder="Nickname"
            value={form.nickname}
            onChange={(e) => setForm((current) => ({ ...current, nickname: e.target.value }))}
          />
          <Input
            placeholder="Full name"
            value={form.fullName}
            onChange={(e) => setForm((current) => ({ ...current, fullName: e.target.value }))}
          />
        </div>
        <label className="flex items-center gap-2 text-sm text-foreground">
          <input
            type="checkbox"
            checked={form.isAdmin}
            onChange={(e) => setForm((current) => ({ ...current, isAdmin: e.target.checked }))}
          />
          Create as administrator
        </label>
        <Button onClick={() => void handleCreateUser()}>Create User</Button>
      </ContentCard>

      <ContentCard hover={false} className="space-y-4">
        <div className="flex items-center gap-2 text-base font-semibold text-foreground">
          <Shield className="h-4 w-4 text-accent" />
          Account Management
        </div>

        {loading ? (
          <div className="text-sm text-muted-foreground">Loading users...</div>
        ) : (
          <div className="space-y-3">
            {users.map((user) => (
              <div
                key={user.id}
                className="flex flex-col gap-3 rounded-lg border border-border p-4 md:flex-row md:items-center md:justify-between"
              >
                <div>
                  <div className="font-medium text-foreground">{user.email}</div>
                  <div className="text-sm text-muted-foreground">
                    {user.nickname} · {user.workspaceName || "Personal Workspace"}
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {user.isAdmin ? "Admin" : "User"} · {user.isActive ? "Active" : "Inactive"}
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" size="sm" onClick={() => void toggleAdmin(user)}>
                    {user.isAdmin ? "Remove Admin" : "Make Admin"}
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => void toggleActive(user)}>
                    {user.isActive ? "Deactivate" : "Activate"}
                  </Button>
                  {user.id !== currentUser.id && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-2"
                      onClick={() => void handleDeleteUser(user)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Delete
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </ContentCard>
    </div>
  );
};

export default AdminPage;
