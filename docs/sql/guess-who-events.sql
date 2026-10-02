-- Guess Who — lire le journal d'erreurs (éditeur SQL Supabase).

-- Erreurs par type et appareil, 7 derniers jours
select kind, device, count(*) as n, max(at) as dernier
from guesswho_events
where at > now() - interval '7 days'
group by kind, device
order by n desc;

-- Détail des erreurs micro, 7 derniers jours
select detail, device, count(*) as n
from guesswho_events
where kind = 'mic_error' and at > now() - interval '7 days'
group by detail, device
order by n desc;

-- Tous les événements d'un salon (remplacer ABCD)
select at, user_id, kind, detail, device
from guesswho_events
where room_code = 'ABCD'
order by at desc
limit 200;
