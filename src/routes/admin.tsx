import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Link2, Pencil, Plus, Trash2 } from "lucide-react";
import {
  adminDeleteServer,
  adminListServers,
  adminSaveServer,
} from "@/lib/verification.functions";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Admin — Secure Access" },
      {
        name: "description",
        content: "Manage servers and their shortener verification links.",
      },
      { property: "og:title", content: "Admin — Secure Access" },
      {
        property: "og:description",
        content: "Manage servers and their shortener verification links.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Admin,
});

const PASSCODE_KEY = "sat_admin_passcode";

function Admin() {
  const queryClient = useQueryClient();
  const [passcode, setPasscode] = useState<string | null>(null);
  const [passcodeInput, setPasscodeInput] = useState("");
  const [editing, setEditing] = useState<{ id?: string; name: string; link: string } | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const saved = sessionStorage.getItem(PASSCODE_KEY);
    if (saved) setPasscode(saved);
  }, []);

  const serversQuery = useQuery({
    queryKey: ["admin-servers", passcode],
    queryFn: () => adminListServers({ data: { passcode: passcode! } }),
    enabled: !!passcode,
    retry: false,
  });

  const saveMutation = useMutation({
    mutationFn: (input: { id?: string; name: string; shortenerLink: string }) =>
      adminSaveServer({ data: { passcode: passcode!, ...input } }),
    onSuccess: () => {
      setEditing(null);
      setError(null);
      queryClient.invalidateQueries({ queryKey: ["admin-servers", passcode] });
      queryClient.invalidateQueries({ queryKey: ["servers"] });
    },
    onError: (e: Error) => setError(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => adminDeleteServer({ data: { passcode: passcode!, id } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-servers", passcode] });
      queryClient.invalidateQueries({ queryKey: ["servers"] });
    },
  });

  if (!passcode) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <form
          className="w-full max-w-sm rounded-xl border border-border bg-card p-6"
          onSubmit={(e) => {
            e.preventDefault();
            sessionStorage.setItem(PASSCODE_KEY, passcodeInput);
            setPasscode(passcodeInput);
            serversQuery.refetch();
          }}
        >
          <h1 className="text-lg font-semibold text-card-foreground">Admin access</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Enter the admin passcode to manage servers.
          </p>
          <input
            type="password"
            value={passcodeInput}
            onChange={(e) => setPasscodeInput(e.target.value)}
            placeholder="Passcode"
            className="mt-4 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
          />
          <button
            type="submit"
            className="mt-3 w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Unlock admin panel
          </button>
          <p className="mt-4 text-center text-xs text-muted-foreground">
            <Link to="/" className="underline underline-offset-2">
              Back to verification
            </Link>
          </p>
        </form>
      </div>
    );
  }

  const servers = serversQuery.data;
  const invalidPasscode =
    serversQuery.isError && /passcode/i.test(String(serversQuery.error));

  return (
    <div className="min-h-screen bg-background px-4 py-10">
      <div className="mx-auto w-full max-w-2xl space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-foreground">Servers</h1>
            <p className="text-sm text-muted-foreground">
              Each server needs exactly one shortener link.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setEditing({ name: "", link: "" })}
            className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" /> Add server
          </button>
        </div>

        <div className="rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground">
          <span className="inline-flex items-center gap-1.5 font-medium text-card-foreground">
            <Link2 className="h-4 w-4" /> Important
          </span>
          <p className="mt-1">
            In your shortener's settings, point this link's destination to this site's{" "}
            <code className="rounded bg-muted px-1 py-0.5 text-xs">/contact</code> page.
            The link must go through the shortener — that is where the user completes
            verification.
          </p>
        </div>

        {invalidPasscode && (
          <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
            Invalid passcode.{" "}
            <button
              type="button"
              className="underline"
              onClick={() => {
                sessionStorage.removeItem(PASSCODE_KEY);
                setPasscode(null);
                setPasscodeInput("");
              }}
            >
              Try again
            </button>
          </div>
        )}

        {serversQuery.isPending && (
          <p className="text-sm text-muted-foreground">Loading…</p>
        )}

        {servers && (
          <div className="space-y-2">
            {servers.length === 0 && (
              <p className="text-sm text-muted-foreground">
                No servers yet — add your first one.
              </p>
            )}
            {servers.map((server) => (
              <div
                key={server.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card px-4 py-3"
              >
                <div className="min-w-0">
                  <p className="font-medium text-card-foreground">{server.name}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {server.shortener_link}
                  </p>
                </div>
                <div className="flex shrink-0 gap-1">
                  <button
                    type="button"
                    aria-label={`Edit ${server.name}`}
                    onClick={() =>
                      setEditing({
                        id: server.id,
                        name: server.name,
                        link: server.shortener_link,
                      })
                    }
                    className="rounded-md p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    aria-label={`Delete ${server.name}`}
                    disabled={deleteMutation.isPending}
                    onClick={() => deleteMutation.mutate(server.id)}
                    className="rounded-md p-2 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive disabled:opacity-50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {editing && (
          <form
            className="space-y-3 rounded-xl border border-border bg-card p-5"
            onSubmit={(e) => {
              e.preventDefault();
              saveMutation.mutate({
                id: editing.id,
                name: editing.name,
                shortenerLink: editing.link,
              });
            }}
          >
            <h2 className="font-medium text-card-foreground">
              {editing.id ? "Edit server" : "Add server"}
            </h2>
            <div>
              <label className="text-sm text-muted-foreground" htmlFor="server-name">
                Server name
              </label>
              <input
                id="server-name"
                value={editing.name}
                onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                placeholder="e.g. Server 1"
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div>
              <label className="text-sm text-muted-foreground" htmlFor="server-link">
                Shortener link (only this — no API setup needed)
              </label>
              <input
                id="server-link"
                value={editing.link}
                onChange={(e) => setEditing({ ...editing, link: e.target.value })}
                placeholder="https://your-shortener.com/abc123"
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={saveMutation.isPending || !editing.name || !editing.link}
                className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
              >
                {saveMutation.isPending ? "Saving…" : "Save"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setEditing(null);
                  setError(null);
                }}
                className="rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
