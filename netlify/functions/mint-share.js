const SUPABASE_URL = 'https://fshvettlltcujmwvikfq.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_ARrX-vYhy8l-yhs6384S_g_n6214taB';
const CARD_VERSION = '146766';

function text(value) {
  return String(value == null ? '' : value).trim();
}
function validUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(text(value));
}
function esc(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
function requestCampaignId(event) {
  const fromQuery = text(event.queryStringParameters && event.queryStringParameters.campaign);
  if (validUuid(fromQuery)) return fromQuery;
  const path = text(event.path || event.rawPath || '');
  const parts = path.split('/').filter(Boolean);
  const candidate = parts[parts.length - 1] || '';
  return validUuid(candidate) ? candidate : '';
}
function safeDestination(event, campaignId, network, publicSlug) {
  const q = event.queryStringParameters || {};
  const params = new URLSearchParams();
  const route = text(q.route).toLowerCase();
  const slug = text(publicSlug).toLowerCase();
  if (route === 'rare-routes') params.set('route', 'rare-routes');
  params.set('source', 'x');
  if (/^[a-z0-9-]{3,60}$/.test(slug)) {
    return `/m/${encodeURIComponent(slug)}?${params.toString()}`;
  }
  const chain = text(q.chain).toLowerCase();
  const suppliedNetwork = text(q.network).toLowerCase();
  if (chain) params.set('chain', chain);
  else if (suppliedNetwork === 'mainnet' || suppliedNetwork === 'testnet') params.set('network', suppliedNetwork);
  else if (network === 'mainnet' || network === 'testnet') params.set('network', network);
  return `/mint/${encodeURIComponent(campaignId)}?${params.toString()}`;
}
async function campaignPublicLink(campaignId) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/onehome_get_mint_public_link`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: SUPABASE_PUBLISHABLE_KEY,
      Accept: 'application/json',
    },
    body: JSON.stringify({ p_campaign_id: campaignId }),
  });
  if (!response.ok) return null;
  return (await response.json().catch(() => null)) || null;
}
async function campaignCover(campaignId) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/onehome_public_mint_cover`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: SUPABASE_PUBLISHABLE_KEY,
      Accept: 'application/json',
    },
    body: JSON.stringify({ p_campaign_id: campaignId }),
  });
  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    throw new Error(`Cover lookup failed (${response.status}) ${detail}`.slice(0, 300));
  }
  return (await response.json().catch(() => ({}))) || {};
}
function cardImageUrl(campaignId) {
  // One Home's canonical social-image renderer already returns a public
  // 1200x630 PNG and has been verified independently. Keep X away from an
  // extra image-CDN transformation layer.
  return `${SUPABASE_URL}/functions/v1/onehome-mint-page/card/${encodeURIComponent(campaignId)}/${CARD_VERSION}.png`;
}

function html(meta) {
  const title = esc(meta.title);
  const desc = esc(meta.description);
  const image = esc(meta.image);
  const pageUrl = esc(meta.pageUrl);
  const destination = esc(meta.destination);
  const name = esc(meta.name);
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="robots" content="index,follow,max-image-preview:large">
<title>${title}</title>
<meta name="description" content="${desc}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="One Home">
<meta property="og:title" content="${title}">
<meta property="og:description" content="${desc}">
<meta property="og:url" content="${pageUrl}">
<meta property="og:image" content="${image}">
<meta property="og:image:secure_url" content="${image}">
<meta property="og:image:type" content="image/png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="${name} mint cover">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${title}">
<meta name="twitter:description" content="${desc}">
<meta name="twitter:image" content="${image}">
<meta name="twitter:image:alt" content="${name} mint cover">
<link rel="canonical" href="${pageUrl}">
<style>
*{box-sizing:border-box}html,body{margin:0;min-height:100%;background:#050505;color:#fff;font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}body{display:grid;place-items:center;padding:24px}.shell{width:min(760px,100%);border:1px solid rgba(255,255,255,.15);border-radius:26px;background:#0b0d0f;overflow:hidden}.art{aspect-ratio:1200/630;background:#070707}.art img{width:100%;height:100%;object-fit:contain;display:block}.copy{padding:24px}.eyebrow{margin:0 0 8px;color:#ff2bd6;font-weight:900;letter-spacing:.14em;text-transform:uppercase;font-size:12px}h1{margin:0;font-size:clamp(28px,6vw,48px);line-height:1.05}.copy p{color:#c9c9c9;line-height:1.5}.open{display:flex;align-items:center;justify-content:center;width:100%;min-height:58px;border:1px solid #ff2bd6;border-radius:999px;background:#ff2bd6;color:#080808;font-weight:900;text-decoration:none}
</style>
<script>window.setTimeout(function(){try{location.replace(${JSON.stringify(meta.destination)})}catch(_e){}},350);</script>
</head>
<body>
<main class="shell">
<div class="art"><img src="${image}" alt="${name} mint cover"></div>
<section class="copy"><p class="eyebrow">One Home Mint</p><h1>${name}</h1><p>Opening the live One Home mint…</p><a class="open" href="${destination}">Open Mint</a></section>
</main>
</body>
</html>`;
}

exports.handler = async function handler(event) {
  const campaignId = requestCampaignId(event);
  if (!campaignId) {
    return { statusCode: 404, headers: { 'Content-Type': 'text/plain; charset=utf-8' }, body: 'Mint not found.' };
  }
  try {
    const cover = await campaignCover(campaignId);
    const name = text(cover.name) || 'One Home Mint';
    const description = text(cover.description) || `Mint ${name} on One Home.`;
    const network = text(cover.network).toLowerCase();
    const publicLink = await campaignPublicLink(campaignId).catch(() => null);
    const destination = safeDestination(event, campaignId, network, publicLink && publicLink.public_slug);
    // Canonical social metadata must never trust a request Host/X-Forwarded-Host.
    // A forged host header should not be able to change og:url/canonical output.
    const qs = new URLSearchParams(event.queryStringParameters || {});
    qs.delete('campaign');
    const pageUrl = `https://doodlabs.app/mint-share/${encodeURIComponent(campaignId)}${qs.toString() ? `?${qs.toString()}` : ''}`;
    const canonicalCover = text(cover.cover_image_url) || text(cover.artwork_url);
    const image = cardImageUrl(campaignId);
    const title = `${name} | One Home`;
    console.log('One Home mint-share card', { campaignId, name, canonicalCover, image, pageUrl });
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-store, max-age=0',
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
        'Referrer-Policy': 'no-referrer',
        'Content-Security-Policy': "default-src 'none'; img-src https://fshvettlltcujmwvikfq.supabase.co data:; style-src 'unsafe-inline'; script-src 'unsafe-inline'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'",
      },
      body: html({ name, description, image, destination, pageUrl, title }),
    };
  } catch (error) {
    console.error('One Home mint share function', error);
    return { statusCode: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' }, body: 'Mint preview is temporarily unavailable.' };
  }
};
