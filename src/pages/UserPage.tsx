import { useEffect, useMemo, useState } from "react";
import { Camera, Save, UserCircle2 } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { ContentCard } from "@/components/shared/ContentCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { changePassword, getCurrentUser, updateCurrentUser } from "@/lib/auth";
import { getAiActionHistory, type AIActionHistoryResponse } from "@/lib/api";
import { defaultUserProfile, type UserProfile } from "@/lib/userProfile";

const UserPage = () => {
  const initialProfile = useMemo(() => defaultUserProfile, []);
  const [profile, setProfile] = useState(initialProfile);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [passwordMessage, setPasswordMessage] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [aiHistory, setAiHistory] = useState<AIActionHistoryResponse[]>([]);

  const initials = (profile.nickname || profile.fullName || "CK")
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const handleAvatarUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) {
      return;
    }
    const file = files[0];
    const reader = new FileReader();
    reader.onload = () => {
      setProfile((current) => ({
        ...current,
        avatarDataUrl: typeof reader.result === "string" ? reader.result : null,
      }));
    };
    reader.readAsDataURL(file);
  };

  useEffect(() => {
    let mounted = true;

    const loadProfile = async () => {
      try {
        const [user, history] = await Promise.all([
          getCurrentUser(),
          getAiActionHistory(),
        ]);
        if (mounted) {
          setProfile(user);
          setAiHistory(history);
        }
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err.message : "Failed to load user settings.");
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    void loadProfile();

    return () => {
      mounted = false;
    };
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setMessage("");
    setError("");
    try {
      const updatedProfile = await updateCurrentUser({
        nickname: profile.nickname,
        full_name: profile.fullName,
        avatar_data_url: profile.avatarDataUrl || null,
        tone: profile.tone,
        default_capture_type: profile.defaultCaptureType,
        ai_name: profile.aiName,
        timezone: profile.timezone,
        language: profile.language,
      });
      setProfile(updatedProfile);
      setMessage("User settings saved successfully.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save user settings.");
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setProfile((current: UserProfile) => ({
      ...current,
      nickname: current.nickname || defaultUserProfile.nickname,
      fullName: current.fullName || defaultUserProfile.fullName,
      avatarDataUrl: null,
      tone: defaultUserProfile.tone,
      defaultCaptureType: defaultUserProfile.defaultCaptureType,
      aiName: defaultUserProfile.aiName,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || defaultUserProfile.timezone,
      language: defaultUserProfile.language,
    }));
    setMessage("User settings reset to defaults.");
  };

  const handlePasswordSave = async () => {
    if (!passwordForm.currentPassword.trim() || !passwordForm.newPassword.trim()) {
      setPasswordError("Current password and new password are required.");
      return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError("New password and confirmation must match.");
      return;
    }

    setPasswordSaving(true);
    setPasswordError("");
    setPasswordMessage("");

    try {
      const response = await changePassword({
        current_password: passwordForm.currentPassword,
        new_password: passwordForm.newPassword,
      });
      setPasswordMessage(response.message);
      setPasswordForm({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
    } catch (err) {
      setPasswordError(err instanceof Error ? err.message : "Failed to change password.");
    } finally {
      setPasswordSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <PageHeader
        title="User Area"
        description="Personal profile, nickname, avatar, and app preferences for CortexKnows"
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

      <ContentCard hover={false} className="space-y-6">
        {loading ? (
          <div className="text-sm text-muted-foreground">Loading your CortexKnows profile...</div>
        ) : (
          <>
        <div className="flex flex-col gap-4 md:flex-row md:items-center">
          <Avatar className="h-20 w-20 border border-border">
            <AvatarImage src={profile.avatarDataUrl || undefined} alt={profile.nickname} />
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>

          <div className="space-y-2">
            <div className="text-lg font-semibold text-foreground">{profile.nickname}</div>
            <div className="text-sm text-muted-foreground">
              This is how CortexKnows and future LLM flows will address the user.
            </div>
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-dashed border-border px-3 py-2 text-sm text-muted-foreground">
              <Camera className="h-4 w-4" />
              Upload avatar
              <input type="file" accept="image/*" className="hidden" onChange={(e) => void handleAvatarUpload(e.target.files)} />
            </label>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Email / Login</label>
            <Input value={profile.email} disabled placeholder="you@cortexknows.app" />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Workspace</label>
            <Input
              value={profile.workspaceName || "Personal Workspace"}
              disabled
              placeholder="Workspace"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Nickname</label>
            <Input value={profile.nickname} onChange={(e) => setProfile((current) => ({ ...current, nickname: e.target.value }))} placeholder="How the app should call you" />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Full Name</label>
            <Input value={profile.fullName} onChange={(e) => setProfile((current) => ({ ...current, fullName: e.target.value }))} placeholder="Full name" />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">AI Name</label>
            <Input value={profile.aiName} onChange={(e) => setProfile((current) => ({ ...current, aiName: e.target.value }))} placeholder="How the assistant should present itself" />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Timezone</label>
            <Input value={profile.timezone} onChange={(e) => setProfile((current) => ({ ...current, timezone: e.target.value }))} placeholder="Europe/London" />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Language</label>
            <Input value={profile.language} onChange={(e) => setProfile((current) => ({ ...current, language: e.target.value }))} placeholder="en / pt" />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Default Capture Type</label>
            <Input value={profile.defaultCaptureType} onChange={(e) => setProfile((current) => ({ ...current, defaultCaptureType: e.target.value }))} placeholder="knowledge / thought / glossary" />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Preferred AI Tone</label>
            <Input value={profile.tone} onChange={(e) => setProfile((current) => ({ ...current, tone: e.target.value }))} placeholder="clear and practical" />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">Personal Context For The Assistant</label>
          <Textarea
            rows={4}
            value={`Call me ${profile.nickname}. Keep the tone ${profile.tone}. Prefer ${profile.language}.`}
            readOnly
          />
        </div>

        <div className="flex gap-2">
          <Button className="gap-2" onClick={() => void handleSave()} disabled={saving}>
            <Save className="h-4 w-4" />
            {saving ? "Saving..." : "Save Settings"}
          </Button>
          <Button variant="outline" onClick={handleReset} disabled={saving}>
            Reset Defaults
          </Button>
        </div>
          </>
        )}
      </ContentCard>

      <ContentCard hover={false} className="space-y-4">
        <div>
          <div className="text-base font-semibold text-foreground">Password & Security</div>
          <div className="mt-1 text-sm text-muted-foreground">
            Change the password for this CortexKnows account. Forgot password is also available from the login screen.
          </div>
        </div>

        {passwordMessage && (
          <div className="rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
            {passwordMessage}
          </div>
        )}

        {passwordError && (
          <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {passwordError}
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Current Password</label>
            <Input
              type="password"
              value={passwordForm.currentPassword}
              onChange={(e) =>
                setPasswordForm((current) => ({ ...current, currentPassword: e.target.value }))
              }
              placeholder="Current password"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">New Password</label>
            <Input
              type="password"
              value={passwordForm.newPassword}
              onChange={(e) =>
                setPasswordForm((current) => ({ ...current, newPassword: e.target.value }))
              }
              placeholder="New password"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Confirm Password</label>
            <Input
              type="password"
              value={passwordForm.confirmPassword}
              onChange={(e) =>
                setPasswordForm((current) => ({ ...current, confirmPassword: e.target.value }))
              }
              placeholder="Repeat new password"
            />
          </div>
        </div>

        <div className="flex gap-2">
          <Button onClick={() => void handlePasswordSave()} disabled={passwordSaving}>
            {passwordSaving ? "Updating..." : "Change Password"}
          </Button>
        </div>
      </ContentCard>

      <ContentCard hover={false}>
        <div className="flex items-start gap-3">
          <UserCircle2 className="mt-0.5 h-5 w-5 text-accent" />
          <div>
            <div className="font-medium text-foreground">User account model</div>
            <div className="mt-1 text-sm text-muted-foreground">
              This profile is now backed by real user accounts, sessions, and backend persistence.
              Your CortexKnows workspace data is isolated per authenticated user.
            </div>
          </div>
        </div>
      </ContentCard>

      <ContentCard hover={false} className="space-y-4">
        <div>
          <div className="text-base font-semibold text-foreground">AI Audit Trail</div>
          <div className="mt-1 text-sm text-muted-foreground">
            A record of AI-applied actions in your workspace, including conversions and automated discovery decisions.
          </div>
        </div>

        {aiHistory.length === 0 ? (
          <div className="text-sm text-muted-foreground">
            No AI actions have been applied yet.
          </div>
        ) : (
          <div className="space-y-3">
            {aiHistory.slice(0, 10).map((entry) => (
              <div key={entry.id} className="rounded-lg border border-border p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-semibold text-foreground">
                    {entry.action_type.replaceAll("_", " ")}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {new Date(entry.created_at).toLocaleString()}
                  </span>
                </div>
                {entry.summary && (
                  <div className="mt-2 text-sm text-foreground">{entry.summary}</div>
                )}
                {entry.details && (
                  <div className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">
                    {entry.details}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </ContentCard>
    </div>
  );
};

export default UserPage;
