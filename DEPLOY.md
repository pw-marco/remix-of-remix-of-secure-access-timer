# Deployment Guide

This app is ready to go live in two ways.

## Option 1 — Publish directly from Lovable (recommended)

Click **Publish** in the Lovable editor. The app goes live at a public URL immediately — no server setup needed. You can connect a custom domain in **Project Settings → Domains**.

## Option 2 — Push to GitHub

1. In Lovable, open **Settings → GitHub** and connect your GitHub account.
2. Choose **Connect repo** — Lovable pushes the full source of this project to a new repository.
3. From then on, every change you make in Lovable is synced to that repository.

## Option 3 — Deploy to Heroku from GitHub (manual setup)

This app is a **TanStack Start** app. It is built to run on Lovable's hosting (Cloudflare Workers). To run it on Heroku you must self-host it as a Node server — the official steps are here:

https://docs.lovable.dev/tips-tricks/self-hosting

Summary:

1. Clone your GitHub repo locally.
2. Run `bun install` (or `npm install`).
3. Build for a Node target (the self-hosting guide shows the exact Vite preset config — the default build here targets Cloudflare Workers, which Heroku cannot run).
4. Add a `Procfile` with your start command, e.g. `web: node dist/server/server.js` (adjust to the output of your build).
5. Set the required environment variables in Heroku (**Settings → Reveal Config Vars**):
   - `SUPABASE_URL`
   - `SUPABASE_PUBLISHABLE_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `ADMIN_PASSCODE` (the admin panel password)
   - `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_SUPABASE_PROJECT_ID`
6. Deploy the branch: `git push heroku main`.

⚠️ Heroku deployment is untested for this project — the self-hosting guide above is the authoritative reference. Publishing through Lovable (Option 1) requires no setup and is the fastest way to make the app live.
