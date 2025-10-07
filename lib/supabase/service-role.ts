// lib/supabase/service-role.ts
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "./types";

type ServiceRoleClient = SupabaseClient<Database>;

export type ServiceRoleConfig = {
  url: string;
  serviceKey: string;
};

export class MissingServiceRoleConfigError extends Error {
  constructor() {
    super("Missing Supabase service-role configuration");
    this.name = "MissingServiceRoleConfigError";
  }
}

let client: ServiceRoleClient | null = null;

export function getServiceRoleConfig(): ServiceRoleConfig | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    return null;
  }

  return { url, serviceKey };
}

export function getServiceRoleClient(
  config: ServiceRoleConfig | null = getServiceRoleConfig(),
): ServiceRoleClient {
  if (!config) {
    throw new MissingServiceRoleConfigError();
  }

  if (!client) {
    client = createClient<Database>(config.url, config.serviceKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
  }

  return client;
}

