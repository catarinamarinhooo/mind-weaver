export interface UserProfile {
  id?: number;
  email: string;
  workspaceId?: number | null;
  workspaceName?: string;
  workspaceSlug?: string;
  nickname: string;
  fullName: string;
  avatarDataUrl?: string | null;
  tone: string;
  defaultCaptureType: string;
  aiName: string;
  timezone: string;
  language: string;
}

const STORAGE_KEY = "cortexknows_user_profile";
const PROFILE_EVENT = "cortexknows-profile-updated";

export const defaultUserProfile: UserProfile = {
  email: "demo@cortexknows.app",
  workspaceId: null,
  workspaceName: "Personal Workspace",
  workspaceSlug: "personal-workspace",
  nickname: "Explorer",
  fullName: "CortexKnows User",
  avatarDataUrl: null,
  tone: "clear and practical",
  defaultCaptureType: "knowledge",
  aiName: "Cortex",
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
  language: "en",
};

export function getUserProfile(): UserProfile {
  if (typeof window === "undefined") {
    return defaultUserProfile;
  }

  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return defaultUserProfile;
  }

  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    return {
      ...defaultUserProfile,
      ...parsed,
      workspaceId:
        (parsed.workspaceId as number | null | undefined) ??
        (parsed.workspace_id as number | null | undefined) ??
        defaultUserProfile.workspaceId,
      workspaceName:
        (parsed.workspaceName as string | undefined) ||
        ((parsed.workspace as { name?: string } | undefined)?.name as string | undefined) ||
        defaultUserProfile.workspaceName,
      workspaceSlug:
        (parsed.workspaceSlug as string | undefined) ||
        ((parsed.workspace as { slug?: string } | undefined)?.slug as string | undefined) ||
        defaultUserProfile.workspaceSlug,
      fullName:
        (parsed.fullName as string | undefined) ||
        (parsed.full_name as string | undefined) ||
        defaultUserProfile.fullName,
      avatarDataUrl:
        (parsed.avatarDataUrl as string | null | undefined) ??
        (parsed.avatar_data_url as string | null | undefined) ??
        defaultUserProfile.avatarDataUrl,
      defaultCaptureType:
        (parsed.defaultCaptureType as string | undefined) ||
        (parsed.default_capture_type as string | undefined) ||
        defaultUserProfile.defaultCaptureType,
      aiName:
        (parsed.aiName as string | undefined) ||
        (parsed.ai_name as string | undefined) ||
        defaultUserProfile.aiName,
    } as UserProfile;
  } catch {
    return defaultUserProfile;
  }
}

export function saveUserProfile(profile: UserProfile) {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
  window.dispatchEvent(new CustomEvent(PROFILE_EVENT));
}

export function clearUserProfile() {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.removeItem(STORAGE_KEY);
  window.dispatchEvent(new CustomEvent(PROFILE_EVENT));
}

export function getUserProfileEventName() {
  return PROFILE_EVENT;
}
