import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import {
  getAccessState,
  startVerification,
  completeVerification,
  listPublicServers,
  adminList,
  adminSave,
  adminDelete,
} from "./verification.server";

const deviceIdSchema = z.object({ deviceId: z.string().min(8).max(64) });

export const listServers = createServerFn({ method: "GET" }).handler(async () => {
  return listPublicServers();
});

export const checkAccess = createServerFn({ method: "POST" })
  .inputValidator((data) => deviceIdSchema.parse(data))
  .handler(async ({ data }) => {
    return getAccessState(data.deviceId);
  });

export const startVerification = createServerFn({ method: "POST" })
  .inputValidator((data) =>
    z
      .object({ deviceId: z.string().min(8).max(64), serverId: z.string().uuid() })
      .parse(data),
  )
  .handler(async ({ data }) => {
    return startVerification(data.deviceId, data.serverId);
  });

export const completeVerification = createServerFn({ method: "POST" })
  .inputValidator((data) => deviceIdSchema.parse(data))
  .handler(async ({ data }) => {
    return completeVerification(data.deviceId);
  });

export const adminListServers = createServerFn({ method: "POST" })
  .inputValidator((data) => z.object({ passcode: z.string() }).parse(data))
  .handler(async ({ data }) => {
    return adminList(data.passcode);
  });

export const adminSaveServer = createServerFn({ method: "POST" })
  .inputValidator((data) =>
    z
      .object({
        passcode: z.string(),
        id: z.string().uuid().optional(),
        name: z.string().min(1).max(100),
        shortenerLink: z.string().url().max(500),
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    await adminSave(data.passcode, {
      id: data.id,
      name: data.name,
      shortenerLink: data.shortenerLink,
    });
    return { ok: true as const };
  });

export const adminDeleteServer = createServerFn({ method: "POST" })
  .inputValidator((data) =>
    z.object({ passcode: z.string(), id: z.string().uuid() }).parse(data),
  )
  .handler(async ({ data }) => {
    await adminDelete(data.passcode, data.id);
    return { ok: true as const };
  });
