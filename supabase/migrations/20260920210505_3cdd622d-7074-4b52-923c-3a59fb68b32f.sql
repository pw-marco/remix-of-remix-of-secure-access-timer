insert into public.servers (name, shortener_link)
select 'Server 1', 'https://vplink.in/x5Uyw'
where not exists (select 1 from public.servers where shortener_link = 'https://vplink.in/x5Uyw');