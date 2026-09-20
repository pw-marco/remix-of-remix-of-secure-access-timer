import { timingSafeEqual } from "crypto";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const VERIFICATION_WINDOW_MS = 3 * 60 * 1000; // 3-minute server-side timer
const ACCESS_DURATION_MS = 12 * 60 * 60 * 1000; // 12 hours of access

// The generated Database type may lag behind new tables, so talk to the
// admin client through a minimal untyped surface.
const db = supabaseAdmin as unknown as {
  from: (table: string) => any;
};

type Row = {
  device_id: string;
  status: "pending" | "verified" | "failed";
  server_id: string | null;
  started_at: string | null;
  verified_at: string | null;
  access_until: string | null;
};

export type AccessState =
  | { status: "unverified" }
  | { status: "pending"; remainingSeconds: number }
  | { status: "failed" }
  | { status: "verified"; accessUntil: string };

async function getRow(deviceId: string): Promise<Row | null> {
  const { data, error } = await db
    .from("device_verifications")
    .select("*")
    .eq("device_id", deviceId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data as Row) ?? null;
}

export async function getAccessState(deviceId: string): Promise<AccessState> {
  const row = await getRow(deviceId);
  if (!row) return { status: "unverified" };

  if (row.status === "verified") {
    if (row.access_until && new Date(row.access_until).getTime() > Date.now()) {
      return { status: "verified", accessUntil: row.access_until };
    }
    // 12 hours are over -> verification page shows again
    return { status: "unverified" };
  }

  if (row.status === "pending" && row.started_at) {
    const elapsed = Date.now() - new Date(row.started_at).getTime();
    if (elapsed < VERIFICATION_WINDOW_MS) {
      return {
        status: "pending",
        remainingSeconds: Math.ceil((VERIFICATION_WINDOW_MS - elapsed) / 1000),
      };
    }
    // Timer ran out without the user returning through /contact
    return { status: "unverified" };
  }

  return { status: "failed" };
}

export async function startVerification(
  deviceId: string,
  serverId: string,
): Promise<{ shortenerLink: string }> {
  const { data: server, error } = await db
    .from("servers")
    .select("id, shortener_link")
    .eq("id", serverId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!server) throw new Error("Server not found");

  const now = new Date().toISOString();
  await db
    .from("device_verifications")
    .upsert(
      {
        device_id: deviceId,
        status: "pending",
        server_id: serverId,
        started_at: now,
        verified_at: null,
        access_until: null,
        updated_at: now,
      },
      { onConflict: "device_id" },
    );

  return { shortenerLink: server.shortener_link };
}

export type CompleteResult =
  | { outcome: "success"; accessUntil: string }
  | { outcome: "already_verified"; accessUntil: string }
  | { outcome: "too_early" }
  | { outcome: "no_verification" };

export async function completeVerification(deviceId: string): Promise<CompleteResult> {
  const row = await getRow(deviceId);
  const now = new Date();

  if (!row || row.status === "failed" || !row.started_at) {
    return { outcome: "no_verification" };
  }

  if (row.status === "verified") {
    if (row.access_until && new Date(row.access_until).getTime() > now.getTime()) {
      return { outcome: "already_verified", accessUntil: row.access_until };
    }
    return { outcome: "no_verification" };
  }

  const elapsed = now.getTime() - new Date(row.started_at).getTime();
  if (elapsed < VERIFICATION_WINDOW_MS) {
    // User reached /contact before the 3-minute timer finished -> unsuccessful
    await db
      .from("device_verifications")
      .update({ status: "failed", updated_at: now.toISOString() })
      .eq("device_id", deviceId);
    return { outcome: "too_early" };
  }

  const accessUntil = new Date(now.getTime() + ACCESS_DURATION_MS).toISOString();
  await db
    .from("device_verifications")
    .update({
      status: "verified",
      verified_at: now.toISOString(),
      access_until: accessUntil,
      updated_at: now.toISOString(),
    })
    .eq("device_id", deviceId);
  return { outcome: "success", accessUntil };
}

// ---------- Public server list (shown on the verification page) ----------

export type PublicServer = { id: string; name: string };

export async function listPublicServers(): Promise<PublicServer[]> {
  const { data, error } = await db
    .from("servers")
    .select("id, name")
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  return (data as PublicServer[]) ?? [];
}

// ---------- Admin (passcode-protected) ----------

export type AdminServer = { id: string; name: string; shortener_link: string };

function isValidPasscode(passcode: string): boolean {
  const expected = process.env["ADMIN_PASSCODE"];
  if (!expected) return false;
  const a = Buffer.from(passcode);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

function assertAdmin(passcode: string) {
  if (!isValidPasscode(passcode)) throw new Error("Invalid passcode");
}

export async function adminList(passcode: string): Promise<AdminServer[]> {
  assertAdmin(passcode);
  const { data, error } = await db
    .from("servers")
    .select("id, name, shortener_link")
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  return (data as AdminServer[]) ?? [];
}

export async function adminSave(
  passcode: string,
  input: { id?: string; name: string; shortenerLink: string },
): Promise<void> {
  assertAdmin(passcode);
  const payload = {
    name: input.name,
    shortener_link: input.shortenerLink,
  };
  const query = input.id
    ? db.from("servers").update(payload).eq("id", input.id)
    : db.from("servers").insert(payload);
  const { error } = await query;
  if (error) throw new Error(error.message);
}

export async function adminDelete(passcode: string, id: string): Promise<void> {
  assertAdmin(passcode);
  const { error } = await db.from("servers").delete().eq("id", id);
  if (error) throw new Error(error.message);
}
