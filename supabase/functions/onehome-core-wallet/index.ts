// One Home Core wallet ownership service.
// Deploy as onehome-core-wallet with Verify JWT OFF; Passport JWTs are validated here.
// Core EVM uses personal_sign. Native X/P uses avalanche_signMessage and Avalanche signature recovery.
// The browser never writes verified wallet rows and never receives the service role key.
import { createClient } from "npm:@supabase/supabase-js@2.45.4";
import { verifyMessage } from "npm:viem@2";
import { publicKeyToXPAddress, xpRecoverPublicKey } from "npm:@avalanche-sdk/client@0.1.1/accounts";
import { CB58ToHex } from "npm:@avalanche-sdk/client@0.1.1/utils";

type Row = Record<string, any>;

const VERSION = "1.0.0";
const CHALLENGE_TTL_MS = 5 * 60 * 1000;
const ORIGINS = new Set([
  "https://doodlabs.app",
  "https://www.doodlabs.app",
  "https://doodlabs.io",
  "https://www.doodlabs.io",
  "http://localhost:8000",
  "http://127.0.0.1:8000",
]);

class ApiError extends Error {
  status: number;
  code: string;
  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

function text(value: unknown): string {
  return String(value ?? "").trim();
}
function lower(value: unknown): string {
  return text(value).toLowerCase();
}
function requestOrigin(req: Request): string {
  const origin = req.headers.get("origin") || "";
  if (!origin) return "https://doodlabs.app";
  if (!ORIGINS.has(origin)) {
    throw new ApiError(403, "ORIGIN_NOT_ALLOWED", "This One Home origin is not allowed.");
  }
  return origin;
}
function cors(req: Request): HeadersInit {
  const origin = req.headers.get("origin") || "https://doodlabs.app";
  return {
    "Access-Control-Allow-Origin": ORIGINS.has(origin) ? origin : "https://doodlabs.app",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin",
  };
}
function reply(req: Request, body: Row, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...cors(req),
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "X-OneHome-Core-Wallet": VERSION,
    },
  });
}
function supabaseConfig() {
  const url = Deno.env.get("SUPABASE_URL") || "";
  const anon = Deno.env.get("SUPABASE_ANON_KEY") || "";
  const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  if (!url || !anon || !service) throw new ApiError(500, "SERVER_CONFIGURATION", "The Core wallet service is not configured.");
  return { url, anon, service };
}
async function passportUser(req: Request, config: ReturnType<typeof supabaseConfig>) {
  const authorization = req.headers.get("authorization") || "";
  const match = authorization.match(/^Bearer\s+(.+)$/i);
  if (!match) throw new ApiError(401, "PASSPORT_REQUIRED", "Sign in to your One Home Passport first.");
  const authClient = createClient(config.url, config.anon, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  const { data, error } = await authClient.auth.getUser(match[1]);
  if (error || !data?.user?.id) throw new ApiError(401, "PASSPORT_REQUIRED", "Your One Home Passport session is not valid.");
  return { id: String(data.user.id), token: match[1] };
}
function adminClient(config: ReturnType<typeof supabaseConfig>) {
  return createClient(config.url, config.service, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}
function randomHex(byteCount = 24): string {
  const bytes = crypto.getRandomValues(new Uint8Array(byteCount));
  return Array.from(bytes).map((byte) => byte.toString(16).padStart(2, "0")).join("");
}
async function sha256(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
}
function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}
function normalizeEvmAddress(value: unknown): string {
  const address = lower(value);
  return /^0x[a-f0-9]{40}$/.test(address) ? address : "";
}
function normalizeXpAddress(value: unknown, alias: "X" | "P"): string {
  let address = lower(value).replace(/^[xp]-/, "");
  if (!address.startsWith("avax1") || !/^avax1[a-z0-9]{20,70}$/.test(address)) return "";
  return alias.toLowerCase() + "-" + address;
}
function xpAlias(chainKey: string): "X" | "P" | "" {
  if (chainKey === "avalanche-x-mainnet") return "X";
  if (chainKey === "avalanche-p-mainnet") return "P";
  return "";
}
async function getChain(admin: any, chainKey: string, kind: "evm" | "xp"): Promise<Row> {
  const { data, error } = await admin
    .from("onehome_chain_registry")
    .select("chain_key,display_name,ecosystem,environment,numeric_chain_id,wallet_providers,wallet_enabled,status,configuration")
    .eq("chain_key", chainKey)
    .maybeSingle();
  if (error || !data) throw new ApiError(404, "CHAIN_NOT_FOUND", "That Avalanche wallet network is not registered in One Home.");
  const expectedEcosystem = kind === "evm" ? "evm" : (xpAlias(chainKey) === "X" ? "avalanche-x" : "avalanche-p");
  const mainnetMatches = kind === "xp"
    ? lower(data.environment) === "mainnet"
    : lower(data.environment) === "mainnet" && Number(data.numeric_chain_id) === 43114;
  if (
    data.ecosystem !== expectedEcosystem ||
    !mainnetMatches ||
    data.wallet_enabled !== true ||
    !["testing", "active"].includes(lower(data.status)) ||
    !Array.isArray(data.wallet_providers) ||
    !data.wallet_providers.includes("core")
  ) {
    throw new ApiError(409, "CHAIN_NOT_AVAILABLE", "Core wallet linking is not enabled for this Avalanche mainnet network.");
  }
  return data;
}
function challengeMessage(args: {
  origin: string; provider: string; address: string; chain: Row; challengeId: string;
  nonce: string; issuedAt: string; expiresAt: string;
}): string {
  return [
    "One Home wallet ownership verification",
    "Link this wallet to the authenticated One Home Passport.",
    "Origin: " + args.origin,
    "Provider: " + args.provider,
    "Wallet: " + args.address,
    "Chain: " + text(args.chain.display_name),
    "Chain key: " + text(args.chain.chain_key),
    "Nonce: " + args.nonce,
    "Issued At: " + args.issuedAt,
    "Expires At: " + args.expiresAt,
    "Request ID: " + args.challengeId,
    "",
    "This proof does not send a transaction or grant spending approval.",
  ].join("\n");
}
function databaseError(error: any): never {
  const message = text(error?.message || error);
  if (/WALLET_ALREADY_LINKED_TO_ANOTHER_PASSPORT/i.test(message)) {
    throw new ApiError(409, "WALLET_ALREADY_LINKED_TO_ANOTHER_PASSPORT", "This Core wallet is already linked to another One Home Passport.");
  }
  if (/CHALLENGE|PROOF_REPLAY|EXPIRED/i.test(message)) {
    throw new ApiError(409, "CHALLENGE_NOT_VALID", "The wallet proof expired or was already used. Please reconnect.");
  }
  if (/CORE_CHAIN_NOT_AVAILABLE/i.test(message)) {
    throw new ApiError(409, "CHAIN_NOT_AVAILABLE", "Core wallet linking is not enabled for this Avalanche network yet.");
  }
  throw new ApiError(500, "CORE_WALLET_ERROR", "One Home could not save the verified Core wallet.");
}
async function rejectCrossPassportWallet(admin: any, ecosystem: string, address: string, userId: string) {
  const { data, error } = await admin
    .from("passport_chain_wallets")
    .select("id,owner_user_id,provider")
    .eq("ecosystem", ecosystem)
    .eq("normalized_address", address)
    .eq("status", "verified")
    .limit(1)
    .maybeSingle();
  if (error) throw new ApiError(500, "WALLET_LOOKUP_FAILED", "One Home could not check this wallet.");
  if (data && String(data.owner_user_id) !== userId) {
    throw new ApiError(409, "WALLET_ALREADY_LINKED_TO_ANOTHER_PASSPORT", "This Core wallet is already linked to another One Home Passport.");
  }
}
async function challengeEvm(req: Request, admin: any, userId: string, body: Row): Promise<Response> {
  const chainKey = lower(body.chain_key);
  const chain = await getChain(admin, chainKey, "evm");
  if (chainKey !== "avalanche-mainnet") throw new ApiError(400, "CHAIN_NOT_SUPPORTED", "Core EVM linking currently supports Avalanche C-Chain Mainnet.");
  const address = normalizeEvmAddress(body.wallet_address);
  if (!address) throw new ApiError(400, "INVALID_WALLET", "Core did not return a valid EVM wallet address.");
  await rejectCrossPassportWallet(admin, "evm", address, userId);

  const nonce = randomHex();
  const nonceHash = await sha256(nonce);
  const challengeId = crypto.randomUUID();
  const now = new Date();
  const issuedAt = now.toISOString();
  const expiresAt = new Date(now.getTime() + CHALLENGE_TTL_MS).toISOString();
  const message = challengeMessage({
    origin: requestOrigin(req), provider: "Core", address, chain,
    challengeId, nonce, issuedAt, expiresAt,
  });
  const { error } = await admin.from("onehome_metamask_home_challenges").insert({
    id: challengeId,
    wallet_address: address,
    normalized_address: address,
    ecosystem: "evm",
    chain_key: chainKey,
    requested_mode: "link",
    requester_user_id: userId,
    browser_nonce_hash: nonceHash,
    challenge_message: message,
    status: "pending",
    expires_at: expiresAt,
  });
  if (error) throw new ApiError(500, "CHALLENGE_CREATE_FAILED", "One Home could not start the Core wallet proof.");
  return reply(req, {
    success: true, action: "challenge", kind: "evm", challenge_id: challengeId,
    browser_nonce: nonce, challenge_message: message, wallet_address: address, expires_at: expiresAt,
  });
}
async function challengeXp(req: Request, admin: any, userId: string, body: Row): Promise<Response> {
  const chainKey = lower(body.chain_key);
  const alias = xpAlias(chainKey);
  if (!alias) throw new ApiError(400, "CHAIN_NOT_SUPPORTED", "Choose an Avalanche X-Chain or P-Chain Mainnet wallet.");
  const chain = await getChain(admin, chainKey, "xp");
  const address = normalizeXpAddress(body.wallet_address, alias);
  if (!address) throw new ApiError(400, "INVALID_WALLET", "Core did not return a valid Avalanche Mainnet X/P address.");
  const addressBody = address.replace(/^[xp]-/, "");
  const pairedAddresses = ["x-" + addressBody, "p-" + addressBody];
  const { data: claims, error: claimsError } = await admin
    .from("passport_chain_wallets")
    .select("id,owner_user_id")
    .in("ecosystem", ["avalanche-x", "avalanche-p"])
    .in("normalized_address", pairedAddresses)
    .eq("status", "verified")
    .limit(2);
  if (claimsError) throw new ApiError(500, "WALLET_LOOKUP_FAILED", "One Home could not check this Core X/P wallet.");
  if ((claims || []).some((row: Row) => String(row.owner_user_id) !== userId)) {
    throw new ApiError(409, "WALLET_ALREADY_LINKED_TO_ANOTHER_PASSPORT", "This Core X/P wallet is already linked to another One Home Passport.");
  }

  const nonce = randomHex();
  const nonceHash = await sha256(nonce);
  const challengeId = crypto.randomUUID();
  const now = new Date();
  const issuedAt = now.toISOString();
  const expiresAt = new Date(now.getTime() + CHALLENGE_TTL_MS).toISOString();
  const message = challengeMessage({
    origin: requestOrigin(req), provider: "Core", address, chain,
    challengeId, nonce, issuedAt, expiresAt,
  });
  const { error } = await admin.from("onehome_core_xp_wallet_challenges").insert({
    id: challengeId,
    owner_user_id: userId,
    chain_key: chainKey,
    wallet_address: address,
    normalized_address: address,
    browser_nonce_hash: nonceHash,
    challenge_message: message,
    status: "pending",
    expires_at: expiresAt,
  });
  if (error) throw new ApiError(500, "CHALLENGE_CREATE_FAILED", "One Home could not start the Core X/P wallet proof.");
  return reply(req, {
    success: true, action: "challenge", kind: "xp", challenge_id: challengeId,
    browser_nonce: nonce, challenge_message: message, wallet_address: address, expires_at: expiresAt,
  });
}
async function readChallenge(admin: any, challengeId: string, table: string): Promise<Row> {
  if (!isUuid(challengeId)) throw new ApiError(400, "INVALID_PROOF", "The Core wallet proof is incomplete.");
  const { data, error } = await admin.from(table).select("*").eq("id", challengeId).maybeSingle();
  if (error) throw new ApiError(500, "CHALLENGE_LOOKUP_FAILED", "One Home could not read the wallet proof.");
  if (!data) throw new ApiError(404, "CHALLENGE_NOT_FOUND", "The Core wallet proof was not found.");
  return data;
}
function validateChallenge(challenge: Row, userId: string, nonce: string, address: string, chainKey: string, evm: boolean) {
  const ownerId = evm ? String(challenge.requester_user_id || "") : String(challenge.owner_user_id || "");
  if (ownerId !== userId) throw new ApiError(403, "PASSPORT_MISMATCH", "This wallet proof belongs to another Passport session.");
  if (challenge.status !== "pending" || Date.parse(String(challenge.expires_at || "")) <= Date.now()) {
    throw new ApiError(409, "CHALLENGE_NOT_VALID", "The wallet proof expired or was already used. Please reconnect.");
  }
  if (lower(challenge.normalized_address) !== lower(address) || lower(challenge.chain_key) !== lower(chainKey)) {
    throw new ApiError(403, "WALLET_MISMATCH", "Core signed with a different wallet or network than the proof requested.");
  }
  return sha256(nonce).then((nonceHash) => {
    if (nonceHash !== lower(challenge.browser_nonce_hash)) {
      throw new ApiError(403, "NONCE_MISMATCH", "The Core wallet proof does not match this request.");
    }
    return nonceHash;
  });
}
async function verifiedReadback(admin: any, userId: string, provider: string, ecosystem: string, chainKey: string, address: string) {
  const { data, error } = await admin
    .from("passport_chain_wallets")
    .select("id,owner_user_id,provider,ecosystem,verification_chain_key,wallet_address,normalized_address,status,is_primary,verified_at,wallet_label")
    .eq("owner_user_id", userId)
    .eq("provider", provider)
    .eq("ecosystem", ecosystem)
    .eq("verification_chain_key", chainKey)
    .eq("normalized_address", address)
    .eq("status", "verified")
    .maybeSingle();
  if (error || !data) throw new ApiError(500, "VERIFIED_WALLET_READBACK_FAILED", "One Home could not confirm the verified Core wallet.");
  return data;
}
async function completeEvm(req: Request, admin: any, userId: string, body: Row): Promise<Response> {
  const challengeId = text(body.challenge_id);
  const nonce = text(body.browser_nonce);
  const chainKey = lower(body.chain_key);
  const address = normalizeEvmAddress(body.wallet_address);
  const signature = text(body.signature);
  if (!address || !/^0x(?:[a-fA-F0-9]{128}|[a-fA-F0-9]{130})$/.test(signature)) {
    throw new ApiError(400, "INVALID_PROOF", "The Core EVM ownership proof is incomplete or invalid.");
  }
  const challenge = await readChallenge(admin, challengeId, "onehome_metamask_home_challenges");
  if (challenge.ecosystem !== "evm" || challenge.requested_mode !== "link") {
    throw new ApiError(409, "CHALLENGE_NOT_VALID", "This Core EVM wallet proof is no longer valid.");
  }
  const nonceHash = await validateChallenge(challenge, userId, nonce, address, chainKey, true);
  const chain = await getChain(admin, lower(challenge.chain_key), "evm");
  const signatureValid = await verifyMessage({
    address: address as any,
    message: String(challenge.challenge_message || ""),
    signature: signature as any,
  }).catch(() => false);
  if (!signatureValid) throw new ApiError(403, "SIGNATURE_INVALID", "Core did not provide a valid EVM ownership signature.");

  const { data, error } = await admin.rpc("onehome_complete_core_evm_wallet_link", {
    p_challenge_id: challengeId,
    p_owner_user_id: userId,
    p_wallet_address: address,
    p_chain_key: chain.chain_key,
    p_browser_nonce_hash: nonceHash,
  });
  if (error) databaseError(error);
  const wallet = await verifiedReadback(admin, userId, "core", "evm", chain.chain_key, address);
  return reply(req, { success: true, action: "complete", linked: true, wallet, server_result: data || null });
}
async function completeXp(req: Request, admin: any, userId: string, body: Row): Promise<Response> {
  const challengeId = text(body.challenge_id);
  const nonce = text(body.browser_nonce);
  const chainKey = lower(body.chain_key);
  const alias = xpAlias(chainKey);
  const address = normalizeXpAddress(body.wallet_address, alias || "X");
  const signature = text(body.signature);
  if (!alias || !address || signature.length < 20 || signature.length > 256) {
    throw new ApiError(400, "INVALID_PROOF", "The Core X/P ownership proof is incomplete or invalid.");
  }
  const challenge = await readChallenge(admin, challengeId, "onehome_core_xp_wallet_challenges");
  const challengeAddress = normalizeXpAddress(challenge.wallet_address, alias);
  if (!challengeAddress) throw new ApiError(400, "INVALID_PROOF", "The saved Core X/P wallet proof is invalid.");
  const nonceHash = await validateChallenge(challenge, userId, nonce, address, chainKey, false);
  const chain = await getChain(admin, lower(challenge.chain_key), "xp");

  let signatureHex = "";
  try {
    signatureHex = /^0x[0-9a-f]{130}$/i.test(signature) ? signature : String(CB58ToHex(signature));
    if (!/^0x[0-9a-f]{130}$/i.test(signatureHex)) throw new Error("BAD_SIGNATURE_ENCODING");
  } catch {
    throw new ApiError(400, "INVALID_SIGNATURE", "Core returned an invalid X/P message signature.");
  }
  let publicKey = "";
  let derivedAddress = "";
  try {
    publicKey = String(xpRecoverPublicKey(String(challenge.challenge_message || ""), signatureHex));
    derivedAddress = String(publicKeyToXPAddress(publicKey, "avax")).toLowerCase().replace(/^[xp]-/, "");
  } catch {
    throw new ApiError(403, "SIGNATURE_INVALID", "One Home could not verify the Core X/P message signature.");
  }
  if (!publicKey || derivedAddress !== address.replace(/^[xp]-/, "")) {
    throw new ApiError(403, "SIGNATURE_INVALID", "Core did not prove ownership of this Avalanche X/P address.");
  }

  const { data, error } = await admin.rpc("onehome_complete_core_xp_wallet_link", {
    p_challenge_id: challengeId,
    p_owner_user_id: userId,
    p_wallet_address: address,
    p_chain_key: chain.chain_key,
    p_browser_nonce_hash: nonceHash,
    p_public_key: publicKey,
  });
  if (error) databaseError(error);
  const wallet = await verifiedReadback(admin, userId, "core", chain.ecosystem, chain.chain_key, address);
  return reply(req, { success: true, action: "complete", linked: true, wallet, server_result: data || null });
}
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors(req) });
  if (req.method !== "POST") return reply(req, { success: false, error: "Method not allowed.", code: "METHOD_NOT_ALLOWED" }, 405);
  try {
    requestOrigin(req);
    const length = Number(req.headers.get("content-length") || "0");
    if (length > 32000) throw new ApiError(413, "REQUEST_TOO_LARGE", "The Core wallet request is too large.");
    const config = supabaseConfig();
    const user = await passportUser(req, config);
    const admin = adminClient(config);
    let body: Row;
    try {
      body = await req.json();
    } catch {
      throw new ApiError(400, "INVALID_JSON", "The Core wallet request was not valid JSON.");
    }
    const action = lower(body.action);
    const kind = lower(body.kind);
    if (action === "challenge" && kind === "evm") return await challengeEvm(req, admin, user.id, body);
    if (action === "challenge" && kind === "xp") return await challengeXp(req, admin, user.id, body);
    if (action === "complete" && kind === "evm") return await completeEvm(req, admin, user.id, body);
    if (action === "complete" && kind === "xp") return await completeXp(req, admin, user.id, body);
    throw new ApiError(400, "ACTION_NOT_SUPPORTED", "That Core wallet request is not supported.");
  } catch (error) {
    if (error instanceof ApiError) return reply(req, { success: false, error: error.message, code: error.code }, error.status);
    return reply(req, { success: false, error: "The Core wallet request could not be completed.", code: "CORE_WALLET_ERROR" }, 500);
  }
});