"use client";

import * as React from "react";
import { Permission } from "@/core/rbac/permissions";
import { usePermission } from "@/hooks/usePermission";

interface CanProps {
  permission: Permission;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function Can({ permission, children, fallback = null }: CanProps) {
  const { can, loading } = usePermission();

  if (loading) return null;
  if (!can(permission)) return <>{fallback}</>;

  return <>{children}</>;
}
