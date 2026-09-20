import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { ArrowRight, CheckCircle2, ShieldQuestion, TriangleAlert } from "lucide-react";
import { completeVerification } from "@/lib/verification.functions";
import { getDeviceId } from "@/lib/device";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Verifying Access — Secure Access" },
      {
        name: "description",
        content: "Verification checkpoint that unlocks 12 hours of site access.",
      },
      { property: "og:title", content: "Verifying Access — Secure Access" },
      {
        property: "og:description",
        content: "Verification checkpoint that unlocks 12 hours of site access.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Contact,
});

function Contact() {
  const [deviceId, setDeviceId] = useState<string | null>(null);

  useEffect(() => {
    setDeviceId(getDeviceId());
  }, []);

  // One-shot: the server decides success based on its own 3-minute timer.
  const resultQuery = useQuery({
    queryKey: ["complete-verification", deviceId],
    queryFn: () => completeVerification({ data: { deviceId: deviceId! } }),
    enabled: !!deviceId,
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    retry: 1,
  });

  const outcome = resultQuery.data?.outcome;

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 text-center">
        {resultQuery.isPending && (
          <>
            <ShieldQuestion className="mx-auto h-10 w-10 text-muted-foreground" />
            <h1 className="mt-3 text-lg font-semibold text-card-foreground">
              Checking verification…
            </h1>
          </>
        )}

        {(outcome === "success" || outcome === "already_verified") && (
          <>
            <CheckCircle2 className="mx-auto h-10 w-10 text-primary" />
            <h1 className="mt-3 text-lg font-semibold text-card-foreground">
              Verification successful
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {"accessUntil" in resultQuery.data! &&
                `Access unlocked until ${new Date(
                  resultQuery.data.accessUntil,
                ).toLocaleString(undefined, {
                  dateStyle: "medium",
                  timeStyle: "short",
                })}.`}
            </p>
            <Link
              to="/"
              className="mt-5 inline-flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Continue to site <ArrowRight className="h-4 w-4" />
            </Link>
          </>
        )}

        {outcome === "too_early" && (
          <>
            <TriangleAlert className="mx-auto h-10 w-10 text-destructive" />
            <h1 className="mt-3 text-lg font-semibold text-card-foreground">
              Verification unsuccessful
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              You returned before the 3-minute check finished. Please start the
              verification again.
            </p>
            <Link
              to="/"
              className="mt-5 inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Start verification again
            </Link>
          </>
        )}

        {outcome === "no_verification" && (
          <>
            <TriangleAlert className="mx-auto h-10 w-10 text-muted-foreground" />
            <h1 className="mt-3 text-lg font-semibold text-card-foreground">
              No verification in progress
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Start the verification from the main page first.
            </p>
            <Link
              to="/"
              className="mt-5 inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
            >
              Go to verification
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
