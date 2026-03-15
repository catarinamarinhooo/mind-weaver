import { clearUserProfile, saveUserProfile, type UserProfile } from "@/lib/userProfile";
import { getApiBaseUrl } from "@/lib/config";

const API_URL = getApiBaseUrl();
const AUTH_KEY = "cortexknows_auth_session";
const AUTH_EVENT = "cortexknows-auth-updated";

export interface AuthSession {
  isAuthenticated: boolean;
  user: UserProfile;
}

interface AuthResponse {
  user: UserProfile;
}

interface UserApiResponse {
  id?: number;
  email: string;
  nickname: string;
  full_name?: string | null;
  avatar_data_url?: string | null;
  tone?: string | null;
  default_capture_type?: string | null;
  ai_name?: string | null;
  timezone?: string | null;
  language?: string | null;
  workspace_id?: number | null;
  workspace?: {
    id: number;
    name: string;
    slug: string;
    created_at: string;
  } | null;
}

interface LoginPayload {
  email: string;
  password: string;
}

interface RegisterPayload extends LoginPayload {
  nickname: string;
  full_name?: string | null;
}

interface UserUpdatePayload {
  nickname?: string;
  full_name?: string;
  avatar_data_url?: string | null;
  tone?: string;
  default_capture_type?: string;
  ai_name?: string;
  timezone?: string;
  language?: string;
}

interface ChangePasswordPayload {
  current_password: string;
  new_password: string;
}

interface ForgotPasswordPayload {
  email: string;
}

interface ResetPasswordPayload {
  token: string;
  new_password: string;
}

interface MessageResponse {
  message: string;
}

function normalizeUser(user: UserApiResponse): UserProfile {
  return {
    id: user.id,
    email: user.email,
    workspaceId: user.workspace_id ?? null,
    workspaceName: user.workspace?.name || "Personal Workspace",
    workspaceSlug: user.workspace?.slug || "personal-workspace",
    nickname: user.nickname,
    fullName: user.full_name || user.nickname || "CortexKnows User",
    avatarDataUrl: user.avatar_data_url || null,
    tone: user.tone || "clear and practical",
    defaultCaptureType: user.default_capture_type || "knowledge",
    aiName: user.ai_name || "Cortex",
    timezone: user.timezone || "UTC",
    language: user.language || "en",
  };
}

export function getAuthSession(): AuthSession | null {
  if (typeof window === "undefined") {
    return null;
  }
  const raw = window.localStorage.getItem(AUTH_KEY);
  if (!raw) {
    return null;
  }
  try {
    return JSON.parse(raw) as AuthSession;
  } catch {
    return null;
  }
}

function persistSession(session: AuthSession) {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.setItem(AUTH_KEY, JSON.stringify(session));
  saveUserProfile(session.user);
  window.dispatchEvent(new CustomEvent(AUTH_EVENT));
}

export async function registerUser(payload: RegisterPayload) {
  const res = await fetch(`${API_URL}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const responseData = (await res.json().catch(() => null)) as { user: UserApiResponse } | null;
  if (!res.ok || !responseData) {
    throw new Error(
      (responseData as { detail?: string } | null)?.detail || "Failed to register."
    );
  }
  persistSession({
    isAuthenticated: true,
    user: normalizeUser(responseData.user),
  });
  return responseData;
}

export async function loginUser(payload: LoginPayload) {
  const res = await fetch(`${API_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const responseData = (await res.json().catch(() => null)) as { user: UserApiResponse } | null;
  if (!res.ok || !responseData) {
    throw new Error(
      (responseData as { detail?: string } | null)?.detail || "Failed to login."
    );
  }
  persistSession({
    isAuthenticated: true,
    user: normalizeUser(responseData.user),
  });
  return responseData;
}

export async function getCurrentUser() {
  const currentSession = getAuthSession();
  if (!currentSession?.isAuthenticated) {
    throw new Error("No active session.");
  }
  const res = await fetch(`${API_URL}/auth/me`, {
    credentials: "include",
  });
  const responseData = (await res.json().catch(() => null)) as UserApiResponse | null;
  if (!res.ok || !responseData) {
    throw new Error(
      (responseData as { detail?: string } | null)?.detail || "Failed to fetch user."
    );
  }
  if (currentSession) {
    persistSession({ ...currentSession, user: normalizeUser(responseData) });
  }
  return normalizeUser(responseData);
}

export async function updateCurrentUser(payload: UserUpdatePayload) {
  const currentSession = getAuthSession();
  if (!currentSession?.isAuthenticated) {
    throw new Error("No active session.");
  }
  const res = await fetch(`${API_URL}/auth/me`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify(payload),
  });
  const responseData = (await res.json().catch(() => null)) as UserApiResponse | null;
  if (!res.ok || !responseData) {
    throw new Error(
      (responseData as { detail?: string } | null)?.detail || "Failed to update user."
    );
  }
  if (currentSession) {
    persistSession({ ...currentSession, user: normalizeUser(responseData) });
  }
  return normalizeUser(responseData);
}

export async function logoutUser() {
  if (getAuthSession()?.isAuthenticated) {
    await fetch(`${API_URL}/auth/logout`, {
      method: "POST",
      credentials: "include",
    }).catch(() => null);
  }
  logout();
}

export async function changePassword(payload: ChangePasswordPayload) {
  const currentSession = getAuthSession();
  if (!currentSession?.isAuthenticated) {
    throw new Error("No active session.");
  }
  const res = await fetch(`${API_URL}/auth/change-password`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify(payload),
  });
  const responseData = (await res.json().catch(() => null)) as MessageResponse | null;
  if (!res.ok || !responseData) {
    throw new Error(
      (responseData as { detail?: string } | null)?.detail || "Failed to change password."
    );
  }
  return responseData;
}

export async function forgotPassword(payload: ForgotPasswordPayload) {
  const res = await fetch(`${API_URL}/auth/forgot-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(payload),
  });
  const responseData = (await res.json().catch(() => null)) as MessageResponse | null;
  if (!res.ok || !responseData) {
    throw new Error(
      (responseData as { detail?: string } | null)?.detail || "Failed to request password reset."
    );
  }
  return responseData;
}

export async function resetPassword(payload: ResetPasswordPayload) {
  const res = await fetch(`${API_URL}/auth/reset-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(payload),
  });
  const responseData = (await res.json().catch(() => null)) as MessageResponse | null;
  if (!res.ok || !responseData) {
    throw new Error(
      (responseData as { detail?: string } | null)?.detail || "Failed to reset password."
    );
  }
  return responseData;
}

export function logout() {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.removeItem(AUTH_KEY);
  clearUserProfile();
  window.dispatchEvent(new CustomEvent(AUTH_EVENT));
}

export function getAuthEventName() {
  return AUTH_EVENT;
}
