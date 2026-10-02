begin;

alter table public.onehome_chain_registry
  drop constraint if exists onehome_chain_registry_ecosystem_check;
alter table public.onehome_chain_registry
  add constraint onehome_chain_registry_ecosystem_check
  check (ecosystem = any (array[
    'bitcoin'::text,
    'cardano'::text,
    'evm'::text,
    'solana'::text,
    'stellar'::text,
    'tron'::text,
    'xrpl'::text,
    'avalanche-x'::text,
    'avalanche-p'::text
  ]));

update public.onehome_chain_registry
set wallet_providers = case
      when 'core' = any(coalesce(wallet_providers, array[]::text[]))
        then wallet_providers
      else array_append(coalesce(wallet_providers, array[]::text[]), 'core')
    end,
    updated_at = now()
where chain_key = 'avalanche-mainnet'
  and ecosystem = 'evm';

insert into public.onehome_chain_registry (
  chain_key, display_name, ecosystem, chain_namespace, network_name,
  external_chain_id, numeric_chain_id, native_symbol, wallet_providers,
  wallet_enabled, mint_enabled, payment_enabled, payout_enabled,
  status, display_order, configuration
)
values
  (
    'avalanche-x-mainnet', 'Avalanche X-Chain — Mainnet', 'avalanche-x',
    'avalanche-x', 'mainnet', null, null, 'AVAX', array['core']::text[],
    true, false, false, false, 'testing', 27,
    '{"chain_alias":"X","network_hrp":"avax","wallet_only":true,"mainnet_locked":true,"production_locked":true}'::jsonb
  ),
  (
    'avalanche-p-mainnet', 'Avalanche P-Chain — Mainnet', 'avalanche-p',
    'avalanche-p', 'mainnet', null, null, 'AVAX', array['core']::text[],
    true, false, false, false, 'testing', 28,
    '{"chain_alias":"P","network_hrp":"avax","wallet_only":true,"mainnet_locked":true,"production_locked":true}'::jsonb
  )
on conflict (chain_key) do update set
  display_name = excluded.display_name,
  ecosystem = excluded.ecosystem,
  chain_namespace = excluded.chain_namespace,
  network_name = excluded.network_name,
  external_chain_id = excluded.external_chain_id,
  numeric_chain_id = excluded.numeric_chain_id,
  native_symbol = excluded.native_symbol,
  wallet_providers = excluded.wallet_providers,
  wallet_enabled = excluded.wallet_enabled,
  mint_enabled = excluded.mint_enabled,
  payment_enabled = excluded.payment_enabled,
  payout_enabled = excluded.payout_enabled,
  status = excluded.status,
  display_order = excluded.display_order,
  configuration = excluded.configuration,
  updated_at = now();

