import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Clock, LogOut, ShieldCheck, TimerReset, TriangleAlert } from "lucide-react";
import { checkAccess, listServers, startVerification } from "@/lib/verification.functions";
import { getDeviceId } from "@/lib/device";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Secure Access — Verification" },
      {
        name: "description",
        content:
          "Verify through the shortener link to unlock 12 hours of access to the site.",
      },
      { property: "og:title", content: "Secure Access — Verification" },
      {
        property: "og:description",
        content: "Verify through the shortener link to unlock 12 hours of access.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  const queryClient = useQueryClient();
  const [deviceId, setDeviceId] = useState<string | null>(null);

  useEffect(() => {
    setDeviceId(getDeviceId());
  }, []);

  const serversQuery = useQuery({ queryKey: ["servers"], queryFn: listServers });
  const accessQuery = useQuery({
    queryKey: ["access", deviceId],
    queryFn: () => checkAccess({ data: { deviceId: deviceId! } }),
    enabled: !!deviceId,
  });

  const startMutation = useMutation({
    mutationFn: async (serverId: string) => {
      if (!deviceId) throw new Error("Not ready");
      return startVerification({ data: { deviceId, serverId } });
    },
    onSuccess: (result) => {
      // Timer is now running on the server; send the user to the shortener.
      window.location.href = result.shortenerLink;
    },
  });

  const access = accessQuery.data;
  const isVerified = access?.status === "verified";

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
            <ShieldCheck className="h-7 w-7 text-primary" />
          </div>
          <h1 className="mt-4 text-2xl font-semibold tracking-tight text-foreground">
            Secure Access
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Verify once to unlock 12 hours of access.
          </p>
        </div>

        {isVerified && access.status === "verified" && (
          <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 text-center">
            <div className="flex items-center justify-center gap-2 text-primary">
              <ShieldCheck className="h-5 w-5" />
              <span className="font-medium">Access active</span>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              Unlocked until{" "}
              {new Date(access.accessUntil).toLocaleString(undefined, {
                dateStyle: "medium",
                timeStyle: "short",
              })}
            </p>
            <button
              type="button"
              onClick={() => {
                if (!deviceId) return;
                localStorage.removeItem("sat_device_id");
                setDeviceId(null);
                queryClient.invalidateQueries();
              }}
              className="mt-3 inline-flex items-center gap-1.5 text-xs text-muted-foreground underline-offset-2 hover:underline"
            >
              <LogOut className="h-3.5 w-3.5" /> Verify on a fresh device
            </button>
          </div>
        )}

        {access?.status === "failed" && (
          <div className="flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
            <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              Verification unsuccessful — the site was opened too early or the timer
              ran out. Start again below.
            </span>
          </div>
        )}

        {access?.status === "pending" && (
          <div className="flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 text-sm text-amber-600 dark:text-amber-400">
            <TimerReset className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              Verification is in progress. Finish it through the shortener link — do
              not open this site before the check completes, or verification fails.
            </span>
          </div>
        )}

        {!isVerified && (
          <div className="rounded-xl border border-border bg-card p-5">
            <h2 className="font-medium text-card-foreground">How verification works</h2>
            <ol className="mt-3 space-y-2 text-sm text-muted-foreground">
              <li className="flex gap-2">
                <span className="font-medium text-foreground">1.</span>
                Tap a server below — a private 3-minute check starts on our side.
              </li>
              <li className="flex gap-2">
                <span className="font-medium text-foreground">2.</span>
                Complete the shortener link you land on.
              </li>
              <li className="flex gap-2">
                <span className="font-medium text-foreground">3.</span>
                You'll return to this site and 12 hours of access unlocks
                automatically.
              </li>
            </ol>
          </div>
        )}

        <div className="space-y-2">
          {serversQuery.isLoading && (
            <p className="text-center text-sm text-muted-foreground">Loading servers…</p>
          )}
          {serversQuery.data?.length === 0 && (
            <p className="text-center text-sm text-muted-foreground">
              No servers yet. Add one in the{" "}
              <Link to="/admin" className="underline underline-offset-2">
                admin panel
              </Link>
              .
            </p>
          )}
          {serversQuery.data?.map((server) => (
            <button
              key={server.id}
              type="button"
              disabled={startMutation.isPending}
              onClick={() => startMutation.mutate(server.id)}
              className="flex w-full items-center justify-between rounded-xl border border-border bg-card px-4 py-3 text-left transition-colors hover:bg-accent disabled:opacity-50"
            >
              <span className="font-medium text-card-foreground">{server.name}</span>
              <span className="inline-flex items-center gap-1.5 text-sm text-primary">
                <Clock className="h-4 w-4" />
                {startMutation.isPending ? "Starting…" : "Verify"}
              </span>
            </button>
          ))}
        </div>

        <p className="text-center text-xs text-muted-foreground">
          <Link to="/admin" className="underline underline-offset-2">
            Admin
          </Link>
        </p>
      </div>
    </div>
  );
}
