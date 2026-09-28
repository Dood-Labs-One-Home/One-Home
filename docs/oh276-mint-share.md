# Mint-share source review (hosting not activated)

The reviewed function is `netlify/functions/mint-share.js` at repository root, outside the public static directory. It is the existing CommonJS Lambda-compatible handler, retained rather than rewritten during this source sync. It uses native `fetch`, no installed package, and requires a supported Node runtime with global fetch (Node 18 or newer; choose a currently supported Netlify runtime before a future deployment).

If hosting is approved later, configuration must use the repository root as base, `apps/one-home` as the publish directory, and `netlify/functions` as the functions directory. The following is documentation only; no netlify.toml was created or changed:

```toml
[build]
  publish = "apps/one-home"
[functions]
  directory = "netlify/functions"
```

The static `_redirects` already contains `/mint-share/* /.netlify/functions/mint-share/:splat 200!`, ahead of the catch-all. `/m/*` and `/mint/*` reach `campaign-mint.html`. Do not copy the package's old build command: it depends on omitted private/backend snapshots and generated application dist. Do not introduce a root `type: module` without reviewing compatibility with this existing `.js` CommonJS handler.

The handler uses only the existing public Supabase URL and publishable key, not an administrative secret. It calls `onehome_public_mint_cover` and `onehome_get_mint_public_link` through the public RPC interface, and constructs image URLs under the existing `onehome-mint-page/card` endpoint. These RPCs must enforce public-mint visibility; their live permissions and availability were not tested or changed. No new environment file is needed by this unchanged handler. Canonical metadata deliberately remains on `https://doodlabs.app`; request Host headers cannot replace it.

Offline mocks cover invalid IDs, metadata escaping, canonical-host pinning, public-slug redirects, a Fuji fallback URL, and failed lookups. They do not prove live RPC authorization or deployment compatibility. No browser session, real booking, wallet, or payment was used.

References: [Netlify Lambda compatibility](https://docs.netlify.com/build/functions/lambda-compatibility/) and [Supabase API key types](https://supabase.com/docs/guides/getting-started/api-keys).
