import { NextRequest, NextResponse } from "next/server";
import { ZodSchema, ZodError } from "zod";
import { Permission } from "@/core/rbac/permissions";
import { getSession, SessionPayload } from "@/core/auth/session";
import { resolveEffectivePermissions } from "@/core/rbac/resolver";
import { checkRateLimit } from "@/core/security/rate-limiter";
import { logAudit } from "@/core/audit/service";
import crypto from "crypto";
import { env } from "@/core/config/env";

export interface RouteContext<TBody = unknown, TQuery = unknown> {
  req: NextRequest;
  session: SessionPayload | null;
  body: TBody;
  query: TQuery;
  params: Record<string, string>;
  requestId: string;
}

export type RouteHandler<TBody = unknown, TQuery = unknown, TResult = unknown> = (
  ctx: RouteContext<TBody, TQuery>
) => Promise<TResult | NextResponse>;

export interface DefineRouteOptions<TBody, TQuery> {
  permission?: Permission | Permission[];
  requireAuth?: boolean;
  bodySchema?: ZodSchema<TBody>;
  querySchema?: ZodSchema<TQuery>;
  rateLimit?: {
    limit: number;
    windowSeconds: number;
  };
  auditAction?: string;
  auditResource?: {
    type: string;
    getId?: (ctx: RouteContext<TBody, TQuery>) => string | undefined;
  };
  auditSummary?: (ctx: RouteContext<TBody, TQuery>, result?: unknown) => string;
  handler: RouteHandler<TBody, TQuery>;
}

// Sanitize query or body against NoSQL operator injection
function sanitizeInput(obj: unknown): void {
  if (obj && typeof obj === "object") {
    for (const key of Object.keys(obj)) {
      if (key.startsWith("$") || key.includes(".")) {
        throw new Error(`Invalid input property '${key}': NoSQL operators not allowed`);
      }
      sanitizeInput((obj as Record<string, unknown>)[key]);
    }
  }
}

