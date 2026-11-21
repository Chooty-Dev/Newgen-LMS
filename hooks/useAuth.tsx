"use client";

import * as React from "react";
import { Permission, UserRole } from "@/core/rbac/permissions";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export interface SessionUser {
  id: string;
  name: string;
  username: string;
  email?: string;
  phone?: string;
  role: UserRole;
  centerId: string;
  centerName?: string;
  assignedCenters?: Array<{ id: string; name: string }>;
  avatarUrl?: string;
  mustChangePassword?: boolean;
  socialLinks?: Array<{ platform: string; url: string }>;
  permissions: Permission[];
}

interface AuthContextType {
  user: SessionUser | null;
  loading: boolean;
  refetchUser: () => Promise<void>;
  hasPermission: (permission: Permission) => boolean;
  hasAnyPermission: (permissions: Permission[]) => boolean;
  isSwitchingCenter: boolean;
  switchingCenterName: string | null;
  switchCenter: (centerId: string, centerName: string) => Promise<boolean>;
}

const AuthContext = React.createContext<AuthContextType>({
  user: null,
  loading: true,
  refetchUser: async () => { },
  hasPermission: () => false,
  hasAnyPermission: () => false,
  isSwitchingCenter: false,
  switchingCenterName: null,
  switchCenter: async () => false,
});

export function AuthProvider({
  children,
  initialUser,
}: {
  children: React.ReactNode;
  initialUser?: SessionUser | null;
}) {
  const queryClient = useQueryClient();
  const [user, setUser] = React.useState<SessionUser | null>(initialUser ?? null);
  const [loading, setLoading] = React.useState(!initialUser);
  const [isSwitchingCenter, setIsSwitchingCenter] = React.useState(false);
  const [switchingCenterName, setSwitchingCenterName] = React.useState<string | null>(null);

  const fetchUser = React.useCallback(async () => {
    try {
      const res = await fetch("/api/v1/auth/me");
      if (res.ok) {
        const json = await res.json();
        setUser(json.data);
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const switchCenter = React.useCallback(
    async (targetCenterId: string, targetCenterName: string): Promise<boolean> => {
      const startTime = Date.now();
      try {
        setIsSwitchingCenter(true);
        setSwitchingCenterName(targetCenterName);

        const res = await fetch("/api/v1/auth/switch-center", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ centerId: targetCenterId }),
        });

        const json = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(json.error?.message || "Failed to switch center");
        }

        // Fetch refreshed user session
        const meRes = await fetch("/api/v1/auth/me");
        if (meRes.ok) {
          const meJson = await meRes.json();
          setUser(meJson.data);
        }

        // Invalidate all react-query queries across the application
        // so classes, students, staff, marks, attendance, dashboard, etc.
        // immediately refetch for the new active center without a browser page reload!
        await queryClient.invalidateQueries();

        // Ensure loader displays for ~6 seconds for optimal switching experience
        const elapsed = Date.now() - startTime;
        const remaining = Math.max(0, 6000 - elapsed);
        if (remaining > 0) {
          await new Promise((resolve) => setTimeout(resolve, remaining));
        }

        toast.success(`Switched to ${targetCenterName}`);
        return true;
      } catch (err) {
        toast.error((err as Error).message || "Could not switch center");
        return false;
      } finally {
        setIsSwitchingCenter(false);
        setSwitchingCenterName(null);
      }
    },
    [queryClient]
  );

  React.useEffect(() => {
    let ignore = false;
    if (!initialUser) {
      fetch("/api/v1/auth/me")
        .then((res) => (res.ok ? res.json() : null))
        .then((json) => {
          if (!ignore) {
            setUser(json ? json.data : null);
            setLoading(false);
          }
        })
        .catch(() => {
          if (!ignore) {
            setUser(null);
            setLoading(false);
          }
        });
    }
    return () => {
      ignore = true;
    };
  }, [initialUser]);

  const hasPermission = React.useCallback(
    (permission: Permission): boolean => {
      if (!user) return false;
      if (user.role === "super_admin") return true;
      return user.permissions.includes(permission);
    },
    [user]
  );

  const hasAnyPermission = React.useCallback(
    (permissions: Permission[]): boolean => {
      if (!user) return false;
      if (user.role === "super_admin") return true;
      return permissions.some((p) => user.permissions.includes(p));
    },
    [user]
  );

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        refetchUser: fetchUser,
        hasPermission,
        hasAnyPermission,
        isSwitchingCenter,
        switchingCenterName,
        switchCenter,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return React.useContext(AuthContext);
}