create table if not exists public.onehome_core_xp_wallet_challenges (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  chain_key text not null references public.onehome_chain_registry(chain_key) on delete restrict,
  wallet_address text not null,
  normalized_address text not null,
  browser_nonce_hash text not null,
  challenge_message text not null,
  status text not null default 'pending'
    check (status = any (array['pending'::text, 'consumed'::text, 'expired'::text])),
  expires_at timestamptz not null,
  consumed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists onehome_core_xp_challenges_owner_created_idx
  on public.onehome_core_xp_wallet_challenges (owner_user_id, created_at desc);
create index if not exists onehome_core_xp_challenges_address_pending_idx
  on public.onehome_core_xp_wallet_challenges (normalized_address, expires_at)
  where status = 'pending';

alter table public.onehome_core_xp_wallet_challenges enable row level security;
revoke all on table public.onehome_core_xp_wallet_challenges from anon, authenticated;
grant all on table public.onehome_core_xp_wallet_challenges to service_role;

create or replace function public.onehome_complete_core_evm_wallet_link(
  p_challenge_id uuid,
  p_owner_user_id uuid,
  p_wallet_address text,
  p_chain_key text,
  p_browser_nonce_hash text
)
returns jsonb
language plpgsql
security definer
set search_path to 'pg_catalog', 'public'
as $function$
declare
  v_challenge public.onehome_metamask_home_challenges%rowtype;
  v_wallet public.passport_chain_wallets%rowtype;
  v_address text := lower(btrim(coalesce(p_wallet_address, '')));
  v_chain text := lower(btrim(coalesce(p_chain_key, '')));
  v_nonce_hash text := lower(btrim(coalesce(p_browser_nonce_hash, '')));
  v_is_primary boolean := false;
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'SERVER_ONLY';
  end if;
  if p_owner_user_id is null then
    raise exception 'PASSPORT_REQUIRED';
  end if;
  if v_address !~ '^0x[a-f0-9]{40}$' then
    raise exception 'INVALID_EVM_ADDRESS';
  end if;
  if v_chain <> 'avalanche-mainnet' then
    raise exception 'CORE_CHAIN_NOT_AVAILABLE';
  end if;
  if v_nonce_hash !~ '^[a-f0-9]{64}$' then
    raise exception 'INVALID_CHALLENGE_NONCE';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(v_address, 0));

  select * into v_challenge
  from public.onehome_metamask_home_challenges
  where id = p_challenge_id
  for update;

  if not found
    or v_challenge.status <> 'pending'
    or v_challenge.expires_at <= now()
    or v_challenge.ecosystem <> 'evm'
    or v_challenge.requested_mode <> 'link'
    or v_challenge.requester_user_id is distinct from p_owner_user_id
    or v_challenge.normalized_address <> v_address
    or lower(v_challenge.chain_key) <> v_chain
    or v_challenge.browser_nonce_hash <> v_nonce_hash
  then
    raise exception 'LINK_CHALLENGE_INVALID_OR_EXPIRED';
  end if;

  if not exists (
    select 1 from public.onehome_chain_registry c
    where c.chain_key = v_chain
      and c.ecosystem = 'evm'
      and c.environment = 'mainnet'
      and c.numeric_chain_id = 43114
      and c.wallet_enabled = true
      and c.status in ('testing', 'active')
      and 'core' = any(coalesce(c.wallet_providers, array[]::text[]))
  ) then
    raise exception 'CORE_CHAIN_NOT_AVAILABLE';
  end if;

  select * into v_wallet
  from public.passport_chain_wallets w
  where w.ecosystem = 'evm'
    and w.normalized_address = v_address
    and w.status = 'verified'
  order by w.verified_at desc nulls last
  limit 1
  for update;

  if found then
    if v_wallet.owner_user_id <> p_owner_user_id then
      raise exception 'WALLET_ALREADY_LINKED_TO_ANOTHER_PASSPORT';
    end if;

    update public.passport_chain_wallets
    set provider = 'core',
        ecosystem = 'evm',
        verification_chain_key = v_chain,
        wallet_address = v_address,
        normalized_address = v_address,
        verification_method = 'personal_sign',
        proof_reference = 'onehome-core-wallet:' || p_challenge_id::text,
        proof_nonce_hash = v_nonce_hash,
        status = 'verified',
        verified_at = now(),
        last_used_at = now(),
        metadata = coalesce(metadata, '{}'::jsonb)
          || jsonb_build_object(
            'linked_from', 'passport',
            'wallet_provider', 'core',
            'link_chain_key', v_chain,
            'link_challenge_id', p_challenge_id::text
          )
    where id = v_wallet.id
    returning * into v_wallet;
  else
    select not exists (
      select 1 from public.passport_chain_wallets w
      where w.owner_user_id = p_owner_user_id
        and w.ecosystem = 'evm'
        and w.status = 'verified'
        and w.is_primary = true
    ) into v_is_primary;

    insert into public.passport_chain_wallets (
      owner_user_id, provider, ecosystem, verification_chain_key,
      wallet_address, normalized_address, verification_method,
      proof_reference, proof_nonce_hash, status, is_primary,
      verified_at, last_used_at, metadata
    )
    values (
      p_owner_user_id, 'core', 'evm', v_chain, v_address, v_address,
      'personal_sign', 'onehome-core-wallet:' || p_challenge_id::text,
      v_nonce_hash, 'verified', v_is_primary, now(), now(),
      jsonb_build_object(
        'linked_from', 'passport',
        'wallet_provider', 'core',
        'link_chain_key', v_chain,
        'link_challenge_id', p_challenge_id::text
      )
    )
    returning * into v_wallet;
  end if;

  update public.onehome_metamask_home_challenges
  set status = 'consumed', consumed_at = now()
  where id = p_challenge_id and status = 'pending';
  if not found then
    raise exception 'PROOF_REPLAY_BLOCKED';
  end if;

  return jsonb_build_object(
    'id', v_wallet.id,
    'owner_user_id', v_wallet.owner_user_id,
    'provider', v_wallet.provider,
    'ecosystem', v_wallet.ecosystem,
    'chain_key', v_wallet.verification_chain_key,
    'wallet_address', v_wallet.normalized_address,
    'status', v_wallet.status,
    'is_primary', v_wallet.is_primary,
    'verified_at', v_wallet.verified_at
  );
