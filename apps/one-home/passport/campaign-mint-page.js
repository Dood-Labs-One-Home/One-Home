/* One Home v14.67.219 — Safari/Xaman mobile user-tap deeplink restoration + frozen same-mint continuation.
   Preserves the v14.67.215 Xaman continuation, v14.67.212 prepare/wallet safeguards, v14.67.211 redeemables, v14.67.207/.168 Xaman return verification, v14.67.206 tier quantity/pricing, and existing server-authoritative mint completion. */
/* One Home v14.67.198 — restores the previously validated Safari/Xaman mobile launch contract and distinguishes an actual Xaman return from an unsigned app-switch check; preserves linked-wallet selection, canonical /m/<slug> returns, Allow List, reconcile, Joey/Crossmark/EVM, My NFTs, and the proven server-authoritative verifier.
   Campaign-specific public mint page with creator-selected 1–8 mint sessions across XRPL + Universal EVM test campaigns.
   Xaman return-mode verifies by payload UUID, then receives the durable batch continuation from the server.
   Raw multi-mint continuation tokens are never transported through Xaman/browser return URLs.
   This page accepts exactly one campaign from /mint/<campaign-id> and never falls back to the Founder Supply Drop. */
(function(){
  'use strict';

  const SUPABASE_URL = 'https://fshvettlltcujmwvikfq.supabase.co';
  const SUPABASE_KEY = 'sb_publishable_ARrX-vYhy8l-yhs6384S_g_n6214taB';
  const FUNCTIONS_BASE = SUPABASE_URL + '/functions/v1';
  const LEGACY_MINT_COLLECTION_KEY = 'onehome_active_mint_collection_id';
  const MINT_CAMPAIGN_KEY = 'onehome_active_mint_campaign_id_v1369';
  const FOUNDER_ELIGIBILITY_KEY = 'onehome_founder_eligibility';
  const STANDARD_ELIGIBILITY_KEY = 'onehome_mint_eligibility_v1369';
  const WALLET_KEY = 'onehome_passport_verified_wallet';
  const PROVIDER_KEY = 'onehome_passport_verified_provider';
  const TEST_WALLET_KEY = 'onehome_test_mint_wallet';
  const TEST_PROVIDER_KEY = 'onehome_test_mint_provider';
  const MINT_RECEIVING_WALLET_KEY = 'onehome_mint_receiving_wallet_v146776';
  const MINT_RECEIVING_PROVIDER_KEY = 'onehome_mint_receiving_provider_v146776';
  const PASSPORT_XRPL_WALLET_TABLE = 'passport_wallets';
  const LAST_LINKED_MINT_WALLET_KEY = 'onehome_last_linked_mint_wallet_v146776';
  const ACCESS_CACHE_MS = 60 * 1000;
  const DEFAULT_FOUNDER_ART = '/assets/founder-supply-drop-sealed.png';
  const DEFAULT_STANDARD_ART='/assets/one-home-image-placeholder.png';
  const ONEHOME_SUPABASE_IMAGE_RE=/^https:\/\/fshvettlltcujmwvikfq(?:\.storage)?\.supabase\.co\//i;
  function oneHomeOptimizedArtworkUrl(source,width=1200){
    const raw=String(source||'').trim();
    if(!raw||!ONEHOME_SUPABASE_IMAGE_RE.test(raw))return raw;
    return '/.netlify/images?url='+encodeURIComponent(raw)+'&w='+Math.max(320,Math.round(Number(width)||1200))+'&fit=contain&q=82';
  }
  function setOneHomeArtwork(image,source,width=1200){
    if(!image)return;
    const original=String(source||'').trim()||DEFAULT_STANDARD_ART;
    const optimized=oneHomeOptimizedArtworkUrl(original,width)||original;
    image.decoding='async';image.loading='eager';
    try{image.fetchPriority='high'}catch(_priorityError){}
    image.onerror=function(){
      if(image.dataset.onehomeOriginal&&image.src!==image.dataset.onehomeOriginal){const fallback=image.dataset.onehomeOriginal;image.onerror=null;image.src=fallback;return}
      image.onerror=null;image.src=DEFAULT_STANDARD_ART;
    };
    image.dataset.onehomeOriginal=original;
    image.src=optimized;
  }
  const DEFAULT_RARE_ROUTES_ART = '/assets/rare-routes-system-logo.jpg?v=1434';
  const PENDING_MINT_KEY = 'onehome_pending_wallet_mint_claim';
  const EVM_PENDING_MINT_KEY = 'onehome_pending_evm_mint_v146712';
  const EVM_BATCH_SESSION_KEY = 'onehome_evm_mint_session_v146718';
  const MAX_MINT_SESSION_QUANTITY = 8;
  const BATCH_MINT_KEY = 'onehome_active_batch_mint_v1445';
  const BATCH_RECEIPT_KEY = 'onehome_completed_batch_receipt_v146779';
  const XAMAN_RETURN_SIGNAL_KEY = 'onehome_xaman_mint_return_v146774';
  const XAMAN_RETURN_MESSAGE_TYPE = 'onehome-xaman-mint-return';
  const XAMAN_RETURN_ACK_TYPE = 'onehome-xaman-mint-return-ack';
  const XAMAN_RETURN_CHANNEL_NAME = 'onehome-xaman-mint-return-v146777';
  const LEGACY_PENDING_MINT_KEY = 'onehome_pending_xaman_mint_claim';
  const MINT_WALLET_LINK_UUID_KEY = 'onehome_mint_wallet_link_uuid';
  const MINT_WALLET_LINK_URL_KEY = 'onehome_mint_wallet_link_url';
  const MINT_WALLET_LINK_STATE_KEY = 'onehome_mint_wallet_link_state_v1439';
  const MINT_WALLET_AUTO_PROVIDER_KEY = 'onehome_mint_wallet_auto_provider';
  const MINT_WALLET_MOBILE_RETURN_KEY = 'onehome_mint_wallet_mobile_return_v1437';
  const XAMAN_WALLET_RETURN_PARAM = 'xaman_wallet_payload';
  const PENDING_MINT_MAX_AGE_MS = 6 * 60 * 60 * 1000;
  const WALLET_LINK_MAX_AGE_MS = 15 * 60 * 1000;
  const RARE_ROUTES_SEASON1_CAMPAIGN_ID = 'e7a97a65-aec2-4d0e-9075-fb100b692fc7';
  const METAMASK_SDK_PATH='/assets/vendor/metamask-connect-multichain-1.2.0.js';
  const METAMASK_HANDOFF_PARAM='onehome_mm_handoff';
  const METAMASK_HANDOFF_TYPE_PARAM='onehome_mm_handoff_type';
  const METAMASK_BROWSER_PARAM='onehome_mm_browser';
  const METAMASK_QUANTITY_PARAM='onehome_mm_qty';
  const FALLBACK_EVM_NETWORKS={
    'avalanche-fuji':{"chain_key":"avalanche-fuji","display_name":"Avalanche Fuji","environment":"testnet","chain_id":43113,"chain_id_hex":"0xa869","native_symbol":"AVAX","explorer_url":"https://explorer-test.avax.network/c-chain","wallet_add_chain":{"chainId":"0xa869","chainName":"Avalanche Fuji C-Chain","nativeCurrency":{"name":"AVAX","symbol":"AVAX","decimals":18},"rpcUrls":["https://api.avax-test.network/ext/bc/C/rpc"],"blockExplorerUrls":["https://explorer-test.avax.network/c-chain"]}},
    'ethereum-sepolia':{chain_key:'ethereum-sepolia',display_name:'Ethereum Sepolia',chain_id:11155111,chain_id_hex:'0xaa36a7',native_symbol:'ETH',wallet_add_chain:{rpcUrls:['https://ethereum-sepolia-rpc.publicnode.com'],chainId:'0xaa36a7'}},
    'base-mainnet':{chain_key:'base-mainnet',display_name:'Base Mainnet',environment:'mainnet',chain_id:8453,chain_id_hex:'0x2105',native_symbol:'ETH',wallet_add_chain:{rpcUrls:['https://mainnet.base.org'],chainId:'0x2105',chainName:'Base',nativeCurrency:{name:'Ether',symbol:'ETH',decimals:18},blockExplorerUrls:['https://base.blockscout.com']}},
    'base-sepolia':{chain_key:'base-sepolia',display_name:'Base Sepolia',chain_id:84532,chain_id_hex:'0x14a34',native_symbol:'ETH',wallet_add_chain:{rpcUrls:['https://sepolia.base.org'],chainId:'0x14a34'}},
    'polygon-amoy':{chain_key:'polygon-amoy',display_name:'Polygon Amoy',chain_id:80002,chain_id_hex:'0x13882',native_symbol:'POL',wallet_add_chain:{rpcUrls:['https://polygon-amoy.drpc.org'],chainId:'0x13882'}},
    'optimism-sepolia':{chain_key:'optimism-sepolia',display_name:'OP Sepolia',chain_id:11155420,chain_id_hex:'0xaa37dc',native_symbol:'ETH',wallet_add_chain:{rpcUrls:['https://sepolia.optimism.io'],chainId:'0xaa37dc'}},
    'arbitrum-sepolia':{chain_key:'arbitrum-sepolia',display_name:'Arbitrum Sepolia',chain_id:421614,chain_id_hex:'0x66eee',native_symbol:'ETH',wallet_add_chain:{rpcUrls:['https://sepolia-rollup.arbitrum.io/rpc'],chainId:'0x66eee'}},
    'linea-sepolia':{chain_key:'linea-sepolia',display_name:'Linea Sepolia',chain_id:59141,chain_id_hex:'0xe705',native_symbol:'ETH',wallet_add_chain:{rpcUrls:['https://rpc.sepolia.linea.build'],chainId:'0xe705'}},
    'bsc-testnet':{chain_key:'bsc-testnet',display_name:'BNB Smart Chain Testnet',chain_id:97,chain_id_hex:'0x61',native_symbol:'tBNB',wallet_add_chain:{rpcUrls:['https://bsc-testnet-dataseed.bnbchain.org'],chainId:'0x61'}},
    'hedera-testnet':{chain_key:'hedera-testnet',display_name:'Hedera Testnet',chain_id:296,chain_id_hex:'0x128',native_symbol:'HBAR',wallet_add_chain:{rpcUrls:['https://testnet.hashio.io/api'],chainId:'0x128'}},
    'sei-atlantic-2':{chain_key:'sei-atlantic-2',display_name:'Sei Atlantic-2',chain_id:1328,chain_id_hex:'0x530',native_symbol:'SEI',wallet_add_chain:{rpcUrls:['https://evm-rpc-testnet.sei-apis.com'],chainId:'0x530'}}
  };
  let currentMint = null;
  // v14.67.133: short public Mint URLs (/m/<slug>) resolve to the same durable campaign UUID.
  let resolvedPublicMintSlug = '';
  let resolvedPublicMintCampaignId = '';
  let resolvedPublicMintNetwork = '';
  let resolvedPublicMintChainKey = '';
  let loadingPromise = null;
  let loadingKey = '';
  let loadingController = null;
  let loadSequence = 0;
  let mintPollTimer = null;
  let accessCheckPromise = null;
  let accessCheckKey = '';
  let accessResumeTimer = null;
  let mintActionActive = false;
  let selectedMintQuantity = 1;
  let selectedMintQuantityMax = 1;
  let xrplMintPriceSchedule = null;
  let xrplTierRefreshTimer = null;
  let xrplTierRefreshPromise = null;
  let lastMintError = '';
  let lastMintErrorAt = 0;
  let walletLinkBusy = false;
  let walletLinkPollTimer = null;
  let walletLinkWindow = null;
  // Keep the desktop Xaman signing window created from the collector's original
  // click so later items in a multi-mint can reuse the same allowed window.
  // Without this, item 2+ can be prepared successfully while the browser has
  // nowhere visible to surface the new Xaman signing request.
  let desktopXamanMintWindow = null;
  // v14.67.72: serialize batch advancement inside one browser context.
  // Mobile Xaman returns can race the background verifier; without this lock,
  // both paths can try to prepare the same next batch position.
  let batchContinuationPromise = null;
  let batchContinuationKey = '';
  // v14.67.75: continuation errors are never allowed to declare a durable
  // server batch paused on their own. One recovery timer reconciles the exact
  // active order after transient app-return/browser races.
  let batchRecoveryTimer = null;
  let batchRecoveryKey = '';
  let batchRecoveryAttempts = 0;
  // v14.67.76: one clean receiving-wallet surface inside the active mint card.
  // Passport wallet rows remain server-verified and browser SELECT-only.
  let linkedPassportWalletRows = [];
  let linkedPassportWalletUserId = '';
  let linkedPassportWalletLoadPromise = null;
  let mintWalletChooserOpen = false;
  let manualTestWalletOpen = false;
  // v14.67.104: a public mint never assumes a receiving wallet on entry.
  // The collector chooses the provider with the Mint button or optionally picks
  // an exact linked wallet from the compact wallet picker.
  let mintWalletSelectionCampaign = '';
  // v14.67.153: one chain-compatible wallet selector + one Mint action.
  let mintWalletProviderChoice = '';

  // Xaman completion is serialized in one browser context. A desktop return
  // bridge signal and a fallback verifier poll may arrive at nearly the same
  // time; both must reconcile the same payload only once.
  let xamanReturnPromise = null;
  let xamanReturnPromiseKey = '';
  let lastXamanReturnSignalPayload = '';
  let lastXamanReturnSignalAt = 0;
  let xamanReturnChannel = null;
  let walletLinkAutoMintProvider = '';
  let crossmarkRecoveryKey = '';
  let crossmarkRecoveryPromise = null;
  let evmCampaignMode=false;
  let evmMintState=null;
  let evmSdkPromise=null;
  const evmClientCache=new Map();
  let evmMintBusy=false;
  let evmActiveOrderId='';
  let evmTransactionHash='';
  let evmMetaMaskCapturedLink='';
  let evmMetaMaskLinkWaiters=[];

  function q(id){ return document.getElementById(id); }
  function rareRoutesMode(){
    try{
      if(new URLSearchParams(window.location.search).get('route')==='rare-routes') return true;
      return activeCampaignId()===RARE_ROUTES_SEASON1_CAMPAIGN_ID;
    }catch(_error){return false;}
  }
  function text(id,value){ const el=q(id); if(el) el.textContent=String(value ?? ''); }
  function showPage(id){
    const target = document.getElementById(id);
    if(target && target.classList.contains('page-view')){
      document.querySelectorAll('.page-view').forEach(function(page){
        page.classList.remove('active');
        page.setAttribute('aria-hidden','true');
      });
      target.hidden = false;
      target.removeAttribute('inert');
      target.removeAttribute('aria-hidden');
      target.style.removeProperty('display');
      target.style.removeProperty('visibility');
      target.classList.add('active');
      return;
    }
    if(typeof window.oneHomeV15Show === 'function') window.oneHomeV15Show(id);
    else if(typeof window.showPage === 'function') window.showPage(id);
  }

  function getSupabase(){
    if(window.doodProfileSupabase?.auth) return window.doodProfileSupabase;
    if(window.doodSupabase?.auth) return window.doodSupabase;
    if(window.supabaseClient?.auth) return window.supabaseClient;
    if(window.supabase?.createClient){
      window.oneHomePublicMintSupabase = window.oneHomePublicMintSupabase || window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY,window.OneHomeAuthStorage?.authOptions?window.OneHomeAuthStorage.authOptions({}):undefined);
      return window.oneHomePublicMintSupabase;
    }
    return null;
  }

  function activeMintSlug(){
    try{
      const match=String(window.location.pathname||'').match(/^\/m\/([a-z0-9-]{3,60})\/?$/i);
      return match?String(match[1]||'').trim().toLowerCase():'';
    }catch(_error){return '';}
  }

  function currentShortMintUrl(){
    const slug=String(resolvedPublicMintSlug||activeMintSlug()||'').trim().toLowerCase();
    return slug?window.location.origin+'/m/'+encodeURIComponent(slug):'';
  }

  async function resolvePublicMintSlug(slug){
    const clean=String(slug||'').trim().toLowerCase();
    if(!clean)return null;
    const sb=getSupabase();
    if(!sb)throw new Error('One Home could not load the Mint link resolver.');
    const {data,error}=await sb.rpc('onehome_resolve_mint_public_slug',{p_slug:clean});
    if(error)throw error;
    if(!data?.campaign_id)throw new Error('This Mint link was not found or is not public yet.');
    resolvedPublicMintCampaignId=String(data.campaign_id||'').trim();
    resolvedPublicMintSlug=String(data.public_slug||clean).trim().toLowerCase();
    resolvedPublicMintNetwork=String(data.network||'').trim().toLowerCase();
    resolvedPublicMintChainKey=String(data.chain_key||'').trim().toLowerCase();
    if(data.is_alias===true&&resolvedPublicMintSlug&&resolvedPublicMintSlug!==clean){
      try{window.history.replaceState({},'',`/m/${encodeURIComponent(resolvedPublicMintSlug)}`)}catch(_error){}
    }
    return data;
  }

  function rememberedMintCampaignId(){
    try{
      const value=String(sessionStorage.getItem(MINT_CAMPAIGN_KEY)||'').trim();
      return /^[0-9a-f-]{36}$/i.test(value)?value:'';
    }catch(_error){return '';}
  }

  async function recoverPublicMintSlugFromRememberedCampaign(slug){
    const clean=String(slug||'').trim().toLowerCase();
    const campaignId=rememberedMintCampaignId();
    if(!clean||!/^[0-9a-f-]{36}$/i.test(campaignId))return null;
    try{
      const sb=getSupabase();if(!sb)return null;
      const {data,error}=await sb.rpc('onehome_get_mint_public_link',{p_campaign_id:campaignId});
      if(error||!data?.public_slug)return null;
      const publicSlug=String(data.public_slug||'').trim().toLowerCase();
      if(publicSlug!==clean)return null;
      resolvedPublicMintCampaignId=campaignId;
      resolvedPublicMintSlug=publicSlug;
      resolvedPublicMintNetwork=String(data.network||resolvedPublicMintNetwork||'').trim().toLowerCase();
      resolvedPublicMintChainKey=String(data.chain_key||resolvedPublicMintChainKey||'').trim().toLowerCase();
      return {campaign_id:campaignId,public_slug:publicSlug,network:resolvedPublicMintNetwork,chain_key:resolvedPublicMintChainKey,recovered:true};
    }catch(_error){return null;}
  }

  async function resolvePublicMintSlugSafely(slug){
    const clean=String(slug||'').trim().toLowerCase();
    let lastError=null;
    for(let attempt=0;attempt<2;attempt+=1){
      try{return await resolvePublicMintSlug(clean);}
      catch(error){
        lastError=error;
        if(attempt===0)await new Promise(function(resolve){setTimeout(resolve,320);});
      }
    }
    const recovered=await recoverPublicMintSlugFromRememberedCampaign(clean);
    if(recovered)return recovered;
    throw lastError||new Error('This Mint link was not found or is not public yet.');
  }

  async function ensureShortMintLink(campaignId){
    const id=String(campaignId||'').trim();
    if(!/^[0-9a-f-]{36}$/i.test(id))return '';
    if(resolvedPublicMintCampaignId===id&&resolvedPublicMintSlug)return currentShortMintUrl();
    try{
      const sb=getSupabase();if(!sb)return '';
      const {data,error}=await sb.rpc('onehome_get_mint_public_link',{p_campaign_id:id});
      if(error||!data?.public_slug)return '';
      resolvedPublicMintCampaignId=id;
      resolvedPublicMintSlug=String(data.public_slug||'').trim().toLowerCase();
      if(!resolvedPublicMintNetwork)resolvedPublicMintNetwork=String(data.network||'').trim().toLowerCase();
      if(!resolvedPublicMintChainKey)resolvedPublicMintChainKey=String(data.chain_key||'').trim().toLowerCase();
      return currentShortMintUrl();
    }catch(_error){return '';}
  }

  function canonicalizeShortMintLocation(campaignId){
    const id=String(campaignId||'').trim();
    const shortUrl=currentShortMintUrl();
    if(!shortUrl||!/^[0-9a-f-]{36}$/i.test(id))return '';
    try{
      const legacy=String(window.location.pathname||'').match(/^\/mint\/([0-9a-f-]{36})(?:\/card-146762)?\/?$/i);
      if(!legacy||String(legacy[1]).toLowerCase()!==id.toLowerCase())return shortUrl;
      const next=new URL(shortUrl,window.location.origin);
      const current=new URL(window.location.href);
      current.searchParams.forEach(function(value,key){
        if(['campaign','network','chain','v','card','xcard'].includes(key))return;
        next.searchParams.append(key,value);
      });
      window.history.replaceState({},'',next.pathname+(next.search||'')+(next.hash||''));
      return next.toString();
    }catch(_error){return shortUrl;}
  }

  async function isAuthenticated(){
    try{
      const sb=getSupabase();
      if(!sb) return false;
      const local=await sb.auth.getSession();
      if(local?.data?.session?.user&&local?.data?.session?.access_token)return true;
      const result=await sb.auth.getUser();
      return Boolean(result?.data?.user && !result.error);
    }catch(_error){ return false; }
  }


  function mintSourceApi(){return window.OneHomeMintSource||null;}
  function mintSourceContext(){
    try{return mintSourceApi()?.capture(activeCampaignId())||null;}catch(_error){return null;}
  }
  function mintSourceUrl(url){
    try{return mintSourceApi()?.appendSource(url,activeCampaignId())||url;}catch(_error){return url;}
  }
  function mintShareUrl(){
    try{return mintSourceApi()?.currentMintShareUrl(activeCampaignId())||window.location.href;}catch(_error){return window.location.href;}
  }
  function mintDisplayName(){
    return String(evmMintState?.campaign?.name||currentMint?.campaign?.name||currentMint?.collection?.name||'this mint').trim()||'this mint';
  }

  const SOCIAL_CARD_VERSION='146762';
  function absoluteSocialUrl(value){
    const raw=String(value||'').trim();
    if(!raw)return '';
    try{return new URL(raw,window.location.origin).toString()}catch(_error){return raw}
  }
  function socialCardImageUrl(value){
    const campaignId=String(activeCampaignId()||'').trim();
    if(/^[0-9a-f-]{36}$/i.test(campaignId)){
      try{
        if(window.OneHomeMintSocialCard?.cardImageUrl)return window.OneHomeMintSocialCard.cardImageUrl(campaignId);
      }catch(_error){}
      return 'https://fshvettlltcujmwvikfq.supabase.co/functions/v1/onehome-mint-page/card/'+encodeURIComponent(campaignId)+'/146762.png';
    }
    return absoluteSocialUrl(value||DEFAULT_STANDARD_ART);
  }
  function upsertSocialMeta(kind,key,value){
    if(!value)return;
    let node=document.head.querySelector('meta['+kind+'="'+key.replace(/"/g,'\\"')+'"]');
    if(!node){node=document.createElement('meta');node.setAttribute(kind,key);document.head.appendChild(node)}
    node.setAttribute('content',String(value));
  }
  function isPlaceholderSocialArtwork(value){
    const raw=String(value||'').trim().toLowerCase();
    if(!raw)return true;
    return raw.includes('one-home-image-placeholder') || raw.includes('image-awaiting-replacement') || raw.includes('image_awaiting_replacement');
  }
  function firstRealSocialArtwork(values){
    for(const value of values){
      const raw=String(value||'').trim();
      if(raw&&!isPlaceholderSocialArtwork(raw))return raw;
    }
    return '';
  }
  const PUBLIC_COVER_LOAD_TOKEN=Date.now();
  function freshPublicCoverUrl(value){
    const raw=String(value||'').trim();
    if(!raw)return '';
    try{
      const url=new URL(raw,window.location.origin);
      url.searchParams.set('ohcover',String(PUBLIC_COVER_LOAD_TOKEN));
      return url.toString();
    }catch(_error){
      return raw+(raw.includes('?')?'&':'?')+'ohcover='+encodeURIComponent(String(PUBLIC_COVER_LOAD_TOKEN));
    }
  }
  const exactCollectionCoverCache=new Map();
  async function exactSavedCollectionCover(data){
    const collectionId=String(data?.campaign?.source_collection_id||data?.collection?.id||'').trim();
    if(!/^[0-9a-f-]{36}$/i.test(collectionId))return '';
    if(exactCollectionCoverCache.has(collectionId))return exactCollectionCoverCache.get(collectionId)||'';
    try{
      const sb=getSupabase();
      if(!sb)return '';
      const result=await sb.from('nft_collection_files')
        .select('storage_bucket,storage_path,file_name')
        .eq('collection_id',collectionId)
        .eq('file_role','cover')
        .eq('is_public',true)
        .limit(1);
      if(result.error)throw result.error;
      const row=Array.isArray(result.data)?result.data[0]:null;
      const path=String(row?.storage_path||'').trim();
      const cover=path?freshPublicCoverUrl(String(sb.storage.from(row?.storage_bucket||'nft-public').getPublicUrl(path)?.data?.publicUrl||'').trim()):'';
      exactCollectionCoverCache.set(collectionId,cover);
      return cover;
    }catch(error){
      console.warn('One Home saved collection cover',error);
      exactCollectionCoverCache.set(collectionId,'');
      return '';
    }
  }
  const canonicalCoverCache=new Map();
  async function canonicalMintCover(campaignId){
    const id=String(campaignId||'').trim();
    if(!/^[0-9a-f-]{36}$/i.test(id))return '';
    if(canonicalCoverCache.has(id))return canonicalCoverCache.get(id)||'';
    try{
      const response=await fetch(SUPABASE_URL+'/rest/v1/rpc/onehome_public_mint_cover',{
        method:'POST',
        headers:{'Content-Type':'application/json','apikey':SUPABASE_KEY},
        body:JSON.stringify({p_campaign_id:id})
      });
      const row=await response.json().catch(function(){return {}});
      const cover=response.ok?freshPublicCoverUrl(String(row?.cover_image_url||'').trim()):'';
      canonicalCoverCache.set(id,cover);
      return cover;
    }catch(error){console.warn('One Home canonical mint cover',error);canonicalCoverCache.set(id,'');return '';}
  }
  async function applyCanonicalMintCover(data,campaignId){
    const id=String(campaignId||data?.campaign?.id||activeCampaignId()||'').trim();
    const exactCover=await exactSavedCollectionCover(data);
    const cover=exactCover||await canonicalMintCover(id);
    if(!cover)return data;
    if(data&&typeof data==='object'){
      data.cover_image_url=cover;
      if(data.campaign&&typeof data.campaign==='object')data.campaign.cover_image_url=cover;
    }
    return data;
  }
  function updateMintSocialMetadata(data,mode){
    const campaign=data?.campaign||{};
    const collection=data?.collection||{};
    const name=String(campaign.name||collection.name||data?.name||mintDisplayName()||'One Home Mint').trim()||'One Home Mint';
    const description=String(campaign.description||collection.description||data?.description||'Mint this collectible on One Home.').replace(/\s+/g,' ').trim().slice(0,190)||'Mint this collectible on One Home.';
    // Canonical campaign cover is the One Home display/social source of truth.
    let art=firstRealSocialArtwork([
      campaign.cover_image_url,data?.cover_image_url,
      data?.artwork_url,
      campaign.share_image_url,data?.share_image_url,
      campaign.artwork_url,campaign.banner_url,
      collection.cover_image_url,collection.artwork_url,collection.banner_url
    ]);
    if(!art&&rareRoutesMode())art=DEFAULT_RARE_ROUTES_ART;
    if(!art)art=DEFAULT_STANDARD_ART;
    const image=socialCardImageUrl(art);
    const campaignId=String(campaign.id||activeCampaignId()||'').trim();
    let canonical=currentShortMintUrl()||window.location.origin+'/mint/'+encodeURIComponent(campaignId);
    try{
      const params=new URLSearchParams(window.location.search||'');
      if(params.get('xcard')===SOCIAL_CARD_VERSION)canonical+='?xcard='+SOCIAL_CARD_VERSION;
    }catch(_error){}
    const title=name+' | One Home';
    document.title=title;
    upsertSocialMeta('name','description',description);
    upsertSocialMeta('property','og:type','website');
    upsertSocialMeta('property','og:site_name','One Home');
    upsertSocialMeta('property','og:title',title);
    upsertSocialMeta('property','og:description',description);
    upsertSocialMeta('property','og:url',canonical);
    upsertSocialMeta('property','og:image',image);
    upsertSocialMeta('property','og:image:secure_url',image);
    upsertSocialMeta('property','og:image:type','image/png');
    upsertSocialMeta('property','og:image:width','1200');
    upsertSocialMeta('property','og:image:height','630');
    upsertSocialMeta('property','og:image:alt',name+' mint artwork');
    upsertSocialMeta('name','twitter:card','summary_large_image');
    upsertSocialMeta('name','twitter:title',title);
    upsertSocialMeta('name','twitter:description',description);
    upsertSocialMeta('name','twitter:image',image);
    upsertSocialMeta('name','twitter:image:alt',name+' mint artwork');
    let canonicalLink=document.head.querySelector('link[rel="canonical"]');
    if(!canonicalLink){canonicalLink=document.createElement('link');canonicalLink.setAttribute('rel','canonical');document.head.appendChild(canonicalLink)}
    canonicalLink.setAttribute('href',canonical);
    document.documentElement.dataset.onehomeSocialCardReady='1';
    document.documentElement.dataset.onehomeSocialCardVersion=SOCIAL_CARD_VERSION;
  }
  function mintResultTransactionHash(result){
    const candidates=[
      result?.transaction_hash,result?.tx_hash,result?.hash,
      result?.xrpl?.transaction_hash,result?.xrpl?.hash,
      result?.receipt?.transactionHash,result?.receipt?.transaction_hash,
      result?.transaction?.hash,result?.mint?.transaction_hash,
      evmTransactionHash
    ];
    for(const value of candidates){const raw=String(value||'').trim();if(/^(0x)?[0-9a-f]{64}$/i.test(raw))return raw;}
    return '';
  }
  async function recordMintAttribution(eventType,result){
    try{
      const campaignId=activeCampaignId();
      if(!/^[0-9a-f-]{36}$/i.test(campaignId))return null;
      const ctx=mintSourceContext();
      if(!ctx)return null;
      const sb=getSupabase();
      if(!sb)return null;
      const session=(await sb.auth.getSession())?.data?.session;
      if(!session?.user)return null;
      const chain=String(evmMintState?.network?.chain_key||requestedChain()||result?.chain_key||'').trim().toLowerCase();
      const network=String(currentMint?.campaign?.network||currentMint?.collection?.network||requestedNetwork()||result?.network||'').trim().toLowerCase();
      const transactionHash=mintResultTransactionHash(result||{});
      const metadata={
        campaign_name:mintDisplayName(),
        route:rareRoutesMode()?'rare-routes':'',
        order_id:String(result?.order_id||evmActiveOrderId||''),
        claim_id:String(result?.claim_id||result?.claim?.id||''),
        token_id:String(result?.token_id||result?.token_or_asset_id||result?.nftoken_id||''),
        wallet_provider:String(result?.wallet_provider||verifiedProvider()||''),
        page_path:window.location.pathname+window.location.search
      };
      const response=await sb.rpc('onehome_record_mint_attribution',{
        p_event_type:String(eventType||''),
        p_campaign_id:campaignId,
        p_source_channel:String(ctx.source||'direct'),
        p_source_detail:String(ctx.source_detail||''),
        p_visit_id:String(ctx.visit_id||''),
        p_transaction_hash:transactionHash||null,
        p_chain_key:chain||null,
        p_network:network||null,
        p_target_url:window.location.pathname+window.location.search,
        p_metadata:metadata
      });
      if(response?.error)throw response.error;
      return response?.data||null;
    }catch(error){
      console.warn('One Home mint source attribution skipped',error);
      return null;
    }
  }
  function openCampaignMintedNfts(){
    const campaignId=String(activeCampaignId()||currentMint?.campaign?.id||'').trim();
    if(!/^[0-9a-f-]{36}$/i.test(campaignId)) return;
    window.location.assign('/minted-nfts.html?campaign='+encodeURIComponent(campaignId));
  }

  async function shareCurrentMintToX(afterMint){
    const api=mintSourceApi();
    if(!api?.shareMintToX)return;
    const campaignId=String(activeCampaignId()||'').trim();
    let target=(await ensureShortMintLink(campaignId))||mintShareUrl();
    if(/^[0-9a-f-]{36}$/i.test(campaignId)&&!currentShortMintUrl()){
      try{
        const u=new URL(window.location.origin+'/mint/'+campaignId);
        const network=requestedNetwork()||String(currentMint?.campaign?.network||evmMintState?.campaign?.network||'').trim();
        const chain=String(evmMintState?.network?.chain_key||requestedChain()||'').trim();
        if(network)u.searchParams.set('network',network);
        if(chain)u.searchParams.set('chain',chain);
        if(rareRoutesMode())u.searchParams.set('route','rare-routes');
        u.searchParams.set('source','x');
        target=u.toString();
      }catch(_error){}
    }
    api.shareMintToX({name:mintDisplayName(),url:target,campaignId:campaignId,afterMint:afterMint===true});
  }

  async function loadCreatorMintSessionLimit(campaignId){
    const id=String(campaignId||'').trim();
    if(!/^[0-9a-f-]{36}$/i.test(id)) return 1;
    try{
      const sb=getSupabase();
      if(!sb) return 1;
      const {data,error}=await sb.rpc('public_mint_quantity_limit',{p_campaign_id:id});
      if(error) throw error;
      return Math.max(1,Math.min(MAX_MINT_SESSION_QUANTITY,Math.floor(Number(data)||1)));
    }catch(error){
      console.warn('One Home mint quantity setting',error);
      return 1;
    }
  }

  function activeCollectionId(){
    try{
      const params=new URLSearchParams(window.location.search);
      const query=String(params.get('collection') || '').trim();
      if(/^[0-9a-f-]{36}$/i.test(query)) return query;
      const match=String(window.location.hash || '').match(/#mint\/([0-9a-f-]{36})/i);
      if(match) return match[1];
      return sessionStorage.getItem(LEGACY_MINT_COLLECTION_KEY) || '';
    }catch(_error){ return ''; }
  }

  function activeCampaignId(){
    try{
      if(/^[0-9a-f-]{36}$/i.test(resolvedPublicMintCampaignId))return resolvedPublicMintCampaignId;
      const pathMatch=String(window.location.pathname || '').match(/^\/mint\/([0-9a-f-]{36})(?:\/card-146762)?\/?$/i);
      if(pathMatch) return pathMatch[1];
      const params=new URLSearchParams(window.location.search);
      const query=String(params.get('campaign') || '').trim();
      return /^[0-9a-f-]{36}$/i.test(query) ? query : '';
    }catch(_error){ return ''; }
  }

  function requestedNetwork(){
    try{
      const value=String(new URLSearchParams(window.location.search).get('network') || '').toLowerCase();
      if(value==='mainnet'||value==='testnet')return value;
      return resolvedPublicMintNetwork==='mainnet'?'mainnet':resolvedPublicMintNetwork==='testnet'?'testnet':'';
    }catch(_error){ return ''; }
  }

  function requestedChain(){
    try{
      const value=String(new URLSearchParams(window.location.search).get('chain') || '').trim().toLowerCase();
      if(value && value!=='xrpl')return value;
      return resolvedPublicMintChainKey && resolvedPublicMintChainKey!=='xrpl' ? resolvedPublicMintChainKey : '';
    }catch(_error){return '';}
  }

  function publicMintEvmChainKey(data){
    const campaign=data?.campaign||{};const collection=data?.collection||{};const settings=data?.settings||{};
    const values=[campaign.chain_key,campaign.chainKey,campaign.payment_chain_key,campaign.destination_chain_key,collection.chain_key,collection.chainKey,settings.chain_key,settings.chainKey].map(function(value){return String(value||'').trim().toLowerCase();}).filter(Boolean);
    return values.find(function(value){return value!=='xrpl'&&value!=='mainnet'&&value!=='testnet';})||'';
  }

  function publicMintLooksLikeEvm(data){
    const campaign=data?.campaign||{};const collection=data?.collection||{};const settings=data?.settings||{};const network=String(campaign.network||collection.network||'').trim().toLowerCase();
    if(publicMintEvmChainKey(data))return true;if(network&&network!=='testnet')return false;
    const addresses=[campaign.issuer_wallet,campaign.inventory_wallet,campaign.creator_wallet,settings.issuer_wallet,settings.inventory_wallet,settings.creator_wallet];
    return addresses.some(isEvmAddress);
  }

  function networkFromData(data){
    const supplied=data?.network||{};const key=String(supplied.chain_key||requestedChain()||'').trim().toLowerCase();const fallback=FALLBACK_EVM_NETWORKS[key]||{};const chainId=Number(supplied.chain_id||fallback.chain_id||0);const environment=String(supplied.environment||fallback.environment||'').trim().toLowerCase()||(key.endsWith('-mainnet')?'mainnet':'testnet');return {...fallback,...supplied,environment,chain_key:key||supplied.chain_key||'',chain_id:chainId,chain_id_hex:String(supplied.chain_id_hex||fallback.chain_id_hex||(chainId?`0x${chainId.toString(16)}`:'')),native_symbol:String(supplied.native_symbol||fallback.native_symbol||data?.mint?.native_symbol||'ETH'),wallet_add_chain:supplied.wallet_add_chain||fallback.wallet_add_chain||{}};
  }
  function evmNetworkIsMainnet(network){return String(network?.environment||'').toLowerCase()==='mainnet'||String(network?.chain_key||'').toLowerCase().endsWith('-mainnet');}

  function canonicalEvmMintUrl(campaignId,chainKey){
    const shortUrl=currentShortMintUrl();if(shortUrl&&String(campaignId||'')===String(activeCampaignId()||''))return shortUrl;
    const params=new URLSearchParams(window.location.search);params.delete('campaign');params.delete('network');params.delete('xaman_mint_payload');const key=String(chainKey||requestedChain()||'').trim().toLowerCase();if(key)params.set('chain',key);else params.delete('chain');params.set('v','146750');return mintSourceUrl(`/mint/${encodeURIComponent(campaignId)}?${params.toString()}`);
  }

  async function renderEvmCampaignById(campaignId){
    evmCampaignMode=true;rememberCampaign(campaignId);
    if(!(await isAuthenticated())){
      const network=networkFromData({network:FALLBACK_EVM_NETWORKS[requestedChain()]||{chain_key:requestedChain()}});const mainnet=evmNetworkIsMainnet(network);const name=network.display_name||(mainnet?'EVM Mainnet':'EVM Test Network');const guest={campaign:{id:campaignId,name:name+(mainnet?' Mint':' Test Mint'),description:'Sign in to One Home to view this EVM '+(mainnet?'mainnet':'test')+' campaign.',status:mainnet?'draft':'test'},network:network,mint:{price:'—',native_symbol:network.native_symbol||'ETH',remaining:1,max_supply:1},wallet:{verified:false,expected_from:''},buyer:{remaining_under_wallet_limit:1},open:false};await renderEvmMint(guest);return guest;
    }
    let data=await callEvmCampaign('status');if(String(data?.campaign?.id||'')!==campaignId)throw new Error('The requested EVM campaign did not match the One Home response.');data=await recoverEvmMintIfNeeded(data);await renderEvmMint(data);return data;
  }

  async function probeAuthenticatedEvmCampaign(campaignId){
    if(!(await isAuthenticated().catch(function(){return false;})))return null;try{let data=await callEvmCampaign('status');if(String(data?.campaign?.id||'')!==campaignId)return null;data=await recoverEvmMintIfNeeded(data);return data}catch(_error){return null}
  }

  function isTestMintPage(){
    const path=String(window.location.pathname || '').replace(/\/+$/,'');
    return path === '/test-mint.html' || window.ONEHOME_TEST_MINT_PAGE === true;
  }

  function rememberCollection(id){
    const value=String(id || '').trim();
    if(/^[0-9a-f-]{36}$/i.test(value)) sessionStorage.setItem(LEGACY_MINT_COLLECTION_KEY,value);
  }

  function rememberCampaign(id){
    const value=String(id || '').trim();
    if(/^[0-9a-f-]{36}$/i.test(value)) sessionStorage.setItem(MINT_CAMPAIGN_KEY,value);
  }
  function readStoredJson(key){
    try{
      const sessionValue=sessionStorage.getItem(key);
      if(sessionValue) return JSON.parse(sessionValue);
    }catch(_error){}
    try{
      const localValue=localStorage.getItem(key);
      if(localValue) return JSON.parse(localValue);
    }catch(_error){}
    return null;
  }

  function storeEligibility(value,founder){
    const key=founder?FOUNDER_ELIGIBILITY_KEY:STANDARD_ELIGIBILITY_KEY;
    try{ sessionStorage.setItem(key,JSON.stringify(value)); }catch(_error){}
    if(founder){ try{ localStorage.setItem(key,JSON.stringify(value)); }catch(_error){} }
  }
  function clearEligibility(founder){
    const keys=founder?[FOUNDER_ELIGIBILITY_KEY]:[STANDARD_ELIGIBILITY_KEY];
    keys.forEach(function(key){
      try{ sessionStorage.removeItem(key); }catch(_error){}
      if(founder){ try{ localStorage.removeItem(key); }catch(_error){} }
    });
  }
  function verifiedWallet(){
    try{
      if(isTestMintPage()){
        return String(sessionStorage.getItem(TEST_WALLET_KEY) || '').trim();
      }
      // Founder access keeps its existing verified-wallet behavior. Standard
      // public mints use a dedicated receiving-wallet selection so merely
      // choosing a mint destination cannot rewrite or inherit stale Passport UI
      // state from another page.
      if(currentMintIsFounder()){
        return String(sessionStorage.getItem(WALLET_KEY) || localStorage.getItem(WALLET_KEY) || '').trim();
      }
      return String(sessionStorage.getItem(MINT_RECEIVING_WALLET_KEY) || '').trim();
    }catch(_error){ return ''; }
  }
  function verifiedProvider(){
    try{
      if(isTestMintPage()) return String(sessionStorage.getItem(TEST_PROVIDER_KEY) || '').trim();
      if(currentMintIsFounder()){
        return String(sessionStorage.getItem(PROVIDER_KEY) || localStorage.getItem(PROVIDER_KEY) || '').trim();
      }
      return String(sessionStorage.getItem(MINT_RECEIVING_PROVIDER_KEY) || '').trim();
    }catch(_error){ return ''; }
  }

  function explicitMintReceivingSelection(){
    try{
      if(isTestMintPage()){
        return {
          wallet:String(sessionStorage.getItem(TEST_WALLET_KEY)||'').trim(),
          provider:String(sessionStorage.getItem(TEST_PROVIDER_KEY)||'').trim().toLowerCase()
        };
      }
      return {
        wallet:String(sessionStorage.getItem(MINT_RECEIVING_WALLET_KEY)||'').trim(),
        provider:String(sessionStorage.getItem(MINT_RECEIVING_PROVIDER_KEY)||'').trim().toLowerCase()
      };
    }catch(_error){return {wallet:'',provider:''};}
  }

  function clearMintReceivingSelection(){
    try{
      if(isTestMintPage()){
        sessionStorage.removeItem(TEST_WALLET_KEY);
        sessionStorage.removeItem(TEST_PROVIDER_KEY);
      }else{
        sessionStorage.removeItem(MINT_RECEIVING_WALLET_KEY);
        sessionStorage.removeItem(MINT_RECEIVING_PROVIDER_KEY);
      }
    }catch(_error){}
    clearEligibility(false);
  }

  function validXrplWallet(value){
    return /^r[1-9A-HJ-NP-Za-km-z]{24,34}$/.test(String(value || '').trim());
  }

  function normalizeXrplProvider(provider){
    const value=String(provider || '').trim().toLowerCase();
    return ['xaman','crossmark','joey'].includes(value) ? value : '';
  }

  function xrplProviderLabel(provider){
    const value=normalizeXrplProvider(provider);
    return value==='crossmark' ? 'Crossmark' : value==='joey' ? 'Joey Wallet' : 'Xaman';
  }

  function joeyMintAllowed(){
    if(isTestMintPage()) return false;
    const network=String(currentMint?.campaign?.network || currentMint?.collection?.network || requestedNetwork() || '').trim().toLowerCase();
    return network==='mainnet';
  }

  function shortXrplWallet(value){
    const wallet=String(value || '').trim();
    return wallet.length>16 ? wallet.slice(0,8)+'…'+wallet.slice(-6) : wallet;
  }

  function currentMintIsFounder(){
    return currentMint?.access_mode==='founder' || currentMint?.is_founder===true;
  }

  function readLastLinkedMintWallet(){
    try{
      const value=JSON.parse(localStorage.getItem(LAST_LINKED_MINT_WALLET_KEY)||'null');
      if(!validXrplWallet(value?.wallet_address)) return null;
      const provider=String(value?.provider||'').toLowerCase();
      if(!['xaman','crossmark','joey'].includes(provider)) return null;
      return {wallet_address:String(value.wallet_address),provider:provider};
    }catch(_error){return null;}
  }

  function rememberLastLinkedMintWallet(row){
    const wallet=String(row?.wallet_address||'').trim();
    const provider=String(row?.provider||'').toLowerCase();
    if(!validXrplWallet(wallet)||!['xaman','crossmark','joey'].includes(provider)) return;
    try{localStorage.setItem(LAST_LINKED_MINT_WALLET_KEY,JSON.stringify({wallet_address:wallet,provider:provider,saved_at:Date.now()}));}catch(_error){}
  }

  function usableLinkedWallet(row){
    const provider=String(row?.provider||'').toLowerCase();
    if(!validXrplWallet(row?.wallet_address)||!['xaman','crossmark','joey'].includes(provider)) return false;
    if(provider==='joey'&&!joeyMintAllowed()) return false;
    if(isMobileBrowser()&&provider==='crossmark') return false;
    return true;
  }

  function sortLinkedPassportWallets(rows){
    return (Array.isArray(rows)?rows:[]).filter(function(row){
      const provider=String(row?.provider||'').toLowerCase();
      return validXrplWallet(row?.wallet_address)&&['xaman','crossmark','joey'].includes(provider)&&(provider!=='joey'||joeyMintAllowed());
    }).sort(function(a,b){
      if(Boolean(a?.is_active)!==Boolean(b?.is_active)) return a?.is_active?-1:1;
      const bTime=Date.parse(String(b?.updated_at||b?.verified_at||''))||0;
      const aTime=Date.parse(String(a?.updated_at||a?.verified_at||''))||0;
      return bTime-aTime;
    });
  }

  async function loadLinkedPassportWallets(force){
    const sb=getSupabase();
    if(!sb) return [];
    let sessionResult=null;
    try{sessionResult=await sb.auth.getSession();}catch(_error){return [];}
    const user=sessionResult?.data?.session?.user;
    if(!user?.id) return [];
    if(!force&&linkedPassportWalletUserId===user.id&&linkedPassportWalletRows.length) return linkedPassportWalletRows.slice();
    if(linkedPassportWalletLoadPromise&&!force) return linkedPassportWalletLoadPromise;
    const work=(async function(){
      const result=await sb
        .from(PASSPORT_XRPL_WALLET_TABLE)
        .select('id,owner_user_id,provider,wallet_address,is_active,verified_at,updated_at')
        .eq('owner_user_id',user.id);
      if(result?.error) throw result.error;
      linkedPassportWalletRows=sortLinkedPassportWallets(result?.data||[]);
      linkedPassportWalletUserId=user.id;
      return linkedPassportWalletRows.slice();
    })();
    linkedPassportWalletLoadPromise=work;
    try{return await work;}catch(error){
      console.warn('One Home Passport receiving-wallet lookup',error);
      linkedPassportWalletRows=[];
      linkedPassportWalletUserId=user.id;
      return [];
    }finally{
      if(linkedPassportWalletLoadPromise===work) linkedPassportWalletLoadPromise=null;
    }
  }

  function preferredLinkedPassportWallet(rows){
    const usable=(Array.isArray(rows)?rows:[]).filter(usableLinkedWallet);
    if(!usable.length) return null;
    const last=readLastLinkedMintWallet();
    if(last){
      const recent=usable.find(function(row){
        return String(row.wallet_address).toLowerCase()===String(last.wallet_address).toLowerCase() && String(row.provider).toLowerCase()===last.provider;
      });
      if(recent) return recent;
    }
    return usable.find(function(row){return row?.is_active===true;}) || usable[0] || null;
  }

  function selectedLinkedPassportWallet(rows){
    const wallet=verifiedWallet();
    const provider=String(verifiedProvider()||'').toLowerCase();
    if(!validXrplWallet(wallet)||!['xaman','crossmark','joey'].includes(provider)) return null;
    return (Array.isArray(rows)?rows:[]).find(function(row){
      return String(row?.wallet_address||'').toLowerCase()===wallet.toLowerCase() && String(row?.provider||'').toLowerCase()===provider;
    }) || null;
  }

  function applyMintWalletSelection(wallet,provider,linked){
    const address=String(wallet||'').trim();
    const walletProvider=String(provider||'').toLowerCase();
    if(!validXrplWallet(address)) throw new Error('The receiving wallet address is invalid.');
    if(walletProvider&&!['xaman','crossmark','joey'].includes(walletProvider)) throw new Error('The wallet provider is invalid.');
    try{
      if(isTestMintPage()){
        sessionStorage.setItem(TEST_WALLET_KEY,address);
        if(walletProvider) sessionStorage.setItem(TEST_PROVIDER_KEY,walletProvider);
        else sessionStorage.removeItem(TEST_PROVIDER_KEY);
      }else{
        // A receiving-wallet choice belongs to this minting browser session.
        // Selecting a wallet here must not rewrite the Passport's global
        // active-wallet preference or its legacy browser mirror.
        sessionStorage.setItem(MINT_RECEIVING_WALLET_KEY,address);
        if(walletProvider) sessionStorage.setItem(MINT_RECEIVING_PROVIDER_KEY,walletProvider);
        else sessionStorage.removeItem(MINT_RECEIVING_PROVIDER_KEY);
      }
    }catch(_error){}
    clearEligibility(false);
    if(linked) rememberLastLinkedMintWallet({wallet_address:address,provider:walletProvider});
  }

  async function ensureInitialMintWalletSelection(){
    if(evmCampaignMode||currentMintIsFounder()) return [];
    const flow=mintFlowUiLockState();
    if(flow.locked) return linkedPassportWalletRows.slice();
    const rows=await loadLinkedPassportWallets(false);
    const campaignId=String(activeCampaignId()||currentMint?.campaign?.id||'').trim();

    // On first entry to each public XRPL mint, deliberately begin with no
    // receiving wallet selected. Do not inherit the Passport primary wallet,
    // the last mint wallet, or a stale choice from another mint.
    if(mintWalletSelectionCampaign!==campaignId){
      mintWalletSelectionCampaign=campaignId;
      clearMintReceivingSelection();
      mintWalletProviderChoice='';
      mintWalletChooserOpen=false;
      manualTestWalletOpen=false;
    }

    return rows;
  }

  function providerSortRank(provider){
    return ({xaman:0,crossmark:1,joey:2})[String(provider||'').toLowerCase()] ?? 99;
  }

  function simplePublicXrplUi(){
    return !isTestMintPage() && !currentMintIsFounder() && !rareRoutesMode() && !evmCampaignMode;
  }

  function ensureMintWalletChooserUi(){
    let panel=q('onehomeMintWalletChoice');
    const wantedMode=simplePublicXrplUi()?'unified':'legacy';
    if(panel && panel.dataset.mode===wantedMode) return panel;
    if(panel) panel.remove();

    const actions=document.querySelector('#onehomeFounderMintPage .founder-mint-actions');
    if(!actions?.parentNode) return null;

    if(!q('onehomeMintWalletChoiceStyles')){
      const style=document.createElement('style');
      style.id='onehomeMintWalletChoiceStyles';
      style.textContent=`
#onehomeFounderMintPage .onehome-mint-wallet-choice{margin:0 0 10px;padding:0;border:0;background:transparent;font-family:inherit}
#onehomeFounderMintPage .onehome-mint-wallet-simple-row{display:block}
#onehomeFounderMintPage .onehome-mint-wallet-field{display:grid;gap:5px;min-width:0}
#onehomeFounderMintPage .onehome-mint-wallet-field label{color:#d9d1c8;font-size:9px;font-weight:900;letter-spacing:.14em;text-transform:uppercase}
#onehomeFounderMintPage .onehome-mint-wallet-field select{width:100%;box-sizing:border-box;min-height:46px;border:1px solid rgba(255,255,255,.22);border-radius:8px;background:#090b0b;color:#fff;padding:9px 38px 9px 11px;font:800 12px/1.25 inherit}
#onehomeFounderMintPage .onehome-mint-wallet-hint{margin-top:5px;color:#a99f94;font-size:9px;line-height:1.35}
#onehomeFounderMintPage .onehome-mint-wallet-steps{margin-top:1px;padding:8px 10px;border-left:2px solid rgba(226,18,26,.75);background:rgba(255,255,255,.025);color:#cfc7bf;font-size:9px;line-height:1.5}
#onehomeFounderMintPage .onehome-mint-wallet-steps strong{color:#fff}
html.onehome-simple-public-mint.onehome-xrpl-public-mint #onehomeFounderMintPage .onehome-mint-wallet-choice{display:grid;gap:8px}
html.onehome-simple-public-mint.onehome-xrpl-public-mint #onehomeFounderMintPage .onehome-mint-primary{width:100%;min-height:46px;border:1px solid rgba(255,255,255,.28);border-radius:8px;background:#e2121a;color:#fff;font:1000 12px/1 inherit;letter-spacing:.12em;text-transform:uppercase;cursor:pointer}
html.onehome-simple-public-mint.onehome-xrpl-public-mint #onehomeFounderMintPage .onehome-mint-primary:disabled{opacity:.4;cursor:not-allowed}
#onehomeFounderMintPage .onehome-xaman-direct-link{display:flex;align-items:center;justify-content:center;text-decoration:none;box-sizing:border-box}
#onehomeFounderMintPage .onehome-xaman-direct-link[hidden]{display:none!important}
html.onehome-simple-public-mint.onehome-xrpl-public-mint #onehomeFounderMintPage .onehome-mint-entitlement{border:1px solid rgba(255,255,255,.16);border-radius:8px;background:rgba(255,255,255,.045);padding:9px 10px;color:#fff;font-size:10px;font-weight:900;line-height:1.45;letter-spacing:.02em}
html.onehome-simple-public-mint.onehome-xrpl-public-mint #onehomeFounderMintPage .founder-mint-actions{display:none!important}
html.onehome-simple-public-mint.onehome-xrpl-public-mint #onehomeFounderMintPage .founder-mint-fineprint{display:none!important}
html.onehome-simple-public-mint.onehome-xrpl-public-mint #onehomeFounderMintPage .founder-payment-note{display:none!important}
html.onehome-simple-public-mint.onehome-xrpl-public-mint #onehomeFounderMintPage .founder-includes{display:none!important}
html.onehome-simple-public-mint.onehome-xrpl-public-mint #onehomeFounderMintPage .founder-mint-details>.founder-mint-intro{display:none!important}
html.onehome-simple-public-mint.onehome-xrpl-public-mint #onehomeFounderMintPage .founder-mint-art>.founder-mint-intro{display:block!important;margin:10px 0 0;color:#d6d0c9;font-size:11px;line-height:1.45}
html.onehome-simple-public-mint.onehome-xrpl-public-mint #onehomeFounderMintPage .onehome-mint-progress{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:4px;margin:8px 0 4px}
html.onehome-simple-public-mint.onehome-xrpl-public-mint #onehomeFounderMintPage .onehome-mint-progress span{position:relative;padding-top:9px;text-align:center;color:#8e8983;font-size:7px;font-weight:1000;letter-spacing:.08em;text-transform:uppercase}
html.onehome-simple-public-mint.onehome-xrpl-public-mint #onehomeFounderMintPage .onehome-mint-progress span:before{content:"";position:absolute;top:0;left:0;right:0;height:4px;border-radius:999px;background:rgba(255,255,255,.12)}
html.onehome-simple-public-mint.onehome-xrpl-public-mint #onehomeFounderMintPage .onehome-mint-progress span.is-done,html.onehome-simple-public-mint.onehome-xrpl-public-mint #onehomeFounderMintPage .onehome-mint-progress span.is-active{color:#fff}
html.onehome-simple-public-mint.onehome-xrpl-public-mint #onehomeFounderMintPage .onehome-mint-progress span.is-done:before,html.onehome-simple-public-mint.onehome-xrpl-public-mint #onehomeFounderMintPage .onehome-mint-progress span.is-active:before{background:#e2121a}
html.onehome-simple-public-mint.onehome-xrpl-public-mint #onehomeFounderMintPage .founder-mint-status{margin-top:4px!important;padding:7px 9px!important;min-height:0!important}
html.onehome-simple-public-mint.onehome-xrpl-public-mint #onehomeFounderMintPage .founder-mint-status span{display:none!important}
html.onehome-simple-public-mint.onehome-xrpl-public-mint #onehomeFounderMintPage .founder-mint-status strong{font-size:9px!important;letter-spacing:.08em!important}
html.onehome-simple-public-mint.onehome-xrpl-public-mint #onehomeFounderMintPage .founder-mint-status.is-attention span{display:block!important;margin-top:4px!important;font-size:9px!important;line-height:1.35!important}
`;
      document.head.appendChild(style);
    }

    panel=document.createElement('section');
    panel.id='onehomeMintWalletChoice';
    panel.className='onehome-mint-wallet-choice';
    panel.dataset.mode=wantedMode;
    panel.hidden=true;

    if(wantedMode==='unified'){
      panel.innerHTML=
        '<div class="onehome-mint-wallet-field">'+
          '<label for="onehomeMintWalletSelect">Choose your XRP wallet</label>'+
          '<select id="onehomeMintWalletSelect" aria-label="Choose your XRP wallet"><option value="">Choose your XRP wallet</option></select>'+
        '</div>'+
        '<div class="onehome-mint-entitlement" id="onehomeMintEntitlement" hidden></div>'+
        '<button class="onehome-mint-primary" id="onehomeMintPrimaryBtn" type="button" disabled>MINT</button>'+
        '<a class="onehome-mint-primary onehome-xaman-direct-link" id="onehomeMintXamanDirectLink" href="" hidden>OPEN XAMAN</a>'+
        '<div class="onehome-mint-wallet-hint onehome-mint-wallet-steps"><strong>How it works:</strong> Choose the exact XRP wallet → tap MINT → when the request is ready, tap OPEN XAMAN → approve the NFT transaction → return to One Home. Your NFT is delivered directly to that wallet; there is no extra claim step.</div>';
    }else{
      panel.innerHTML=
        '<div class="onehome-mint-wallet-simple-row">'+
          '<div class="onehome-mint-wallet-field">'+
            '<label for="onehomeMintWalletSelect">Optional linked wallet</label>'+
            '<select id="onehomeMintWalletSelect" aria-label="Optional linked wallet">'+
              '<option value="">Choose in wallet app</option>'+
            '</select>'+
          '</div>'+
        '</div>'+
        '<div class="onehome-mint-wallet-hint">Optional. Leave this blank and choose Xaman, Crossmark, or Joey Wallet below.</div>';
    }

    actions.parentNode.insertBefore(panel,actions);

    panel.addEventListener('change',async function(event){
      if(event.target?.id!=='onehomeMintWalletSelect') return;
      const value=String(event.target.value||'');
      clearPreparedMobileXamanLaunch();
      if(panel.dataset.mode==='legacy'){
        if(!value){
          clearMintReceivingSelection();
          if(currentMint) await renderMint(currentMint);
          return;
        }
        const row=linkedPassportWalletRows.find(function(item){return String(item?.id||'')===value;});
        if(!row) return;
        applyMintWalletSelection(row.wallet_address,row.provider,true);
        if(currentMint) await renderMint(currentMint);
        return;
      }

      mintWalletProviderChoice='';
      clearMintReceivingSelection();
      renderMintEntitlement(null);
      if(!value){
        updateUnifiedMintButton(true);
        return;
      }
      if(value.startsWith('wallet:')){
        const rowId=value.slice(7);
        const row=linkedPassportWalletRows.find(function(item){return String(item?.id||'')===rowId;});
        if(!row||!usableLinkedWallet(row)) return;
        // A collector choosing an already-linked wallet must never be hijacked
        // by an older unfinished Xaman profile-wallet SignIn. Linked-wallet
        // mints go straight to the NFT transaction path.
        clearMintWalletLinkState();
        clearWalletLinkAutoProvider();
        clearMobileXamanReturnState();
        applyMintWalletSelection(row.wallet_address,row.provider,true);
        const status=q('founderMintStatus');
        if(status){status.hidden=false;status.classList.add('is-preparing');status.innerHTML='<strong>CHECKING THIS WALLET</strong><span>One Home is checking its mint limit and Allow List allocation before anything opens in your wallet app.</span>';}
        try{
          const eligibility=await verifyMintAccess(currentMint,true);
          renderMintEntitlement(eligibility?.allow_list||null);
          if(currentMint) await renderMint(currentMint);
        }catch(error){
          console.warn('One Home linked wallet eligibility',error);
          if(status){status.classList.remove('is-preparing');status.innerHTML='<strong>WALLET CHECK NEEDS ATTENTION</strong><span>'+collectorMintError(error)+'</span>';}
          updateUnifiedMintButton(false);
        }
        return;
      }
      if(value.startsWith('provider:')){
        const provider=normalizeXrplProvider(value.slice(9));
        if(!provider) return;
        mintWalletProviderChoice=provider;
        updateUnifiedMintButton(true);
      }
    });

    q('onehomeMintPrimaryBtn')?.addEventListener('click',async function(){
      if(mintActionActive||walletLinkBusy) return;
      const select=q('onehomeMintWalletSelect');
      const value=String(select?.value||'');
      if(!value) return;
      if(value.startsWith('wallet:')){
        const rowId=value.slice(7);
        const row=linkedPassportWalletRows.find(function(item){return String(item?.id||'')===rowId;});
        if(!row||!usableLinkedWallet(row)) return;
        clearMintWalletLinkState();
        clearWalletLinkAutoProvider();
        clearMobileXamanReturnState();
        applyMintWalletSelection(row.wallet_address,row.provider,true);
        await start(row.provider,{skipProviderReconnect:true,expectedWallet:String(row.wallet_address||'')});
        return;
      }
      const provider=normalizeXrplProvider(value.replace(/^provider:/,''));
      if(provider) await handleXrplMintWalletButton(provider);
    });

    return panel;
  }

  function activeXrplTierSchedule(){
    const schedule=xrplMintPriceSchedule&&typeof xrplMintPriceSchedule==='object'?xrplMintPriceSchedule:null;
    const tiers=Array.isArray(schedule?.tiers)?schedule.tiers:[];
    return schedule?.available===true&&tiers.length>1?schedule:null;
  }

  function xrplTierScheduleText(){
    const schedule=activeXrplTierSchedule();
    if(!schedule) return '';
    return schedule.tiers.map(function(row){return 'mints '+Number(row.start_position)+'–'+Number(row.end_position)+' = '+Number(row.price)+' '+String(row.currency_code||schedule.currency_code||'XRP');}).join(' · ');
  }

  async function loadXrplMintPriceSchedule(campaignId){
    const id=String(campaignId||'').trim();
    if(!id) return null;
    const sb=getSupabase();
    if(!sb) return null;
    const result=await sb.rpc('onehome_public_mint_price_tiers',{p_campaign_id:id});
    if(result?.error) throw result.error;
    return result?.data&&typeof result.data==='object'?result.data:null;
  }

  function currentXrplPublicPrice(fallback){
    const schedule=activeXrplTierSchedule();
    const next=Number(schedule?.next_public_price);
    return Number.isFinite(next)&&next>=0?next:Number(fallback||0);
  }

  async function refreshXrplTierPriceDisplay(force){
    if(evmCampaignMode||isTestMintPage()||currentMintIsFounder()||!currentMint?.campaign?.id) return xrplMintPriceSchedule;
    if(xrplTierRefreshPromise&&!force) return xrplTierRefreshPromise;
    const work=(async function(){
      try{
        const latest=await loadXrplMintPriceSchedule(currentMint.campaign.id);
        if(latest&&typeof latest==='object') xrplMintPriceSchedule=latest;
        const nextPrice=currentXrplPublicPrice(currentMint?.settings?.price);
        const currency=String(currentMint?.settings?.currency||'XRP');
        const schedule=activeXrplTierSchedule();
        text('founderMintPrice',nextPrice+' '+currency+(schedule?' · MINT #'+Number(schedule.next_position||1):''));
        const eligibility=eligibilityFor(currentMint,ACCESS_CACHE_MS);
        if(validXrplWallet(verifiedWallet())) renderMintEntitlement(eligibility?.allow_list||null);
        ensureMintQuantityControl(currentMint);
        return latest;
      }catch(error){
        console.warn('One Home live XRPL tier price refresh',error);
        return xrplMintPriceSchedule;
      }finally{
        if(xrplTierRefreshPromise===work) xrplTierRefreshPromise=null;
      }
    })();
    xrplTierRefreshPromise=work;
    return work;
  }

  function scheduleXrplTierPriceRefresh(){
    if(xrplTierRefreshTimer) clearTimeout(xrplTierRefreshTimer);
    xrplTierRefreshTimer=setTimeout(async function tick(){
      if(document.visibilityState!=='hidden'&&!mintActionActive&&!pendingMintForCurrentContext()?.claim_id&&!readBatchMint()?.order_id){
        await refreshXrplTierPriceDisplay(false);
      }
      xrplTierRefreshTimer=setTimeout(tick,8000);
    },8000);
  }

  function renderMintEntitlement(entitlement){
    const box=q('onehomeMintEntitlement');
    if(!box) return;
    const data=entitlement&&typeof entitlement==='object'?entitlement:null;
    if(!data){box.hidden=true;box.textContent='';return;}
    const currency=String(data.currency_code||currentMint?.settings?.currency||'XRP');
    const scheduledPrice=currentXrplPublicPrice(data.public_price);
    const publicPrice=Number(scheduledPrice);
    if(data.on_allow_list!==true){
      const schedule=activeXrplTierSchedule();box.textContent='PUBLIC MINT'+(Number.isFinite(publicPrice)?' · '+publicPrice+' '+currency:'')+(schedule?' · NEXT MINT #'+Number(schedule.next_position||1):'');
      box.hidden=false;
      return;
    }
    const parts=['ALLOW LIST'];
    const free=Math.max(0,Number(data.free_remaining)||0);
    const discount=Math.max(0,Number(data.discount_remaining)||0);
    if(free) parts.push(free+' FREE MINT'+(free===1?'':'S'));
    if(discount){
      const price=Number(data.discounted_price);
      parts.push(discount+' DISCOUNT MINT'+(discount===1?'':'S')+(Number.isFinite(price)?' @ '+price+' '+currency:''));
    }
    if(!free&&!discount) parts.push('ALLOCATION USED');
    if(Number.isFinite(publicPrice)) parts.push('PUBLIC '+publicPrice+' '+currency+(activeXrplTierSchedule()?' · NEXT #'+Number(activeXrplTierSchedule().next_position||1):''));
    box.textContent=parts.join(' · ');
    box.hidden=false;
  }

  function clearPreparedMobileXamanLaunch(){
    const action=q('onehomeMintXamanDirectLink');
    const button=q('onehomeMintPrimaryBtn');
    if(action){
      action.hidden=true;
      action.removeAttribute('href');
      action.removeAttribute('data-payload-uuid');
      action.textContent='OPEN XAMAN';
    }
    if(button) button.hidden=false;
  }

  function armPreparedMobileXamanLaunch(signUrl,payloadUuid,activeBatch){
    const url=String(signUrl||'').trim();
    const action=q('onehomeMintXamanDirectLink');
    const button=q('onehomeMintPrimaryBtn');
    const panel=q('onehomeMintWalletChoice');
    if(!url||!action||!button||!simplePublicXrplUi()||!isMobileBrowser()) return false;
    action.href=url;
    action.target='_self';
    action.rel='external';
    action.hidden=false;
    if(payloadUuid) action.dataset.payloadUuid=String(payloadUuid);
    action.textContent=activeBatch
      ? 'OPEN XAMAN · '+String(activeBatch.position)+' OF '+String(activeBatch.quantity)
      : 'OPEN XAMAN';
    button.hidden=true;
    setQuantityControlsEnabled(false);
    // This is intentionally a real href on a collector-tapped control. Xaman's
    // browser guidance warns that mobile deeplinks may be blocked after an async
    // chain; a fresh explicit tap on payload.next.always is the supported path.
    // Keep the exact pending request persisted before Safari leaves so any iOS
    // restored tab can resume the SAME UUID instead of creating another claim.
    try{
      action.onclick=function(){
        // Record only the exact prepared UUID attached to this tapped link.
        // Never infer a launch from whichever pending record happens to be in
        // storage after Safari has had time to restore/duplicate a tab.
        if(payloadUuid) markPreparedXamanLaunch(String(payloadUuid));
        const status=q('founderMintStatus');
        if(status){status.classList.add('is-preparing');status.innerHTML='<strong>OPENING XAMAN</strong><span>Approve this exact prepared request in Xaman. If Safari remains visible, tap OPEN XAMAN again; One Home will not create another claim.</span>';}
        try{updateMintProgressBar('APPROVE IN XAMAN');}catch(_error){}
        // Do not preventDefault: Safari should process the anchor as an actual
        // user-invoked Universal Link rather than a delayed script redirect.
      };
    }catch(_error){}
    try{requestAnimationFrame(function(){if(!panel?.hidden) action.scrollIntoView({block:'center',behavior:'smooth'});});}catch(_error){}
    return true;
  }

  function presentPreparedMobileXaman(signUrl,payloadUuid,activeBatch,message){
    const url=String(signUrl||'').trim();
    if(!url||!isMobileBrowser()||!simplePublicXrplUi()) return false;
    const armed=armPreparedMobileXamanLaunch(url,String(payloadUuid||''),activeBatch||null);
    const status=q('founderMintStatus');
    if(status){
      status.classList.remove('is-preparing');
      status.innerHTML='<strong>XAMAN REQUEST READY</strong><span>'+htmlEscape(message || 'Tap OPEN XAMAN above to approve this exact reserved NFT. Do not start another mint.')+'</span>';
    }
    try{updateMintProgressBar('XAMAN REQUEST READY');}catch(_error){}
    if(!armed){
      showMintXamanLaunch(url,message || 'Your exact Xaman request is ready. Tap Open Xaman to approve it.');
    }
    return armed;
  }

  function updateUnifiedMintButton(enabled){
    const button=q('onehomeMintPrimaryBtn');
    const select=q('onehomeMintWalletSelect');
    if(!button) return;
    const direct=q('onehomeMintXamanDirectLink');
    if(direct && direct.hidden===false && direct.getAttribute('href')){button.hidden=true;return;}
    const hasChoice=Boolean(String(select?.value||''));
    button.textContent=selectedMintQuantity>1?'MINT '+selectedMintQuantity+' NFTS':'MINT';
    button.disabled=!Boolean(enabled)||!hasChoice||mintActionActive||walletLinkBusy;
    button.setAttribute('aria-disabled',String(button.disabled));
  }

  function hideMintWalletChooser(){
    const panel=q('onehomeMintWalletChoice');
    if(panel) panel.hidden=true;
    renderMintEntitlement(null);
  }

  async function renderMintWalletChooser(){
    if(evmCampaignMode||currentMintIsFounder()){
      hideMintWalletChooser();
      return;
    }

    const authenticated=await isAuthenticated();
    const flow=mintFlowUiLockState();
    const panel=ensureMintWalletChooserUi();

    if(!panel||!authenticated||flow.locked){
      if(panel) panel.hidden=true;
      return;
    }

    const rows=await loadLinkedPassportWallets(false);
    const selected=selectedLinkedPassportWallet(rows);
    const select=q('onehomeMintWalletSelect');
    panel.hidden=false;

    if(panel.dataset.mode==='legacy'){
      if(select){
        const options=['<option value="">Choose in wallet app</option>'];
        for(const row of rows){
          const rowProvider=String(row?.provider||'').toLowerCase();
          if(isMobileBrowser()&&rowProvider==='crossmark') continue;
          options.push('<option value="'+htmlEscape(row.id||'')+'">'+htmlEscape(xrplProviderLabel(rowProvider)+' · '+shortXrplWallet(row.wallet_address))+'</option>');
        }
        select.innerHTML=options.join('');
        select.value=selected?String(selected.id||''):'';
      }
      return;
    }

    const ordered=rows.slice().sort(function(a,b){
      const providerDiff=providerSortRank(a?.provider)-providerSortRank(b?.provider);
      if(providerDiff) return providerDiff;
      return String(a?.wallet_address||'').localeCompare(String(b?.wallet_address||''));
    });
    if(select){
      const options=['<option value="">Choose your XRP wallet</option>'];
      for(const row of ordered){
        const rowProvider=normalizeXrplProvider(row?.provider);
        if(!rowProvider||!usableLinkedWallet(row)) continue;
        if(isMobileBrowser()&&rowProvider==='crossmark') continue;
        if(rowProvider==='joey'&&!joeyMintAllowed()) continue;
        const primary=row?.is_active===true?' · Primary':'';
        options.push('<option value="wallet:'+htmlEscape(String(row.id||''))+'">'+htmlEscape(xrplProviderLabel(rowProvider)+' · '+shortXrplWallet(row.wallet_address)+primary)+'</option>');
      }
      options.push('<option value="provider:xaman">Use another Xaman wallet…</option>');
      if(!isMobileBrowser()) options.push('<option value="provider:crossmark">Use another Crossmark wallet…</option>');
      if(joeyMintAllowed()) options.push('<option value="provider:joey">Use another Joey Wallet…</option>');
      select.innerHTML=options.join('');
      select.value=selected ? 'wallet:'+String(selected.id||'') : (mintWalletProviderChoice ? 'provider:'+mintWalletProviderChoice : '');
    }
    const eligibility=eligibilityFor(currentMint,ACCESS_CACHE_MS);
    if(validXrplWallet(verifiedWallet())) renderMintEntitlement(eligibility?.allow_list||null);
    else renderMintEntitlement(null);
    updateUnifiedMintButton(Boolean(currentMint?.claim_ready));
  }

  function selectedProviderLock(){
    const wallet=verifiedWallet();
    const provider=String(verifiedProvider()||'').toLowerCase();
    if(!validXrplWallet(wallet)||!['xaman','crossmark','joey'].includes(provider)) return '';
    return provider;
  }

  function walletProviderNeedsConnection(provider){
    const requested=normalizeXrplProvider(provider)||'xaman';
    const wallet=verifiedWallet();
    const selectedProvider=String(verifiedProvider() || '').toLowerCase();
    // A manually entered Testnet address has no provider lock; the collector may
    // open either supported wallet and the XRPL transaction itself proves control.
    if(isTestMintPage()&&validXrplWallet(wallet)&&!selectedProvider) return false;
    return !validXrplWallet(wallet) || selectedProvider!==requested;
  }


  async function restoreLinkedPassportWallet(provider){
    const requested=normalizeXrplProvider(provider)||'xaman';
    try{
      const rows=await loadLinkedPassportWallets(true);
      const current=verifiedWallet();
      const exact=rows.find(function(row){
        return usableLinkedWallet(row) && String(row.provider).toLowerCase()===requested && String(row.wallet_address).toLowerCase()===String(current).toLowerCase();
      });
      const preferred=exact || rows.filter(function(row){return usableLinkedWallet(row)&&String(row.provider).toLowerCase()===requested;}).sort(function(a,b){
        if(Boolean(a?.is_active)!==Boolean(b?.is_active)) return a?.is_active?-1:1;
        return (Date.parse(String(b?.updated_at||b?.verified_at||''))||0)-(Date.parse(String(a?.updated_at||a?.verified_at||''))||0);
      })[0];
      if(!preferred) return '';
      applyMintWalletSelection(preferred.wallet_address,preferred.provider,true);
      return String(preferred.wallet_address||'').trim();
    }catch(error){
      console.warn('One Home Passport wallet restore',error);
      return '';
    }
  }

  async function startJoeyFromWalletButton(){
    if(walletLinkBusy||mintActionActive)return;
    const status=q('founderMintStatus');
    if(!joeyMintAllowed()){
      if(status)status.innerHTML='<strong>JOEY WALLET USES XRP LEDGER MAINNET</strong><span>Choose Joey Wallet from a Mainnet mint.</span>';
      return;
    }
    try{
      const api=window.OneHomeJoeyWallet;
      if(!api?.connect||!api?.signAndSubmit)throw new Error('Joey Wallet is still loading. Refresh One Home and try again.');
      walletLinkBusy=true;
      setWalletConnectButtons(false);
      if(status){status.hidden=false;status.classList.add('is-preparing');status.innerHTML='<strong>OPENING JOEY WALLET</strong><span>Choose the XRP Ledger account you want to use.</span>';}
      const connected=await api.connect();
      const wallet=String(connected?.address||api.getAddress?.()||'').trim();
      if(!validXrplWallet(wallet))throw new Error('Joey Wallet did not return an XRP Ledger account.');
      const rows=await loadLinkedPassportWallets(false).catch(function(){return []});
      const linked=rows.some(function(row){return String(row?.provider||'').toLowerCase()==='joey'&&String(row?.wallet_address||'').toLowerCase()===wallet.toLowerCase();});
      applyMintWalletSelection(wallet,'joey',linked);
      walletLinkBusy=false;
      await start('joey',{skipProviderReconnect:true,expectedWallet:wallet});
    }catch(error){
      walletLinkBusy=false;
      console.error('One Home Joey direct mint connection',error);
      if(status){status.classList.remove('is-preparing');status.innerHTML='<strong>JOEY WALLET COULD NOT OPEN</strong><span>'+collectorMintError(error)+'</span>';}
      setButtons(true);
    }
  }

  async function handleXrplMintWalletButton(provider){
    const requested=normalizeXrplProvider(provider)||'xaman';
    // Every standard public mint confirms the exact receiving account in the
    // wallet app chosen by the collector. A Passport-linked wallet is welcome,
    // but One Home never substitutes the Passport's active/primary wallet.
    clearMintReceivingSelection();
    if(requested==='joey'){
      await startJoeyFromWalletButton();
      return;
    }
    await connectMintWallet(requested);
  }

  function eligibilityFor(data,maxAge){
    try{
      const founder=data?.access_mode==='founder' || data?.is_founder===true;
      const key=founder?FOUNDER_ELIGIBILITY_KEY:STANDARD_ELIGIBILITY_KEY;
      const stored=readStoredJson(key);
      if(!stored || stored.eligible !== true) return null;
      const campaignId=String(data?.campaign?.id || '').trim();
      const collectionId=String(data?.collection?.id || '').trim();
      if(campaignId && stored.campaign_id && String(stored.campaign_id)!==campaignId) return null;
      if(!stored.campaign_id && collectionId && stored.collection_id && String(stored.collection_id)!==collectionId) return null;
      if(Date.now() - Number(stored.checked_at || 0) > Number(maxAge || 30 * 60 * 1000)) return null;
      const wallet=verifiedWallet();
      if(!wallet || String(stored.wallet || '').toLowerCase() !== wallet.toLowerCase()) return null;
      return stored;
    }catch(_error){ return null; }
  }
  function isMobileBrowser(){
    return /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent || '') || (navigator.maxTouchPoints > 1 && /Macintosh/i.test(navigator.userAgent || ''));
  }

  function setLoading(target){
    currentMint=null;
    const supplied=target && typeof target==='object' ? target : {};
    const founder=supplied.founder===true || (!supplied.campaign_id && !supplied.collection_id);
    text('founderMintHeaderPath',founder?'FOUNDER DROP':'MINT');
    text('founderMintDropLabel',founder?'FOUNDER SUPPLY DROP':'PUBLISHED MINT');
    text('founderMintSealStatus','LOADING');
    text('founderMintName','LOADING MINT');
    text('founderMintDescription','Loading the collection information saved by the creator.');
    text('founderMintPrice','—');
    text('founderMintSupply','—');
    text('founderMintStatusLabel','LOADING');
    text('founderMintQuantity','—');
    const image=q('founderMintArtwork');
    if(image){
      const routeMint=rareRoutesMode();
      image.src=routeMint?DEFAULT_RARE_ROUTES_ART:(founder?DEFAULT_FOUNDER_ART:DEFAULT_STANDARD_ART);
      image.alt=routeMint?'Rare Routes system logo':founder?'88 Squared Founder Supply Drop sealed package':'Published mint artwork is loading';
      image.hidden=false;
    }
    if(rareRoutesMode()){
      text('founderMintPathSection','RARE ROUTES');
      text('founderMintHeaderPath','ROUTE SYSTEM');
      text('founderMintDropLabel','RARE ROUTES · SEASON 1');
      text('founderMintArtEyebrow','Rare Routes System');
    }
    const status=q('founderMintStatus');
    if(status){
      status.classList.add('is-preparing');
      status.innerHTML='<strong>LOADING PUBLISHED MINT</strong><span>One Home is retrieving the collection details saved by the creator.</span>';
    }
    setButtons(false);
  }

  function setProviderButtonLabel(buttonId,verb){
    const button=q(buttonId);
    const small=button?.querySelector('small');
    if(small) small.textContent=String(verb || 'MINT WITH');
  }

  function setButtons(enabled){
    const mintVerb=selectedMintQuantity>1?'MINT '+selectedMintQuantity+' WITH':'MINT WITH';
    const meta=q('founderMintMetaMaskBtn');
    const xaman=q('founderMintXamanBtn');
    const crossmark=q('founderMintCrossmarkBtn');
    const joey=q('founderMintJoeyBtn');
    if(evmCampaignMode){
      document.documentElement.classList.remove('onehome-xrpl-public-mint');
      if(xaman)xaman.hidden=true;
      if(crossmark)crossmark.hidden=true;
      if(joey)joey.hidden=true;
      if(meta){meta.hidden=false;meta.disabled=!enabled||evmMintBusy;meta.setAttribute('aria-disabled',String(!enabled||evmMintBusy));meta.title='Mint with MetaMask on this EVM network';}
      setProviderButtonLabel('founderMintMetaMaskBtn',mintVerb);
      setQuantityControlsEnabled(Boolean(enabled)&&!evmMintBusy);
      return;
    }
    if(meta){meta.hidden=true;meta.disabled=true;}

    if(simplePublicXrplUi()){
      [xaman,crossmark,joey].forEach(function(button){if(button){button.hidden=true;button.style.display='none';button.disabled=true;}});
      setQuantityControlsEnabled(Boolean(enabled));
      updateUnifiedMintButton(Boolean(enabled));
      return;
    }

    [xaman,crossmark,joey].forEach(function(button){if(button)button.style.display='';});
    setProviderButtonLabel('founderMintXamanBtn',mintVerb);
    setProviderButtonLabel('founderMintCrossmarkBtn',mintVerb);
    setProviderButtonLabel('founderMintJoeyBtn',mintVerb);
    setQuantityControlsEnabled(Boolean(enabled));
    const xamanEnabled=Boolean(enabled);
    const crossmarkEnabled=Boolean(enabled)&&!isMobileBrowser();
    const joeyEnabled=Boolean(enabled)&&joeyMintAllowed();
    if(xaman){xaman.hidden=false;xaman.disabled=!xamanEnabled;xaman.setAttribute('aria-disabled',String(!xamanEnabled));xaman.title='Mint with Xaman';}
    if(crossmark){
      crossmark.hidden=isMobileBrowser();
      crossmark.disabled=!crossmarkEnabled;
      crossmark.setAttribute('aria-disabled',String(!crossmarkEnabled));
      crossmark.title=isMobileBrowser()?'Crossmark is available on desktop.':'Mint with Crossmark';
    }
    if(joey){
      joey.hidden=!joeyMintAllowed();
      joey.disabled=!joeyEnabled;
      joey.setAttribute('aria-disabled',String(!joeyEnabled));
      joey.title=joeyMintAllowed()?'Mint with Joey Wallet':'Joey Wallet is available for XRP Ledger Mainnet mints.';
    }
  }

  function setWalletConnectButtons(enabled){
    if(simplePublicXrplUi()){
      ['founderMintXamanBtn','founderMintCrossmarkBtn','founderMintJoeyBtn','founderMintMetaMaskBtn'].forEach(function(id){const button=q(id);if(button){button.hidden=true;button.style.display='none';button.disabled=true;}});
      updateUnifiedMintButton(Boolean(enabled));
      return;
    }
    setProviderButtonLabel('founderMintXamanBtn','MINT WITH');
    setProviderButtonLabel('founderMintCrossmarkBtn','MINT WITH');
    setProviderButtonLabel('founderMintJoeyBtn','MINT WITH');
    const xaman=q('founderMintXamanBtn');
    if(xaman){xaman.style.display='';xaman.disabled=!enabled;xaman.setAttribute('aria-disabled',String(!enabled));xaman.title='Mint with Xaman';}
    const crossmark=q('founderMintCrossmarkBtn');
    if(crossmark){
      crossmark.style.display='';crossmark.hidden=isMobileBrowser();
      crossmark.disabled=!enabled || isMobileBrowser();
      crossmark.setAttribute('aria-disabled',String(!enabled || isMobileBrowser()));
      crossmark.title=isMobileBrowser()?'Crossmark is available on desktop.':'Mint with Crossmark';
    }
    const joey=q('founderMintJoeyBtn');
    if(joey){
      joey.style.display='';joey.hidden=!joeyMintAllowed();
      joey.disabled=!enabled || !joeyMintAllowed();
      joey.setAttribute('aria-disabled',String(!enabled || !joeyMintAllowed()));
      joey.title=joeyMintAllowed()?'Mint with Joey Wallet':'Joey Wallet is available for XRP Ledger Mainnet mints.';
    }
  }

  async function session(){
    const sb=getSupabase();
    if(!sb) return null;
    const result=await sb.auth.getSession();
    return result?.data?.session || null;
  }

  function collectorMintError(error){
    const code=String(error?.code || '').toUpperCase();
    const message=String(error?.message || '');
    const detail=String(error?.detail || '');
    const combined=(message+' '+detail).trim();

    if(code==='WALLET_LIMIT_REACHED' || /wallet has reached the mint limit/i.test(combined)) return 'This wallet has reached the limit for this mint.';
    if(code==='NO_AVAILABLE_INVENTORY' || /no NFTs remain|sold out/i.test(combined)) return 'No NFTs remain in this mint.';
    if(code==='BATCH_ORDER_ERROR' || /BATCH_NOT_ENOUGH_INVENTORY/i.test(combined)) return 'That multi-mint quantity is not available right now. Choose a smaller quantity or resume the order already in progress.';
    if(code==='COLLECTOR_ACCOUNT_NOT_ACTIVATED' || /tecNO_DST|tecNO_DST_INSUF_XRP|wallet is not activated/i.test(combined)) return 'This XRPL wallet is not activated yet. Fund or activate it, then try the mint again.';
    if(code==='MINT_PREPARING' || /already being prepared|still being confirmed|another collector is being prepared/i.test(combined)) return 'Your NFT is already being prepared. One Home is protecting it from a duplicate mint.';
    if(code==='XRPL_RPC_BUSY' || /XRPL_(?:HTTP_(?:408|425|429|500|502|503|504)|RPC_UNAVAILABLE)|tooBusy|server is overloaded/i.test(combined)) return 'The XRP Ledger is temporarily busy. One Home protected your mint and will retry safely.';
    if(code==='XAMAN_REQUEST_REJECTED') return 'The Xaman signing request was cancelled or rejected. Start the mint again when you are ready.';
    if(code==='XAMAN_PAYLOAD_EXPIRED') return 'The Xaman signing request expired. Start the mint again to receive a new request.';
    if(code==='XRPL_SEQUENCE_CONFLICT') return 'One Home paused this mint to protect against a duplicate XRPL transaction. No replacement transaction was sent. Please contact One Home support.';
    if(code==='XRPL_RECONCILE_PENDING') return 'One Home is still confirming a previous XRP delivery. No duplicate offer was sent. Try the mint again in a moment.';
    if(['XRPL_STALE_ITEM_UNRESOLVED','XRPL_STALE_ITEM_OWNER_UNKNOWN','XRPL_STALE_ITEM_PROOF_NOT_FOUND','XRPL_RECONCILE_FAILED'].includes(code)) return 'One Home found a previous XRP delivery that cannot be reused safely yet. No duplicate offer was sent. Please contact One Home support if this continues.';
    if(
      ['AUTOMATION_SIGNER_NOT_ACTIVATED','AUTOMATION_SIGNER_NOT_READY','MINT_AUTHORIZATION_REQUIRED','MINTER_ACCOUNT_NOT_ACTIVATED','MINTER_CREDENTIAL_MISMATCH'].includes(code) ||
      /automation signer|collection issuer|authorize Mint|family seed|credentials do not match/i.test(combined)
    ) return 'This mint needs a creator update before it can continue.';
    if(code==='ON_DEMAND_MINT_FAILED') return 'The NFT could not be prepared for this wallet. Please try again.';
    return message || 'The mint request could not be completed.';
  }

  function mintWait(ms){
    return new Promise(function(resolve){setTimeout(resolve,Math.max(0,Number(ms)||0));});
  }

  function retryableMintPreparationError(error){
    const code=String(error?.code || '').toUpperCase();
    const detail=(String(error?.message || '')+' '+String(error?.detail || '')).trim();
    return code==='MINT_PREPARING' ||
      code==='XRPL_RPC_BUSY' ||
      /MINT_SIGNER_BUSY|XRPL_TRANSACTION_CONFIRMATION_PENDING|XRPL_RPC_UNAVAILABLE|XRPL_HTTP_(408|425|429|500|502|503|504)|already being prepared|still being confirmed|another collector is being prepared/i.test(detail);
  }

  async function reserveMintWithRetry(name,body,status,authenticated){
    const started=Date.now();
    let attempt=0;
    let lastError=null;
    // Five silent minutes looked like a frozen PREPARE screen. Keep retries
    // bounded, run the existing server-authoritative XRPL reconcile during the
    // wait, and then return control without ever creating a replacement claim.
    const maxWaitMs=75*1000;

    while(Date.now()-started<maxWaitMs){
      try{
        return await callFunction(name,body,authenticated!==false);
      }catch(error){
        lastError=error;
        if(!retryableMintPreparationError(error)) throw error;
        attempt+=1;
        if(name==='on-demand-mint-manager'&&attempt===2&&body?.campaign_id){
          if(status){
            status.classList.add('is-preparing');
            status.innerHTML='<strong>RECOVERING PREVIOUS MINT STATE</strong><span>One Home is checking XRPL before it tries this same mint again. No second NFT is being reserved.</span>';
          }
          try{await callFunction('xrpl-mint-reconcile',{action:'preflight',campaign_id:body.campaign_id},true);}catch(reconcileError){console.warn('One Home prepare recovery reconcile',reconcileError);}
        }else if(status){
          status.classList.add('is-preparing');
          status.innerHTML='<strong>PREPARING YOUR NFT</strong><span>One Home is safely finishing the current ledger step. You do not need to tap again.</span>';
        }
        const delay=Math.min(4500,1200+(attempt*350))+Math.floor(Math.random()*250);
        await mintWait(delay);
      }
    }

    const timeout=new Error('One Home could not finish the existing preparation state. No replacement mint was created. Tap MINT again to re-check the same campaign state.');
    timeout.code='MINT_PREPARING';
    timeout.detail=lastError?.detail||lastError?.message||null;
    throw timeout;
  }

  async function reconcileXrplMintOnDemandBeforeReserve(campaignId,status){
    if(!campaignId)return null;
    if(status){status.classList.add('is-preparing');status.innerHTML='<strong>CHECKING PREVIOUS XRP DELIVERY</strong><span>One Home is confirming that earlier Mint-on-Demand NFTs are not reused after delivery.</span>';}
    const result=await callFunction('xrpl-mint-reconcile',{action:'preflight',campaign_id:campaignId},true);
    const data=result?.data||{};
    const reconciled=Math.max(0,Number(data.reconciled_count||0));
    if(reconciled>0&&status){status.innerHTML='<strong>PREVIOUS XRP DELIVERY CONFIRMED</strong><span>One Home matched the earlier NFT to its real wallet and is selecting the next available NFT.</span>';}
    return data;
  }

  async function callFunction(name,body,authenticated){
    const headers={'Content-Type':'application/json','apikey':SUPABASE_KEY};
    if(authenticated){
      const current=await session();
      if(!current?.access_token) throw new Error('Your Home ID session expired. Sign in again.');
      headers.Authorization='Bearer '+current.access_token;
    }
    const response=await fetch(FUNCTIONS_BASE+'/'+name,{method:'POST',headers,body:JSON.stringify(body||{})});
    const data=await response.json().catch(function(){return {};});
    if(!response.ok && data.success!==true){
      const error=new Error(data.error || 'The mint request could not be completed.');
      error.code=String(data.code || '');
      error.detail=data.detail || null;
      error.http_status=response.status;
      throw error;
    }
    return {data,status:response.status};
  }


  function readPendingEvmMint(){
    try{
      const value=JSON.parse(localStorage.getItem(EVM_PENDING_MINT_KEY)||'null');
      if(!value||typeof value!=='object')return null;
      if(String(value.campaign_id||'')!==String(activeCampaignId()||''))return null;
      const savedAt=Number(value.saved_at||0);
      if(!savedAt||Date.now()-savedAt>PENDING_MINT_MAX_AGE_MS){localStorage.removeItem(EVM_PENDING_MINT_KEY);return null}
      if(!/^[0-9a-f-]{36}$/i.test(String(value.order_id||'')))return null;
      if(!/^0x[a-fA-F0-9]{64}$/.test(String(value.transaction_hash||'')))return null;
      return value
    }catch(_error){return null}
  }

  function savePendingEvmMint(value){
    try{
      localStorage.setItem(EVM_PENDING_MINT_KEY,JSON.stringify({
        campaign_id:String(activeCampaignId()||''),
        order_id:String(value?.order_id||''),
        transaction_hash:String(value?.transaction_hash||''),
        chain_key:String(value?.chain_key||''),
        saved_at:Date.now()
      }))
    }catch(_error){}
  }

  function clearPendingEvmMint(){
    try{localStorage.removeItem(EVM_PENDING_MINT_KEY)}catch(_error){}
  }


  function readEvmBatchSession(){
    try{
      const value=JSON.parse(localStorage.getItem(EVM_BATCH_SESSION_KEY)||'null');
      if(!value||typeof value!=='object')return null;
      if(String(value.campaign_id||'')!==String(activeCampaignId()||''))return null;
      const savedAt=Number(value.saved_at||value.created_at||0);
      if(!savedAt||Date.now()-savedAt>PENDING_MINT_MAX_AGE_MS){localStorage.removeItem(EVM_BATCH_SESSION_KEY);return null}
      const target=Math.max(2,Math.min(MAX_MINT_SESSION_QUANTITY,Math.floor(Number(value.target_quantity)||0)));
      const baseline=Math.max(0,Math.floor(Number(value.baseline_completed)||0));
      if(target<2)return null;
      return {...value,target_quantity:target,baseline_completed:baseline};
    }catch(_error){return null}
  }

  function saveEvmBatchSession(value){
    try{
      localStorage.setItem(EVM_BATCH_SESSION_KEY,JSON.stringify({
        campaign_id:String(activeCampaignId()||''),
        target_quantity:Math.max(2,Math.min(MAX_MINT_SESSION_QUANTITY,Math.floor(Number(value?.target_quantity)||2))),
        baseline_completed:Math.max(0,Math.floor(Number(value?.baseline_completed)||0)),
        created_at:Number(value?.created_at)||Date.now(),
        saved_at:Date.now()
      }));
    }catch(_error){}
  }

  function clearEvmBatchSession(){
    try{localStorage.removeItem(EVM_BATCH_SESSION_KEY)}catch(_error){}
  }

  function evmBatchProgress(session,data){
    if(!session)return 0;
    const completed=Math.max(0,Math.floor(Number(data?.buyer?.completed)||0));
    return Math.max(0,Math.min(session.target_quantity,completed-session.baseline_completed));
  }

  function lowerEvm(value){return String(value||'').trim().toLowerCase();}
  function htmlEscape(value){return String(value||'').replace(/[&<>"']/g,function(ch){return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[ch];});}
  function shortEvm(value){const text=String(value||'').trim();return text.length>24?text.slice(0,12)+'…'+text.slice(-10):text;}
  function isEvmAddress(value){return /^0x[a-fA-F0-9]{40}$/.test(String(value||'').trim());}
  function sleep(ms){return new Promise(function(resolve){setTimeout(resolve,ms);});}

  async function callEvmCampaign(action,payload){
    const body=Object.assign({action:action,campaign_id:activeCampaignId()},payload||{});
    const result=await callFunction('evm-campaign-mint',body,true);
    if(result.data&&result.data.ok===false)throw new Error(result.data.error||'The One Home EVM mint could not continue.');
    return result.data||{};
  }

  function injectedMetaMaskProvider(){
    try{
      const root=window.ethereum;
      if(Array.isArray(root?.providers)){
        const found=root.providers.find(function(provider){return provider&&provider.isMetaMask;});
        if(found)return found;
      }
      if(root&&root.isMetaMask)return root;
    }catch(_error){}
    return null;
  }

  function isMetaMaskBrowserHandoff(){
    try{
      const params=new URLSearchParams(window.location.search||'');
      if(params.get(METAMASK_BROWSER_PARAM)==='1')return true;
    }catch(_error){}
    return /MetaMaskMobile/i.test(navigator.userAgent||'');
  }

  function requestedMetaMaskQuantity(){
    try{
      const raw=Math.floor(Number(new URLSearchParams(window.location.search||'').get(METAMASK_QUANTITY_PARAM)||1));
      return Math.max(1,Math.min(MAX_MINT_SESSION_QUANTITY,Number.isFinite(raw)?raw:1));
    }catch(_error){return 1;}
  }

  function cleanConsumedMetaMaskHandoff(){
    try{
      const url=new URL(window.location.href);
      url.searchParams.delete(METAMASK_HANDOFF_PARAM);
      url.searchParams.delete(METAMASK_HANDOFF_TYPE_PARAM);
      window.history.replaceState({},'',url.pathname+(url.searchParams.toString()?'?'+url.searchParams.toString():'')+url.hash);
    }catch(_error){}
  }

  async function consumeMetaMaskBrowserHandoff(){
    let token='';
    let verificationType='magiclink';
    try{
      const params=new URLSearchParams(window.location.search||'');
      token=String(params.get(METAMASK_HANDOFF_PARAM)||'').trim();
      verificationType=String(params.get(METAMASK_HANDOFF_TYPE_PARAM)||'magiclink').trim()||'magiclink';
    }catch(_error){return false;}
    if(!token)return false;

    const sb=getSupabase();
    if(!sb?.auth?.verifyOtp)throw new Error('One Home Passport authentication did not finish loading inside MetaMask.');

    setEvmStatus('RESTORING YOUR ONE HOME PASSPORT','One Home is securely carrying your signed-in Passport into MetaMask. You will not need to enter your password again.',true);
    const result=await sb.auth.verifyOtp({token_hash:token,type:verificationType});
    if(result?.error||!result?.data?.session?.access_token){
      throw new Error(result?.error?.message||'The secure One Home Passport handoff expired. Return to X and tap Mint with MetaMask again.');
    }

    selectedMintQuantity=requestedMetaMaskQuantity();
    cleanConsumedMetaMaskHandoff();
    try{
      localStorage.setItem('onehome_metamask_browser_handoff_v146750',JSON.stringify({campaign_id:activeCampaignId(),saved_at:Date.now()}));
    }catch(_error){}
    return true;
  }

  function metaMaskDappUniversalLink(targetUrl){
    const raw=String(targetUrl||'').trim();
    if(!raw)return '';
    return 'https://metamask.app.link/dapp/'+raw.replace(/^https?:\/\//i,'');
  }

  async function prepareMetaMaskBrowserHandoff(network){
    const config=networkFromData({network:network||evmMintState?.network||{}});
    const response=await callFunction('onehome-metamask-handoff',{
      purpose:'evm_mint',
      campaign_id:activeCampaignId(),
      chain_key:String(config.chain_key||''),
      quantity:Math.max(1,Math.min(selectedMintQuantityMax||MAX_MINT_SESSION_QUANTITY,selectedMintQuantity||1))
    },true);
    const data=response?.data||{};
    const token=String(data.token_hash||'').trim();
    if(!data.ok||!token)throw new Error(data.error||'One Home could not prepare the secure MetaMask handoff.');

    const target=new URL(canonicalEvmMintUrl(activeCampaignId(),config.chain_key||requestedChain()||''),window.location.origin);
    target.searchParams.set('source','x');
    target.searchParams.set(METAMASK_BROWSER_PARAM,'1');
    target.searchParams.set(METAMASK_QUANTITY_PARAM,String(Math.max(1,Math.min(selectedMintQuantityMax||MAX_MINT_SESSION_QUANTITY,selectedMintQuantity||1))));
    target.searchParams.set(METAMASK_HANDOFF_PARAM,token);
    target.searchParams.set(METAMASK_HANDOFF_TYPE_PARAM,String(data.verification_type||'magiclink'));
    return metaMaskDappUniversalLink(target.toString());
  }

  function showMetaMaskBrowserHandoff(link,networkName){
    const status=q('founderMintStatus');
    if(!status||!link)return false;
    status.classList.remove('is-preparing');
    status.innerHTML='';
    const strong=document.createElement('strong');
    strong.textContent='CONTINUE THIS MINT IN METAMASK';
    const span=document.createElement('span');
    span.textContent='One Home prepared a one-time Passport handoff. Tap below to open this exact '+String(networkName||'EVM')+' mint inside MetaMask. You will stay signed in.';
    const anchor=document.createElement('a');
    anchor.href=link;
    anchor.className='founder-mint-entry-button';
    anchor.textContent='Continue Mint in MetaMask';
    anchor.setAttribute('aria-label','Continue this One Home mint inside MetaMask');
    anchor.style.display='inline-flex';
    anchor.style.marginTop='12px';
    anchor.style.justifyContent='center';
    anchor.style.alignItems='center';
    anchor.style.textDecoration='none';
    anchor.addEventListener('click',function(){span.textContent='Opening the exact mint inside MetaMask. Once it loads, tap Mint with MetaMask there to approve the transaction.';});
    status.appendChild(strong);
    status.appendChild(span);
    status.appendChild(anchor);
    try{requestAnimationFrame(function(){status.scrollIntoView({block:'center',behavior:'smooth'});});}catch(_error){}
    return true;
  }

  async function connectInjectedExpectedEvmWallet(expected,network){
    const config=networkFromData({network:network||evmMintState?.network||{}});
    const provider=injectedMetaMaskProvider();
    if(!provider)throw new Error('MetaMask did not inject its wallet provider. Open this mint in the MetaMask browser and try again.');
    const chainId=String(config.chain_id_hex||('0x'+Number(config.chain_id||0).toString(16)));
    const rpcUrls=Array.isArray(config.wallet_add_chain?.rpcUrls)?config.wallet_add_chain.rpcUrls:[];

    let accounts=await provider.request({method:'eth_requestAccounts',params:[]});
    let address=Array.isArray(accounts)?String(accounts[0]||''):'';
    if(!isEvmAddress(address))throw new Error('MetaMask did not return an EVM account.');
    if(lowerEvm(address)!==lowerEvm(expected))throw new Error('MetaMask is using '+shortEvm(address)+', but your One Home Passport expects '+shortEvm(expected)+'. Switch to the Passport wallet and try again.');

    try{
      await provider.request({method:'wallet_switchEthereumChain',params:[{chainId:chainId}]});
    }catch(error){
      const code=Number(error?.code);
      const message=String(error?.message||'');
      if(code!==4902&&!/unrecognized chain|unknown chain|not added/i.test(message))throw error;
      const symbol=String(config.native_symbol||'ETH');
      await provider.request({
        method:'wallet_addEthereumChain',
        params:[{
          chainId:chainId,
          chainName:String(config.wallet_add_chain?.chainName||config.display_name||config.chain_key||'One Home EVM Network'),
          nativeCurrency:config.wallet_add_chain?.nativeCurrency||{name:symbol,symbol:symbol,decimals:18},
          rpcUrls:rpcUrls,
          ...(Array.isArray(config.wallet_add_chain?.blockExplorerUrls)&&config.wallet_add_chain.blockExplorerUrls.length?{blockExplorerUrls:config.wallet_add_chain.blockExplorerUrls}:{})
        }]
      });
      await provider.request({method:'wallet_switchEthereumChain',params:[{chainId:chainId}]});
    }

    accounts=await provider.request({method:'eth_accounts',params:[]});
    address=Array.isArray(accounts)?String(accounts[0]||''):address;
    if(lowerEvm(address)!==lowerEvm(expected))throw new Error('MetaMask is using '+shortEvm(address)+', but your One Home Passport expects '+shortEvm(expected)+'. Switch to the Passport wallet and try again.');

    const scope='eip155:'+String(config.chain_id);
    return {
      wallet:{invokeMethod:function(input){return provider.request(input?.request||{});}},
      address:address,
      scope:scope,
      network:config,
      injected:true
    };
  }

  function loadEvmSdk(){
    if(window.OneHomeMetaMaskSDK&&typeof window.OneHomeMetaMaskSDK.createMultichainClient==='function')return Promise.resolve(window.OneHomeMetaMaskSDK);if(evmSdkPromise)return evmSdkPromise;evmSdkPromise=new Promise(function(resolve,reject){const prior=document.querySelector('script[data-onehome-campaign-metamask-sdk]');const script=prior||document.createElement('script');function ready(){if(window.OneHomeMetaMaskSDK&&typeof window.OneHomeMetaMaskSDK.createMultichainClient==='function')resolve(window.OneHomeMetaMaskSDK);else reject(new Error('MetaMask access did not finish loading. Refresh and try again.'))}script.addEventListener('load',ready,{once:true});script.addEventListener('error',function(){reject(new Error('MetaMask access could not load. Refresh and try again.'));},{once:true});if(!prior){script.src=METAMASK_SDK_PATH;script.async=true;script.dataset.onehomeCampaignMetamaskSdk='1';document.head.appendChild(script)}}).catch(function(error){evmSdkPromise=null;throw error});return evmSdkPromise;
  }

  function isXStayInBrowserMint(){
    try{
      const raw=sessionStorage.getItem('onehome_x_stay_browser_v146747')||localStorage.getItem('onehome_x_stay_browser_v146747')||'';
      const saved=JSON.parse(raw||'null');
      if(!saved||saved.source!=='x'||Date.now()-Number(saved.saved_at||0)>2*60*60*1000)return false;
      const current=activeCampaignId();
      return !saved.campaign_id||!current||String(saved.campaign_id).toLowerCase()===String(current).toLowerCase();
    }catch(_error){return false;}
  }

  function evmMetaMaskUniversalLink(url){
    const raw=String(url||'').trim();
    if(!raw)return '';
    if(/^metamask:\/\/connect/i.test(raw)){
      return 'https://metamask.app.link/connect'+raw.replace(/^metamask:\/\/connect/i,'');
    }
    return raw;
  }

  function resetEvmMetaMaskLinkCapture(){
    evmMetaMaskCapturedLink='';
  }

  function captureEvmMetaMaskLink(url){
    const link=evmMetaMaskUniversalLink(url);
    if(!link)return;
    evmMetaMaskCapturedLink=link;
    const waiters=evmMetaMaskLinkWaiters.splice(0);
    waiters.forEach(function(resolve){try{resolve(link);}catch(_error){}});
  }

  function waitForEvmMetaMaskLink(ms){
    if(evmMetaMaskCapturedLink)return Promise.resolve(evmMetaMaskCapturedLink);
    return new Promise(function(resolve,reject){
      let settled=false;
      const done=function(link){if(settled)return;settled=true;clearTimeout(timer);resolve(link);};
      evmMetaMaskLinkWaiters.push(done);
      const timer=setTimeout(function(){
        if(settled)return;
        settled=true;
        evmMetaMaskLinkWaiters=evmMetaMaskLinkWaiters.filter(function(item){return item!==done;});
        reject(new Error('One Home could not prepare the MetaMask app link. Tap Mint with MetaMask and try again.'));
      },Math.max(1000,Number(ms)||10000));
    });
  }

  function showEvmMetaMaskLaunch(url,title,message){
    const link=evmMetaMaskUniversalLink(url);
    const status=q('founderMintStatus');
    if(!status||!link)return false;
    status.classList.remove('is-preparing');
    status.innerHTML='';
    const strong=document.createElement('strong');
    strong.textContent=title||'OPEN METAMASK';
    const span=document.createElement('span');
    span.textContent=message||'Tap below to open MetaMask, approve the One Home request, then return to X.';
    const anchor=document.createElement('a');
    anchor.href=link;
    anchor.className='founder-mint-entry-button';
    anchor.textContent='Open MetaMask';
    anchor.setAttribute('aria-label','Open MetaMask to approve the One Home request');
    anchor.style.display='inline-flex';
    anchor.style.marginTop='12px';
    anchor.style.justifyContent='center';
    anchor.style.alignItems='center';
    anchor.style.textDecoration='none';
    anchor.addEventListener('click',function(){
      span.textContent='MetaMask is opening. Approve the request, then return to X. One Home will continue automatically.';
    });
    status.appendChild(strong);
    status.appendChild(span);
    status.appendChild(anchor);
    return true;
  }

  async function waitForMetaMaskApprovalWithExplicitLaunch(actionPromise,title,message){
    if(!isXStayInBrowserMint())return await actionPromise;
    const first=await Promise.race([
      Promise.resolve(actionPromise).then(function(result){return {kind:'done',result:result};}),
      waitForEvmMetaMaskLink(12000).then(function(link){return {kind:'link',link:link};})
    ]);
    if(first.kind==='done')return first.result;
    showEvmMetaMaskLaunch(first.link,title,message);
    return await actionPromise;
  }

  async function evmWalletClient(network){
    const config=networkFromData({network:network||evmMintState?.network||{}});
    if(!config.chain_id)throw new Error('One Home did not return the EVM chain ID.');
    const scope='eip155:'+String(config.chain_id);
    const rpcUrls=Array.isArray(config.wallet_add_chain?.rpcUrls)?config.wallet_add_chain.rpcUrls:[];
    const rpc=String(rpcUrls[0]||'');
    if(!rpc)throw new Error((config.display_name||config.chain_key||'This EVM network')+' does not have a MetaMask RPC configured.');
    if(evmClientCache.has(config.chain_key))return evmClientCache.get(config.chain_key);
    const promise=loadEvmSdk().then(function(sdk){
      const options={
        dapp:{name:'One Home',url:window.location.origin,iconUrl:window.location.origin+'/assets/one-home-logo.png'},
        api:{supportedNetworks:{[scope]:rpc}},
        analytics:{enabled:false},
        ui:{preferExtension:true,showInstallModal:false}
      };
      // X's embedded browser blocks programmatic wallet launches after the SDK
      // creates its relay request. Capture the exact MetaMask request instead.
      // One Home then renders it as a real user-tapped HTTPS universal link.
      if(isXStayInBrowserMint()){
        options.mobile={
          preferredOpenLink:function(url){captureEvmMetaMaskLink(url);}
        };
      }
      return sdk.createMultichainClient(options);
    }).catch(function(error){evmClientCache.delete(config.chain_key);throw error});
    evmClientCache.set(config.chain_key,promise);
    return promise;
  }

  function evmAccountFromSession(walletSession,scope){const scopes=walletSession&&walletSession.sessionScopes||{};const accounts=scopes[scope]&&Array.isArray(scopes[scope].accounts)?scopes[scope].accounts:[];const prefix=scope+':';const account=accounts.find(function(value){return String(value||'').indexOf(prefix)===0});return account?String(account).slice(prefix.length):''}

  function evmConnectWithTimeout(promise,ms,message){
    let timer=null;
    return Promise.race([
      Promise.resolve(promise).finally(function(){if(timer)clearTimeout(timer)}),
      new Promise(function(_resolve,reject){timer=setTimeout(function(){reject(new Error(message))},ms)})
    ]);
  }

  async function connectExpectedEvmWallet(expected,network){
    const config=networkFromData({network:network||evmMintState?.network||{}});
    if(isMetaMaskBrowserHandoff()&&injectedMetaMaskProvider()){
      return await connectInjectedExpectedEvmWallet(expected,config);
    }
    const scope='eip155:'+String(config.chain_id);
    const wallet=await evmWalletClient(config);
    try{
      resetEvmMetaMaskLinkCapture();
      const connectPromise=evmConnectWithTimeout(
        wallet.connect([scope],[],undefined,true),
        180000,
        'MetaMask did not return the One Home connection approval. Tap Mint with MetaMask again and approve the connection in the MetaMask app.'
      );
      await waitForMetaMaskApprovalWithExplicitLaunch(
        connectPromise,
        'OPEN METAMASK TO CONNECT',
        'X cannot open this wallet request automatically. Tap Open MetaMask, approve the One Home connection for '+(config.display_name||config.chain_key||'this network')+', then return to X.'
      );
      const walletSession=await wallet.provider.getSession();
      const address=evmAccountFromSession(walletSession,scope);
      if(!isEvmAddress(address))throw new Error('MetaMask did not return an account for '+(config.display_name||config.chain_key||'the requested EVM network')+'.');
      if(lowerEvm(address)!==lowerEvm(expected))throw new Error('MetaMask is using '+shortEvm(address)+', but your One Home Passport expects '+shortEvm(expected)+'. Switch to the Passport wallet and try again.');
      return {wallet:wallet,address:address,scope:scope,network:config};
    }catch(error){
      evmClientCache.delete(config.chain_key);
      throw error;
    }
  }

  function setEvmStatus(title,message,preparing){
    const status=q('founderMintStatus');
    if(!status)return;
    status.classList.toggle('is-preparing',preparing!==false);
    status.innerHTML='<strong>'+String(title||'').replace(/[&<>"']/g,function(ch){return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[ch];})+'</strong><span>'+String(message||'').replace(/[&<>"']/g,function(ch){return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[ch];})+'</span>';
  }

  function renderEvmArtwork(data){const image=q('founderMintArtwork');if(!image)return;const src=String(data?.campaign?.cover_image_url||data?.cover_image_url||data?.campaign?.artwork_url||data?.campaign?.banner_url||DEFAULT_STANDARD_ART);setOneHomeArtwork(image,src||DEFAULT_STANDARD_ART,1200);image.hidden=false;image.alt=String(data?.campaign?.name||'EVM mint')+' cover';}

  async function recoverEvmMintIfNeeded(data){
    if(!data?.buyer?.recovery_available)return data;
    try{
      const recovered=await callEvmCampaign('recover');
      if(recovered?.confirmed===true){
        clearPendingEvmMint();
        return await callEvmCampaign('status')
      }
    }catch(error){
      console.warn('One Home EVM recovery',error)
    }
    return data
  }

  async function renderEvmMint(data){
    document.documentElement.classList.remove('onehome-mint-error-state');
    hideMintWalletChooser();
    document.documentElement.classList.remove('onehome-xrpl-public-mint');
    const progress=q('onehomeMintProgress');if(progress)progress.hidden=true;
    positionPublicMintDescription(false);
    data=await applyCanonicalMintCover(data,data?.campaign?.id||activeCampaignId());
    evmCampaignMode=true;evmMintState=data;currentMint=null;
    const campaign=data.campaign||{},mint=data.mint||{},wallet=data.wallet||{};
    updateMintSocialMetadata(data,'evm');
    const network=networkFromData(data),mainnet=evmNetworkIsMainnet(network);
    const rawNetworkName=network.display_name||(mainnet?'EVM':'EVM');
    const key=String(network.chain_key||'').toLowerCase();
    const family=key.replace(/-(?:mainnet|sepolia|amoy|testnet|fuji|atlantic-2)$/,'');
    const publicNames={avalanche:'Avalanche',ethereum:'Ethereum',base:'Base',polygon:'Polygon',optimism:'Optimism',arbitrum:'Arbitrum',linea:'Linea',bsc:'BNB Chain',bnb:'BNB Chain',hedera:'Hedera',sei:'Sei'};
    const networkName=publicNames[family]||String(rawNetworkName).replace(/\s+(Mainnet|Sepolia|Amoy|Testnet|Atlantic[- ]?2)$/i,'').trim()||'EVM';
    const symbol=String(mint.native_symbol||network.native_symbol||'ETH');
    const laneLabel=mainnet?'':'TESTNET';
    const collectionWord='collection';
    rememberCampaign(campaign.id||activeCampaignId());
    if(!Number(campaign.max_per_mint))campaign.max_per_mint=await loadCreatorMintSessionLimit(campaign.id||activeCampaignId());
    text('founderMintPathSection','EVM');
    text('founderMintHeaderPath',networkName.toUpperCase()+(mainnet?'':' · TESTNET'));
    text('founderMintDropLabel',networkName.toUpperCase()+(laneLabel?' · '+laneLabel:''));
    text('founderMintSealStatus',data.open?'OPEN':String(campaign.status||'DRAFT').toUpperCase());
    text('founderMintName',campaign.name||networkName+' Mint');
    text('founderMintDescription',campaign.description||('A One Home ERC-721 mint on '+networkName+'.'));
    text('founderMintPrice',String(mint.price??'0')+' '+symbol);
    text('founderMintSupply',String(Math.max(0,Number(mint.remaining)||0))+' / '+String(Math.max(0,Number(mint.max_supply)||0)));
    text('founderMintStatusLabel',data.open?'OPEN':'DRAFT');
    text('founderMintQuantity',String(Math.max(1,Number(campaign.per_wallet_limit)||1))+' PER WALLET');
    text('founderMintCrateSupply',String(Math.max(0,Number(mint.remaining)||0))+' / '+String(Math.max(0,Number(mint.max_supply)||0)));
    text('founderMintArtEyebrow',networkName+(mainnet?'':' · Testnet'));
    text('founderMintRevealTitle','ERC-721 NFT');
    text('founderMintAccessLabel','One Home MetaMask Access');
    text('founderMintPaymentNote','Review the mint price and network fee in MetaMask before approving.');
    const metaLabel=q('founderMintMetaMaskBtn')?.querySelector('strong');if(metaLabel)metaLabel.textContent='METAMASK · '+networkName.toUpperCase()+(mainnet?'':' · TESTNET');
    const includes=q('founderMintIncludes');if(includes)includes.innerHTML='<div><span>✓</span><strong>ERC-721 on '+htmlEscape(networkName)+'</strong></div><div><span>✓</span><strong>Verified MetaMask EVM destination</strong></div><div><span>✓</span><strong>On-chain receipt and Token ID recorded by One Home</strong></div>';
    renderEvmArtwork(data);ensureMintQuantityControl(data);
    const authenticated=await isAuthenticated();const verify=q('founderMintVerifyBtn');
    if(!authenticated){text('founderMintReadyIcon','1');text('founderMintReadyTitle','Sign in to One Home');text('founderMintWallet','A One Home Passport is required before connecting MetaMask.');if(verify){verify.hidden=false;verify.textContent='Sign In to One Home';}setEvmStatus('SIGN IN REQUIRED','Enter One Home, then return to this mint.',true);setButtons(false);return;}
    if(!wallet.verified||!isEvmAddress(wallet.expected_from)){text('founderMintReadyIcon','2');text('founderMintReadyTitle','MetaMask EVM address required');text('founderMintWallet','Link and verify a MetaMask EVM address in your One Home Passport first.');if(verify){verify.hidden=false;verify.textContent='Open One Home Passport';}setEvmStatus('METAMASK REQUIRED','This NFT must be delivered to a verified EVM address.',true);setButtons(false);return;}
    text('founderMintReadyIcon','✓');text('founderMintReadyTitle','MetaMask destination confirmed');text('founderMintWallet',shortEvm(wallet.expected_from)+' is ready to receive this '+networkName+' NFT.');if(verify)verify.hidden=true;
    if(Number(mint.remaining)<=0){setEvmStatus('COLLECTION SOLD OUT','Every NFT in this '+networkName+' '+collectionWord+' has been minted.',true);setButtons(false);return;}
    if(Number(data?.buyer?.remaining_under_wallet_limit)<=0){setEvmStatus('WALLET LIMIT REACHED','This Passport has already reached the mint limit for this '+collectionWord+'.',false);setButtons(false);return;}
    if(!data.open){setEvmStatus(mainnet?'EVM MAINNET MINT NOT OPEN':'EVM TEST MINT NOT OPEN','The creator has not opened this '+(mainnet?'mainnet':'test')+' campaign yet.',true);setButtons(false);return;}
    setEvmStatus('READY TO MINT','Connect the verified MetaMask wallet and review the '+networkName+(mainnet?' MAINNET':' test')+' transaction before approving.',false);setButtons(true);
  }

  async function confirmEvmUntilDone(){const network=networkFromData(evmMintState||{});for(let attempt=0;attempt<75;attempt+=1){const submittedHash=String(evmTransactionHash||'');const result=await callEvmCampaign('confirm',{order_id:evmActiveOrderId,transaction_hash:submittedHash});if(result&&result.confirmed===true){if(submittedHash&&!result.transaction_hash)result.transaction_hash=submittedHash;return result;}setEvmStatus('CONFIRMING ON '+String(network.display_name||'EVM').toUpperCase(),'Your transaction was sent. One Home is waiting for the ERC-721 mint receipt.',true);await sleep(4000);}throw new Error('The transaction was sent, but confirmation is taking longer than expected. Transaction: '+evmTransactionHash);}

  async function resumePendingEvmMint(){
    const pending=readPendingEvmMint();
    if(!pending)return null;
    evmActiveOrderId=String(pending.order_id);
    evmTransactionHash=String(pending.transaction_hash);
    const network=networkFromData(evmMintState||{});
    setEvmStatus('RESUMING TRANSACTION','One Home found a previously submitted '+String(network.display_name||'EVM')+' transaction and is verifying it. No new mint will be sent.',true);
    const confirmed=await confirmEvmUntilDone();
    clearPendingEvmMint();
    return confirmed
  }

  async function startEvmMint(){
    if(!evmCampaignMode||evmMintBusy||!evmMintState)return;
    evmMintBusy=true;
    setButtons(false);

    try{
      const expected=String(evmMintState?.wallet?.expected_from||'');
      const network=networkFromData(evmMintState);
      const networkName=network.display_name||network.chain_key||'EVM Test Network';

      // X's embedded browser can open MetaMask, but MetaMask Mobile currently
      // may not receive relay/WalletConnect requests from in-app browsers.
      // Move the exact mint into MetaMask's own dapp browser instead. A
      // one-time Supabase token carries the already-authenticated Passport.
      if(isXStayInBrowserMint()&&!injectedMetaMaskProvider()){
        setEvmStatus('PREPARING SECURE METAMASK HANDOFF','One Home is carrying this exact mint and your signed-in Passport into MetaMask.',true);
        const handoffLink=await prepareMetaMaskBrowserHandoff(network);
        showMetaMaskBrowserHandoff(handoffLink,networkName);
        return;
      }

      // A saved multi-mint session is resumable. Progress is derived from the
      // backend's completed count, so a refresh after an on-chain confirmation
      // cannot accidentally create an extra NFT.
      let session=readEvmBatchSession();
      if(!session&&selectedMintQuantity>1){
        session={
          target_quantity:Math.max(2,Math.min(selectedMintQuantityMax||MAX_MINT_SESSION_QUANTITY,selectedMintQuantity)),
          baseline_completed:Math.max(0,Math.floor(Number(evmMintState?.buyer?.completed)||0)),
          created_at:Date.now()
        };
        saveEvmBatchSession(session);
      }
      const target=session?.target_quantity||1;

      // Start MetaMask from the collector's tap before any network recovery calls.
      // X's in-app browser may refuse an app launch after the original tap has
      // been lost to awaited background work. A saved pending transaction is
      // the only case where we recover first without reopening the wallet.
      const pending=readPendingEvmMint();
      let connected=null;
      if(!pending){
        setEvmStatus('CONNECT METAMASK','MetaMask should open now. Approve the One Home connection for '+networkName+', then return to X if needed.',true);
        connected=await connectExpectedEvmWallet(expected,network);
      }

      // Never submit another transaction while a prior transaction for this
      // campaign is still recoverable.
      if(pending){
        await resumePendingEvmMint();
        evmMintState=await callEvmCampaign('status');
      }

      // Also ask the backend to discover any successful on-chain mint that
      // happened before the browser could persist its transaction hash.
      const recovered=await callEvmCampaign('recover').catch(function(){return null});
      if(recovered?.confirmed===true){
        clearPendingEvmMint();
        evmMintState=await callEvmCampaign('status');
      }

      if(session){
        const alreadyDone=evmBatchProgress(session,evmMintState);
        if(alreadyDone>=target){
          clearEvmBatchSession();
          setEvmStatus('MINT SESSION COMPLETE',String(target)+' NFTs were minted and recorded by One Home.',false);
          await showMintSuccessReceipt(recovered||{});
          await renderEvmMint(evmMintState);
          return;
        }
      }else if(pending||recovered?.confirmed===true){
        setEvmStatus('MINT CONFIRMED','Your NFT was recovered and recorded by One Home.',false);
        await showMintSuccessReceipt(recovered||{});
        await renderEvmMint(evmMintState);
        return;
      }

      evmActiveOrderId='';
      evmTransactionHash='';

      if(!connected){
        setEvmStatus('CONNECT METAMASK','MetaMask should open now. Approve the One Home connection for '+networkName+', then return to X if needed.',true);
        connected=await connectExpectedEvmWallet(expected,network);
      }
      let lastConfirmed=null;

      while(true){
        evmMintState=await callEvmCampaign('status');
        const completedInSession=session?evmBatchProgress(session,evmMintState):0;
        if(completedInSession>=target)break;

        const remainingNeeded=target-completedInSession;
        const collectionRemaining=Math.max(0,Math.floor(Number(evmMintState?.mint?.remaining)||0));
        const walletRemaining=Math.max(0,Math.floor(Number(evmMintState?.buyer?.remaining_under_wallet_limit)||0));
        if(collectionRemaining<1||walletRemaining<1){
          if(session&&completedInSession>0){
            clearEvmBatchSession();
            setEvmStatus('MINT SESSION FINISHED',String(completedInSession)+' of '+String(target)+' selected NFTs were minted before the available supply or wallet allowance was exhausted.',false);
            await showMintSuccessReceipt(lastConfirmed||{});
            await renderEvmMint(evmMintState);
            return;
          }
          throw new Error(collectionRemaining<1?'This collection is sold out.':'This wallet has reached its mint limit.');
        }

        const itemNumber=session?completedInSession+1:1;
        setEvmStatus(
          session?'PREPARING NFT '+String(itemNumber)+' OF '+String(target):'PREPARING YOUR NFT',
          'One Home is preparing the ERC-721 mint transaction.',
          true
        );

        const prepared=await callEvmCampaign('prepare');
        const tx=prepared?.transaction||{};
        const preparedNetwork=networkFromData({network:prepared?.network||network,mint:evmMintState?.mint||{}});

        if(!prepared?.ok||!/^[-0-9a-f]{36}$/i.test(String(prepared.order_id||''))){
          throw new Error('One Home did not create a valid EVM mint order.');
        }

        if(
          lowerEvm(tx.from)!==lowerEvm(expected)||
          !isEvmAddress(tx.to)||
          lowerEvm(tx.data)!=='0x1249c58b'||
          lowerEvm(tx.chainId)!==lowerEvm(preparedNetwork.chain_id_hex)
        ){
          throw new Error('The prepared '+networkName+' transaction did not pass One Home validation.');
        }

        evmActiveOrderId=String(prepared.order_id);
        evmTransactionHash='';

        setEvmStatus(
          session?'REVIEW NFT '+String(itemNumber)+' OF '+String(target)+' IN METAMASK':'REVIEW IN METAMASK',
          'Confirm '+networkName+', the NFT contract, and the '+String(prepared?.mint?.native_symbol||preparedNetwork.native_symbol||'test')+' price before approving.',
          true
        );

        resetEvmMetaMaskLinkCapture();
        const sendPromise=connected.wallet.invokeMethod({
          scope:connected.scope,
          request:{
            method:'eth_sendTransaction',
            params:[{
              from:connected.address,
              to:tx.to,
              data:tx.data,
              value:tx.value,
              ...(tx.maxPriorityFeePerGas?{maxPriorityFeePerGas:tx.maxPriorityFeePerGas}:{}),
              ...(tx.maxFeePerGas?{maxFeePerGas:tx.maxFeePerGas}:{}),
              ...(tx.gas?{gas:tx.gas}:{})
            }]
          }
        });
        const sent=await waitForMetaMaskApprovalWithExplicitLaunch(
          sendPromise,
          session?'OPEN METAMASK — NFT '+String(itemNumber)+' OF '+String(target):'OPEN METAMASK TO APPROVE',
          'The mint transaction is ready. Tap Open MetaMask, review '+networkName+' and the price, approve the transaction, then return to X.'
        );

        evmTransactionHash=
          typeof sent==='string'
            ? sent
            : String(sent?.result||sent?.transactionHash||'');

        if(!/^0x[a-fA-F0-9]{64}$/.test(evmTransactionHash)){
          throw new Error('MetaMask did not return a valid '+networkName+' transaction hash.');
        }

        // Persist BEFORE the first confirmation request. A reload, wallet return,
        // RPC timeout, or app switch can no longer cause a second accidental mint.
        savePendingEvmMint({
          order_id:evmActiveOrderId,
          transaction_hash:evmTransactionHash,
          chain_key:preparedNetwork.chain_key
        });

        setEvmStatus(
          session?'CONFIRMING NFT '+String(itemNumber)+' OF '+String(target):'TRANSACTION SENT',
          'One Home is confirming the NFT and recording the Token ID.',
          true
        );

        lastConfirmed=await confirmEvmUntilDone();
        clearPendingEvmMint();
        evmActiveOrderId='';
        evmTransactionHash='';

        evmMintState=await callEvmCampaign('status');
        if(!session)break;

        const nowDone=evmBatchProgress(session,evmMintState);
        if(nowDone<target){
          setEvmStatus('NFT '+String(nowDone)+' OF '+String(target)+' COMPLETE','The completed NFT is safe. One Home is continuing your selected mint session.',true);
          await sleep(500);
        }
      }

      if(session){
        const finalDone=evmBatchProgress(session,evmMintState);
        if(finalDone>=target)clearEvmBatchSession();
        setEvmStatus('MINT SESSION COMPLETE',String(finalDone)+' NFT'+(finalDone===1?'':'s')+' minted and recorded by One Home.',false);
      }else{
        setEvmStatus('MINT CONFIRMED','Token #'+String(lastConfirmed?.token_id||'')+' was minted to '+shortEvm(lastConfirmed?.wallet_address||expected)+'.',false);
      }
      await showMintSuccessReceipt(lastConfirmed||{});
      await renderEvmMint(evmMintState);

    }catch(error){
      console.error('One Home EVM campaign mint',error);

      if(evmActiveOrderId&&!evmTransactionHash){
        try{await callEvmCampaign('cancel',{order_id:evmActiveOrderId})}catch(_error){}
      }

      if(evmTransactionHash){
        savePendingEvmMint({
          order_id:evmActiveOrderId,
          transaction_hash:evmTransactionHash,
          chain_key:networkFromData(evmMintState||{}).chain_key
        });
        setEvmStatus(
          'TRANSACTION SUBMITTED',
          'MetaMask returned a transaction hash. One Home will resume verification automatically; do not mint again. '+String(evmTransactionHash),
          false
        );
      }else{
        const session=readEvmBatchSession();
        const done=session?evmBatchProgress(session,evmMintState):0;
        setEvmStatus(
          done>0?'MINT SESSION PAUSED':'MINT NOT COMPLETED',
          done>0?String(done)+' NFT'+(done===1?' is':'s are')+' complete and safe. Reopen this mint to continue the remaining selection.':collectorMintError(error),
          false
        );
      }
    }finally{
      evmMintBusy=false;
      const pending=readPendingEvmMint();
      setButtons(
        !pending&&Boolean(
          evmMintState?.open&&
          Number(evmMintState?.mint?.remaining)>0&&
          Number(evmMintState?.buyer?.remaining_under_wallet_limit)>0
        )
      );
    }
  }


  function readStoredBatchMint(){
    try{
      const value=JSON.parse(localStorage.getItem(BATCH_MINT_KEY)||'null');
      if(!value||typeof value!=='object') return null;
      if(value.campaign_id&&activeCampaignId()&&String(value.campaign_id)!==activeCampaignId()) return null;
      if(!value.order_id||!value.token) return null;
      return value;
    }catch(_error){return null;}
  }

  function readBatchMint(){
    return readStoredBatchMint();
  }

  function saveBatchMint(value){
    if(!value?.order_id||!value?.token) return;
    try{
      localStorage.setItem(BATCH_MINT_KEY,JSON.stringify({
        ...value,
        campaign_id:String(value.campaign_id||activeCampaignId()||''),
        saved_at:Date.now()
      }));
    }catch(_error){}
  }

  function clearBatchMint(){
    try{localStorage.removeItem(BATCH_MINT_KEY);}catch(_error){}
  }

  function completedBatchOrderId(batch){
    const completed=batch?.batch_completed===true ||
      String(batch?.status||'').toLowerCase()==='completed' ||
      (Number(batch?.quantity)>0&&Number(batch?.completed_count)>=Number(batch?.quantity));
    return completed?String(batch?.order_id||'').trim():'';
  }

  function batchReceiptWasShown(batch){
    const orderId=completedBatchOrderId(batch);
    if(!orderId)return false;
    try{
      const saved=JSON.parse(localStorage.getItem(BATCH_RECEIPT_KEY)||'null');
      return String(saved?.order_id||'')===orderId;
    }catch(_error){return false;}
  }

  function rememberBatchReceiptShown(batch){
    const orderId=completedBatchOrderId(batch);
    if(!orderId)return;
    try{localStorage.setItem(BATCH_RECEIPT_KEY,JSON.stringify({order_id:orderId,shown_at:Date.now()}));}catch(_error){}
  }

  function batchFromResponse(batch,provider){
    if(!batch?.order_id||!batch?.token) return null;
    const value={
      order_id:String(batch.order_id),
      token:String(batch.token),
      quantity:Math.max(2,Math.min(8,Number(batch.quantity)||2)),
      completed_count:Math.max(0,Number(batch.completed_count)||0),
      position:Math.max(1,Number(batch.position)||Number(batch.completed_count)+1||1),
      unit_price:Number(batch.unit_price)||Number(currentMint?.settings?.price)||0,
      total_price:Number(batch.total_price)||0,
      wallet_provider:String(batch.wallet_provider||provider||verifiedProvider()||'xaman').toLowerCase(),
      collector_wallet:String(batch.collector_wallet||verifiedWallet()||''),
      campaign_id:String(batch.campaign_id||activeCampaignId()||''),
      status:String(batch.status||'active').toLowerCase()
    };
    saveBatchMint(value);
    return value;
  }

  async function recoverActiveBatchFromServer(context,provider,quiet){
    const campaignId=activeCampaignId();
    if(!/^[0-9a-f-]{36}$/i.test(campaignId)) return null;
    if(!(await isAuthenticated())) return null;

    const request={
      campaign_id:campaignId
    };
    const orderId=String(context?.order_id||'').trim();
    const wallet=String(context?.collector_wallet||verifiedWallet()||'').trim();
    const walletProvider=String(provider||context?.wallet_provider||verifiedProvider()||'').trim().toLowerCase();

    if(/^[0-9a-f-]{36}$/i.test(orderId)) request.order_id=orderId;
    if(/^r[1-9A-HJ-NP-Za-km-z]{24,34}$/.test(wallet)) request.collector_wallet=wallet;
    if(['xaman','crossmark','joey'].includes(walletProvider)) request.wallet_provider=walletProvider;

    try{
      const result=await callFunction('mint-batch-session',request,true);
      if(result.data?.found!==true||!result.data?.batch) return null;
      const batch=result.data.batch;
      if(batch.batch_completed===true||String(batch.status||'').toLowerCase()==='completed'){
        clearBatchMint();
        return batch;
      }
      return batchFromResponse(batch,walletProvider);
    }catch(error){
      if(!quiet) throw error;
      console.warn('One Home durable batch recovery',error);
      return null;
    }
  }

  async function inspectBatchServerState(context,provider,quiet){
    const campaignId=activeCampaignId();
    if(!/^[0-9a-f-]{36}$/i.test(campaignId)) return null;
    if(!(await isAuthenticated())) return null;

    const request={action:'status',campaign_id:campaignId};
    const orderId=String(context?.order_id||'').trim();
    const wallet=String(context?.collector_wallet||verifiedWallet()||'').trim();
    const walletProvider=String(provider||context?.wallet_provider||verifiedProvider()||'').trim().toLowerCase();

    if(/^[0-9a-f-]{36}$/i.test(orderId)) request.order_id=orderId;
    if(/^r[1-9A-HJ-NP-Za-km-z]{24,34}$/.test(wallet)) request.collector_wallet=wallet;
    if(['xaman','crossmark','joey'].includes(walletProvider)) request.wallet_provider=walletProvider;

    try{
      const result=await callFunction('mint-batch-session',request,true);
      if(result.data?.found!==true||!result.data?.batch) return null;
      return result.data.batch;
    }catch(error){
      if(!quiet) throw error;
      console.warn('One Home durable batch status check',error);
      return null;
    }
  }

  function clearBatchRecoveryTimer(resetAttempts){
    if(batchRecoveryTimer) clearTimeout(batchRecoveryTimer);
    batchRecoveryTimer=null;
    batchRecoveryKey='';
    if(resetAttempts!==false) batchRecoveryAttempts=0;
  }

  function mintFlowUiLockState(){
    const stored=readBatchMint();
    const pending=pendingMintForCurrentContext();
    let callbackPayload='';
    try{callbackPayload=String(new URLSearchParams(window.location.search).get('xaman_mint_payload')||'').trim();}catch(_error){}
    const batchActive=Boolean(
      stored?.order_id ||
      pending?.batch_order_id ||
      batchContinuationPromise ||
      batchRecoveryTimer ||
      batchRecoveryKey
    );
    const returnActive=Boolean(
      /^[0-9a-f-]{36}$/i.test(callbackPayload) ||
      xamanReturnPromise
    );
    return {
      locked:batchActive||returnActive,
      batch_active:batchActive,
      return_active:returnActive,
      bound_wallet:String(stored?.collector_wallet||pending?.collector_wallet||verifiedWallet()||'')
    };
  }

  async function finishBatchFromAuthoritativeState(batch){
    const status=q('founderMintStatus');
    clearPendingMint();
    clearBatchMint();
    clearBatchRecoveryTimer();
    try{await loadMint({campaign_id:activeCampaignId(),network:requestedNetwork()});}catch(_error){}
    if(status){
      status.classList.remove('is-preparing');
      status.innerHTML='<strong>MINT SUCCESSFUL</strong>';
    }
    if(desktopXamanMintWindow && !desktopXamanMintWindow.closed){
      try{desktopXamanMintWindow.close();}catch(_error){}
    }
    desktopXamanMintWindow=null;
    setButtons(false);
    await showBatchSuccessReceipt(batch||{});
    rememberBatchReceiptShown(batch);
    return true;
  }

  async function finishOrContinueVerifiedCrossmarkBatch(serverBatch,fallbackContext){
    let batch=serverBatch?.order_id?serverBatch:null;
    const fallback=fallbackContext?.order_id?fallbackContext:null;
    const walletProvider=normalizeXrplProvider(serverBatch?.wallet_provider||fallback?.wallet_provider)||'crossmark';

    // Compatibility recovery is intentionally server-authoritative. It also
    // makes the frontend safe during a controlled Edge Function deployment:
    // an older verifier response can never advance with a stale browser token.
    if(!batch&&fallback){
      batch=await recoverActiveBatchFromServer(fallback,walletProvider,false);
      if(!batch){
        batch=await inspectBatchServerState(fallback,walletProvider,false);
      }
    }
    if(!batch?.order_id){
      throw new Error('One Home verified the NFT but did not receive the authoritative multi-mint order state.');
    }

    const completed=completedBatchOrderId(batch);
    if(completed){
      if(batchReceiptWasShown(batch)){
        clearPendingMint();
        clearBatchMint();
        clearBatchRecoveryTimer();
        try{await loadMint({campaign_id:activeCampaignId(),network:requestedNetwork()});}catch(_error){}
        return true;
      }
      return finishBatchFromAuthoritativeState(batch);
    }

    const active=batchFromResponse(batch,walletProvider);
    if(!active){
      throw new Error('One Home verified the NFT but did not receive a safe continuation token for the next item.');
    }

    // A Crossmark item verified from inside continueBatchOrder must let that
    // exact single-flight promise unwind before opening the next position.
    // Awaiting continueBatchOrder here would await the promise currently
    // executing this function and permanently deadlock the UI.
    if(batchContinuationPromise){
      showBatchRecoveryState('The item is verified. One Home is opening the next wallet approval from the updated server order.');
      setTimeout(function(){continueBatchOrder(active,walletProvider);},0);
      return true;
    }
    return continueBatchOrder(active,walletProvider);
  }

  function showBatchRecoveryState(message){
    const status=q('founderMintStatus');
    if(status){
      status.classList.add('is-preparing');
      status.innerHTML='<strong>RESUMING MULTI-MINT</strong><span>'+String(message||'One Home is confirming the exact next item in your existing order. Do not start another mint.')+'</span>';
    }
    setButtons(false);
  }

  function scheduleBatchRecovery(context,provider,delay){
    const orderId=String(context?.order_id||'').trim();
    if(!/^[0-9a-f-]{36}$/i.test(orderId)) return false;
    const walletProvider=String(provider||context?.wallet_provider||'xaman').toLowerCase()==='crossmark'?'crossmark':'xaman';
    const key=orderId+':'+walletProvider;
    if(batchRecoveryTimer && batchRecoveryKey===key) return true;
    if(batchRecoveryTimer) clearTimeout(batchRecoveryTimer);
    batchRecoveryKey=key;
    batchRecoveryTimer=setTimeout(async function(){
      batchRecoveryTimer=null;
      try{
        const pending=pendingMintForCurrentContext();
        if(pending?.batch_order_id===orderId){
          if(walletProvider==='xaman'){
            const signUrl=String(pending.sign_url||'').trim();
            if(signUrl){
              batchRecoveryAttempts=0;
              if(isMobileBrowser()){
                showMintXamanLaunch(signUrl,'Your next Xaman approval is ready. Open this exact request to continue the existing multi-mint.');
              }else{
                // Desktop batch recovery stays in the current tab. Never
                // resurrect the retired popup/bridge flow for an active batch.
                if(desktopXamanMintWindow && !desktopXamanMintWindow.closed){
                  try{desktopXamanMintWindow.close();}catch(_error){}
                }
                desktopXamanMintWindow=null;
                window.location.assign(signUrl);
              }
              return;
            }
          }else if(pending.claim_id){
            batchRecoveryAttempts=0;
            await verifyPendingMint(true);
            return;
          }
        }

        const serverState=await inspectBatchServerState(context,walletProvider,true);
        const serverStatus=String(serverState?.status||'').toLowerCase();
        if(serverState?.batch_completed===true||serverStatus==='completed'){
          batchRecoveryAttempts=0;
          await finishBatchFromAuthoritativeState(serverState);
          return;
        }
        if(serverStatus==='cancelled'||serverStatus==='expired'){
          clearPendingMint();
          clearBatchMint();
          clearBatchRecoveryTimer();
          try{await loadMint({campaign_id:activeCampaignId(),network:requestedNetwork()});}catch(_error){}
          const status=q('founderMintStatus');
          if(status){
            status.classList.remove('is-preparing');
            status.innerHTML='<strong>MULTI-MINT ENDED</strong><span>This server order is '+serverStatus+'. Your completed NFTs are safe. If the mint is still open, the normal controls above are available for a new order.</span>';
          }
          return;
        }
        if(serverStatus==='active' && serverState?.recoverable!==false){
          const recovered=await recoverActiveBatchFromServer(context,walletProvider,true);
          if(recovered?.batch_completed===true||String(recovered?.status||'').toLowerCase()==='completed'){
            batchRecoveryAttempts=0;
            await finishBatchFromAuthoritativeState(recovered);
            return;
          }
          if(recovered?.order_id&&recovered?.token){
            showBatchRecoveryState('Your existing order is active. One Home is opening the next approval now.');
            setTimeout(function(){continueBatchOrder(recovered,walletProvider);},120);
            return;
          }
        }

        // A mobile Xaman return can temporarily land in a browser context that
        // cannot see the Home ID session. The server-issued batch token remains
        // sufficient for the protected on-demand continuation. Retry the newest
        // token cached for this SAME order before giving up on recovery.
        if(!serverState){
          const cached=readBatchMint();
          const retryContext=(cached?.order_id===orderId&&cached?.token)?cached:context;
          if(retryContext?.order_id===orderId&&retryContext?.token&&batchRecoveryAttempts<6){
            showBatchRecoveryState('One Home is restoring the next approval from the existing server-issued batch continuation.');
            setTimeout(function(){continueBatchOrder(retryContext,walletProvider);},180);
            return;
          }
        }

        batchRecoveryAttempts+=1;
        if(batchRecoveryAttempts<6){
          showBatchRecoveryState('Your completed NFTs are safe. One Home is waiting for the durable order to finish reconciling before opening the next approval.');
          scheduleBatchRecovery(context,walletProvider,Math.min(4000,900+(batchRecoveryAttempts*500)));
          return;
        }

        const status=q('founderMintStatus');
        if(status){
          status.classList.remove('is-preparing');
          status.innerHTML='<strong>MULTI-MINT NEEDS ATTENTION</strong><span>One Home could not confirm a final server state after several retries. Your completed NFTs are safe. Reopen this same mint to retry recovery; do not start a second order.</span>';
        }
        setButtons(false);
      }catch(error){
        console.warn('One Home multi-mint recovery retry',error);
        batchRecoveryAttempts+=1;
        if(batchRecoveryAttempts<6){
          showBatchRecoveryState('The connection was interrupted while checking your existing order. One Home will retry automatically; do not start another mint.');
          scheduleBatchRecovery(context,walletProvider,Math.min(4000,1000+(batchRecoveryAttempts*500)));
        }else{
          const status=q('founderMintStatus');
          if(status){
            status.classList.remove('is-preparing');
            status.innerHTML='<strong>MULTI-MINT NEEDS ATTENTION</strong><span>The server could not be reached after several retries. Your completed NFTs are safe. Reopen this same mint when the connection is stable; do not start another order.</span>';
          }
          setButtons(false);
        }
      }
    },Math.max(150,Number(delay)||900));
    return true;
  }

  function readXamanReturnSignal(){
    try{
      const value=JSON.parse(localStorage.getItem(XAMAN_RETURN_SIGNAL_KEY)||'null');
      if(!value||typeof value!=='object') return null;
      const payload=String(value.payload_uuid||'').trim();
      const campaign=String(value.campaign_id||'').trim();
      const savedAt=Number(value.saved_at||0);
      if(!/^[0-9a-f-]{36}$/i.test(payload)) return null;
      if(campaign&&activeCampaignId()&&campaign!==activeCampaignId()) return null;
      if(savedAt&&Date.now()-savedAt>30*60*1000){
        localStorage.removeItem(XAMAN_RETURN_SIGNAL_KEY);
        return null;
      }
      return value;
    }catch(_error){return null;}
  }

  function clearXamanReturnSignal(){
    try{localStorage.removeItem(XAMAN_RETURN_SIGNAL_KEY);}catch(_error){}
  }

  function handleXamanReturnSignal(value){
    const signal=value&&typeof value==='object'?value:readXamanReturnSignal();
    if(!signal) return false;
    const payload=String(signal.payload_uuid||'').trim();
    const campaign=String(signal.campaign_id||'').trim();
    if(!/^[0-9a-f-]{36}$/i.test(payload)) return false;
    if(campaign&&activeCampaignId()&&campaign!==activeCampaignId()) return false;
    clearXamanReturnSignal();
    const now=Date.now();
    if(lastXamanReturnSignalPayload===payload && now-lastXamanReturnSignalAt<30000) return true;
    lastXamanReturnSignalPayload=payload;
    lastXamanReturnSignalAt=now;
    setTimeout(function(){resumeXamanReturn(payload);},20);
    return true;
  }

  function acknowledgeDesktopXamanBridge(source,payload){
    if(!source)return;
    try{
      source.postMessage({type:XAMAN_RETURN_ACK_TYPE,payload_uuid:String(payload||'')},location.origin);
    }catch(_error){}
  }

  function handleDesktopXamanBridgeMessage(event){
    if(event.origin!==location.origin)return;
    const signal=event.data&&typeof event.data==='object'?event.data:null;
    if(!signal||signal.type!==XAMAN_RETURN_MESSAGE_TYPE)return;
    const payload=String(signal.payload_uuid||'').trim();
    const campaign=String(signal.campaign_id||'').trim();
    if(!/^[0-9a-f-]{36}$/i.test(payload))return;
    if(campaign&&activeCampaignId()&&campaign!==activeCampaignId())return;
    try{
      if(event.source && !event.source.closed) desktopXamanMintWindow=event.source;
    }catch(_error){}
    acknowledgeDesktopXamanBridge(event.source,payload);
    handleXamanReturnSignal(signal);
    try{window.focus();}catch(_error){}
  }

  function startXamanReturnChannel(){
    if(typeof BroadcastChannel!=='function'||xamanReturnChannel)return;
    try{
      xamanReturnChannel=new BroadcastChannel(XAMAN_RETURN_CHANNEL_NAME);
      xamanReturnChannel.addEventListener('message',function(event){
        const signal=event.data&&typeof event.data==='object'?event.data:null;
        if(!signal||signal.type!==XAMAN_RETURN_MESSAGE_TYPE)return;
        handleXamanReturnSignal(signal);
        try{window.focus();}catch(_error){}
      });
    }catch(_error){xamanReturnChannel=null;}
  }

  function setQuantityControlsEnabled(enabled){
    ['founderMintQtyMinus','founderMintQtyPlus'].forEach(function(id){const el=q(id);if(el)el.disabled=!enabled;});
  }

  function updateMintQuantityUi(){
    selectedMintQuantity=Math.max(1,Math.min(selectedMintQuantityMax||1,selectedMintQuantity||1));
    text('founderMintQtyValue',String(selectedMintQuantity));
    const label=q('founderMintQtyLabel');
    if(label) label.textContent=rareRoutesMode()?(selectedMintQuantity===1?'Route Ticket':'Route Tickets'):(selectedMintQuantity===1?'NFT':'NFTs');
    const price=evmCampaignMode?(Number(evmMintState?.mint?.price)||0):currentXrplPublicPrice(currentMint?.settings?.price);
    const currency=evmCampaignMode?String(evmMintState?.mint?.native_symbol||networkFromData(evmMintState||{}).native_symbol||'TEST'):String(currentMint?.settings?.currency||'XRP');
    const tierSchedule=!evmCampaignMode?activeXrplTierSchedule():null;
    text('founderMintQtyTotal',tierSchedule?(String(selectedMintQuantity)+' selected · exact '+currency+' price set per NFT'):(price*selectedMintQuantity).toLocaleString(undefined,{maximumFractionDigits:6})+' '+currency+' total');
    const mintVerb=selectedMintQuantity>1?'MINT '+selectedMintQuantity+' WITH':'MINT WITH';
    setProviderButtonLabel('founderMintXamanBtn',mintVerb);
    setProviderButtonLabel('founderMintCrossmarkBtn',mintVerb);
    setProviderButtonLabel('founderMintJoeyBtn',mintVerb);
    setProviderButtonLabel('founderMintMetaMaskBtn',mintVerb);
  }

  function ensureMintQuantityControl(data){
    // v14.67.206: Tier-priced XRPL mints keep the normal quantity selector.
    // onehome_reserve_mint_price remains authoritative per batch position.
    // v14.67.19: Quantity belongs to the mint page, not to a specific wallet
    // button. Older EVM test URLs can render without a MetaMask button until
    // the EVM mode is resolved; using that button as the insertion anchor made
    // the quantity selector disappear entirely. Anchor to the shared actions
    // container instead, with either wallet button only as a fallback.
    const actions=document.querySelector('#onehomeFounderMintPage .founder-mint-actions') ||
      q('founderMintMetaMaskBtn')?.closest('.founder-mint-actions') ||
      q('founderMintXamanBtn')?.closest('.founder-mint-actions');
    if(!actions) return;
    let box=q('founderMintQuantityControl');
    if(!box){
      box=document.createElement('div');
      box.id='founderMintQuantityControl';
      box.className='founder-mint-quantity-control';
      box.innerHTML='<div class="founder-mint-quantity-copy"><strong>HOW MANY?</strong><small id="founderMintQtyHelp">Choose how many NFTs to mint in this session.</small></div><div class="founder-mint-quantity-stepper"><button id="founderMintQtyMinus" type="button" aria-label="Decrease quantity">−</button><strong id="founderMintQtyValue">1</strong><button id="founderMintQtyPlus" type="button" aria-label="Increase quantity">+</button></div><div class="founder-mint-quantity-summary"><strong id="founderMintQtyLabel">NFT</strong><small id="founderMintQtyTotal">—</small></div>';
      actions.parentNode.insertBefore(box,actions);
      q('founderMintQtyMinus')?.addEventListener('click',function(){selectedMintQuantity=Math.max(1,selectedMintQuantity-1);updateMintQuantityUi();});
      q('founderMintQtyPlus')?.addEventListener('click',function(){selectedMintQuantity=Math.min(selectedMintQuantityMax,selectedMintQuantity+1);updateMintQuantityUi();});
    }

    let remaining=0;
    let walletRemaining=Number.POSITIVE_INFINITY;
    let creatorLimit=1;
    let enabledForMint=true;

    if(evmCampaignMode){
      const rawRemaining=Number(data?.mint?.remaining);
      const rawWalletRemaining=Number(data?.buyer?.remaining_under_wallet_limit);
      remaining=Number.isFinite(rawRemaining)
        ? Math.max(0,rawRemaining)
        : Math.max(0,Number(data?.campaign?.total_supply)||1);
      walletRemaining=Number.isFinite(rawWalletRemaining)
        ? Math.max(0,rawWalletRemaining)
        : Math.max(1,Number(data?.campaign?.per_wallet_limit)||1);
      creatorLimit=Math.max(1,Math.min(MAX_MINT_SESSION_QUANTITY,Number(data?.campaign?.max_per_mint)||1));
      const session=readEvmBatchSession();
      if(session){
        const progressed=evmBatchProgress(session,data);
        const sessionRemaining=Math.max(1,session.target_quantity-progressed);
        selectedMintQuantityMax=sessionRemaining;
        selectedMintQuantity=sessionRemaining;
        text('founderMintQtyHelp','Continuing your saved mint session: '+String(sessionRemaining)+' NFT'+(sessionRemaining===1?'':'s')+' remaining. Completed NFTs are safe.');
      }else{
        selectedMintQuantityMax=Math.max(1,Math.min(MAX_MINT_SESSION_QUANTITY,creatorLimit,remaining||1,walletRemaining||1));
        if(selectedMintQuantity>selectedMintQuantityMax) selectedMintQuantity=selectedMintQuantityMax;
        text('founderMintQtyHelp','Up to '+String(creatorLimit)+' NFT'+(creatorLimit===1?'':'s')+' per session.');
      }
    }else{
      remaining=Math.max(0,Number(data?.remaining)||0);
      const walletLimit=Math.max(1,Number(data?.settings?.per_wallet_limit)||1);
      const access=eligibilityFor(data,ACCESS_CACHE_MS);
      const cachedWalletRemaining=Number(access?.wallet_remaining);
      walletRemaining=Number.isFinite(cachedWalletRemaining)?Math.max(0,cachedWalletRemaining):walletLimit;
      creatorLimit=Math.max(1,Math.min(MAX_MINT_SESSION_QUANTITY,Number(data?.settings?.max_per_mint)||1));
      selectedMintQuantityMax=Math.max(1,Math.min(MAX_MINT_SESSION_QUANTITY,creatorLimit,remaining||1,walletRemaining||1));
      if(selectedMintQuantity>selectedMintQuantityMax) selectedMintQuantity=selectedMintQuantityMax;
      enabledForMint=String(data?.campaign?.mint_method||'').toLowerCase()==='on_demand';
      if(activeXrplTierSchedule()) text('founderMintQtyHelp','Up to '+String(creatorLimit)+' NFT'+(creatorLimit===1?'':'s')+' per session. Each NFT gets its exact tier price automatically.');
      else text('founderMintQtyHelp','Up to '+String(creatorLimit)+' NFT'+(creatorLimit===1?'':'s')+' per session.');
    }

    box.hidden=false;
    if(!enabledForMint){
      text('founderMintQtyHelp','This mint type currently allows one NFT per wallet approval.');
      selectedMintQuantityMax=1;
      selectedMintQuantity=1;
    }else if(activeXrplTierSchedule()){
      text('founderMintQtyHelp','Up to '+String(creatorLimit)+' NFT'+(creatorLimit===1?'':'s')+' per session. Each NFT gets its exact tier price automatically.');
    }else if(selectedMintQuantityMax<2){
      if(remaining<=1) text('founderMintQtyHelp','Only 1 NFT remains in this mint.');
      else if(creatorLimit<=1) text('founderMintQtyHelp','Creator allows a maximum of 1 NFT per mint session.');
      else if(Number.isFinite(walletRemaining)&&walletRemaining<=1) text('founderMintQtyHelp','This wallet has 1 NFT remaining under its lifetime wallet limit.');
      else text('founderMintQtyHelp','Only 1 NFT is currently available to this wallet in this session.');
    }
    updateMintQuantityUi();
  }

  async function showBatchSuccessReceipt(_batch){
    return showSimpleMintSuccessReceipt();
  }

  // v14.67.72 mobile recovery: when two mobile return contexts briefly race,
  // one may create the Xaman payload while the other receives
  // XAMAN_REQUEST_ALREADY_EXISTS for the same claim. The v13.85 batch-aware
  // create-xaman function can recover that existing payload, but immediately
  // after creation Xaman's GET endpoint can take a moment to expose it. Retry
  // the SAME claim only; never reserve or create a replacement claim here.
  async function createOrRecoverBatchXamanRequest(body){
    let lastError=null;
    const requestBody={
      ...(body||{}),
      // Batch desktop navigation is intentionally same-tab. Mobile keeps the
      // already-proven app-switch return path.
      client_return_mode:isMobileBrowser()?'mobile':'same_tab'
    };
    for(let attempt=0;attempt<4;attempt+=1){
      try{
        return await callFunction('create-xaman-mint-request',requestBody,false);
      }catch(error){
        lastError=error;
        const code=String(error?.code||'').toUpperCase();
        if(code!=='XAMAN_REQUEST_ALREADY_EXISTS') throw error;
        const saved=pendingMintForCurrentContext();
        if(saved?.claim_id===String(requestBody?.claim_id||'') && saved?.sign_url){
          return {
            status:200,
            data:{
              success:true,
              recovered_existing_request:true,
              xaman:{payload_uuid:String(saved.payload_uuid||''),sign_url:String(saved.sign_url||'')}
            }
          };
        }
        if(attempt<3){
          await new Promise(function(resolve){setTimeout(resolve,250*(attempt+1));});
        }
      }
    }
    throw lastError||new Error('The existing Xaman signing request could not be recovered yet.');
  }

  function batchSessionTokenError(error){
    const code=String(error?.code||'').toUpperCase();
    const combined=(String(error?.message||'')+' '+String(error?.detail||'')).trim();
    return code==='BATCH_SESSION_INVALID' ||
      (code==='BATCH_ORDER_ERROR' && /BATCH_SESSION_INVALID|multi-mint session is no longer valid|multi-mint session could not be verified/i.test(combined)) ||
      /multi-mint session is no longer valid|multi-mint session could not be verified/i.test(combined);
  }

  async function continueBatchOrder(batch,provider){
    const context=batch||readBatchMint();
    if(!context?.order_id||!context?.token) return false;
    const key=String(context.order_id)+':'+String(context.token);
    if(batchContinuationPromise){
      return batchContinuationPromise;
    }
    batchContinuationKey=key;
    const work=continueBatchOrderUnlocked(context,provider);
    batchContinuationPromise=work;
    try{
      return await work;
    }finally{
      if(batchContinuationPromise===work){
        batchContinuationPromise=null;
        batchContinuationKey='';
      }
    }
  }

  async function continueBatchOrderUnlocked(batch,provider){
    const context=batch||readBatchMint();
    if(!context?.order_id||!context?.token) return false;
    const walletProvider=normalizeXrplProvider(provider||context.wallet_provider)||'xaman';
    const status=q('founderMintStatus');
    clearBatchRecoveryTimer(false);
    mintActionActive=true;
    setButtons(false);
    try{
      if(status){status.classList.add('is-preparing');status.innerHTML='<strong>PREPARING NEXT MINT</strong><span>One Home is preparing the next item in your '+String(context.quantity||'')+'-item order.</span>';}
      let continuationContext=context;
      let claimResult;
      try{
        claimResult=await reserveMintWithRetry(
          'on-demand-mint-manager',
          {batch_order_id:continuationContext.order_id,batch_token:continuationContext.token},
          status,
          false
        );
      }catch(error){
        if(!batchSessionTokenError(error)) throw error;

        // Browser/local tokens are only a cache. If one is stale, recover the
        // exact durable order through the authenticated server session manager.
        // This never creates a replacement order.
        if(status){
          status.classList.add('is-preparing');
          status.innerHTML='<strong>RECOVERING MULTI-MINT</strong><span>One Home is re-opening your existing order from its server record. Completed NFTs will not be repeated.</span>';
        }
        const recovered=await recoverActiveBatchFromServer(
          continuationContext,
          walletProvider,
          false
        );
        if(!recovered?.order_id||!recovered?.token) throw error;
        if(String(recovered.order_id)!==String(continuationContext.order_id)){
          throw new Error('One Home refused to switch to a different multi-mint order during recovery.');
        }
        continuationContext=recovered;
        claimResult=await reserveMintWithRetry(
          'on-demand-mint-manager',
          {batch_order_id:continuationContext.order_id,batch_token:continuationContext.token},
          status,
          false
        );
      }
      const returnedBatch=batchFromResponse(claimResult.data?.batch||continuationContext,walletProvider)||continuationContext;
      if(claimResult.data?.batch_completed===true||String(returnedBatch.status||'').toLowerCase()==='completed'||Number(returnedBatch.completed_count)>=Number(returnedBatch.quantity)){
        clearPendingMint();clearBatchMint();
        try{await loadMint({campaign_id:activeCampaignId(),network:requestedNetwork()});}catch(_error){}
        if(status){status.classList.remove('is-preparing');status.innerHTML='<strong>MINT SUCCESSFUL</strong>';}
        await showBatchSuccessReceipt(returnedBatch);
        rememberBatchReceiptShown(returnedBatch);
        mintActionActive=false;setButtons(true);return true;
      }
      const claim=claimResult.data?.claim||claimResult.data||{};
      const claimId=String(claim.id||claimResult.data?.claim_id||'').trim();
      const reservationToken=String(claim.reservation_token||claimResult.data?.reservation_token||'').trim();
      if(!claimId||!reservationToken) throw new Error('One Home did not receive the next reserved mint claim.');
      const position=Math.max(1,Number(returnedBatch.position)||Number(returnedBatch.completed_count)+1);
      if(walletProvider==='joey'){
        const api=window.OneHomeJoeyWallet;if(!api?.connect||!api?.signAndSubmit)throw new Error('Joey Wallet connection is still loading. Refresh One Home and continue your multi-mint order.');
        const expected=String(returnedBatch.collector_wallet||verifiedWallet()||'').trim();
        const connected=await api.connect();const connectedAddress=String(connected?.address||api.getAddress?.()||'').trim();
        if(!validXrplWallet(connectedAddress)||connectedAddress.toLowerCase()!==expected.toLowerCase())throw new Error('Joey Wallet opened a different wallet than the wallet bound to this multi-mint order.');
        const transaction=claimResult.data?.transaction;if(!transaction||transaction.TransactionType!=='NFTokenAcceptOffer')throw new Error('One Home did not receive a valid Joey Wallet mint transaction.');
        if(status)status.innerHTML='<strong>APPROVE '+position+' OF '+returnedBatch.quantity+' IN JOEY WALLET</strong><span>Approve this item to continue your order.</span>';
        const submitted=await api.signAndSubmit(transaction,expected,'NFTokenAcceptOffer');const transactionHash=String(submitted?.hash||'').trim().toUpperCase();
        if(!/^[A-F0-9]{64}$/.test(transactionHash))throw new Error('Joey Wallet did not return a valid transaction hash. Do not approve this item again; refresh One Home to recover the order.');
        savePendingMint({claim_id:claimId,reservation_token:reservationToken,transaction_hash:transactionHash,wallet_provider:'joey',collector_wallet:expected,campaign_id:activeCampaignId(),network:requestedNetwork(),batch_order_id:returnedBatch.order_id,batch_token:returnedBatch.token,batch_quantity:returnedBatch.quantity,batch_position:position});
        batchRecoveryAttempts=0;mintActionActive=false;await verifyPendingMint(false);return true;
      }
      if(walletProvider==='crossmark'){
        const sdk=findCrossmarkSdk();if(!sdk)throw new Error('Open or install the Crossmark browser extension, then continue your multi-mint order.');
        const transaction=claimResult.data?.transaction;if(!transaction||transaction.TransactionType!=='NFTokenAcceptOffer')throw new Error('One Home did not receive a valid Crossmark mint transaction.');
        if(status)status.innerHTML='<strong>APPROVE '+position+' OF '+returnedBatch.quantity+' IN CROSSMARK</strong><span>Approve this item to continue your order.</span>';
        const submitted=await crossmarkSubmitForOneHome(sdk,transaction);const transactionHash=String(submitted.hash||'').toUpperCase();
        if(!transactionHash){
          if(submitted.submitted){
            if(status){status.classList.add('is-preparing');status.innerHTML='<strong>TRANSACTION SUBMITTED</strong><span>Crossmark received tesSUCCESS but its server is busy. Your completed mints are safe. One Home is recovering this transaction; do not approve it again.</span>';}
            crossmarkRecoveryKey='';crossmarkRecoveryPromise=null;mintActionActive=false;setTimeout(function(){recoverCrossmarkMint(currentMint)},1200);return true;
          }
          throw new Error('Crossmark did not return a submitted transaction result.');
        }
        savePendingMint({claim_id:claimId,reservation_token:reservationToken,transaction_hash:transactionHash,wallet_provider:'crossmark',collector_wallet:returnedBatch.collector_wallet||verifiedWallet()||'',campaign_id:activeCampaignId(),network:requestedNetwork(),batch_order_id:returnedBatch.order_id,batch_token:returnedBatch.token,batch_quantity:returnedBatch.quantity,batch_position:position});
        batchRecoveryAttempts=0;
        if(submitted.recoveredFromBusy&&status){status.classList.add('is-preparing');status.innerHTML='<strong>TRANSACTION SUBMITTED</strong><span>Confirming this item. Do not approve it again.</span>';}
        mintActionActive=false;
        await verifyPendingMint(false);
        return true;
      }
      if(status)status.innerHTML='<strong>CREATING XAMAN REQUEST '+position+' OF '+returnedBatch.quantity+'</strong><span>Your next item is reserved.</span>';
      const requestResult=await createOrRecoverBatchXamanRequest({claim_id:claimId,reservation_token:reservationToken,batch_order_id:returnedBatch.order_id,batch_token:returnedBatch.token});
      const xaman=requestResult.data?.xaman||{};const signUrl=String(xaman.sign_url||requestResult.data?.sign_url||'').trim();if(!signUrl)throw new Error('Xaman did not return the next signing link.');
      savePendingMint({claim_id:claimId,reservation_token:reservationToken,payload_uuid:xaman.payload_uuid||'',sign_url:signUrl,wallet_provider:'xaman',collector_wallet:returnedBatch.collector_wallet||verifiedWallet()||'',campaign_id:activeCampaignId(),network:requestedNetwork(),batch_order_id:returnedBatch.order_id,batch_token:returnedBatch.token,batch_quantity:returnedBatch.quantity,batch_position:position});
      batchRecoveryAttempts=0;
      if(isMobileBrowser() && simplePublicXrplUi()){
        if(status)status.innerHTML='<strong>XAMAN REQUEST READY · '+position+' OF '+returnedBatch.quantity+'</strong><span>Tap OPEN XAMAN to approve this exact ticket and continue your existing order.</span>';
        // v14.67.219: Safari/Xaman mobile deeplinks must be triggered by the
        // collector's direct tap. Do not mark the payload as launched and do
        // not script-redirect after the async reserve/create chain. The armed
        // OPEN XAMAN anchor marks the exact saved UUID only when it is tapped.
        presentPreparedMobileXaman(signUrl,xaman.payload_uuid||'',returnedBatch,'Mint '+position+' of '+returnedBatch.quantity+' is ready. Tap OPEN XAMAN to approve this exact request.');
      }else if(isMobileBrowser()){
        if(status)status.innerHTML='<strong>APPROVE '+position+' OF '+returnedBatch.quantity+' IN XAMAN</strong><span>Approve this ticket. One Home will automatically prepare the next one.</span>';
        showMintXamanLaunch(signUrl,'Mint '+position+' of '+returnedBatch.quantity+' is ready. One Home is opening Xaman now. Use Open Xaman if the app does not open automatically.');
        try{window.location.assign(signUrl);}catch(_error){}
      }else{
        // Desktop batch stays in one browsing context. This avoids popup focus
        // restrictions entirely and gives every approval the same
        // server-authoritative return path. Any legacy popup reference is
        // closed before leaving the current tab.
        if(desktopXamanMintWindow && !desktopXamanMintWindow.closed){
          try{desktopXamanMintWindow.close();}catch(_error){}
        }
        desktopXamanMintWindow=null;
        window.location.assign(signUrl);
      }
      mintActionActive=false;
      return true;
    }catch(error){
      mintActionActive=false;
      console.error('One Home multi-mint continuation',error);

      // A browser/app-return exception is NOT authoritative batch state.
      // Check the durable order before showing any terminal UI. This prevents
      // iOS/Android/desktop return races from flashing a false PAUSED message
      // while another safe context is already opening the next approval.
      showBatchRecoveryState('One Home is confirming the durable order before opening the next approval. Your completed NFTs are safe.');
      try{
        const serverState=await inspectBatchServerState(context,walletProvider,true);
        const serverStatus=String(serverState?.status||'').toLowerCase();
        if(serverState?.batch_completed===true||serverStatus==='completed'){
          return await finishBatchFromAuthoritativeState(serverState);
        }
        if(serverStatus==='cancelled'||serverStatus==='expired'){
          clearPendingMint();
          clearBatchMint();
          clearBatchRecoveryTimer();
          try{await loadMint({campaign_id:activeCampaignId(),network:requestedNetwork()});}catch(_error){}
          if(status){
            status.classList.remove('is-preparing');
            status.innerHTML='<strong>MULTI-MINT ENDED</strong><span>This server order is '+serverStatus+'. Your completed NFTs are safe. If the mint is still open, the normal controls above are available for a new order.</span>';
          }
          return false;
        }
      }catch(statusError){
        console.warn('One Home multi-mint authoritative state check',statusError);
      }

      // Active, temporarily unreachable, or concurrently advancing orders stay
      // in a neutral recovery state. Buttons remain locked so the collector
      // cannot accidentally create a second order. Count only failed
      // continuation cycles; successful recovery resets this counter.
      batchRecoveryAttempts=Math.min(6,batchRecoveryAttempts+1);
      scheduleBatchRecovery(context,walletProvider,650);
      return false;
    }
  }



  function ensureMintReceiptStyles(){
    if(document.getElementById('onehome-mint-receipt-styles')) return;
    const style=document.createElement('style');
    style.id='onehome-mint-receipt-styles';
    style.textContent=`
      .onehome-mint-receipt-backdrop{position:fixed;inset:0;z-index:2147483000;background:rgba(0,0,0,.78);display:flex;align-items:center;justify-content:center;padding:20px}
      .onehome-mint-receipt{width:min(540px,100%);border:1px solid rgba(85,255,154,.72);border-radius:24px;background:rgba(5,14,9,.97);box-shadow:0 0 34px rgba(85,255,154,.2);padding:28px;text-align:center;color:#fff;font-family:inherit}
      .onehome-mint-receipt-check{width:74px;height:74px;border-radius:50%;margin:0 auto 16px;display:grid;place-items:center;background:#55ff9a;color:#062010;font-size:44px;font-weight:1000}
      .onehome-mint-receipt h2{margin:0 0 10px;font-size:clamp(30px,7vw,48px);line-height:1;color:#55ff9a}
      .onehome-mint-receipt-actions{display:grid;gap:10px;margin-top:22px}
      .onehome-mint-receipt button,.onehome-mint-receipt a{appearance:none;border:1px solid rgba(85,255,154,.5);border-radius:14px;background:#06100a;color:#55ff9a;font:inherit;font-weight:900;padding:14px 16px;text-decoration:none;cursor:pointer}
      .onehome-mint-receipt button:hover,.onehome-mint-receipt a:hover{background:rgba(85,255,154,.1)}
    `;
    document.head.appendChild(style);
  }

  function showSimpleMintSuccessReceipt(){
    ensureMintReceiptStyles();
    let backdrop=document.getElementById('onehomeMintSuccessReceipt');
    if(backdrop) backdrop.remove();

    backdrop=document.createElement('div');
    backdrop.id='onehomeMintSuccessReceipt';
    backdrop.className='onehome-mint-receipt-backdrop';
    backdrop.setAttribute('role','dialog');
    backdrop.setAttribute('aria-modal','true');
    backdrop.setAttribute('aria-label','Mint successful');

    const card=document.createElement('div');
    card.className='onehome-mint-receipt';
    card.innerHTML='<div class="onehome-mint-receipt-check">✓</div><h2>MINT SUCCESSFUL</h2><p>Your NFT has been delivered directly to your XRP wallet. No additional claim is required.</p>';

    const actions=document.createElement('div');
    actions.className='onehome-mint-receipt-actions';

    const myNfts=document.createElement('button');
    myNfts.type='button';
    myNfts.textContent='VIEW MY NFTs';
    myNfts.addEventListener('click',function(){window.location.assign('/?oh_return=mintedItemsPage');});
    actions.appendChild(myNfts);

    const recent=document.createElement('button');
    recent.type='button';
    recent.textContent='RECENTLY MINTED';
    recent.addEventListener('click',function(){openCampaignMintedNfts();});
    actions.appendChild(recent);

    const shareX=document.createElement('button');
    shareX.type='button';
    shareX.textContent='SHARE TO X';
    shareX.addEventListener('click',function(){shareCurrentMintToX(true);});
    actions.appendChild(shareX);

    const viewMint=document.createElement('button');
    viewMint.type='button';
    viewMint.textContent='VIEW MINT PAGE';
    viewMint.addEventListener('click',async function(){backdrop.remove();try{await refresh()}catch(_error){}});
    actions.appendChild(viewMint);

    const home=document.createElement('button');
    home.type='button';
    home.textContent='RETURN TO ONE HOME';
    home.addEventListener('click',function(){window.location.assign('/one-home/');});
    actions.appendChild(home);

    card.appendChild(actions);
    backdrop.appendChild(card);
    document.body.appendChild(backdrop);
  }

  function showMintSuccessReceipt(result){
    recordMintAttribution('mint_completed',result||{});
    return showSimpleMintSuccessReceipt();
  }
  window.oneHomeShowMintSuccessReceipt=function(result){
    return showMintSuccessReceipt(result||{});
  };

  async function verifyMintAccess(data,force){
    const campaignId=String(data?.campaign?.id || '').trim();
    const collectionId=String(data?.collection?.id || '').trim();
    const wallet=verifiedWallet();
    const founder=data?.access_mode==='founder' || data?.is_founder===true;
    if(!campaignId || !wallet) return null;

    const recent=force === true ? null : eligibilityFor(data,ACCESS_CACHE_MS);
    if(recent) return recent;

    const key=wallet.toLowerCase()+'|'+campaignId+'|'+(founder?'founder':'standard');
    if(accessCheckPromise && accessCheckKey===key) return accessCheckPromise;
    accessCheckKey=key;
    accessCheckPromise=(async function(){
      try{
        const result=founder
          ? await callFunction('xrpl-check-mint-gates',{campaign_id:campaignId,collection_id:collectionId,wallet_address:wallet},true)
          : await callFunction('check-mint-eligibility',{campaign_id:campaignId,collector_wallet:wallet},true);
        const gateData=result.data || {};
        if(gateData.eligible !== true){
          clearEligibility(founder);
          return null;
        }
        let allowance=null;
        let allowList=null;
        if(!founder){
          try{
            const allowanceResult=await callFunction('mint-limits-manager',{action:'buyer_allowance',campaign_id:campaignId,collector_wallet:wallet},true);
            allowance=allowanceResult?.data||null;
          }catch(allowanceError){
            console.warn('One Home mint allowance lookup',allowanceError);
          }
          try{
            const allowListResult=await callFunction('mint-buyer-entitlement',{campaign_id:campaignId,collector_wallet:wallet,wallet_provider:verifiedProvider()},true);
            allowList=allowListResult?.data||null;
          }catch(allowListError){
            console.warn('One Home Allow List buyer status',allowListError);
          }
        }
        const verified={
          eligible:true,
          campaign_id:campaignId,
          collection_id:collectionId,
          wallet:wallet,
          provider:verifiedProvider(),
          checked_at:Date.now(),
          source:'backend',
          wallet_remaining:Number.isFinite(Number(allowance?.wallet_remaining))?Math.max(0,Number(allowance.wallet_remaining)):null,
          completed_wallet_mints:Number.isFinite(Number(allowance?.completed_wallet_mints))?Math.max(0,Number(allowance.completed_wallet_mints)):null,
          active_wallet_mints:Number.isFinite(Number(allowance?.active_wallet_mints))?Math.max(0,Number(allowance.active_wallet_mints)):null,
          allow_list:allowList
        };
        storeEligibility(verified,founder);
        return verified;
      }catch(error){
        console.error('One Home mint access verification',error);
        return null;
      }finally{
        accessCheckPromise=null;
        accessCheckKey='';
      }
    })();
    return accessCheckPromise;
  }
  function parsePendingMintStorage(raw){
    try{
      const value=JSON.parse(raw||'null');
      if(!value || typeof value!=='object') return null;
      const savedAt=Number(value.saved_at||0);
      if(savedAt && Date.now()-savedAt>PENDING_MINT_MAX_AGE_MS) return null;
      return value;
    }catch(_error){return null;}
  }

  function readPendingMint(){
    const candidates=[];
    try{candidates.push(parsePendingMintStorage(localStorage.getItem(PENDING_MINT_KEY)));}catch(_error){}
    try{candidates.push(parsePendingMintStorage(sessionStorage.getItem(PENDING_MINT_KEY)));}catch(_error){}
    try{candidates.push(parsePendingMintStorage(localStorage.getItem(LEGACY_PENDING_MINT_KEY)));}catch(_error){}
    try{candidates.push(parsePendingMintStorage(sessionStorage.getItem(LEGACY_PENDING_MINT_KEY)));}catch(_error){}
    const valid=candidates.filter(Boolean).sort(function(a,b){return Number(b.saved_at||0)-Number(a.saved_at||0);});
    const value=valid[0]||null;
    if(!value){
      try{localStorage.removeItem(PENDING_MINT_KEY);localStorage.removeItem(LEGACY_PENDING_MINT_KEY);}catch(_error){}
      try{sessionStorage.removeItem(PENDING_MINT_KEY);sessionStorage.removeItem(LEGACY_PENDING_MINT_KEY);}catch(_error){}
      return null;
    }
    // Mirror the newest exact request into both stores. This is the same Safari
    // recovery principle used by the proven v14.67.159 Passport Xaman controller:
    // the payload UUID must survive whichever browsing context iOS restores.
    try{localStorage.setItem(PENDING_MINT_KEY,JSON.stringify(value));}catch(_error){}
    try{sessionStorage.setItem(PENDING_MINT_KEY,JSON.stringify(value));}catch(_error){}
    return value;
  }

  function pendingMintForCurrentContext(){
    const pending=readPendingMint();
    if(!pending) return null;
    const campaignId=activeCampaignId();
    if(pending.campaign_id && campaignId && String(pending.campaign_id)!==campaignId) return null;
    const wallet=verifiedWallet();
    if(pending.collector_wallet && wallet && String(pending.collector_wallet).toLowerCase()!==wallet.toLowerCase()) return null;
    if(!pending.collector_wallet && wallet){
      const callbackId=new URLSearchParams(window.location.search||'').get('xaman_mint_payload');
      if(!callbackId) return null;
    }
    return pending;
  }

  function savePendingMint(value){
    const pending={
      ...value,
      campaign_id:String(value?.campaign_id || activeCampaignId() || ''),
      collector_wallet:String(value?.collector_wallet || verifiedWallet() || ''),
      saved_at:Date.now()
    };
    const raw=JSON.stringify(pending);
    try{localStorage.setItem(PENDING_MINT_KEY,raw);localStorage.removeItem(LEGACY_PENDING_MINT_KEY);}catch(_error){}
    try{sessionStorage.setItem(PENDING_MINT_KEY,raw);sessionStorage.removeItem(LEGACY_PENDING_MINT_KEY);}catch(_error){}
    return pending;
  }

  function markPreparedXamanLaunch(payloadUuid){
    const id=String(payloadUuid||'').trim();
    const pending=pendingMintForCurrentContext();
    if(!pending?.claim_id)return pending||null;
    if(id && String(pending.payload_uuid||'')!==id)return pending;
    return savePendingMint({...pending,xaman_launch_started_at:Date.now()});
  }

  function recentPreparedXamanLaunch(payloadUuid){
    const id=String(payloadUuid||'').trim();
    const pending=pendingMintForCurrentContext();
    if(!pending||String(pending.payload_uuid||'')!==id)return false;
    const started=Number(pending.xaman_launch_started_at||0);
    return started>0 && Date.now()-started<2*60*1000;
  }

  function pendingXamanBatchContext(pending){
    if(!pending?.batch_order_id)return null;
    return {
      order_id:String(pending.batch_order_id||''),
      token:String(pending.batch_token||''),
      quantity:Math.max(1,Number(pending.batch_quantity||1)),
      position:Math.max(1,Number(pending.batch_position||1))
    };
  }

  function clearPendingMint(){
    try{localStorage.removeItem(PENDING_MINT_KEY);localStorage.removeItem(LEGACY_PENDING_MINT_KEY);}catch(_error){}
    try{sessionStorage.removeItem(PENDING_MINT_KEY);sessionStorage.removeItem(LEGACY_PENDING_MINT_KEY);}catch(_error){}
    if(mintPollTimer){clearTimeout(mintPollTimer);mintPollTimer=null;}
  }
  function scheduleMintVerification(){if(mintPollTimer)clearTimeout(mintPollTimer);mintPollTimer=setTimeout(function(){verifyPendingMint(true);},3500);}

  function isAppleSafari(){
    const ua=navigator.userAgent || '';
    const appleMobile=/iPhone|iPad|iPod/i.test(ua) || (navigator.maxTouchPoints > 1 && /Macintosh/i.test(ua));
    const safariEngine=/Safari/i.test(ua) && !/CriOS|FxiOS|EdgiOS|OPiOS/i.test(ua);
    return appleMobile && safariEngine;
  }

  function findCrossmarkSdk(){
    const browserWindows=[window];
    try{if(window.parent&&window.parent!==window)browserWindows.push(window.parent);}catch(_error){}
    try{if(window.top&&window.top!==window&&window.top!==window.parent)browserWindows.push(window.top);}catch(_error){}
    for(const browserWindow of browserWindows){
      try{
        const sdk=browserWindow.xrpl?.crossmark||browserWindow.crossmark||browserWindow.CROSSMARK||null;
        if(sdk) return sdk;
      }catch(_error){}
    }
    return null;
  }

  function crossmarkAddress(result){
    const candidates=[result?.response?.data?.address,result?.response?.address,result?.response?.data?.resp?.address,result?.response?.data?.resp?.result?.address,result?.data?.address,result?.address];
    return String(candidates.find(Boolean)||'').trim();
  }

  function crossmarkPublicKey(result){
    const candidates=[result?.response?.data?.publicKey,result?.response?.data?.public_key,result?.response?.publicKey,result?.response?.public_key,result?.data?.publicKey,result?.data?.public_key,result?.publicKey,result?.public_key];
    return String(candidates.find(Boolean)||'').trim();
  }

  function crossmarkSignature(result){
    const candidates=[result?.response?.data?.signature,result?.response?.signature,result?.data?.signature,result?.signature];
    return String(candidates.find(Boolean)||'').trim();
  }

  function crossmarkTransactionHash(result){
    const candidates=[result?.response?.data?.resp?.result?.hash,result?.response?.data?.resp?.hash,result?.response?.data?.resp?.result?.tx_json?.hash,result?.response?.data?.hash,result?.response?.hash,result?.data?.resp?.result?.hash,result?.data?.hash,result?.result?.hash,result?.hash];
    return String(candidates.find(function(value){return /^[A-F0-9]{64}$/i.test(String(value||''));})||'').toUpperCase();
  }

  function crossmarkSubmissionEvidence(error){
    const message=String(error?.message||error||'');
    const detail=String(error?.detail||'');
    const combined=(message+' '+detail).trim();
    const submitted=/\btesSUCCESS\b/i.test(combined) || /preliminary result\s*:\s*tesSUCCESS/i.test(combined);
    const contextual=combined.match(/(?:transaction|tx(?:_hash)?|hash)\s*[:=]\s*['"]?([A-F0-9]{64})/i);
    const anyHashes=combined.match(/\b[A-F0-9]{64}\b/ig)||[];
    const hash=String((contextual&&contextual[1])||(anyHashes.length===1?anyHashes[0]:'')||'').toUpperCase();
    const serverBusy=/slowDown|too much load|server.*busy|temporar|rate.?limit/i.test(combined);
    return {submitted,hash,serverBusy,message:combined};
  }

  async function crossmarkSubmitForOneHome(sdk,transaction){
    try{
      const result=await crossmarkSignAndSubmit(sdk,transaction);
      return {result,hash:crossmarkTransactionHash(result),submitted:true,recoveredFromBusy:false};
    }catch(error){
      const evidence=crossmarkSubmissionEvidence(error);
      if(evidence.submitted){
        console.warn('One Home Crossmark returned a post-submit warning; treating tesSUCCESS as submitted and verifying on-ledger.',error);
        return {result:null,hash:evidence.hash,submitted:true,recoveredFromBusy:true,warning:error};
      }
      throw error;
    }
  }

  async function crossmarkSignIn(sdk,challengeHex){
    if(typeof sdk?.methods?.signInAndWait==='function') return challengeHex?sdk.methods.signInAndWait(challengeHex):sdk.methods.signInAndWait();
    if(typeof sdk?.async?.signInAndWait==='function') return challengeHex?sdk.async.signInAndWait(challengeHex):sdk.async.signInAndWait();
    if(typeof sdk?.signInAndWait==='function') return challengeHex?sdk.signInAndWait(challengeHex):sdk.signInAndWait();
    throw new Error('Crossmark is installed, but wallet verification could not be opened.');
  }

  async function crossmarkSignAndSubmit(sdk,transaction){
    if(typeof sdk?.methods?.signAndSubmitAndWait==='function') return sdk.methods.signAndSubmitAndWait(transaction);
    if(typeof sdk?.async?.signAndSubmitAndWait==='function') return sdk.async.signAndSubmitAndWait(transaction);
    if(typeof sdk?.signAndSubmitAndWait==='function') return sdk.signAndSubmitAndWait(transaction);
    throw new Error('Crossmark is installed, but transaction signing could not be opened.');
  }

  function saveVerifiedMintWallet(address,provider){
    const wallet=String(address || '').trim();
    const walletProvider=String(provider || '').trim().toLowerCase();
    if(!/^r[1-9A-HJ-NP-Za-km-z]{24,34}$/.test(wallet)) throw new Error('The verified wallet address is invalid.');
    if(!['xaman','crossmark','joey'].includes(walletProvider)) throw new Error('The wallet provider could not be verified.');
    try{
      // Standard public mint wallet choice is session-local and authoritative.
      // Linking a wallet to the Passport must not replace the collector's mint
      // choice with the Passport's previously active wallet.
      if(currentMintIsFounder()){
        sessionStorage.setItem(WALLET_KEY,wallet);
        sessionStorage.setItem(PROVIDER_KEY,walletProvider);
        localStorage.setItem(WALLET_KEY,wallet);
        localStorage.setItem(PROVIDER_KEY,walletProvider);
      }
      sessionStorage.setItem(MINT_RECEIVING_WALLET_KEY,wallet);
      sessionStorage.setItem(MINT_RECEIVING_PROVIDER_KEY,walletProvider);
    }catch(_error){}
    linkedPassportWalletRows=[];
    linkedPassportWalletUserId='';
    linkedPassportWalletLoadPromise=null;
    rememberLastLinkedMintWallet({wallet_address:wallet,provider:walletProvider});
    clearEligibility(false);
  }

  function currentMintMobileReturnPath(){
    const campaignId=activeCampaignId();
    if(!/^[0-9a-f-]{36}$/i.test(campaignId)) return '';

    // v14.67.167: Mainnet public mints have used the permanent /m/<slug>
    // route since v14.67.149. The old mobile-wallet helper accepted only
    // /mint/<campaign-uuid>, so Xaman SignIn was given an empty return_path
    // from /m/yakuzaxrp and fell back to One Home's generic hub. That recreated
    // the Safari loop that v13.69 originally solved by keeping one exact mint
    // route through Xaman and return. Prefer the canonical short route whenever
    // this page resolved from /m/<slug>.
    const slug=String(resolvedPublicMintSlug || activeMintSlug() || '').trim().toLowerCase();
    if(slug){
      return window.location.origin+'/m/'+encodeURIComponent(slug);
    }

    // Legacy/direct campaign URLs remain valid and retain network/route state.
    const path=String(window.location.pathname || '');
    if(!new RegExp('^/mint/'+campaignId.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'/?$','i').test(path)) return '';
    const params=new URLSearchParams(window.location.search || '');
    params.delete(XAMAN_WALLET_RETURN_PARAM);
    params.delete('xaman_mint_payload');
    const network=requestedNetwork() || String(currentMint?.campaign?.network || currentMint?.collection?.network || 'mainnet').toLowerCase();
    if(network==='mainnet' || network==='testnet') params.set('network',network);
    if(campaignId===RARE_ROUTES_SEASON1_CAMPAIGN_ID) params.set('route','rare-routes');
    return mintSourceUrl(path+(params.toString()?'?'+params.toString():''));
  }

  function saveMobileXamanReturnState(){
    if(!isMobileBrowser()) return;
    const returnPath=currentMintMobileReturnPath();
    if(!returnPath) return;
    const state={
      return_path:returnPath,
      campaign_id:activeCampaignId(),
      created_at:Date.now()
    };
    try{localStorage.setItem(MINT_WALLET_MOBILE_RETURN_KEY,JSON.stringify(state));}catch(_error){}
  }

  function clearMobileXamanReturnState(){
    try{localStorage.removeItem(MINT_WALLET_MOBILE_RETURN_KEY);}catch(_error){}
  }

  function xamanWalletReturnUuid(){
    try{
      const id=String(new URLSearchParams(window.location.search || '').get(XAMAN_WALLET_RETURN_PARAM) || '').trim();
      return /^[0-9a-f-]{36}$/i.test(id)?id:'';
    }catch(_error){return '';}
  }

  function cleanXamanWalletReturnParam(){
    try{
      const url=new URL(window.location.href);
      if(!url.searchParams.has(XAMAN_WALLET_RETURN_PARAM)) return;
      url.searchParams.delete(XAMAN_WALLET_RETURN_PARAM);
      window.history.replaceState({},'',url.pathname+(url.search?url.search:'')+url.hash);
    }catch(_error){}
  }

  function clearMintWalletLinkState(){
    if(walletLinkPollTimer){clearTimeout(walletLinkPollTimer);walletLinkPollTimer=null;}
    try{
      sessionStorage.removeItem(MINT_WALLET_LINK_UUID_KEY);
      sessionStorage.removeItem(MINT_WALLET_LINK_URL_KEY);
      sessionStorage.removeItem(MINT_WALLET_LINK_STATE_KEY);
    }catch(_error){}
    try{
      localStorage.removeItem(MINT_WALLET_LINK_UUID_KEY);
      localStorage.removeItem(MINT_WALLET_LINK_URL_KEY);
      localStorage.removeItem(MINT_WALLET_LINK_STATE_KEY);
    }catch(_error){}
  }

  function saveMintWalletLinkState(uuid,url){
    const id=String(uuid || '').trim();
    const link=String(url || '').trim();
    if(!/^[0-9a-f-]{36}$/i.test(id)) return;
    const state={
      uuid:id,
      sign_url:link,
      campaign_id:activeCampaignId(),
      return_path:currentMintMobileReturnPath(),
      provider:'xaman',
      created_at:Date.now()
    };
    const encoded=JSON.stringify(state);
    try{
      sessionStorage.setItem(MINT_WALLET_LINK_STATE_KEY,encoded);
      sessionStorage.setItem(MINT_WALLET_LINK_UUID_KEY,id);
      if(link)sessionStorage.setItem(MINT_WALLET_LINK_URL_KEY,link);
    }catch(_error){}
    try{
      localStorage.setItem(MINT_WALLET_LINK_STATE_KEY,encoded);
      localStorage.setItem(MINT_WALLET_LINK_UUID_KEY,id);
      if(link)localStorage.setItem(MINT_WALLET_LINK_URL_KEY,link);
    }catch(_error){}
  }

  function readMintWalletLinkState(){
    try{
      const raw=sessionStorage.getItem(MINT_WALLET_LINK_STATE_KEY)||localStorage.getItem(MINT_WALLET_LINK_STATE_KEY)||'';
      if(raw){
        const state=JSON.parse(raw);
        const id=String(state?.uuid||'').trim();
        const created=Number(state?.created_at||0);
        const campaign=String(state?.campaign_id||'').trim();
        const active=activeCampaignId();
        if(
          !/^[0-9a-f-]{36}$/i.test(id) ||
          !created ||
          Date.now()-created>WALLET_LINK_MAX_AGE_MS ||
          (campaign && active && campaign!==active)
        ){
          clearMintWalletLinkState();
          clearWalletLinkAutoProvider();
          clearMobileXamanReturnState();
          return null;
        }
        return state;
      }

      const legacy=String(sessionStorage.getItem(MINT_WALLET_LINK_UUID_KEY)||localStorage.getItem(MINT_WALLET_LINK_UUID_KEY)||'').trim();
      const mobileRaw=localStorage.getItem(MINT_WALLET_MOBILE_RETURN_KEY)||'';
      if(!/^[0-9a-f-]{36}$/i.test(legacy) || !mobileRaw) return null;
      const mobile=JSON.parse(mobileRaw);
      const created=Number(mobile?.created_at||0);
      const campaign=String(mobile?.campaign_id||'').trim();
      const active=activeCampaignId();
      if(!created || Date.now()-created>WALLET_LINK_MAX_AGE_MS || (campaign && active && campaign!==active)){
        clearMintWalletLinkState();
        clearMobileXamanReturnState();
        return null;
      }
      return {uuid:legacy,campaign_id:campaign,created_at:created,provider:'xaman'};
    }catch(_error){
      clearMintWalletLinkState();
      return null;
    }
  }

  function pendingMintWalletLinkUuid(){
    return String(xamanWalletReturnUuid() || readMintWalletLinkState()?.uuid || '').trim();
  }

  function saveWalletLinkAutoProvider(provider){
    const value=normalizeXrplProvider(provider)||'xaman';
    walletLinkAutoMintProvider=value;
    try{sessionStorage.setItem(MINT_WALLET_AUTO_PROVIDER_KEY,value);}catch(_error){}
    try{localStorage.setItem(MINT_WALLET_AUTO_PROVIDER_KEY,value);}catch(_error){}
  }

  function pendingWalletLinkAutoProvider(){
    if(walletLinkAutoMintProvider) return walletLinkAutoMintProvider;
    try{
      const value=String(sessionStorage.getItem(MINT_WALLET_AUTO_PROVIDER_KEY)||localStorage.getItem(MINT_WALLET_AUTO_PROVIDER_KEY)||'').toLowerCase();
      return normalizeXrplProvider(value);
    }catch(_error){return '';}
  }

  function clearWalletLinkAutoProvider(){
    walletLinkAutoMintProvider='';
    try{sessionStorage.removeItem(MINT_WALLET_AUTO_PROVIDER_KEY);}catch(_error){}
    try{localStorage.removeItem(MINT_WALLET_AUTO_PROVIDER_KEY);}catch(_error){}
  }

  async function linkVerifiedWallet(provider,payload){
    const result=await callFunction('passport-wallet-link',Object.assign({provider:provider},payload||{}),true);
    const wallet=String(result.data?.wallet_address || '').trim();
    if(!wallet) throw new Error('One Home could not confirm the wallet address.');
    saveVerifiedMintWallet(wallet,provider);
    return wallet;
  }

  function finishWalletConnection(wallet,provider){
    const autoProvider=pendingWalletLinkAutoProvider();
    // Restore the frozen, previously validated mobile Xaman contract from the
    // Vegan/YakuzaXRP flow: after the collector explicitly chooses a different
    // wallet and proves that exact address, continue the SAME mint automatically.
    // Do not make the collector tap MINT a second time and do not reserve a
    // second NFT. The prepared Xaman request remains recoverable by payload UUID.
    const shouldContinue=autoProvider===provider;
    const handoffWindow=shouldContinue && provider==='xaman' && walletLinkWindow && !walletLinkWindow.closed
      ? walletLinkWindow
      : null;

    clearMintWalletLinkState();
    clearWalletLinkAutoProvider();
    clearMobileXamanReturnState();
    walletLinkBusy=false;

    if(handoffWindow){
      try{handoffWindow.location.replace('about:blank');handoffWindow.focus();}catch(_error){}
    }else if(walletLinkWindow && !walletLinkWindow.closed){
      try{walletLinkWindow.close();}catch(_error){}
    }
    walletLinkWindow=null;

    const status=q('founderMintStatus');
    if(status){
      status.classList.add('is-preparing');
      status.innerHTML=shouldContinue
        ? '<strong>WALLET CONFIRMED</strong><span>Continuing your mint…</span>'
        : '<strong>WALLET CONFIRMED</strong><span>Your wallet is ready. Review the allowance above, then tap MINT to approve the NFT transaction.</span>';
    }

    if(currentMint){
      clearEligibility(false);
      setTimeout(async function(){
        try{
          await verifyMintAccess(currentMint,true);
          await renderMint(currentMint);
          if(shouldContinue){
            await start(provider,{xamanWindow:handoffWindow,skipProviderReconnect:true,expectedWallet:wallet});
          }else if(handoffWindow && !handoffWindow.closed){
            try{handoffWindow.close();}catch(_error){}
          }
        }catch(error){
          if(handoffWindow && !handoffWindow.closed){try{handoffWindow.close();}catch(_error){}}
          console.error('One Home wallet-confirmed mint continuation',error);
          const currentStatus=q('founderMintStatus');
          if(currentStatus){
            currentStatus.classList.remove('is-preparing');
            currentStatus.innerHTML='<strong>MINT NEEDS ATTENTION</strong><span>'+collectorMintError(error)+'</span>';
          }
          setButtons(true);
        }
      },120);
    }else if(handoffWindow && !handoffWindow.closed){
      try{handoffWindow.close();}catch(_error){}
    }

    return {wallet:wallet,provider:provider};
  }

  async function checkXamanMintWalletLink(uuid){
    const id=String(uuid || pendingMintWalletLinkUuid() || '').trim();
    if(!/^[0-9a-f-]{36}$/i.test(id)) return false;
    if(walletLinkBusy==='checking') return false;
    walletLinkBusy='checking';
    const status=q('founderMintStatus');
    try{
      const check=await callFunction('xaman-check-payload',{uuid:id,purpose:'profile_wallet_link'},true);
      const data=check.data || {};
      if(data.waiting===true || data.resolved===false){
        walletLinkBusy=false;
        if(status){status.classList.add('is-preparing');status.innerHTML='<strong>CONFIRM IN XAMAN</strong><span>'+ (simplePublicXrplUi()?'Approve the wallet and return to One Home. One Home will continue this same mint automatically.':'Approve your wallet in Xaman. Your mint will continue automatically.') +'</span>';}
        walletLinkPollTimer=setTimeout(function(){checkXamanMintWalletLink(id);},2500);
        return false;
      }
      if(data.cancelled===true || data.expired===true){
        clearMintWalletLinkState();
        clearWalletLinkAutoProvider();
        clearMobileXamanReturnState();
        walletLinkBusy=false;
        if(status){status.classList.remove('is-preparing');status.innerHTML='<strong>WALLET NOT CONNECTED</strong><span>The Xaman request was cancelled or expired. Try again when you are ready.</span>';}
        setWalletConnectButtons(true);
        return true;
      }
      if(data.signed===true){
        const confirmed=String(data.wallet_address||'').trim();
        if(!validXrplWallet(confirmed)) throw new Error('Xaman confirmed the request but did not return a valid XRP wallet.');
        const rows=await loadLinkedPassportWallets(true).catch(function(){return []});
        const alreadyLinked=rows.some(function(row){
          return normalizeXrplProvider(row?.provider)==='xaman' && String(row?.wallet_address||'').toLowerCase()===confirmed.toLowerCase();
        });
        let wallet='';
        if(simplePublicXrplUi()){
          // "Use another Xaman wallet" is a receiving-wallet choice, not an
          // instruction to mutate Passport wallet links. xaman-check-payload has
          // already server-verified the signed payload and exact XRP address.
          applyMintWalletSelection(confirmed,'xaman',alreadyLinked);
          wallet=confirmed;
        }else{
          wallet=alreadyLinked
            ? (applyMintWalletSelection(confirmed,'xaman',true),confirmed)
            : await linkVerifiedWallet('xaman',{uuid:id});
        }
        finishWalletConnection(wallet,'xaman');
        return true;
      }
      walletLinkBusy=false;
      walletLinkPollTimer=setTimeout(function(){checkXamanMintWalletLink(id);},2500);
      return false;
    }catch(error){
      walletLinkBusy=false;
      clearMintWalletLinkState();
      clearWalletLinkAutoProvider();
      clearMobileXamanReturnState();
      console.error('One Home Xaman wallet connection',error);
      if(status){status.classList.remove('is-preparing');status.innerHTML='<strong>WALLET CONNECTION NEEDS ATTENTION</strong><span>'+collectorMintError(error)+'</span>';}
      setWalletConnectButtons(true);
      return true;
    }
  }

  async function connectXamanMintWallet(){
    if(walletLinkBusy) return;
    const status=q('founderMintStatus');
    const mobileXaman=isMobileBrowser();
    walletLinkBusy=true;
    clearMintWalletLinkState();
    saveMobileXamanReturnState();
    setWalletConnectButtons(false);
    try{
      // Desktop keeps the working popup flow. Mobile stays in one browser tab so
      // Xaman cannot return into a detached/root One Home tab and lose the mint.
      walletLinkWindow=mobileXaman?null:window.open('about:blank','onehome-xaman-wallet','width=520,height=760');
      if(walletLinkWindow){try{walletLinkWindow.document.body.innerHTML='<p style="font-family:system-ui;padding:24px">Preparing Xaman…</p>';}catch(_error){}}
      if(status){status.classList.add('is-preparing');status.innerHTML='<strong>CONFIRM IN XAMAN</strong><span>Preparing your wallet confirmation…</span>';}
      const created=await callFunction('xaman-create-payload',{
        app:'one-home',
        purpose:'profile_wallet_link',
        return_path:currentMintMobileReturnPath()
      },true);
      const data=created.data || {};
      const uuid=String(data.uuid || '').trim();
      const signUrl=String(data?.next?.always || data?.next?.no_push_msg_received || data.next_always || data.sign_url || '').trim();
      if(!/^[0-9a-f-]{36}$/i.test(uuid) || !signUrl) throw new Error('Xaman could not create the wallet connection request.');
      saveMintWalletLinkState(uuid,signUrl);
      if(status){status.classList.add('is-preparing');status.innerHTML='<strong>CONFIRM IN XAMAN</strong><span>'+ (simplePublicXrplUi()?'Approve the wallet and return to One Home. One Home will continue this same mint automatically.':'Approve your wallet in Xaman. Your mint will continue automatically.') +'</span>';}
      let launched=false;
      if(walletLinkWindow && !walletLinkWindow.closed){try{walletLinkWindow.location.replace(signUrl);walletLinkWindow.focus();launched=true;}catch(_error){}}
      if(!launched && mobileXaman){
        // v14.67.219: this payload URL was created after an async server call,
        // so Safari must receive a fresh user tap on the real Xaman link.
        launched=showMintXamanLaunch(signUrl,'Your wallet confirmation is ready. Tap Open Xaman to approve this exact request, then return to One Home.');
      }
      if(!launched && !mobileXaman){try{window.location.assign(signUrl);launched=true;}catch(_error){}}
      if(!launched) throw new Error('Xaman could not be opened.');
      walletLinkBusy=false;
      walletLinkPollTimer=setTimeout(function(){checkXamanMintWalletLink(uuid);},1800);
    }catch(error){
      walletLinkBusy=false;
      clearMintWalletLinkState();
      clearWalletLinkAutoProvider();
      clearMobileXamanReturnState();
      if(walletLinkWindow && !walletLinkWindow.closed){try{walletLinkWindow.close();}catch(_error){}}
      walletLinkWindow=null;
      console.error('One Home Xaman wallet connect start',error);
      if(status){status.classList.remove('is-preparing');status.innerHTML='<strong>WALLET CONNECTION COULD NOT START</strong><span>'+collectorMintError(error)+'</span>';}
      setWalletConnectButtons(true);
    }
  }

  async function connectCrossmarkMintWallet(){
    if(walletLinkBusy) return;
    const status=q('founderMintStatus');
    walletLinkBusy=true;
    setWalletConnectButtons(false);
    try{
      const sdk=findCrossmarkSdk();
      if(!sdk) throw new Error('Open or install the Crossmark browser extension, then try again.');
      if(status){status.classList.add('is-preparing');status.innerHTML='<strong>CONFIRM IN CROSSMARK</strong><span>'+ (simplePublicXrplUi()?'Approve the wallet, then tap MINT to approve the NFT transaction.':'Approve your wallet in Crossmark. Your mint will continue automatically.') +'</span>';}
      const challengeResult=await callFunction('crossmark-create-home-id-challenge',{purpose:'home_id'},false);
      const challenge=challengeResult.data || {};
      const challengeId=String(challenge.challenge_id || '').trim();
      const challengeHex=String(challenge.challenge_hex || '').trim();
      const browserNonce=String(challenge.browser_nonce || '').trim();
      if(!challengeId || !challengeHex || !browserNonce) throw new Error('One Home could not create the Crossmark verification request.');
      const signed=await crossmarkSignIn(sdk,challengeHex);
      const address=crossmarkAddress(signed);
      const publicKey=crossmarkPublicKey(signed);
      const signature=crossmarkSignature(signed);
      if(!/^r[1-9A-HJ-NP-Za-km-z]{24,34}$/.test(address) || !publicKey || !signature) throw new Error('Crossmark did not return the complete wallet verification.');
      const proof={challenge_id:challengeId,browser_nonce:browserNonce,wallet_address:address,public_key:publicKey,signature:signature};
      let wallet='';
      if(simplePublicXrplUi()){
        // Verify the signed server challenge without rewriting Passport wallet
        // links. This mirrors the already-established authenticated Founder
        // Crossmark proof path in Passport entrance.js.
        const completed=await callFunction('crossmark-complete-home-id',proof,false);
        if(completed.data?.signed!==true) throw new Error('One Home could not verify the signed Crossmark wallet.');
        const rows=await loadLinkedPassportWallets(true).catch(function(){return []});
        const alreadyLinked=rows.some(function(row){
          return normalizeXrplProvider(row?.provider)==='crossmark' && String(row?.wallet_address||'').toLowerCase()===address.toLowerCase();
        });
        applyMintWalletSelection(address,'crossmark',alreadyLinked);
        wallet=address;
      }else{
        wallet=await linkVerifiedWallet('crossmark',proof);
      }
      finishWalletConnection(wallet,'crossmark');
    }catch(error){
      walletLinkBusy=false;
      clearWalletLinkAutoProvider();
      console.error('One Home Crossmark wallet connection',error);
      if(status){status.classList.remove('is-preparing');status.innerHTML='<strong>WALLET CONNECTION COULD NOT START</strong><span>'+collectorMintError(error)+'</span>';}
      setWalletConnectButtons(true);
    }
  }

  async function connectJoeyMintWallet(){
    if(walletLinkBusy) return;
    const status=q('founderMintStatus');
    if(!joeyMintAllowed()){
      if(status) status.innerHTML='<strong>JOEY WALLET USES XRP LEDGER MAINNET</strong><span>Choose Joey Wallet from a Mainnet mint.</span>';
      return;
    }
    walletLinkBusy=true;
    setWalletConnectButtons(false);
    try{
      const api=window.OneHomeJoeyWallet;
      if(!api?.link) throw new Error('Joey Wallet connection is still loading. Refresh One Home and try again.');
      if(status){status.classList.add('is-preparing');status.innerHTML='<strong>CONFIRM IN JOEY WALLET</strong><span>Connect Joey Wallet and approve the one-time wallet verification.</span>';}
      const linked=await api.link();
      const wallet=String(linked?.wallet_address||linked?.address||api.getAddress?.()||'').trim();
      saveVerifiedMintWallet(wallet,'joey');
      finishWalletConnection(wallet,'joey');
    }catch(error){
      walletLinkBusy=false;
      clearWalletLinkAutoProvider();
      console.error('One Home Joey wallet connection',error);
      if(status){status.classList.remove('is-preparing');status.innerHTML='<strong>WALLET CONNECTION COULD NOT START</strong><span>'+collectorMintError(error)+'</span>';}
      setWalletConnectButtons(true);
    }
  }

  async function connectMintWallet(provider){
    if(isTestMintPage()){
      mintWalletChooserOpen=true;
      manualTestWalletOpen=true;
      await renderMintWalletChooser();
      return;
    }
    const walletProvider=normalizeXrplProvider(provider)||'xaman';
    saveWalletLinkAutoProvider(walletProvider);
    if(walletProvider==='xaman') return connectXamanMintWallet();
    if(walletProvider==='crossmark') return connectCrossmarkMintWallet();
    if(walletProvider==='joey') return connectJoeyMintWallet();
  }

  function resumeMintWalletLink(){
    if(isTestMintPage()) return;

    const explicitUuid=xamanWalletReturnUuid();
    const selected=explicitMintReceivingSelection();

    // If this is NOT an actual Xaman wallet-return URL and the collector has
    // already chosen a verified Xaman receiving wallet, an old saved SignIn
    // payload is stale. Clear it instead of reopening/continuing wallet SignIn.
    // A real Safari return still wins through the URL UUID; a legitimate
    // "Use another Xaman wallet" flow has no receiving-wallet selection because
    // handleXrplMintWalletButton clears it before leaving One Home.
    if(
      !explicitUuid &&
      validXrplWallet(selected.wallet) &&
      normalizeXrplProvider(selected.provider)==='xaman'
    ){
      clearMintWalletLinkState();
      clearWalletLinkAutoProvider();
      clearMobileXamanReturnState();
      return;
    }

    const uuid=String(explicitUuid || readMintWalletLinkState()?.uuid || '').trim();
    // A cached wallet must never suppress an in-progress Xaman confirmation.
    // This matters on iPhone/Safari, where the browser is backgrounded while
    // Xaman is open and then resumes the existing mint page.
    if(!/^[0-9a-f-]{36}$/i.test(uuid)) return;
    if(!currentMint && loadingPromise){
      if(walletLinkPollTimer) clearTimeout(walletLinkPollTimer);
      walletLinkPollTimer=setTimeout(resumeMintWalletLink,250);
      return;
    }
    checkXamanMintWalletLink(uuid);
  }

  function openInDesktopXamanMintWindow(signUrl){
    const url=String(signUrl||'').trim();
    if(!url||isMobileBrowser()) return false;
    const target=desktopXamanMintWindow;
    if(!target||target.closed) return false;
    try{
      target.location.replace(url);
      target.focus();
      return true;
    }catch(_error){
      return false;
    }
  }

  function showMintXamanLaunch(signUrl,message){
    const url=String(signUrl || '').trim();
    const status=q('founderMintStatus');
    if(!status || !url) return false;
    status.classList.remove('is-preparing');
    status.innerHTML='';
    const strong=document.createElement('strong');
    strong.textContent='OPEN XAMAN';
    const span=document.createElement('span');
    span.textContent=message || 'Tap below to open Xaman, approve the transaction, then return to One Home.';
    const anchor=document.createElement('a');
    anchor.href=url;
    anchor.className='founder-mint-entry-button';
    anchor.textContent='Open Xaman';
    anchor.setAttribute('aria-label','Open the Xaman mint request');
    anchor.style.display='inline-flex';
    anchor.style.marginTop='12px';

    if(!isMobileBrowser()){
      anchor.target='onehome-xaman-mint';
      anchor.addEventListener('click',function(event){
        event.preventDefault();
        const opened=window.open(url,'onehome-xaman-mint');
        if(opened){
          desktopXamanMintWindow=opened;
          try{opened.focus();}catch(_error){}
        }else{
          window.location.assign(url);
        }
      });
    }else{
      anchor.target='_self';
      anchor.rel='external';
      anchor.addEventListener('click',function(){
        const pending=pendingMintForCurrentContext();
        if(pending?.sign_url===url && pending?.payload_uuid) markPreparedXamanLaunch(pending.payload_uuid);
        // Do not preventDefault: Safari must process the actual tapped href.
      });
    }

    // Mobile deliberately does not start a verifier timer from this tap.
    // iOS and Android may suspend or duplicate browser contexts during the
    // Xaman app switch. The Xaman return bridge is the authoritative signal.
    status.appendChild(strong);
    status.appendChild(span);
    status.appendChild(anchor);
    return true;
  }

  async function settlePublicXamanCreatorPayment(payloadUuid,status){
    const network=String(currentMint?.campaign?.network || currentMint?.collection?.network || requestedNetwork() || '').toLowerCase();
    const id=String(payloadUuid||'').trim();
    if(network!=='mainnet') return true;
    if(!/^[0-9a-f-]{36}$/i.test(id)) return false;
    try{
      const settlement=await callFunction('settle-mint-creator-payout',{payload_uuid:id,return_mode:true},false);
      if(settlement.data?.completed===true) return true;
      if(settlement.data?.pending===true || settlement.status===202){
        if(status){status.classList.add('is-preparing');status.innerHTML='<strong>NFT RECEIVED</strong><span>Finalizing your mint…</span>';}
        schedulePublicXamanReturnVerification(id);
        return false;
      }
      return false;
    }catch(error){
      const message=String(error?.message||'');
      const code=String(error?.code||'').toUpperCase();
      const retryable=/MINT_SIGNER_BUSY|CREATOR_PAYMENT_PENDING|Finalizing your mint|temporar|busy|still being|Failed to fetch|NetworkError|Load failed|timeout/i.test(message) ||
        ['CREATOR_PAYMENT_PENDING','XRPL_RPC_BUSY','MINT_PREPARING'].includes(code);
      console.error('One Home public creator payment settlement',error);
      if(status){status.classList.add('is-preparing');status.innerHTML='<strong>NFT RECEIVED</strong><span>Finalizing your mint…</span>';}
      if(retryable){schedulePublicXamanReturnVerification(id);return false;}
      schedulePublicXamanReturnVerification(id);
      return false;
    }
  }

  async function settleMainnetCreatorPayment(pending,status){
    const network=String(pending?.network || currentMint?.campaign?.network || currentMint?.collection?.network || '').toLowerCase();
    if(network!=='mainnet') return true;
    try{
      const settlement=await callFunction('settle-mint-creator-payout',{claim_id:pending.claim_id,reservation_token:pending.reservation_token},true);
      if(settlement.data?.completed===true) return true;
      if(settlement.data?.pending===true || settlement.status===202){
        if(status){status.classList.add('is-preparing');status.innerHTML='<strong>NFT RECEIVED</strong><span>Finalizing your mint…</span>';}
        scheduleMintVerification();
        return false;
      }
      return false;
    }catch(error){
      const payload=String(pending?.payload_uuid||'').trim();
      const message=String(error?.message||'');
      if(/Home ID session expired|Sign in to One Home first|One Home session could not be verified/i.test(message) && /^[0-9a-f-]{36}$/i.test(payload)){
        return await settlePublicXamanCreatorPayment(payload,status);
      }
      console.error('One Home creator payment settlement',error);
      if(status){status.classList.add('is-preparing');status.innerHTML='<strong>NFT RECEIVED</strong><span>Finalizing your mint…</span>';}
      scheduleMintVerification();
      return false;
    }
  }


  async function recoverDirectXrplMint(data,provider){
    const walletProvider=normalizeXrplProvider(provider);
    if(!['crossmark','joey'].includes(walletProvider)) return false;
    const campaignId=String(data?.campaign?.id || '').trim();
    if(!/^[0-9a-f-]{36}$/i.test(campaignId) || pendingMintForCurrentContext()?.claim_id) return false;
    const recoveryId=walletProvider+':'+campaignId;
    if(crossmarkRecoveryKey===recoveryId && crossmarkRecoveryPromise) return crossmarkRecoveryPromise;
    if(!(await isAuthenticated())) return false;

    crossmarkRecoveryKey=recoveryId;
    crossmarkRecoveryPromise=(async function(){
      try{
        const verifier=walletProvider==='joey'?'verify-joey-mint-claim':'verify-crossmark-mint-claim';
        const result=await callFunction(verifier,{action:'recover_latest',campaign_id:campaignId},true);
        const payload=result.data || {};
        if(payload.recovered!==true) return false;

        const claim=payload.claim || {};
        const serverBatch=payload.batch||null;
        if(serverBatch?.order_id&&batchReceiptWasShown(serverBatch)){
          clearPendingMint();
          clearBatchMint();
          return false;
        }
        const transactionHash=String(payload?.xrpl?.transaction_hash || payload?.transaction_hash || claim?.transaction_hash || '').trim().toUpperCase();
        const reservationToken=String(claim?.reservation_token || '').trim();
        const claimId=String(claim?.id || '').trim();
        if(!claimId || !reservationToken || !/^[A-F0-9]{64}$/.test(transactionHash)) return false;

        const pending={
          claim_id:claimId,
          reservation_token:reservationToken,
          transaction_hash:transactionHash,
          wallet_provider:walletProvider,
          collection_id:data?.collection?.id || '',
          campaign_id:campaignId,
          network:data?.campaign?.network || data?.collection?.network || ''
        };
        savePendingMint(pending);

        const status=q('founderMintStatus');
        if(payload.completed===true){
          if(status){status.classList.add('is-preparing');status.innerHTML='<strong>NFT RECEIVED</strong><span>Finalizing your mint…</span>';}
          const settled=await settleMainnetCreatorPayment(pending,status);
          if(!settled) return true;
          clearPendingMint();
          if(serverBatch?.order_id){
            await finishOrContinueVerifiedCrossmarkBatch(serverBatch,{wallet_provider:walletProvider});
            return true;
          }
          await loadMint({campaign_id:campaignId,network:pending.network||''});
          if(status){status.classList.remove('is-preparing');status.innerHTML='<strong>MINT SUCCESSFUL</strong>';}
          await showMintSuccessReceipt(payload);
          return true;
        }

        if(payload.pending===true || result.status===202){
          if(status){status.classList.add('is-preparing');status.innerHTML='<strong>FINALIZING YOUR MINT</strong><span>Your '+xrplProviderLabel(walletProvider)+' transaction was approved. One Home is confirming it now.</span>';}
          scheduleMintVerification();
          return true;
        }
        return false;
      }catch(error){
        console.warn('One Home '+xrplProviderLabel(walletProvider)+' recovery check',error);
        return false;
      }finally{
        crossmarkRecoveryPromise=null;
      }
    })();
    return crossmarkRecoveryPromise;
  }

  async function recoverCrossmarkMint(data){
    return recoverDirectXrplMint(data,'crossmark');
  }

  async function recoverJoeyMint(data){
    return recoverDirectXrplMint(data,'joey');
  }

  async function verifyPendingMint(quiet){
    const pending=pendingMintForCurrentContext();
    if(!pending?.claim_id || !pending?.reservation_token) return false;
    const provider=normalizeXrplProvider(pending.wallet_provider)||'xaman';

    // Xaman has one authoritative verification path on every browser:
    // the payload UUID. This works even when the app return opens a browser
    // context that cannot see the prior Home ID session.
    if(provider==='xaman'){
      const payload=String(pending.payload_uuid||'').trim();
      if(/^[0-9a-f-]{36}$/i.test(payload)){
        return verifyPublicXamanReturn(payload,quiet);
      }
      if(pending.sign_url){
        showMintXamanLaunch(
          pending.sign_url,
          'This exact Xaman request is still pending. Open it to approve; One Home will continue from Xaman’s verified return.'
        );
      }
      return false;
    }

    const status=q('founderMintStatus');
    try{
      const payload={claim_id:pending.claim_id,reservation_token:pending.reservation_token};
      if(pending.transaction_hash) payload.transaction_hash=pending.transaction_hash;
      const verifier=provider==='joey'?'verify-joey-mint-claim':'verify-crossmark-mint-claim';
      const result=await callFunction(verifier,payload,true);
      if(result.data?.completed){
        const settled=await settleMainnetCreatorPayment(pending,status);
        if(!settled) return false;

        const fallbackBatchContext=pending.batch_order_id&&pending.batch_token
          ? {
              order_id:pending.batch_order_id,
              token:pending.batch_token,
              quantity:Number(pending.batch_quantity)||2,
              position:Number(pending.batch_position)||1,
              wallet_provider:provider,
              collector_wallet:pending.collector_wallet||'',
              campaign_id:pending.campaign_id||activeCampaignId()
            }
          : null;

        clearPendingMint();
        const serverBatch=result.data?.batch||null;
        if(serverBatch?.order_id||fallbackBatchContext){
          // The verifier returns the exact post-completion batch state. This is
          // required because completion increments completed_count, which
          // intentionally invalidates the pre-approval continuation token.
          return finishOrContinueVerifiedCrossmarkBatch(
            serverBatch,
            fallbackBatchContext
          );
        }

        await loadMint(
          pending.campaign_id
            ? {campaign_id:pending.campaign_id,network:pending.network||''}
            : {collection_id:pending.collection_id || activeCollectionId()}
        );
        if(status){
          status.classList.remove('is-preparing');
          status.innerHTML='<strong>MINT SUCCESSFUL</strong>';
        }
        await showMintSuccessReceipt(result.data);
        return true;
      }

      if(result.data?.pending || result.status===202){
        if(status){
          status.innerHTML='<strong>CONFIRMING ON XRPL</strong><span>'+
            String(result.data?.message || 'Your signed transaction is waiting for final validation.')+
            '</span>';
        }
        scheduleMintVerification();
        return false;
      }

      scheduleMintVerification();
      return false;
    }catch(error){
      const message=String(error?.message || '');
      const code=String(error?.code || '').toUpperCase();
      const transient=/Failed to fetch|Failed to send a request|NetworkError|Load failed|fetch failed|timed out|timeout|slowDown|too much load|temporar|server.*busy|rate.?limit/i.test(message) ||
        ['XRPL_RPC_BUSY','XRPL_TRANSACTION_PENDING','XRPL_VALIDATION_PENDING','MINT_CONFIRMATION_PENDING','NFT_OWNERSHIP_CONFIRMATION_PENDING'].includes(code);
      if(transient){
        if(status){
          status.classList.add('is-preparing');
          status.innerHTML='<strong>FINALIZING YOUR MINT</strong><span>Your transaction was approved. One Home is confirming it now.</span>';
        }
        scheduleMintVerification();
        if(!quiet) console.error('One Home Crossmark verification retry',error);
        return false;
      }
      clearPendingMint();
      if(status){
        status.innerHTML='<strong>MINT NOT COMPLETED</strong><span>'+
          String(error?.message || 'The transaction could not be verified.')+
          '</span>';
      }
      if(!quiet) console.error('One Home Crossmark verification',error);
      return false;
    }
  }


  function cleanXamanReturnParam(){
    try{
      const url=new URL(window.location.href);
      if(!url.searchParams.has('xaman_mint_payload')) return;
      url.searchParams.delete('xaman_mint_payload');
      window.history.replaceState({},'',url.pathname+(url.search?url.search:'')+url.hash);
    }catch(_error){}
  }

  function authoritativeXamanReturnContext(payloadUuid){
    const id=String(payloadUuid||'').trim();
    if(!/^[0-9a-f-]{36}$/i.test(id)) return false;
    try{
      const callback=String(new URLSearchParams(window.location.search||'').get('xaman_mint_payload')||'').trim();
      if(callback===id) return true;
    }catch(_error){}
    return lastXamanReturnSignalPayload===id && Date.now()-lastXamanReturnSignalAt<2*60*1000;
  }

  function schedulePublicXamanReturnVerification(payloadUuid,delayMs){
    if(mintPollTimer) clearTimeout(mintPollTimer);
    const delay=Math.max(650,Number(delayMs)||3500);
    mintPollTimer=setTimeout(function(){
      verifyPublicXamanReturn(payloadUuid,true);
    },delay);
  }

  async function finishVerifiedXamanResult(resultData,payloadUuid,status){
    const settled=await settlePublicXamanCreatorPayment(payloadUuid,status);
    if(!settled) return false;

    clearPendingMint();
    cleanXamanReturnParam();
    clearXamanReturnSignal();

    const serverBatch=resultData?.batch||null;
    if(serverBatch?.order_id){
      const completed=
        serverBatch.batch_completed===true ||
        String(serverBatch.status||'').toLowerCase()==='completed' ||
        (
          Number(serverBatch.quantity)>0 &&
          Number(serverBatch.completed_count)>=Number(serverBatch.quantity)
        );

      if(completed){
        clearBatchMint();
        try{
          await loadMint({
            campaign_id:activeCampaignId(),
            network:requestedNetwork()
          });
        }catch(_error){}
        if(status){
          status.classList.remove('is-preparing');
          status.innerHTML='<strong>MINT SUCCESSFUL</strong>';
        }
        if(desktopXamanMintWindow && !desktopXamanMintWindow.closed){
          try{desktopXamanMintWindow.close();}catch(_error){}
        }
        desktopXamanMintWindow=null;
        await showBatchSuccessReceipt(serverBatch);
        rememberBatchReceiptShown(serverBatch);
        return true;
      }

      const activeServerBatch=batchFromResponse(serverBatch,'xaman');
      if(!activeServerBatch){
        throw new Error(
          'One Home verified the NFT but did not receive safe continuation state for the remaining multi-mint.'
        );
      }

      // This is the only path that advances an Xaman batch after a completed
      // item: verified server state -> exact next durable batch position.
      await continueBatchOrder(activeServerBatch,'xaman');
      return true;
    }

    // Single mint. Any unrelated stale batch cache must not survive a verified
    // non-batch claim.
    const stored=readBatchMint();
    if(stored?.campaign_id===activeCampaignId()) clearBatchMint();

    try{
      await loadMint({
        campaign_id:activeCampaignId(),
        network:requestedNetwork()
      });
    }catch(_error){}

    if(status){
      status.classList.remove('is-preparing');
      status.innerHTML='<strong>MINT SUCCESSFUL</strong>';
    }
    if(desktopXamanMintWindow && !desktopXamanMintWindow.closed){
      try{desktopXamanMintWindow.close();}catch(_error){}
    }
    desktopXamanMintWindow=null;
    await showMintSuccessReceipt(resultData);
    return true;
  }

  async function verifyPublicXamanReturnUnlocked(payloadUuid,quiet){
    const id=String(payloadUuid||'').trim();
    if(!/^[0-9a-f-]{36}$/i.test(id)) return false;
    const status=q('founderMintStatus');

    try{
      const result=await callFunction(
        'verify-xaman-mint-claim',
        {payload_uuid:id,return_mode:true},
        false
      );

      if(result.data?.completed){
        return await finishVerifiedXamanResult(result.data,id,status);
      }

      if(result.data?.pending || result.status===202){
        const code=String(result.data?.code||'').toUpperCase();
        const waitingForApproval=code==='XAMAN_PAYLOAD_PENDING';

        if(waitingForApproval){
          const pending=pendingMintForCurrentContext();
          const signUrl=String(
            pending?.payload_uuid===id ? pending?.sign_url||'' : ''
          ).trim();

          if(isMobileBrowser()){
            // v14.67.168: an actual Xaman return is materially different from a
            // generic Safari focus/pageshow check. Xaman documents that iOS may
            // restore a different browser context, so the payload UUID in the
            // return URL / server-authoritative bridge is the durable signal.
            //
            // Xaman's API can briefly report meta.resolved=false immediately
            // after Safari is returned. The recent .166/.167 code treated that
            // first 202 exactly like an unsigned request and stopped polling,
            // leaving a genuinely signed mint stranded at PREPARE/APPROVE.
            // Once this exact UUID has RETURNED from Xaman, keep verifying the
            // SAME claim until Xaman/XRPL state catches up. Never relaunch and
            // never create or reserve another NFT from this branch.
            const returned=authoritativeXamanReturnContext(id);
            const recentLaunch=recentPreparedXamanLaunch(id);
            if(returned||recentLaunch){
              if(signUrl && simplePublicXrplUi()) armPreparedMobileXamanLaunch(signUrl,id,pendingXamanBatchContext(pending));
              if(status){
                status.classList.add('is-preparing');
                status.innerHTML=returned
                  ? '<strong>FINALIZING YOUR XAMAN MINT</strong><span>Xaman returned this exact request. One Home is waiting for Xaman and the XRP Ledger to publish the signed result. Do not mint again.</span>'
                  : '<strong>CHECKING XAMAN APPROVAL</strong><span>One Home is checking the exact request you just opened. If Xaman did not open or you did not approve it, use OPEN XAMAN above.</span>';
              }
              try{updateMintProgressBar(returned?'VERIFYING XAMAN RETURN':'CHECKING XAMAN APPROVAL');}catch(_error){}
              schedulePublicXamanReturnVerification(id,1200);
              return false;
            }

            if(signUrl){
              if(simplePublicXrplUi()) presentPreparedMobileXaman(signUrl,id,pendingXamanBatchContext(pending),String(result.data?.message || 'This Xaman request is waiting for approval.')+' Tap OPEN XAMAN to approve this exact saved request.');
              else showMintXamanLaunch(
                signUrl,
                String(result.data?.message || 'This Xaman request is waiting for approval.')+
                ' Tap Open Xaman to approve this exact saved request.'
              );
            }else if(status){
              status.classList.remove('is-preparing');
              status.innerHTML='<strong>WAITING FOR XAMAN APPROVAL</strong><span>Return to the Xaman request you opened and approve it. One Home will resume from Xaman’s verified return.</span>';
            }
            // Before an actual return signal, do not repeatedly poll while Xaman
            // is open. This preserves the validated v14.67.74 mobile behavior.
            return false;
          }

          if(signUrl){
            if(pending?.batch_order_id){
              // Desktop multi-mint uses same-tab navigation. The legacy popup
              // helper remains for quantity=1 only.
              if(desktopXamanMintWindow && !desktopXamanMintWindow.closed){
                try{desktopXamanMintWindow.close();}catch(_error){}
              }
              desktopXamanMintWindow=null;
              window.location.assign(signUrl);
            }else if(!openInDesktopXamanMintWindow(signUrl)){
              showMintXamanLaunch(
                signUrl,
                String(result.data?.message || 'This Xaman request is waiting for approval.')+
                ' Open the exact saved request; do not start another mint.'
              );
            }else if(status){
              status.classList.remove('is-preparing');
              status.innerHTML='<strong>WAITING FOR XAMAN APPROVAL</strong><span>'+
                String(result.data?.message || 'Approve the Xaman request to continue.')+
                '</span>';
            }
          }else if(status){
            status.classList.remove('is-preparing');
            status.innerHTML='<strong>WAITING FOR XAMAN APPROVAL</strong><span>Approve the open Xaman request to continue.</span>';
          }

          // Desktop keeps a verifier fallback in case the Xaman web return does
          // not navigate the signing window. Completion handling is serialized
          // and the server token is deterministic, so this cannot advance twice.
          schedulePublicXamanReturnVerification(id);
          return false;
        }

        if(status){
          status.classList.add('is-preparing');
          status.innerHTML='<strong>CONFIRMING YOUR MINT</strong><span>'+
            String(result.data?.message || 'Your signed transaction is being confirmed on the XRP Ledger. You do not need to mint again.')+
            '</span>';
        }
        schedulePublicXamanReturnVerification(id);
        return false;
      }

      schedulePublicXamanReturnVerification(id);
      return false;
    }catch(error){
      const message=String(error?.message || '');
      const code=String(error?.code || '').toUpperCase();
      const transient=/Failed to fetch|Failed to send a request|NetworkError|Load failed|fetch failed|timed out|timeout|temporarily|still being confirmed/i.test(message) ||
        code==='MINT_CONFIRMATION_PENDING' ||
        code==='XRPL_TRANSACTION_PENDING' ||
        code==='XRPL_VALIDATION_PENDING' ||
        code==='NFT_OWNERSHIP_CONFIRMATION_PENDING';

      if(transient){
        if(status){
          status.classList.add('is-preparing');
          status.innerHTML='<strong>FINALIZING YOUR MINT</strong><span>Your Xaman transaction is signed. One Home is safely confirming the result.</span>';
        }
        schedulePublicXamanReturnVerification(id);
        if(!quiet) console.error('One Home public Xaman return retry',error);
        return false;
      }

      if(['XAMAN_REQUEST_REJECTED','XAMAN_PAYLOAD_EXPIRED'].includes(code)){
        clearPendingMint();
        }

      if(status){
        status.classList.remove('is-preparing');
        status.innerHTML='<strong>MINT NOT COMPLETED</strong><span>'+collectorMintError(error)+'</span>';
      }
      if(!quiet) console.error('One Home public Xaman return verification',error);
      return false;
    }
  }

  async function verifyPublicXamanReturn(payloadUuid,quiet){
    const id=String(payloadUuid||'').trim();
    if(!/^[0-9a-f-]{36}$/i.test(id)) return false;

    if(xamanReturnPromise){
      if(xamanReturnPromiseKey===id) return xamanReturnPromise;
      const prior=xamanReturnPromise;
      return prior.finally(function(){}).then(function(){
        return verifyPublicXamanReturn(id,quiet);
      });
    }

    const work=verifyPublicXamanReturnUnlocked(id,quiet);
    xamanReturnPromise=work;
    xamanReturnPromiseKey=id;
    try{
      return await work;
    }finally{
      if(xamanReturnPromise===work){
        xamanReturnPromise=null;
        xamanReturnPromiseKey='';
      }
    }
  }

  async function resumeXamanReturn(payloadUuid){
    const id=String(payloadUuid||'').trim();
    if(!/^[0-9a-f-]{36}$/i.test(id)) return;
    showPage('onehomeFounderMintPage');
    window.scrollTo({top:0,behavior:'instant'});
    try{
      await loadMint({
        campaign_id:activeCampaignId(),
        network:requestedNetwork()
      });
    }catch(_error){}
    const status=q('founderMintStatus');
    if(status){
      status.classList.add('is-preparing');
      status.innerHTML='<strong>CHECKING YOUR XAMAN MINT</strong><span>One Home is confirming your signed transaction. You do not need to mint again.</span>';
    }
    await verifyPublicXamanReturn(id,true);
  }

  async function resumePendingMint(){
    const pending=pendingMintForCurrentContext();
    if(!pending?.claim_id) return;
    showPage('onehomeFounderMintPage');
    window.scrollTo({top:0,behavior:'instant'});
    await loadMint(
      pending.campaign_id
        ? {campaign_id:pending.campaign_id,network:pending.network||''}
        : {collection_id:pending.collection_id || activeCollectionId()}
    );

    const provider=normalizeXrplProvider(pending.wallet_provider)||'xaman';

    if(provider==='xaman'){
      const payload=String(pending.payload_uuid||'').trim();
      if(/^[0-9a-f-]{36}$/i.test(payload)){
        await verifyPublicXamanReturn(payload,true);
        return;
      }
      if(pending.sign_url){
        if(isMobileBrowser() && simplePublicXrplUi()){
          presentPreparedMobileXaman(
            pending.sign_url,
            pending.payload_uuid||'',
            pending.batch_order_id ? {
              order_id:pending.batch_order_id,
              token:pending.batch_token||'',
              quantity:Number(pending.batch_quantity||0),
              position:Number(pending.batch_position||0)
            } : null,
            'Your saved Xaman request is still available. Tap OPEN XAMAN to approve this exact existing mint; One Home will not create another claim.'
          );
        }else{
          showMintXamanLaunch(
            pending.sign_url,
            'Your saved Xaman request is still available. Open it to approve; One Home will resume the exact existing mint.'
          );
        }
      }
      return;
    }

    const status=q('founderMintStatus');
    if(status){
      status.innerHTML='<strong>CHECKING YOUR '+xrplProviderLabel(provider).toUpperCase()+' MINT</strong><span>One Home is confirming the signed transaction on the XRP Ledger.</span>';
    }
    await verifyPendingMint(true);
  }

  function featureList(data){
    if(rareRoutesMode()) return ['Randomized Route Ticket','8 Ticket Designs','Collect All 8 to Unlock the Route Reward'];
    const collection=data.collection || {};
    const list=[];
    if(collection.physical_enabled) list.push('Physical Item Included');
    if(collection.reveal_enabled) list.push('Reveal Collection');
    if(collection.future_updates_enabled) list.push('Evolving NFT + Living COA');
    if(collection.travel_tracker_enabled) list.push('Travel Tracker');
    if(!list.length) list.push('XRPL Digital Collectible');
    return list.slice(0,4);
  }

  function stateLabel(state){
    return ({open:'OPEN',published:'PUBLISHED',scheduled:'COMING SOON',ended:'CLOSED',sold_out:'SOLD OUT'})[state] || 'PUBLISHED';
  }

  function renderArtwork(data){
    const image=q('founderMintArtwork');
    const stage=q('founderMintArtworkStage');
    const fallback=q('founderMintCrateFallback');
    if(!image) return;
    const canonicalCover=String(data?.campaign?.cover_image_url||data?.cover_image_url||'').trim();
    const publishedArtwork=String(data?.artwork_url || '').trim();
    const founder=data?.access_mode==='founder' || data?.is_founder===true;
    const artworkSource=canonicalCover || publishedArtwork || (founder?DEFAULT_FOUNDER_ART:DEFAULT_STANDARD_ART);
    if(!founder&&artworkSource){
      try{document.documentElement.style.setProperty('--onehome-mint-campaign-bg','url('+JSON.stringify(artworkSource)+')');}catch(_error){}
    }else{
      try{document.documentElement.style.removeProperty('--onehome-mint-campaign-bg');}catch(_error){}
    }
    setOneHomeArtwork(image,artworkSource,1200);
    image.alt=canonicalCover
      ? (data?.campaign?.name||data?.collection?.name||'Published mint')+' cover'
      : publishedArtwork
        ? (data?.collection?.name || 'Collection')+' artwork'
        : founder
          ? '88 Squared Founder Supply Drop sealed package'
          : (data?.collection?.name || 'Published mint')+' artwork placeholder';
    image.hidden=false;
    stage?.classList.add('has-published-art');
    if(fallback) fallback.hidden=true;
  }

  async function renderAccessState(data){
    const founder=data?.access_mode==='founder' || data?.is_founder===true;
    const authenticated=await isAuthenticated();
    const banner=q('founderMintReadyBanner');
    const verify=q('founderMintVerifyBtn');
    banner?.classList.remove('is-waiting','is-error');

    if(!authenticated){
      hideMintWalletChooser();
      banner?.classList.add('is-waiting');
      text('founderMintReadyIcon','1');
      text('founderMintReadyTitle','Create or sign in to your One Home Passport');
      text('founderMintWallet','Your place in this mint will be remembered.');
      if(verify){ verify.hidden=false; verify.textContent='Sign In to Continue'; }
      setButtons(false);
      return {authenticated:false,eligible:false};
    }

    // During an existing multi-mint or an Xaman return, never show Choose
    // Wallet or re-enable mint controls. A multi-mint is already bound to its
    // receiving wallet/provider. A single-mint Xaman return is also locked while
    // its payload UUID is being authoritatively verified.
    const flowLock=mintFlowUiLockState();
    if(flowLock.locked){
      hideMintWalletChooser();
      banner?.classList.add('is-waiting');
      text('founderMintReadyIcon','…');
      text('founderMintReadyTitle',flowLock.batch_active?'Multi-mint in progress':'Xaman approval received');
      const boundWallet=flowLock.bound_wallet;
      text('founderMintWallet',boundWallet
        ? boundWallet.slice(0,8)+'…'+boundWallet.slice(-6)+(flowLock.batch_active?' remains bound to this order.':' is being verified.')
        : (flowLock.batch_active?'One Home is restoring the receiving wallet from the active order.':'One Home is verifying the signed Xaman request.'));
      if(verify) verify.hidden=true;
      setButtons(false);
      return {authenticated:true,eligible:false,batch_active:flowLock.batch_active,mint_return_active:flowLock.return_active};
    }

    if(!founder) await ensureInitialMintWalletSelection();
    const wallet=verifiedWallet();
    if(!founder) await renderMintWalletChooser();
    else hideMintWalletChooser();
    if(!wallet){
      renderMintEntitlement(null);
      banner?.classList.add('is-waiting');
      text('founderMintReadyIcon','2');
      text('founderMintReadyTitle',founder?'Verify Founder access':'Choose a receiving wallet');
      text('founderMintWallet',founder?'Connect the wallet holding the Founder requirements.':'Use a compatible wallet already linked to your Passport, or choose a different/new wallet below.');
      if(founder){
        if(verify){verify.hidden=false;verify.textContent='Verify Founder Access';}
      }else if(verify){
        verify.hidden=true;
      }
      setWalletConnectButtons(Boolean(data.claim_ready));
      return {authenticated:true,eligible:false};
    }

    let eligibility=eligibilityFor(data,ACCESS_CACHE_MS);
    if(!eligibility){
      banner?.classList.add('is-waiting');
      text('founderMintReadyIcon','…');
      text('founderMintReadyTitle',founder?'Confirming Founder access':'Confirming mint access');
      text('founderMintWallet',wallet.slice(0,8)+'…'+wallet.slice(-6)+' is being checked.');
      if(verify){ verify.hidden=true; }
      setButtons(false);
      eligibility=await verifyMintAccess(data,false);
    }

    if(!eligibility){
      banner?.classList.add('is-waiting');
      text('founderMintReadyIcon','2');
      text('founderMintReadyTitle',founder?'Verify Founder access':'Mint access needs attention');
      text('founderMintWallet',founder?'Tap below to check the Founder requirements again.':'This wallet could not be approved for this mint.');
      if(verify){ verify.hidden=false; verify.textContent=founder?'Verify Founder Access':'Check Mint Access'; }
      setButtons(false);
      return {authenticated:true,eligible:false};
    }

    renderMintEntitlement(eligibility?.allow_list||null);
    const lifetimeRemaining=Number(eligibility?.wallet_remaining);
    if(Number.isFinite(lifetimeRemaining)&&lifetimeRemaining<=0){
      banner?.classList.add('is-waiting');
      text('founderMintReadyIcon','!');
      text('founderMintReadyTitle','Wallet lifetime limit reached');
      text('founderMintWallet',wallet.slice(0,8)+'…'+wallet.slice(-6)+' has reached this mint’s lifetime wallet limit.');
      if(verify) verify.hidden=true;
      setButtons(false);
      return {authenticated:true,eligible:false,wallet_limit_reached:true};
    }

    text('founderMintReadyIcon','✓');
    text('founderMintReadyTitle',founder?'Your access is confirmed':'Receiving wallet ready');
    text('founderMintWallet',(verifiedProvider()?xrplProviderLabel(verifiedProvider())+' · ':'')+wallet.slice(0,8)+'…'+wallet.slice(-6)+' is ready.');
    if(verify) verify.hidden=true;
    setButtons(Boolean(data.claim_ready));
    return {authenticated:true,eligible:true};
  }
  function positionPublicMintDescription(simple){
    const description=q('founderMintDescription');
    const art=document.querySelector('#onehomeFounderMintPage .founder-mint-art');
    const details=document.querySelector('#onehomeFounderMintPage .founder-mint-details');
    const caption=document.querySelector('#onehomeFounderMintPage .founder-art-caption');
    const banner=q('founderMintReadyBanner');
    if(!description||!art||!details) return;
    if(simple){
      if(description.parentNode!==art) art.insertBefore(description,caption||null);
    }else if(description.parentNode!==details){
      details.insertBefore(description,banner||details.firstChild);
    }
  }

  async function renderMint(data){
    document.documentElement.classList.remove('onehome-mint-error-state');
    data=await applyCanonicalMintCover(data,data?.campaign?.id||activeCampaignId());
    currentMint=data;
    const collection=data.collection || {};
    const settings=data.settings || {};
    updateMintSocialMetadata(data,'xrpl');
    if(data.campaign?.id) rememberCampaign(data.campaign.id);
    else rememberCollection(collection.id);
    if(!Number(settings.max_per_mint)) settings.max_per_mint=await loadCreatorMintSessionLimit(data.campaign?.id||activeCampaignId());
    try{xrplMintPriceSchedule=await loadXrplMintPriceSchedule(data.campaign?.id||activeCampaignId())}catch(_tierError){xrplMintPriceSchedule=null}

    const founder=data?.access_mode==='founder' || data?.is_founder===true;
    const network=String(data?.campaign?.network || data?.collection?.network || '').toLowerCase()==='mainnet'?'mainnet':'testnet';
    const routeMint=rareRoutesMode();
    const simplePublic=!founder&&!routeMint;
    const simpleXrpl=simplePublic&&!evmCampaignMode&&!isTestMintPage();
    document.documentElement.classList.toggle('onehome-simple-public-mint',simplePublic);
    document.documentElement.classList.toggle('onehome-xrpl-public-mint',simpleXrpl);
    const progress=q('onehomeMintProgress');
    if(progress) progress.hidden=!simpleXrpl;
    positionPublicMintDescription(simpleXrpl);
    text('founderMintPathSection',routeMint ? 'RARE ROUTES' : founder ? 'FOUNDER SUPPLY DROP' : 'PUBLIC MINT');
    text('founderMintHeaderPath',routeMint ? 'ROUTE SYSTEM' : founder ? 'FOUNDER DROP' : network==='testnet' ? 'TESTNET MINT' : 'MAINNET MINT');
    text('founderMintDropLabel',routeMint ? 'RARE ROUTES · SEASON 1' : founder ? 'FOUNDER SUPPLY DROP' : network==='testnet' ? 'XRPL TESTNET MINT' : 'XRPL MAINNET MINT');
    text('founderMintSealStatus',collection.reveal_enabled ? 'SEALED' : stateLabel(data.sale_state));
    text('founderMintName',collection.name || 'Published Collection');
    text('founderMintDescription',collection.description || 'A collection published through Rare Ink Studio.');
    const publicTierPrice=currentXrplPublicPrice(settings.price);const publicTierSchedule=activeXrplTierSchedule();text('founderMintPrice',publicTierPrice+' '+(settings.currency || 'XRP')+(publicTierSchedule?' · MINT #'+Number(publicTierSchedule.next_position||1):''));
    text('founderMintSupply',Math.max(0,Number(data.remaining)||0)+' / '+Math.max(0,Number(collection.supply)||0));
    text('founderMintStatusLabel',stateLabel(data.sale_state));
    text('founderMintQuantity',Math.max(1,Number(settings.per_wallet_limit)||1)+' PER WALLET');
    text('founderMintCrateSupply',Math.max(0,Number(data.remaining)||0)+' / '+Math.max(0,Number(collection.supply)||0));
    text('founderMintArtEyebrow',routeMint ? 'Rare Routes System' : collection.reveal_enabled ? 'The reveal begins after the collection closes.' : 'Published through Rare Ink Studio');
    text('founderMintRevealTitle',routeMint ? 'SEASON 1 ROUTE' : collection.reveal_enabled ? 'SEALED UNTIL REVEAL' : 'READY TO COLLECT');
    const revealCopy=q('founderMintRevealCopy');
    if(revealCopy){
      if(collection.reveal_enabled && !routeMint){
        revealCopy.hidden=false;
        revealCopy.textContent='The final artwork is assigned through the reveal settings saved by the creator.';
      }else{
        revealCopy.hidden=true;
        revealCopy.textContent='';
      }
    }
    text('founderMintAccessLabel',routeMint ? 'Rare Routes Access' : founder ? 'Verified Founder Access' : 'One Home Mint Access');
    const tierCopy=publicTierSchedule?' Automatic pricing: '+xrplTierScheduleText()+'. The server selects the exact price for each outgoing mint.':'';text('founderMintPaymentNote',routeMint ? ((network==='testnet'?'This is an XRPL Testnet mint. No Mainnet NFT or XRP is involved. ':'')+'Each mint receives one random Season 1 Route Ticket from the remaining fixed inventory. NO CLAIM NEEDED — after the mint is confirmed, your NFT is delivered directly to the XRP wallet you chose. The mint price is paid in '+(settings.currency || 'XRP')+'.'+tierCopy) : (network==='testnet'?'Testnet mint. No Mainnet NFT or XRP is involved. ':'')+(data.gate_count ? 'Access requirements apply. ' : '')+'NO CLAIM NEEDED — after your mint is confirmed, the NFT is delivered directly to the XRP wallet you chose. One Home does not require a separate claim or collect step. The mint price is '+(settings.currency || 'XRP')+'.'+tierCopy);
    const paymentNote=q('founderMintPaymentNote');
    if(paymentNote) paymentNote.hidden=false;

    ensureMintQuantityControl(data);

    const includes=q('founderMintIncludes');
    if(includes){
      if(simpleXrpl){
        includes.innerHTML='';
        includes.hidden=true;
      }else{
        includes.hidden=false;
        includes.innerHTML=featureList(data).map(function(label){
          return '<div><span>✓</span><strong>'+String(label).replace(/[&<>"']/g,function(ch){return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[ch];})+'</strong></div>';
        }).join('');
      }
    }

    renderArtwork(data);
    const access=await renderAccessState(data);
    // Recalculate after wallet verification so XRPL quantity reflects the
    // wallet's remaining lifetime allowance, not only the campaign maximum.
    ensureMintQuantityControl(data);
    const status=q('founderMintStatus');
    if(!status) return;
    status.hidden=false;

    status.classList.toggle('is-preparing',data.sale_state !== 'open' || !data.claim_ready);
    if(data.sale_state === 'sold_out'){
      status.innerHTML='<strong>COLLECTION SOLD OUT</strong><span>Every available item in this collection has been claimed.</span>';
      setButtons(false);
    }else if(data.sale_state === 'scheduled'){
      status.innerHTML='<strong>DROP SCHEDULED</strong><span>This mint will open at the start time saved by the creator.</span>';
      setButtons(false);
    }else if(data.sale_state === 'ended'){
      status.innerHTML='<strong>MINT CLOSED</strong><span>The collection is no longer accepting new mints.</span>';
      setButtons(false);
    }else if(!access.authenticated){
      status.innerHTML='<strong>WELCOME HOME</strong><span>Enter through the front door before continuing to this mint.</span>';
    }else if(access.batch_active){
      status.classList.add('is-preparing');
      status.innerHTML='<strong>CONTINUING MULTI-MINT</strong><span>Your receiving wallet is already locked to this order. One Home is preparing or verifying the next approval.</span>';
      setButtons(false);
    }else if(access.mint_return_active){
      status.classList.add('is-preparing');
      status.innerHTML='<strong>CHECKING YOUR XAMAN MINT</strong><span>One Home is verifying the signed request before changing any mint controls.</span>';
      setButtons(false);
    }else if(!access.eligible){
      if(!verifiedWallet() && !founder){
        status.classList.remove('is-preparing');
        status.hidden=true;
        setWalletConnectButtons(Boolean(data.claim_ready));
      }else{
        status.innerHTML='<strong>ACCESS CHECK REQUIRED</strong><span>Verify the qualifying wallet to continue.</span>';
      }
    }else if(!data.claim_ready){
      status.innerHTML='<strong>COLLECTION PAGE PUBLISHED</strong><span>The mint will unlock here as soon as the collection is opened for collectors.</span>';
      setButtons(false);
    }else{
      status.classList.remove('is-preparing');
      status.hidden=true;
      setButtons(true);
    }
  }

  function renderError(message){
    evmCampaignMode=false;
    evmMintState=null;
    document.documentElement.classList.add('onehome-mint-error-state');
    document.documentElement.classList.remove('onehome-xrpl-public-mint');
    hideMintWalletChooser();
    ['founderMintXamanBtn','founderMintCrossmarkBtn','founderMintJoeyBtn','founderMintMetaMaskBtn'].forEach(function(id){
      const button=q(id);if(button){button.hidden=true;button.style.display='none';button.disabled=true;}
    });
    renderArtwork({collection:{name:'Published Mint'}});
    text('founderMintSealStatus','NOT OPEN');
    text('founderMintName','MINT NOT AVAILABLE');
    text('founderMintDescription',message || 'This mint has not been published yet.');
    text('founderMintStatusLabel','PREPARING');
    const status=q('founderMintStatus');
    if(status) status.innerHTML='<strong>MINT PAGE READY</strong><span>'+String(message || 'The collection will appear here after it is published from Rare Ink Studio.')+'</span>';
    setButtons(false);
  }

  async function loadMint(target){
    const supplied=target&&typeof target==='object'?target:{};const campaignId=String(supplied.campaign_id||(typeof target==='string'?target:'')||activeCampaignId()||'').trim();const requested=String(supplied.network||requestedNetwork()||'').toLowerCase();const explicitChain=String(supplied.chain||requestedChain()||'').trim().toLowerCase();
    if(!/^[0-9a-f-]{36}$/i.test(campaignId)){renderError('This mint link is missing its campaign reference.');return null;}

    // Stellar Testnet has its own authenticated Soroban/Freighter renderer.
    // Do not send an explicit Stellar chain link through the EVM renderer.
    if(explicitChain==='stellar-testnet'){
      evmCampaignMode=false;evmMintState=null;rememberCampaign(campaignId);setLoading({campaign_id:campaignId,chain:explicitChain});return null;
    }

    // Other explicit One Home contract-chain keys continue through the universal EVM lane.
    if(explicitChain){
      const requestKey=JSON.stringify({campaign_id:campaignId,chain:explicitChain});if(loadingPromise&&loadingKey===requestKey)return loadingPromise;loadingKey=requestKey;setLoading({campaign_id:campaignId,chain:explicitChain});rememberCampaign(campaignId);const requestPromise=(async function(){try{return await renderEvmCampaignById(campaignId)}catch(error){renderError(error?.message||'The EVM mint could not be loaded.');return null}finally{loadingPromise=null;loadingKey=''}})();loadingPromise=requestPromise;return requestPromise;
    }

    // Never choose XRPL merely because campaign.network is "testnet". Load the public
    // campaign first, then probe the universal EVM campaign backend before any XRPL redirect.
    evmCampaignMode=false;evmMintState=null;const requestBody={campaign_id:campaignId,network:requested};const requestKey=JSON.stringify(requestBody);if(loadingPromise&&loadingKey===requestKey)return loadingPromise;if(loadingController){try{loadingController.abort()}catch(_error){}}const sequence=++loadSequence;const controller=new AbortController();loadingController=controller;loadingKey=requestKey;setLoading(requestBody);rememberCampaign(campaignId);
    const requestPromise=(async function(){
      try{
        const response=await fetch(FUNCTIONS_BASE+'/get-public-mint',{method:'POST',headers:{'Content-Type':'application/json','apikey':SUPABASE_KEY},body:JSON.stringify(requestBody),signal:controller.signal});const data=await response.json().catch(function(){return {}});if(!response.ok||data.success===false)throw new Error(data.error||'The published mint could not be loaded.');if(sequence!==loadSequence)return null;if(String(data?.campaign?.id||'')!==campaignId)throw new Error('The requested mint campaign did not match the published mint response.');await ensureShortMintLink(campaignId);canonicalizeShortMintLocation(campaignId);
        const resolvedNetwork=String(data?.campaign?.network||data?.collection?.network||requested||'').toLowerCase();if(requested&&resolvedNetwork&&requested!==resolvedNetwork)throw new Error('The requested mint network did not match the published mint response.');
        let evmData=null;const authenticated=await isAuthenticated().catch(function(){return false});if(authenticated&&(publicMintLooksLikeEvm(data)||resolvedNetwork==='testnet'))evmData=await probeAuthenticatedEvmCampaign(campaignId);if(evmData){const chainKey=String(evmData?.network?.chain_key||publicMintEvmChainKey(data)||'');const canonical=canonicalEvmMintUrl(campaignId,chainKey);if(isTestMintPage()){window.location.replace(canonical);return null}try{window.history.replaceState({},'',canonical)}catch(_error){}evmCampaignMode=true;evmMintState=evmData;currentMint=null;await renderEvmMint(evmData);return evmData;}
        if(!authenticated&&publicMintLooksLikeEvm(data)){evmCampaignMode=true;const publicChain=publicMintEvmChainKey(data);if(publicChain){try{window.history.replaceState({},'',canonicalEvmMintUrl(campaignId,publicChain))}catch(_error){}}const guestNetwork=FALLBACK_EVM_NETWORKS[publicChain]||{chain_key:publicChain};const guest={campaign:{...(data.campaign||{}),id:campaignId},network:guestNetwork,mint:{price:data?.campaign?.price??'—',native_symbol:data?.campaign?.payment_currency_code||guestNetwork.native_symbol||'TEST',remaining:Number(data?.campaign?.total_supply||1),max_supply:Number(data?.campaign?.total_supply||1)},wallet:{verified:false,expected_from:''},buyer:{remaining_under_wallet_limit:Number(data?.campaign?.per_wallet_limit||1)},open:false};await renderEvmMint(guest);return guest;}
        if(resolvedNetwork==='testnet'&&!isTestMintPage()){const params=new URLSearchParams(window.location.search);params.set('campaign',campaignId);params.set('network','testnet');params.delete('chain');params.delete('v');window.location.replace('/test-mint.html?'+params.toString());return null;}
        if(data?.is_founder===true||data?.access_mode==='founder'){window.location.replace('/?passport=mint');return null;}await renderMint(data);if(!pendingMintForCurrentContext()?.claim_id)setTimeout(async function(){if(!(await recoverCrossmarkMint(data)))await recoverJoeyMint(data)},120);return data;
      }catch(error){
        if(error?.name==='AbortError'||sequence!==loadSequence)return null;
        if((requested==='testnet'||isTestMintPage())&&await isAuthenticated().catch(function(){return false})){
          try{let evm=await callEvmCampaign('status');if(String(evm?.campaign?.id||'')===campaignId){evm=await recoverEvmMintIfNeeded(evm);const canonical=canonicalEvmMintUrl(campaignId,evm?.network?.chain_key||'');if(isTestMintPage()){window.location.replace(canonical);return null}try{window.history.replaceState({},'',canonical)}catch(_historyError){}await renderEvmMint(evm);return evm;}}catch(_evmProbeError){}
        }
        renderError(error?.message||'The published mint could not be loaded.');return null;
      }finally{if(sequence===loadSequence){loadingPromise=null;loadingKey='';loadingController=null;}}
    })();loadingPromise=requestPromise;return requestPromise;
  }
  async function openMint(target){
    const supplied=target && typeof target==='object' ? target : {};
    const campaignId=String(supplied.campaign_id || (typeof target==='string'?target:'') || activeCampaignId() || '').trim();
    if(campaignId) rememberCampaign(campaignId);
    showPage('onehomeFounderMintPage');
    window.scrollTo({top:0,behavior:'instant'});
    return loadMint({campaign_id:campaignId,network:supplied.network||requestedNetwork()});
  }
  async function refresh(){
    const campaignId=String(currentMint?.campaign?.id || activeCampaignId() || '').trim();
    return campaignId ? loadMint({campaign_id:campaignId,network:currentMint?.campaign?.network||requestedNetwork()}) : null;
  }
  async function start(provider,options){
    const status=q('founderMintStatus');
    if(status)status.hidden=false;
    const walletProvider=normalizeXrplProvider(provider)||'xaman';
    const startOptions=options || {};
    if(walletProvider==='joey'&&!joeyMintAllowed()){
      if(status) status.innerHTML='<strong>JOEY WALLET USES XRP LEDGER MAINNET</strong><span>Joey Wallet is not enabled for this Testnet mint.</span>';
      return;
    }
    const skipProviderReconnect=startOptions.skipProviderReconnect===true;
    clearPreparedMobileXamanLaunch();
    const suppliedXamanWindow=startOptions.xamanWindow && !startOptions.xamanWindow.closed
      ? startOptions.xamanWindow
      : null;
    lastMintError='';
    lastMintErrorAt=0;
    if(!evmCampaignMode&&currentMint?.campaign?.id) await refreshXrplTierPriceDisplay(true);
    if(!skipProviderReconnect && walletProviderNeedsConnection(walletProvider)){
      return connectMintWallet(walletProvider);
    }
    if(walletProvider==='crossmark'&&isMobileBrowser()){
      if(status) status.innerHTML='<strong>OPEN CROSSMARK ON DESKTOP</strong><span>Crossmark minting is available from its desktop browser extension.</span>';
      return;
    }
    // Mobile Xaman must remain in the foreground Safari browsing context.
    // v14.67.163 opened a blank child tab synchronously, but iOS can suspend the
    // originating mint tab as soon as that child becomes foreground. The async
    // reconcile/reserve/create-payload chain then stops progressing, leaving the
    // child forever on "Preparing your Xaman request…". Restore the previously
    // validated mobile design from v14.67.152-v14.67.160: prepare in the current
    // foreground mint tab, then top-level navigate that same tab to the exact
    // Xaman signing URL. Desktop quantity=1 keeps its proven popup; desktop
    // multi-mint keeps the proven same-tab durable batch return.
    const requestedQuantityIntent=Math.max(1,Math.min(selectedMintQuantityMax||1,selectedMintQuantity||1));
    const mobileXamanMint=walletProvider==='xaman'&&isMobileBrowser();
    const desktopXamanBatchSameTab=walletProvider==='xaman'&&!mobileXamanMint&&requestedQuantityIntent>1;
    const xamanWindow=walletProvider==='xaman' && !mobileXamanMint && !desktopXamanBatchSameTab
      ? (suppliedXamanWindow || window.open('about:blank','onehome-xaman-mint'))
      : null;
    if(xamanWindow && !xamanWindow.closed) desktopXamanMintWindow=xamanWindow;
    if(xamanWindow){
      try{
        xamanWindow.opener=null;
        xamanWindow.document.title='Opening Xaman…';
        xamanWindow.document.body.innerHTML='<p style="font-family:system-ui;padding:24px">Preparing your Xaman request…</p>';
      }catch(_error){}
    }
    if(!currentMint){ if(xamanWindow&&!xamanWindow.closed)xamanWindow.close(); await loadMint({campaign_id:activeCampaignId(),network:requestedNetwork()}); return; }
    const access=await renderAccessState(currentMint);
    if(!access.authenticated || !access.eligible){
      if(xamanWindow&&!xamanWindow.closed)xamanWindow.close();
      if(status) status.innerHTML='<strong>ACCESS CHECK REQUIRED</strong><span>Complete the One Home Passport and wallet access check first.</span>';
      return;
    }
    if(!currentMint.claim_ready || !currentMint.campaign?.id){
      if(xamanWindow&&!xamanWindow.closed)xamanWindow.close();
      if(status) status.innerHTML='<strong>COLLECTION PAGE PUBLISHED</strong><span>The mint will unlock here when the collection is opened for collectors.</span>';
      return;
    }
    const eligibility=eligibilityFor(currentMint,ACCESS_CACHE_MS) || await verifyMintAccess(currentMint,true);
    const wallet=String(eligibility?.wallet || verifiedWallet() || '').trim();
    if(!wallet){
      if(xamanWindow&&!xamanWindow.closed)xamanWindow.close();
      if(status) status.innerHTML='<strong>VERIFIED WALLET REQUIRED</strong><span>Connect the verified wallet that will receive the NFT.</span>';
      return;
    }
    const expectedWallet=String(startOptions.expectedWallet||'').trim();
    if(validXrplWallet(expectedWallet) && wallet.toLowerCase()!==expectedWallet.toLowerCase()){
      if(xamanWindow&&!xamanWindow.closed)xamanWindow.close();
      if(status) status.innerHTML='<strong>WALLET CHOICE CHANGED</strong><span>One Home stopped before reserving an NFT because the receiving wallet changed. Choose the XRP wallet again.</span>';
      return;
    }
    const appleSafari=walletProvider==='xaman'&&isAppleSafari();
    mintActionActive=true;
    try{
      setButtons(false);
      let crossmarkSdk=null;
      if(walletProvider==='crossmark'){
        crossmarkSdk=findCrossmarkSdk();
        if(!crossmarkSdk) throw new Error('Open or install the Crossmark browser extension, then try again.');
        if(!skipProviderReconnect){
          if(status){status.classList.add('is-preparing');status.innerHTML='<strong>CONFIRM IN CROSSMARK</strong><span>Confirm the wallet that will receive this NFT.</span>';}
          const signIn=await crossmarkSignIn(crossmarkSdk);
          const connected=crossmarkAddress(signIn);
          if(!connected) throw new Error('Crossmark did not return a wallet address.');
          if(connected.toLowerCase()!==wallet.toLowerCase()) throw new Error('Crossmark opened a different wallet than the wallet verified for this mint.');
        }
      }
      let joeyApi=null;
      if(walletProvider==='joey'){
        joeyApi=window.OneHomeJoeyWallet;
        if(!joeyApi?.connect||!joeyApi?.signAndSubmit) throw new Error('Joey Wallet connection is still loading. Refresh One Home and try again.');
        if(status){status.classList.add('is-preparing');status.innerHTML='<strong>CONNECTING JOEY WALLET</strong><span>Confirm the Joey Wallet that will receive this NFT.</span>';}
        const connected=await joeyApi.connect();
        const connectedAddress=String(connected?.address||joeyApi.getAddress?.()||'').trim();
        if(!validXrplWallet(connectedAddress)) throw new Error('Joey Wallet did not return an XRP Ledger account.');
        if(connectedAddress.toLowerCase()!==wallet.toLowerCase()) throw new Error('Joey Wallet opened a different wallet than the wallet verified for this mint.');
      }
      if(status){status.classList.add('is-preparing');status.innerHTML='<strong>RESERVING YOUR NFT</strong><span>One Home is securely selecting the next available NFT.</span>';}
      const claimFunction=String(currentMint.campaign?.mint_method || '').toLowerCase()==='on_demand'?'on-demand-mint-manager':'create-mint-claim';
      if(claimFunction==='on-demand-mint-manager'){
        await reconcileXrplMintOnDemandBeforeReserve(currentMint.campaign.id,status);
        if(status){status.innerHTML='<strong>RESERVING YOUR NFT</strong><span>One Home is securely selecting the next available NFT.</span>';}
      }
      const requestedQuantity=requestedQuantityIntent;
      const claimResult=await reserveMintWithRetry(claimFunction,{
        campaign_id:currentMint.campaign.id,
        campaign_slug:currentMint.campaign.slug,
        slug:currentMint.campaign.slug,
        collector_wallet:wallet,
        wallet_address:wallet,
        wallet,
        wallet_provider:walletProvider,
        provider:walletProvider,
        ...(requestedQuantity>1?{batch_quantity:requestedQuantity}:{})
      },status);
      const activeBatch=claimResult.data?.batch?batchFromResponse(claimResult.data.batch,walletProvider):null;
      const authoritativePayment=claimResult.data?.payment||{};
      if(claimFunction==='on-demand-mint-manager'&&authoritativePayment.price!==undefined&&authoritativePayment.price!==null){
        const effectivePrice=Number(authoritativePayment.price||0);
        const priceTier=String(authoritativePayment.tier||'public').toLowerCase();
        const priceLabel=priceTier==='free'?'FREE':(Number.isFinite(effectivePrice)?effectivePrice+' XRP':String(authoritativePayment.price)+' XRP');
        text('founderMintPrice',priceTier==='discount'?priceLabel+' · ALLOW LIST':priceTier==='free'?'FREE · ALLOW LIST':priceLabel);
        const paymentNote=q('founderMintPaymentNote');
        if(paymentNote){paymentNote.hidden=false;paymentNote.textContent=priceTier==='free'?'Your XRP wallet has a free Allow List mint. Only the normal XRP Ledger network fee applies.':priceTier==='discount'?`Your XRP wallet has an Allow List price of ${priceLabel}.`:`This mint uses the public price of ${priceLabel}.`;}
        if(status){status.innerHTML=priceTier==='free'?'<strong>ALLOW LIST · FREE MINT</strong><span>Your wallet-qualified price is FREE. Preparing the wallet approval now.</span>':priceTier==='discount'?`<strong>ALLOW LIST PRICE · ${priceLabel}</strong><span>Your wallet-qualified discount is locked for this NFT.</span>`:`<strong>PUBLIC PRICE · ${priceLabel}</strong><span>Your NFT price is locked for this reservation.</span>`;}
      }
      const claim=claimResult.data?.claim || claimResult.data || {};
      const claimId=String(claim.id || claimResult.data?.claim_id || '').trim();
      const reservationToken=String(claim.reservation_token || claimResult.data?.reservation_token || '').trim();
      if(!claimId || !reservationToken) throw new Error('One Home did not receive a valid reserved mint claim.');
      if(walletProvider==='joey'){
        const transaction=claimResult.data?.transaction;
        if(!transaction || transaction.TransactionType!=='NFTokenAcceptOffer') throw new Error('One Home did not receive a valid Joey Wallet mint transaction.');
        if(status) status.innerHTML='<strong>APPROVE IN JOEY WALLET</strong><span>Review the XRP Ledger transaction, then approve the mint.</span>';
        const submitted=await joeyApi.signAndSubmit(transaction,wallet,'NFTokenAcceptOffer');
        const transactionHash=String(submitted?.hash||'').trim().toUpperCase();
        if(!/^[A-F0-9]{64}$/.test(transactionHash)) throw new Error('Joey Wallet submitted the transaction but did not return a valid transaction hash. Do not approve another mint; use Refresh to recover this one.');
        savePendingMint({claim_id:claimId,reservation_token:reservationToken,transaction_hash:transactionHash,wallet_provider:'joey',collector_wallet:wallet,collection_id:currentMint.collection?.id||'',campaign_id:currentMint.campaign.id,network:currentMint.campaign.network||currentMint.collection?.network||'',...(activeBatch?{batch_order_id:activeBatch.order_id,batch_token:activeBatch.token,batch_quantity:activeBatch.quantity,batch_position:activeBatch.position}:{})});
        if(status) status.innerHTML='<strong>CONFIRMING ON XRPL</strong><span>Your Joey Wallet transaction is being verified on the XRP Ledger.</span>';
        await verifyPendingMint(false);
        mintActionActive=false;
        return;
      }
      if(walletProvider==='crossmark'){
        const transaction=claimResult.data?.transaction;
        if(!transaction || transaction.TransactionType!=='NFTokenAcceptOffer') throw new Error('One Home did not receive a valid Crossmark mint transaction.');
        if(status) status.innerHTML='<strong>APPROVE IN CROSSMARK</strong><span>Review the price and transaction details, then approve the mint.</span>';
        const submitted=await crossmarkSubmitForOneHome(crossmarkSdk,transaction);
        const transactionHash=String(submitted.hash||'').toUpperCase();
        if(transactionHash){
          savePendingMint({claim_id:claimId,reservation_token:reservationToken,transaction_hash:transactionHash,wallet_provider:'crossmark',collector_wallet:wallet,collection_id:currentMint.collection?.id||'',campaign_id:currentMint.campaign.id,network:currentMint.campaign.network||currentMint.collection?.network||'',...(activeBatch?{batch_order_id:activeBatch.order_id,batch_token:activeBatch.token,batch_quantity:activeBatch.quantity,batch_position:activeBatch.position}:{})});
          if(status) status.innerHTML=submitted.recoveredFromBusy
            ? '<strong>TRANSACTION SUBMITTED</strong><span>Confirming your mint. Do not mint again.</span>'
            : '<strong>CONFIRMING ON XRPL</strong><span>Your Crossmark transaction is being verified.</span>';
          await verifyPendingMint(false);
          mintActionActive=false;
          return;
        }
        if(submitted.submitted){
          if(status){status.classList.add('is-preparing');status.innerHTML='<strong>TRANSACTION SUBMITTED</strong><span>Confirming your mint. Do not mint again.</span>';}
          crossmarkRecoveryKey='';
          crossmarkRecoveryPromise=null;
          mintActionActive=false;
          setTimeout(async function(){
            const recovered=await recoverCrossmarkMint(currentMint);
            if(!recovered){
              crossmarkRecoveryKey='';
              scheduleMintVerification();
            }
          },1200);
          return;
        }
        throw new Error('Crossmark did not return a submitted transaction result.');
      }
      if(status) status.innerHTML='<strong>CREATING XAMAN REQUEST</strong><span>Your NFT is reserved while the signing request is prepared.</span>';
      const requestResult=await callFunction('create-xaman-mint-request',{claim_id:claimId,reservation_token:reservationToken,client_return_mode:desktopXamanBatchSameTab?'same_tab':(mobileXamanMint?'mobile':'desktop'),...(activeBatch?{batch_order_id:activeBatch.order_id,batch_token:activeBatch.token}:{})},true);
      const xaman=requestResult.data?.xaman || {};
      const signUrl=String(xaman.sign_url || requestResult.data?.sign_url || '').trim();
      if(!signUrl) throw new Error('Xaman did not return a signing link.');
      savePendingMint({claim_id:claimId,reservation_token:reservationToken,payload_uuid:xaman.payload_uuid||'',sign_url:signUrl,wallet_provider:'xaman',collector_wallet:wallet,collection_id:currentMint.collection?.id||'',campaign_id:currentMint.campaign.id,network:currentMint.campaign.network||currentMint.collection?.network||'',...(activeBatch?{batch_order_id:activeBatch.order_id,batch_token:activeBatch.token,batch_quantity:activeBatch.quantity,batch_position:activeBatch.position}:{})});
      let launched=false;
      if(desktopXamanBatchSameTab){
        if(status) status.innerHTML=activeBatch?'<strong>APPROVE '+activeBatch.position+' OF '+activeBatch.quantity+' IN XAMAN</strong><span>Approve each ticket. One Home will automatically prepare the next one.</span>':'<strong>APPROVE IN XAMAN</strong><span>One Home is opening Xaman. Review the transaction, approve it, then return here.</span>';
        try{window.location.assign(signUrl);launched=true;}catch(_error){}
      }else if(mobileXamanMint && simplePublicXrplUi()){
        // v14.67.219: restore the working Safari/Xaman mobile contract by
        // separating async request preparation from the deeplink itself. Xaman
        // mobile deeplinks are most reliable when the payload URL is opened by
        // a fresh collector tap, so keep Safari on this exact mint and replace
        // MINT with a real OPEN XAMAN anchor once the server returns next.always.
        // The anchor's click handler records xaman_launch_started_at for this
        // exact saved UUID; simply preparing the request must never look like a
        // launch if Safari blocked a scripted redirect.
        if(status) status.innerHTML=activeBatch
          ? '<strong>XAMAN REQUEST READY · '+activeBatch.position+' OF '+activeBatch.quantity+'</strong><span>Tap OPEN XAMAN to approve this exact saved request.</span>'
          : '<strong>XAMAN REQUEST READY</strong><span>Tap OPEN XAMAN to review and approve this exact saved request.</span>';
        const armed=presentPreparedMobileXaman(signUrl,xaman.payload_uuid||'',activeBatch,activeBatch
          ? 'Mint '+activeBatch.position+' of '+activeBatch.quantity+' is ready. Tap OPEN XAMAN to approve this exact request.'
          : 'Your mint request is ready. Tap OPEN XAMAN to approve this exact request.');
        launched=armed || showMintXamanLaunch(signUrl,'Your exact Xaman request is ready. Tap Open Xaman to approve it.');
      }else if(mobileXamanMint){
        if(status) status.innerHTML=activeBatch?'<strong>APPROVE '+activeBatch.position+' OF '+activeBatch.quantity+' IN XAMAN</strong><span>Approve each ticket. One Home will automatically prepare the next one.</span>':'<strong>APPROVE IN XAMAN</strong><span>One Home is opening Xaman. Review the transaction, approve it, then return here.</span>';
        // Legacy/founder/test mobile behavior is left unchanged by v14.67.165.
        showMintXamanLaunch(signUrl,activeBatch
          ? 'Your next mint request is ready. One Home is opening Xaman now. Use Open Xaman if the app does not open automatically.'
          : 'Your mint request is ready. One Home is opening Xaman now. Use Open Xaman if the app does not open automatically.');
        try{window.location.assign(signUrl);launched=true;}catch(_error){}
      }
      if(!launched && xamanWindow && !xamanWindow.closed){
        try{xamanWindow.location.replace(signUrl);xamanWindow.focus();launched=true;}catch(_error){}
      }
      if(!launched){
        try{window.location.assign(signUrl);launched=true;}catch(_error){}
      }
      if(!launched){
        showMintXamanLaunch(signUrl,'Xaman is ready. Tap Open Xaman to approve the transaction.');
      }else if(appleSafari && status){
        const fallback=document.createElement('a');
        fallback.href=signUrl;
        fallback.textContent='Open Xaman Again';
        fallback.className='founder-mint-entry-button';
        fallback.style.display='inline-flex';
        fallback.style.marginTop='12px';
        status.appendChild(fallback);
      }
      // Multi-mint completion enters through the server-authoritative return
      // bridge on iOS, Android, and desktop. Keep the already-proven desktop
      // single-mint verifier fallback; it now verifies by payload UUID rather
      // than depending on the browser Home ID session.
      if(
        !mobileXamanMint &&
        !activeBatch &&
        /^[0-9a-f-]{36}$/i.test(String(xaman.payload_uuid||''))
      ){
        schedulePublicXamanReturnVerification(String(xaman.payload_uuid));
      }
      mintActionActive=false;
    }catch(error){
      mintActionActive=false;
      console.error('One Home public mint start',error);
      lastMintError=collectorMintError(error);
      lastMintErrorAt=Date.now();
      clearPreparedMobileXamanLaunch();
      if(xamanWindow && !xamanWindow.closed) xamanWindow.close();
      if(!pendingMintForCurrentContext()?.claim_id) clearPendingMint();
      if(status){
        status.classList.remove('is-preparing');
        status.innerHTML='<strong>MINT COULD NOT START</strong><span>'+lastMintError+'</span>';
      }
      setButtons(true);
    }
  }

  async function openDestinationOptions(){
    window.location.assign('/one-home/');
  }

  function passportReturnUrl(){
    const campaignId=activeCampaignId();
    if(evmCampaignMode||requestedChain()){const chain=String(evmMintState?.network?.chain_key||requestedChain()||'');return canonicalEvmMintUrl(campaignId,chain);}
    const network=requestedNetwork() || String(currentMint?.campaign?.network || 'testnet');
    if(network === 'testnet' && isTestMintPage()){
      return mintSourceUrl(`/test-mint.html?campaign=${encodeURIComponent(campaignId)}&network=testnet`);
    }
    return currentShortMintUrl()||mintSourceUrl(`/mint/${encodeURIComponent(campaignId)}?network=${encodeURIComponent(network)}`);
  }

  async function verifyAccess(){
    const authenticated=await isAuthenticated();
    if(evmCampaignMode||requestedChain()){
      if(!authenticated){const campaignId=activeCampaignId();const returnPath=passportReturnUrl();window.location.assign(`/?passport=entry&from=mint&campaign=${encodeURIComponent(campaignId)}&return=${encodeURIComponent(returnPath)}`);return;}
      window.location.assign('/?passport=profile');return;
    }
    const wallet=verifiedWallet();
    if(!authenticated){
      const campaignId=activeCampaignId();
      const network=requestedNetwork() || String(currentMint?.campaign?.network || 'testnet');
      const returnPath=passportReturnUrl();
      window.location.assign(`/?passport=entry&from=mint&campaign=${encodeURIComponent(campaignId)}&network=${encodeURIComponent(network)}&return=${encodeURIComponent(returnPath)}`);
      return;
    }
    if(!wallet){
      mintWalletChooserOpen=true;
      await renderMintWalletChooser();
      const status=q('founderMintStatus');
      if(status){status.classList.remove('is-preparing');status.innerHTML='<strong>CHOOSE A RECEIVING WALLET</strong><span>Select a linked Passport wallet or use a different/new wallet below.</span>';}
      setButtons(false);
      return;
    }
    if(currentMint){
      await verifyMintAccess(currentMint,true);
      await renderMint(currentMint);
    }
  }
  function syncMintProgress(){
    const bar=q('onehomeMintProgress');
    const status=q('founderMintStatus');
    if(!bar||!status) return;
    const label=String(status.querySelector('strong')?.textContent||'').toUpperCase();
    const detail=String(status.querySelector('span')?.textContent||'').toUpperCase();
    const combined=label+' '+detail;
    const attention=/ATTENTION|FAILED|ERROR|COULD NOT|REJECTED|EXPIRED|NOT CONNECTED|NOT READY|LIMIT REACHED|SOLD OUT/.test(label);
    status.classList.toggle('is-attention',attention);

    // 0 Wallet, 1 Access, 2 Prepare, 3 Approve, 4 Verify/Complete, 5 finished.
    // PRE-MINT Xaman SignIn is deliberately Wallet, not Approve/Complete.
    let stage=0;
    if(/SUCCESS|MINTED|MINT COMPLETE|COMPLETE$/.test(label)) stage=5;
    else if(/VERIFY|CHECKING.*LEDGER|LEDGER|CONFIRMING TRANSACTION|FINALIZ/.test(combined)) stage=4;
    else if(/OPENING XAMAN|APPROV(?:E|AL)|SIGN TRANSACTION|SUBMIT/.test(combined) && !/WALLET CONFIRM|VERIFY.*WALLET|CONNECT.*WALLET/.test(combined)) stage=3;
    else if(/XAMAN REQUEST READY|OPEN XAMAN|PREPAR|RESERV|CREAT.*NFT|BUILD.*TRANSACTION|GETTING NFT/.test(combined)) stage=2;
    else if(/ACCESS|ALLOW LIST|ELIGIB|READY TO MINT|WALLET CONFIRMED|RECEIVING WALLET READY/.test(combined)) stage=1;
    else stage=0;

    bar.querySelectorAll('[data-mint-step]').forEach(function(step,index){
      // The final COMPLETE marker is reserved for a verified successful mint.
      // During ledger verification (stage 4), Wallet/Access/Prepare/Approve may
      // be complete, but COMPLETE stays gray until finishVerifiedXamanResult
      // or another authoritative wallet verifier reports success.
      step.classList.toggle('is-done',stage===5 || index<Math.min(stage,4));
      step.classList.toggle('is-active',stage<4 && index===stage);
    });
  }

  function installMintProgressObserver(){
    const status=q('founderMintStatus');
    if(!status||status.dataset.progressObserver==='1') return;
    status.dataset.progressObserver='1';
    const observer=new MutationObserver(syncMintProgress);
    observer.observe(status,{childList:true,subtree:true,characterData:true,attributes:true,attributeFilter:['class']});
    syncMintProgress();
  }

  async function init(){
    installMintProgressObserver();
    if(rareRoutesMode()) document.title='Rare Routes — Season 1 Mint';
    q('founderMintOptionsBtn')?.addEventListener('click',openDestinationOptions);
    q('founderMintVerifyBtn')?.addEventListener('click',verifyAccess);
    q('founderMintXamanBtn')?.addEventListener('click',function(){ handleXrplMintWalletButton('xaman'); });
    q('founderMintCrossmarkBtn')?.addEventListener('click',function(){ handleXrplMintWalletButton('crossmark'); });
    q('founderMintJoeyBtn')?.addEventListener('click',function(){ handleXrplMintWalletButton('joey'); });
    q('founderMintMetaMaskBtn')?.addEventListener('click',startEvmMint);
    window.addEventListener('onehome-joey-request-pending',function(){
      const status=q('founderMintStatus');
      if(!status||!isMobileBrowser())return;
      status.hidden=false;
      status.classList.add('is-preparing');
      status.innerHTML='<strong>APPROVE IN JOEY WALLET</strong><span>Joey Wallet has the request.</span><a class="founder-mint-entry-button" href="joey://" style="display:inline-flex;margin-top:10px">Open Joey Wallet</a>';
    });
    q('founderMintedNftsBtn')?.addEventListener('click',openCampaignMintedNfts);
    q('founderMintShareXBtn')?.addEventListener('click',function(){shareCurrentMintToX(false);});

    let campaignId=activeCampaignId();
    if(!/^[0-9a-f-]{36}$/i.test(campaignId)&&activeMintSlug()){
      try{await resolvePublicMintSlugSafely(activeMintSlug());campaignId=activeCampaignId();}
      catch(error){renderError(error?.message||'This Mint link could not be resolved.');return;}
    }
    if(!/^[0-9a-f-]{36}$/i.test(campaignId)){
      renderError('This mint link is missing its campaign reference.');
      return;
    }
    rememberCampaign(campaignId);
    mintSourceContext();
    const explicitEvm=Boolean(requestedChain());
    const walletReturnUuid=explicitEvm?'':xamanWalletReturnUuid();
    if(walletReturnUuid){
      saveMintWalletLinkState(walletReturnUuid,'');
      saveWalletLinkAutoProvider('xaman');
      cleanXamanWalletReturnParam();
    }
    showPage('onehomeFounderMintPage');
    try{
      await consumeMetaMaskBrowserHandoff();
    }catch(error){
      renderError(error?.message||'The secure One Home Passport handoff could not be completed. Return to X and try again.');
      return;
    }
    await loadMint({campaign_id:campaignId,network:requestedNetwork(),chain:requestedChain()});
    recordMintAttribution('arrival',{});

    const params=new URLSearchParams(window.location.search);
    if(evmCampaignMode||requestedChain())return;

    window.addEventListener('message',handleDesktopXamanBridgeMessage);
    startXamanReturnChannel();

    window.addEventListener('storage',function(event){
      if(event.key!==XAMAN_RETURN_SIGNAL_KEY || !event.newValue) return;
      try{
        const signal=JSON.parse(event.newValue);
        handleXamanReturnSignal(signal);
      }catch(_error){}
    });

    const callbackPayload=String(params.get('xaman_mint_payload') || '').trim();
    const pendingForPage=pendingMintForCurrentContext();

    if(/^[0-9a-f-]{36}$/i.test(callbackPayload)){
      setTimeout(function(){resumeXamanReturn(callbackPayload);},80);
    }else if(handleXamanReturnSignal()){
      // Desktop bridge signal was already saved before this page resumed.
    }else if(pendingForPage){
      // v14.67.166: mirror the proven v14.67.159 Safari recovery pattern.
      // iOS may restore a different browser context/event after Xaman. Retry
      // the SAME persisted request at staggered intervals instead of creating
      // a replacement claim or depending on one pageshow/focus event.
      setTimeout(resumePendingMint,100);
      if(pendingForPage.wallet_provider==='xaman'){
        setTimeout(resumePendingMint,850);
        setTimeout(resumePendingMint,2200);
      }
    }else{
      // Treat browser storage as a hint only. If the Home ID session is
      // available, ask the server for the exact existing durable order and a
      // current continuation token. This is also how v14.67.74 recovers the
      // batches paused by the older browser-token design.
      const cachedBatch=readBatchMint();
      let recoveredBatch=null;
      try{
        recoveredBatch=await recoverActiveBatchFromServer(
          cachedBatch,
          cachedBatch?.wallet_provider||verifiedProvider()||'',
          true
        );
      }catch(_error){}

      if(recoveredBatch?.batch_completed===true||String(recoveredBatch?.status||'').toLowerCase()==='completed'){
        if(batchReceiptWasShown(recoveredBatch)){
          clearBatchMint();
        }else{
          await finishBatchFromAuthoritativeState(recoveredBatch);
        }
      }else if(recoveredBatch?.order_id&&recoveredBatch?.token){
        setTimeout(function(){
          continueBatchOrder(
            recoveredBatch,
            recoveredBatch.wallet_provider||'xaman'
          );
        },180);
      }else if(cachedBatch?.order_id&&cachedBatch?.token){
        // Public Xaman return can continue without local auth by using the
        // server-issued token already saved in this browser.
        setTimeout(function(){
          continueBatchOrder(
            cachedBatch,
            cachedBatch.wallet_provider||'xaman'
          );
        },220);
      }
    }

    if(pendingMintWalletLinkUuid() && !isTestMintPage()) setTimeout(resumeMintWalletLink,220);

    const resumeAccess=function(){
      if(!currentMint || mintActionActive || xamanReturnPromise || batchContinuationPromise) return;
      if(pendingMintForCurrentContext()?.claim_id || readBatchMint()?.order_id) return;
      if(lastMintError && Date.now()-lastMintErrorAt<15000) return;
      clearTimeout(accessResumeTimer);
      accessResumeTimer=setTimeout(async function(){
        if(
          mintActionActive ||
          xamanReturnPromise ||
          batchContinuationPromise ||
          pendingMintForCurrentContext()?.claim_id ||
          readBatchMint()?.order_id ||
          (lastMintError && Date.now()-lastMintErrorAt<15000)
        ) return;
        await verifyMintAccess(currentMint,true);
        await renderMint(currentMint);
      },180);
    };

    window.addEventListener('onehome-profile-wallet-changed',function(){
      linkedPassportWalletRows=[];
      linkedPassportWalletUserId='';
      linkedPassportWalletLoadPromise=null;
      // Refresh Passport wallet rows without erasing the exact receiving wallet
      // that was just confirmed for this mint.
      if(currentMint&&!mintFlowUiLockState().locked){
        setTimeout(async function(){await loadLinkedPassportWallets(true);await renderMint(currentMint);},80);
      }
    });

    const resumeSignals=function(){
      const handledSignal=handleXamanReturnSignal();
      if(!handledSignal){
        const pending=pendingMintForCurrentContext();
        const payload=String(pending?.wallet_provider==='xaman'?pending?.payload_uuid||'':'').trim();
        if(/^[0-9a-f-]{36}$/i.test(payload) && !xamanReturnPromise){
          // App-switch fallback for Safari/iOS, Chrome/Android, and desktop.
          // verifyPublicXamanReturn re-arms the SAME saved OPEN XAMAN href if
          // Xaman still reports XAMAN_PAYLOAD_PENDING.
          verifyPublicXamanReturn(payload,true);
        }else if(pending?.wallet_provider==='xaman' && pending?.sign_url && isMobileBrowser() && simplePublicXrplUi()){
          presentPreparedMobileXaman(
            pending.sign_url,
            pending.payload_uuid||'',
            pending.batch_order_id ? {
              order_id:pending.batch_order_id,
              token:pending.batch_token||'',
              quantity:Number(pending.batch_quantity||0),
              position:Number(pending.batch_position||0)
            } : null,
            'Your exact Xaman request is ready. Tap OPEN XAMAN to continue the saved mint.'
          );
        }
      }
      resumeMintWalletLink();
      resumeAccess();
    };

    const delayedResume=function(delay){
      setTimeout(function(){
        if(document.visibilityState==='hidden') return;
        resumeSignals();
      },delay);
    };

    // These delays intentionally mirror the Safari-resilient v14.67.159
    // wallet-return controller: boot + pageshow + focus + visibility retries.
    window.addEventListener('pageshow',function(){delayedResume(220);setTimeout(function(){refreshXrplTierPriceDisplay(true);},260);});
    window.addEventListener('focus',function(){delayedResume(350);setTimeout(function(){refreshXrplTierPriceDisplay(true);},390);});
    document.addEventListener('visibilitychange',function(){
      if(document.visibilityState==='visible'){delayedResume(350);setTimeout(function(){refreshXrplTierPriceDisplay(true);},390);}
    });
    scheduleXrplTierPriceRefresh();
  }

  window.oneHomeMintChooseReceivingWallet=function(){mintWalletChooserOpen=true;manualTestWalletOpen=false;return renderMintWalletChooser();};
  window.oneHomePublicMintOpen=openMint;
  window.oneHomePublicMintRefresh=refresh;
  window.oneHomePublicMintStart=start;
  window.oneHomePublicMintConnectWallet=connectMintWallet;
  window.openOneHomePublicMint=openMint;

  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded',init);
  else init();
})();

/* One Home v14.67.95 - Stellar Testnet mint adapter cache refresh */
(function(){var s=document.createElement('script');s.src='/stellar/onehome-stellar-runtime-v146785.js?v=146795';s.defer=true;document.head.appendChild(s);}());