export function defineRoute<TBody = unknown, TQuery = unknown>(
  options: DefineRouteOptions<TBody, TQuery>
) {
  return async (req: NextRequest, { params }: { params?: Promise<Record<string, string>> } = {}) => {
    const requestId = crypto.randomUUID();
    const resolvedParams = params ? await params : {};
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() || "unknown";
    const userAgent = req.headers.get("user-agent") || "unknown";

    // CSRF / Origin Check for mutating requests
    const method = req.method.toUpperCase();
    if (["POST", "PUT", "PATCH", "DELETE"].includes(method)) {
      const origin = req.headers.get("origin");
      const host = req.headers.get("host");
      if (origin && host) {
        const originHost = new URL(origin).host;
        if (originHost !== host) {
          return NextResponse.json(
            { error: { code: "CSRF_ERROR", message: "Cross-site request forgery protection triggered" } },
            { status: 403 }
          );
        }
      }
    }

    // 1. Session resolution
    const session = await getSession();

    // 2. Authentication Enforcement
    if (options.requireAuth !== false && !session) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Please sign in to continue" } },
        { status: 401 }
      );
    }

    // 3. Rate Limiting
    const rateLimitConfig = options.rateLimit || {
      limit: method === "GET" ? env.RATE_LIMIT_API_PER_MINUTE : 60,
      windowSeconds: 60,
    };
    const rateLimitKey = session ? `rate:${session.sub}` : `rate:${ip}`;
    const rateLimitCheck = await checkRateLimit({
      key: rateLimitKey,
      limit: rateLimitConfig.limit,
      windowSeconds: rateLimitConfig.windowSeconds,
    });

    if (!rateLimitCheck.success) {
      return NextResponse.json(
        {
          error: {
            code: "RATE_LIMITED",
            message: "Too many requests. Please slow down and try again shortly.",
          },
        },
        { status: 429 }
      );
    }

    // 4. Permission Enforcement
    if (options.permission) {
      if (!session) {
        return NextResponse.json(
          { error: { code: "FORBIDDEN", message: "You do not have access to this action" } },
          { status: 403 }
        );
      }

      const effectivePermissions = await resolveEffectivePermissions(
        session.sub,
        session.role,
        session.permissionsVersion
      );

      const requiredPermissions = Array.isArray(options.permission)
        ? options.permission
        : [options.permission];

      const hasPerm =
        session.role === "super_admin" ||
        requiredPermissions.some((p) => effectivePermissions.includes(p));

      if (!hasPerm) {
        const actionLabel = Array.isArray(options.permission)
          ? options.permission.join(" | ")
          : options.permission;

        // Log denied attempt in audit trail
        await logAudit({
          actorId: session.sub,
          actorRole: session.role,
          actorName: session.name,
          action: actionLabel,
          resource: {
            type: options.auditResource?.type || "unknown",
            id: undefined,
          },
          summary: `${session.name} attempted to access ${actionLabel} without permission`,
          result: "denied",
          ip,
          userAgent,
          requestId,
        });

        return NextResponse.json(
          {
            error: {
              code: "FORBIDDEN",
              message: "You do not have permission to perform this action",
            },
          },
          { status: 403 }
        );
      }
    }

    // 5. Input parsing & validation
    let parsedBody: TBody = {} as TBody;
    let parsedQuery: TQuery = {} as TQuery;

    try {
      if (["POST", "PUT", "PATCH"].includes(method)) {
        const rawBody = await req.json().catch(() => ({}));
        sanitizeInput(rawBody);
        parsedBody = options.bodySchema ? options.bodySchema.parse(rawBody) : rawBody;
      }

      const url = new URL(req.url);
      const rawQuery: Record<string, string> = {};
      url.searchParams.forEach((val, key) => {
        rawQuery[key] = val;
      });
      sanitizeInput(rawQuery);
      parsedQuery = options.querySchema ? options.querySchema.parse(rawQuery) : (rawQuery as unknown as TQuery);
    } catch (err) {
      if (err instanceof ZodError) {
        return NextResponse.json(
          {
            error: {
              code: "VALIDATION_ERROR",
              message: "Please check your inputs and try again",
              fields: err.flatten().fieldErrors,
            },
          },
          { status: 400 }
        );
      }
      return NextResponse.json(
        {
          error: {
            code: "BAD_REQUEST",
            message: (err as Error).message || "Invalid request payload",
          },
        },
        { status: 400 }
      );
    }

    const ctx: RouteContext<TBody, TQuery> = {
      req,
      session,
      body: parsedBody,
      query: parsedQuery,
      params: resolvedParams,
      requestId,
    };

    // 6. Execute Handler
    try {
      const result = await options.handler(ctx);

      if (result instanceof NextResponse) {
        return result;
      }

      // Write audit log on successful mutating operations
      if (options.auditAction && session) {
        const resourceId = options.auditResource?.getId
          ? options.auditResource.getId(ctx)
          : resolvedParams.id;

        const summary = options.auditSummary
          ? options.auditSummary(ctx, result)
          : `${session.name} performed ${options.auditAction}`;

        await logAudit({
          actorId: session.sub,
          actorRole: session.role,
          actorName: session.name,
          action: options.auditAction,
          resource: {
            type: options.auditResource?.type || "unknown",
            id: resourceId,
          },
          summary,
          result: "success",
          ip,
          userAgent,
          requestId,
        });
      }

      return NextResponse.json(result);
    } catch (err) {
      console.error(`[API Error] RequestId ${requestId}:`, err);

      if (options.auditAction && session) {
        await logAudit({
          actorId: session.sub,
          actorRole: session.role,
          actorName: session.name,
          action: options.auditAction,
          resource: {
            type: options.auditResource?.type || "unknown",
            id: resolvedParams.id,
          },
          summary: `${session.name} failed to perform ${options.auditAction}: ${(err as Error).message}`,
          result: "failed",
          ip,
          userAgent,
          requestId,
        });
      }

      return NextResponse.json(
        {
          error: {
            code: "INTERNAL_ERROR",
            message: (err as Error).message || "An unexpected error occurred. Please try again.",
          },
        },
        { status: 500 }
      );
    }
  };
}
