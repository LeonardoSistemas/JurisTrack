import * as Sentry from "@sentry/node";
//import { nodeProfilingIntegration } from "@sentry/profiling-node";

let sentryEnabled = false;
let globalHandlersBound = false;

function parseRate(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function sanitize(obj = {}) {
  return Object.fromEntries(
    Object.entries(obj).filter(
      ([, value]) => value !== undefined && value !== null
    )
  );
}

function applyScopeContext(scope, context = {}) {
  const { userId, tenantId, tags, extra, ...rest } = context;

  if (context.traceId) {
    scope.setTag("trace_id", context.traceId);
  }

  if (userId || tenantId) {
    scope.setUser(sanitize({ id: userId, tenantId }));
  }

  if (tags && typeof tags === "object") {
    scope.setTags(tags);
  }

  if (extra && typeof extra === "object") {
    scope.setExtras(extra);
  }

  const cleaned = sanitize(rest);
  if (Object.keys(cleaned).length > 0) {
    scope.setContext("context", cleaned);
  }
}

export function initSentry(app) {
  const dsn = process.env.SENTRY_DSN;
  if (!dsn) {
    // eslint-disable-next-line no-console
    console.info("[observability] Sentry desabilitado (SENTRY_DSN ausente)");
    return;
  }

  const environment =
    process.env.SENTRY_ENVIRONMENT ?? process.env.NODE_ENV ?? "development";
  const release = process.env.SENTRY_RELEASE;
  const tracesSampleRate = parseRate(process.env.SENTRY_TRACES_SAMPLE_RATE, 0.1);
  const profilesSampleRate = parseRate(
    process.env.SENTRY_PROFILES_SAMPLE_RATE,
    0.05
  );

  Sentry.init({
    dsn,
    environment,
    release,
    integrations: [
      Sentry.httpIntegration({ tracing: true }),
      Sentry.expressIntegration({ app }),
     // nodeProfilingIntegration(),
    ],
    tracesSampleRate,
    profilesSampleRate,
  });

  sentryEnabled = true;
}

export function sentryRequestMiddleware() {
  return (req, res, next) => next();
}

export function sentryTracingMiddleware() {
  return (req, res, next) => next();
}

export function sentryErrorMiddleware() {
  if (!sentryEnabled) return (err, req, res, next) => next(err);
  return Sentry.expressErrorHandler();
}

export function setSentryScope(context = {}) {
  if (!sentryEnabled) return;
  const scope = Sentry.getCurrentHub().getScope();
  if (!scope) return;
  applyScopeContext(scope, context);
}

export function captureException(error, context = {}) {
  if (!sentryEnabled || !error) return;

  Sentry.withScope((scope) => {
    applyScopeContext(scope, context);
    Sentry.captureException(error);
  });
}

export function captureMessage(message, level = "info", context = {}) {
  if (!sentryEnabled || !message) return;

  Sentry.withScope((scope) => {
    applyScopeContext(scope, context);
    Sentry.captureMessage(message, level);
  });
}

export function bindUnhandledRejections() {
  if (!sentryEnabled || globalHandlersBound) return;
  globalHandlersBound = true;

  process.on("unhandledRejection", (reason) => {
    const error =
      reason instanceof Error ? reason : new Error(String(reason ?? "unknown"));
    captureException(error, { hook: "unhandledRejection" });
  });

  process.on("uncaughtException", (error) => {
    captureException(error, { hook: "uncaughtException" });
  });
}


