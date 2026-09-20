create policy "Only the app server manages verification records"
  on public.device_verifications
  for select
  to anon, authenticated
  using (false);