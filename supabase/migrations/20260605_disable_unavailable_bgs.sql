-- ═══════════════════════════════════════════════════════════════════════════
--  Désactive les fonds d'opening SANS vidéo R2 (indisponibles) — retirés de la
--  boutique. Idempotent. (Catalogue front + liste boutique déjà nettoyés.)
-- ═══════════════════════════════════════════════════════════════════════════
UPDATE shop_items SET active = false
WHERE id IN ('bg-gurenge', 'bg-connect', 'bg-99', 'bg-tank');
