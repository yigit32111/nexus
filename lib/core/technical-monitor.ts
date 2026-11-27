import "server-only";
import { createTechnicalReporter } from "./sentry-events";

// Only the DSN is used for ingestion. No read token is sent or loaded.
export const reportTechnicalEvent=createTechnicalReporter({
  dsn:()=>process.env.NODE_ENV==="production"?process.env.SENTRY_DSN:undefined
});
