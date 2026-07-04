-- Premium tier market auras with distinct multi-layer CSS effects.
insert into public.market_items (id, name_key, price, color_hex, sort_order) values
  ('phoenix', 'market.effect.phoenix', 650, '#ff6b00', 11),
  ('nebula',  'market.effect.nebula',  650, '#e879f9', 12),
  ('thunder', 'market.effect.thunder', 650, '#0ea5e9', 13),
  ('eclipse', 'market.effect.eclipse', 650, '#fbbf24', 14),
  ('prism',   'market.effect.prism',   650, '#22d3ee', 15)
on conflict (id) do update set
  name_key   = excluded.name_key,
  price      = excluded.price,
  color_hex  = excluded.color_hex,
  sort_order = excluded.sort_order;