end;
$function$;

create or replace function public.onehome_complete_core_xp_wallet_link(
  p_challenge_id uuid,
  p_owner_user_id uuid,
  p_wallet_address text,
  p_chain_key text,
  p_browser_nonce_hash text,
  p_public_key text
)
returns jsonb
language plpgsql
security definer
set search_path to 'pg_catalog', 'public'
as $function$
declare
  v_challenge public.onehome_core_xp_wallet_challenges%rowtype;
  v_wallet public.passport_chain_wallets%rowtype;
  v_chain public.onehome_chain_registry%rowtype;
  v_chain_key text := lower(btrim(coalesce(p_chain_key, '')));
  v_address text := lower(btrim(coalesce(p_wallet_address, '')));
  v_address_body text;
  v_nonce_hash text := lower(btrim(coalesce(p_browser_nonce_hash, '')));
  v_expected_prefix text;
  v_is_primary boolean := false;
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'SERVER_ONLY';
  end if;
  if p_owner_user_id is null then
    raise exception 'PASSPORT_REQUIRED';
  end if;
  if v_chain_key = 'avalanche-x-mainnet' then
    v_expected_prefix := 'x-';
  elsif v_chain_key = 'avalanche-p-mainnet' then
    v_expected_prefix := 'p-';
  else
    raise exception 'CORE_CHAIN_NOT_AVAILABLE';
  end if;
  if v_address !~ '^[xp]-avax1[a-z0-9]{20,70}$'
    or left(v_address, 2) <> v_expected_prefix
  then
    raise exception 'INVALID_XP_ADDRESS';
  end if;
  if v_nonce_hash !~ '^[a-f0-9]{64}$' then
    raise exception 'INVALID_CHALLENGE_NONCE';
  end if;
  if lower(coalesce(p_public_key, '')) !~ '^0x0[23][a-f0-9]{64}$' then
    raise exception 'INVALID_XP_PUBLIC_KEY';
  end if;
  v_address_body := regexp_replace(v_address, '^[xp]-', '');

  perform pg_advisory_xact_lock(hashtextextended('avalanche-xp:' || v_address_body, 0));

  select * into v_challenge
  from public.onehome_core_xp_wallet_challenges
  where id = p_challenge_id
  for update;

  if not found
    or v_challenge.status <> 'pending'
    or v_challenge.expires_at <= now()
    or v_challenge.owner_user_id is distinct from p_owner_user_id
    or lower(v_challenge.wallet_address) <> v_address
    or lower(v_challenge.normalized_address) <> v_address
    or lower(v_challenge.chain_key) <> v_chain_key
    or lower(v_challenge.browser_nonce_hash) <> v_nonce_hash
  then
    raise exception 'LINK_CHALLENGE_INVALID_OR_EXPIRED';
  end if;

  select * into v_chain
  from public.onehome_chain_registry c
  where c.chain_key = v_chain_key
  for share;

  if not found
    or v_chain.ecosystem not in ('avalanche-x', 'avalanche-p')
    or v_chain.environment <> 'mainnet'
    or v_chain.wallet_enabled <> true
    or v_chain.status not in ('testing', 'active')
    or not ('core' = any(coalesce(v_chain.wallet_providers, array[]::text[])))
  then
    raise exception 'CORE_CHAIN_NOT_AVAILABLE';
  end if;

  if exists (
    select 1 from public.passport_chain_wallets w
    where w.ecosystem in ('avalanche-x', 'avalanche-p')
      and regexp_replace(lower(w.normalized_address), '^[xp]-', '') = v_address_body
      and w.status = 'verified'
      and w.owner_user_id <> p_owner_user_id
  ) then
    raise exception 'WALLET_ALREADY_LINKED_TO_ANOTHER_PASSPORT';
  end if;

  select * into v_wallet
  from public.passport_chain_wallets w
  where w.ecosystem = v_chain.ecosystem
    and w.normalized_address = v_address
    and w.status = 'verified'
  order by w.verified_at desc nulls last
  limit 1
  for update;

  if found then
    if v_wallet.owner_user_id <> p_owner_user_id then
      raise exception 'WALLET_ALREADY_LINKED_TO_ANOTHER_PASSPORT';
    end if;

    update public.passport_chain_wallets
    set provider = 'core',
        verification_chain_key = v_chain_key,
        wallet_address = v_address,
        normalized_address = v_address,
        public_key = lower(p_public_key),
        verification_method = 'avalanche_signMessage',
        proof_reference = 'onehome-core-wallet:' || p_challenge_id::text,
        proof_nonce_hash = v_nonce_hash,
        status = 'verified',
        verified_at = now(),
        last_used_at = now(),
        metadata = coalesce(metadata, '{}'::jsonb)
          || jsonb_build_object(
            'linked_from', 'passport',
            'wallet_provider', 'core',
            'network', 'mainnet',
            'chain_alias', upper(left(v_expected_prefix, 1)),
            'link_chain_key', v_chain_key,
            'link_challenge_id', p_challenge_id::text
          )
    where id = v_wallet.id
    returning * into v_wallet;
  else
    select not exists (
      select 1 from public.passport_chain_wallets w
      where w.owner_user_id = p_owner_user_id
        and w.ecosystem = v_chain.ecosystem
        and w.status = 'verified'
        and w.is_primary = true
    ) into v_is_primary;

    insert into public.passport_chain_wallets (
      owner_user_id, provider, ecosystem, verification_chain_key,
      wallet_address, normalized_address, public_key, verification_method,
      proof_reference, proof_nonce_hash, status, is_primary, verified_at,
      last_used_at, metadata
    )
    values (
      p_owner_user_id, 'core', v_chain.ecosystem, v_chain_key,
      v_address, v_address, lower(p_public_key), 'avalanche_signMessage',
      'onehome-core-wallet:' || p_challenge_id::text, v_nonce_hash,
      'verified', v_is_primary, now(), now(),
      jsonb_build_object(
        'linked_from', 'passport',
        'wallet_provider', 'core',
        'network', 'mainnet',
        'chain_alias', upper(left(v_expected_prefix, 1)),
        'link_chain_key', v_chain_key,
        'link_challenge_id', p_challenge_id::text
      )
    )
    returning * into v_wallet;
  end if;

  update public.onehome_core_xp_wallet_challenges
  set status = 'consumed', consumed_at = now()
  where id = p_challenge_id and status = 'pending';
  if not found then
    raise exception 'PROOF_REPLAY_BLOCKED';
  end if;

  return jsonb_build_object(
    'id', v_wallet.id,
    'owner_user_id', v_wallet.owner_user_id,
    'provider', v_wallet.provider,
    'ecosystem', v_wallet.ecosystem,
    'chain_key', v_wallet.verification_chain_key,
    'wallet_address', v_wallet.wallet_address,
    'normalized_address', v_wallet.normalized_address,
    'status', v_wallet.status,
    'is_primary', v_wallet.is_primary,
    'verified_at', v_wallet.verified_at
  );
end;
$function$;

revoke all on function public.onehome_complete_core_evm_wallet_link(uuid, uuid, text, text, text) from public, anon, authenticated;
grant execute on function public.onehome_complete_core_evm_wallet_link(uuid, uuid, text, text, text) to service_role;
revoke all on function public.onehome_complete_core_xp_wallet_link(uuid, uuid, text, text, text, text) from public, anon, authenticated;
grant execute on function public.onehome_complete_core_xp_wallet_link(uuid, uuid, text, text, text, text) to service_role;

commit;