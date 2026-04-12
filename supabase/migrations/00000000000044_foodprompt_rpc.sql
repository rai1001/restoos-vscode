-- =============================================================================
-- Migration 044: FoodPrompt — RPC upsert_hotel_prompt_pref
-- Atomic insert-or-increment of hotel photography preferences
-- =============================================================================

create or replace function upsert_hotel_prompt_pref(
  p_hotel_id uuid,
  p_categoria text,
  p_valor text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into hotel_prompt_prefs (hotel_id, categoria, valor, peso)
  values (p_hotel_id, p_categoria, p_valor, 1)
  on conflict (hotel_id, categoria, valor)
  do update set
    peso = hotel_prompt_prefs.peso + 1,
    updated_at = now();
end;
$$;

comment on function upsert_hotel_prompt_pref is 'Atomic upsert for hotel photography preferences — increments weight on conflict';

-- Grant execution to authenticated users (RLS on the table covers row-level access)
grant execute on function upsert_hotel_prompt_pref to authenticated;
