"use client";

import { useAuth } from "./useAuth";

export function usePermission() {
  const { hasPermission, hasAnyPermission, user, loading } = useAuth();
  return {
    can: hasPermission,
    canAny: hasAnyPermission,
    user,
    loading,
  };
}
