import { Navigate } from "react-router-dom";
import { getAuthSession } from "@/lib/auth";

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const session = getAuthSession();

  if (!session?.isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}
