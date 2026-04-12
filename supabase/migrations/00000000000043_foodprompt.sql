-- =============================================================================
-- Migration 043: FoodPrompt — librería gastronómica con memoria por hotel
-- Tables: prompt_library, hotel_prompt_prefs, prompt_generations
-- =============================================================================

-- 1. PROMPT_LIBRARY — Librería global curada (no varía por hotel)
create table if not exists prompt_library (
  id uuid primary key default gen_random_uuid(),
  categoria text not null
    check (categoria in ('angulo', 'encuadre', 'luz', 'superficie', 'props', 'estilo', 'camara', 'negativo')),
  valor text not null,
  descripcion text,
  tags text[],          -- ['pulpo', 'carnes', 'galicia']
  sector text[],        -- ['gallega', 'tapas', 'hamburgueseria', 'sushi', 'marisqueria']
  created_at timestamptz not null default now(),
  unique (categoria, valor)
);

comment on table prompt_library is 'Librería global de parámetros fotográficos gastronómicos curada manualmente';

-- No RLS — lectura pública para todos los usuarios autenticados
alter table prompt_library enable row level security;

create policy "prompt_library_select" on prompt_library for select
  using (auth.role() = 'authenticated');

-- 2. HOTEL_PROMPT_PREFS — Preferencias aprendidas por hotel (el local enseña)
create table if not exists hotel_prompt_prefs (
  id uuid primary key default gen_random_uuid(),
  hotel_id uuid not null references hotels(id) on delete cascade,
  categoria text not null
    check (categoria in ('angulo', 'encuadre', 'luz', 'superficie', 'props', 'estilo', 'camara', 'negativo')),
  valor text not null,
  peso integer not null default 1 check (peso >= 0),  -- +1 cada aprobación
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (hotel_id, categoria, valor)
);

create index idx_hotel_prompt_prefs_hotel on hotel_prompt_prefs (hotel_id);

create trigger trg_hotel_prompt_prefs_updated_at
  before update on hotel_prompt_prefs
  for each row execute function update_updated_at();

alter table hotel_prompt_prefs enable row level security;

create policy "hotel_prompt_prefs_select" on hotel_prompt_prefs for select
  using (hotel_id in (
    select m.hotel_id from memberships m
    where m.user_id = auth.uid() and m.is_active = true
  ));

create policy "hotel_prompt_prefs_insert" on hotel_prompt_prefs for insert
  with check (hotel_id in (
    select m.hotel_id from memberships m
    where m.user_id = auth.uid() and m.is_active = true
  ));

create policy "hotel_prompt_prefs_update" on hotel_prompt_prefs for update
  using (hotel_id in (
    select m.hotel_id from memberships m
    where m.user_id = auth.uid() and m.is_active = true
  ));

comment on table hotel_prompt_prefs is 'Preferencias fotográficas aprendidas por hotel — peso sube con cada aprobación';
comment on column hotel_prompt_prefs.peso is 'Peso acumulado: +1 por cada prompt aprobado con esta combinación';

-- 3. PROMPT_GENERATIONS — Historial de prompts generados por IA
create table if not exists prompt_generations (
  id uuid primary key default gen_random_uuid(),
  hotel_id uuid not null references hotels(id) on delete cascade,
  recipe_id uuid references recipes(id) on delete set null,
  recipe_nombre text not null,
  recipe_ingredientes text[],
  prompts jsonb not null default '[]'::jsonb,  -- array de {variante, prompt, angulo, estilo}
  aprobado_idx integer,  -- índice del prompt aprobado (0, 1, 2)
  created_at timestamptz not null default now()
);

create index idx_prompt_generations_hotel on prompt_generations (hotel_id, created_at desc);
create index idx_prompt_generations_recipe on prompt_generations (recipe_id);

alter table prompt_generations enable row level security;

create policy "prompt_generations_select" on prompt_generations for select
  using (hotel_id in (
    select m.hotel_id from memberships m
    where m.user_id = auth.uid() and m.is_active = true
  ));

create policy "prompt_generations_insert" on prompt_generations for insert
  with check (hotel_id in (
    select m.hotel_id from memberships m
    where m.user_id = auth.uid() and m.is_active = true
  ));

create policy "prompt_generations_update" on prompt_generations for update
  using (hotel_id in (
    select m.hotel_id from memberships m
    where m.user_id = auth.uid() and m.is_active = true
  ));

comment on table prompt_generations is 'Historial de prompts fotográficos generados por FoodPrompt AI';
comment on column prompt_generations.prompts is 'Array JSON: [{variante: "Midjourney", prompt: "...", angulo: "45°", estilo: "taberna"}]';
comment on column prompt_generations.aprobado_idx is 'Índice del prompt aprobado por el usuario (null = ninguno aprobado aún)';
