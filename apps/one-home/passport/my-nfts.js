/* One Home v14.67.225 — My NFTs + physical proof creator-review gate; ownership remains authoritative at redemption submit.
   Shared multichain holdings page for XRPL, EVM, and Stellar-linked wallets. */
(function(){
  'use strict';
  if(window.__oneHomeMyNftsV1467160) return;
  window.__oneHomeMyNftsV1467160=true;

  const SUPABASE_URL=window.DOOD_SUPABASE_URL||'https://fshvettlltcujmwvikfq.supabase.co';
  const SUPABASE_KEY=window.DOOD_SUPABASE_KEY||'sb_publishable_ARrX-vYhy8l-yhs6384S_g_n6214taB';
  const XRPL_FUNCTION_URL=SUPABASE_URL+'/functions/v1/passport-wallet-nfts';
  const EVM_FUNCTION_URL=SUPABASE_URL+'/functions/v1/passport-evm-nfts';
  const STELLAR_FUNCTION_URL=SUPABASE_URL+'/functions/v1/passport-stellar-nfts';
  const REDEMPTION_FUNCTION_URL=SUPABASE_URL+'/functions/v1/creator-mint-redemption-manager';
  const PHYSICAL_FUNCTION_URL=SUPABASE_URL+'/functions/v1/nft-physical-link-manager';
  const XRPL_METADATA_FUNCTION_URL=SUPABASE_URL+'/functions/v1/xrpl-redemption-metadata-manager';
  const PAGE_SIZE=48;

  let loading=false;
  let xrplNextOffset=0;
  let xrplTotal=0;
  let xrplHasMore=false;
  let evmTotal=0;
  let stellarTotal=0;
  let xrplWallets=[];
  let evmWallets=[];
  let stellarWallets=[];
  let loadedIds=new Set();
  let selectedWalletKey='all';
  let searchQuery='';
  let sortMode='alpha';
  let holdingRecords=new Map();
  let lastDetailFocus=null;
  let currentDetailKey='';

  function q(id){return document.getElementById(id)}
  function esc(value){return String(value==null?'':value).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
  function short(value){const v=String(value||'').trim();return v.length>18?v.slice(0,8)+'…'+v.slice(-7):v}
  function normalizeSearch(value){
    return String(value==null?'':value)
      .toLowerCase()
      .replace(/[_\-/:.]+/g,' ')
      .replace(/[^a-z0-9\s]+/g,' ')
      .replace(/\s+/g,' ')
      .trim();
  }
  function getSupabase(){
    if(window.oneHomePassportSupabase&&window.oneHomePassportSupabase.auth)return window.oneHomePassportSupabase;
    if(window.doodProfileSupabase&&window.doodProfileSupabase.auth)return window.doodProfileSupabase;
    if(window.doodSupabase&&window.doodSupabase.auth)return window.doodSupabase;
    if(window.supabaseClient&&window.supabaseClient.auth)return window.supabaseClient;
    if(window.supabase&&window.supabase.createClient){
      window.oneHomeMyNftsSupabase=window.oneHomeMyNftsSupabase||window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY);
      return window.oneHomeMyNftsSupabase;
    }
    return null;
  }
  async function session(){
    const sb=getSupabase();if(!sb)return null;
    try{const result=await sb.auth.getSession();return result&&result.data&&result.data.session?result.data.session:null}catch(_error){return null}
  }
  function page(){return q('mintedItemsPage')}
  function showPageSafe(id){if(typeof window.showPage==='function')window.showPage(id);else{document.querySelectorAll('.page-view').forEach(function(el){el.classList.toggle('active',el.id===id)})}}
  function backToPassport(){if(typeof window.oneHomeJourneyOpenPassport==='function')window.oneHomeJourneyOpenPassport();else showPageSafe('onehomePassportJourneyPage')}
  function replaceBrokenArtwork(img){
    if(!img||!img.parentNode)return;
    const placeholder=document.createElement('div');placeholder.className='onehome-my-nft-media-fallback';placeholder.setAttribute('role','img');placeholder.setAttribute('aria-label','NFT artwork is not available from this source right now');placeholder.innerHTML='<strong>MEDIA</strong><span>Tap for NFT details</span>';
    img.replaceWith(placeholder);
  }

  function ensurePage(){
    let root=page();
    if(!root){
      const main=document.querySelector('main')||document.body;
      root=document.createElement('div');root.id='mintedItemsPage';root.className='page-view';main.appendChild(root);
    }
    if(root.dataset.myNftsV1467157==='1')return root;
    root.dataset.myNftsV1467157='1';
    root.innerHTML='<section class="onehome-my-nfts-shell">'+
      '<div class="onehome-my-nfts-toolbar">'+
        '<button class="onehome-my-nfts-btn" id="oneHomeMyNftsBack" type="button">← Back to My Passport</button>'+
        '<button class="onehome-my-nfts-btn primary" id="oneHomeMyNftsRefresh" type="button">Refresh NFTs</button>'+
      '</div>'+
      '<h1 class="onehome-my-nfts-title">My NFTs</h1>'+
      '<div class="onehome-my-nfts-wallets" id="oneHomeMyNftsWallets"></div>'+
      '<div class="onehome-my-nfts-sort" id="oneHomeMyNftsSort" role="group" aria-label="Sort NFTs"><span>View</span><button type="button" data-sort="alpha" aria-pressed="true">A–Z</button><button type="button" data-sort="oldest" aria-pressed="false">Oldest</button><button type="button" data-sort="newest" aria-pressed="false">Newest</button></div>'+
      '<div class="onehome-my-nfts-search-wrap"><label for="oneHomeMyNftsSearch"><span>Search My NFTs</span></label><div class="onehome-my-nfts-search-row"><input class="onehome-my-nfts-search" id="oneHomeMyNftsSearch" type="search" autocomplete="off" enterkeyhint="search" placeholder="Search by NFT name, chain, creator, or collection"><button class="onehome-my-nfts-btn onehome-my-nfts-search-btn" id="oneHomeMyNftsSearchBtn" type="button">Search</button></div></div>'+
      '<div class="onehome-my-nfts-progress" id="oneHomeMyNftsProgress" hidden><div class="onehome-my-nfts-progress-track" role="progressbar" aria-label="Checking current NFT holdings"><span></span></div></div>'+
      '<div class="onehome-my-nfts-status" id="oneHomeMyNftsStatus" hidden></div>'+
      '<div class="onehome-my-nfts-grid" id="oneHomeMyNftsGrid"></div>'+
      '<div class="onehome-my-nfts-more"><button class="onehome-my-nfts-btn" id="oneHomeMyNftsMore" type="button" hidden>Load More NFTs</button></div>'+
    '</section>';
    q('oneHomeMyNftsBack').addEventListener('click',backToPassport);
    q('oneHomeMyNftsRefresh').addEventListener('click',function(){load({reset:true})});
    q('oneHomeMyNftsMore').addEventListener('click',function(){load({reset:false})});
    function runSearch(){
      const input=q('oneHomeMyNftsSearch');
      searchQuery=normalizeSearch(input&&input.value||'');
      applyFilters();
    }
    q('oneHomeMyNftsSearchBtn').addEventListener('click',runSearch);
    q('oneHomeMyNftsSearch').addEventListener('input',runSearch);
    q('oneHomeMyNftsSearch').addEventListener('search',runSearch);
    q('oneHomeMyNftsSearch').addEventListener('keydown',function(event){
      if(event.key==='Enter'){event.preventDefault();runSearch();}
    });
    q('oneHomeMyNftsSort')?.addEventListener('click',function(event){
      const button=event.target?.closest?.('[data-sort]');
      if(!button)return;
      const next=String(button.dataset.sort||'alpha');
      if(!['alpha','oldest','newest'].includes(next))return;
      sortMode=next;
      q('oneHomeMyNftsSort')?.querySelectorAll('[data-sort]').forEach(function(node){node.setAttribute('aria-pressed',String(node===button))});
      applyFilters();
    });
    root.addEventListener('error',function(event){
      const img=event.target;
      if(!(img instanceof HTMLImageElement)||!img.classList.contains('onehome-my-nft-image'))return;
      let fallbacks=[];
      try{fallbacks=JSON.parse(img.dataset.fallbacks||'[]')}catch(_error){}
      const index=Math.max(0,Number(img.dataset.fallbackIndex||0));
      if(index<fallbacks.length){
        img.dataset.fallbackIndex=String(index+1);
        const next=String(fallbacks[index]||'');
        if(next){img.src=next;return;}
        replaceBrokenArtwork(img);return;
      }
      if(img.dataset.oneHomeFallback==='1')return;
      img.dataset.oneHomeFallback='1';
      img.removeAttribute('data-fallbacks');
      replaceBrokenArtwork(img);
    },true);
    root.addEventListener('click',function(event){
      const close=event.target?.closest?.('[data-onehome-nft-detail-close]');
      if(close){event.preventDefault();closeNftDetails();return;}
      if(event.target?.classList?.contains('onehome-my-nft-detail-backdrop')){closeNftDetails();return;}
      const redeemStart=event.target?.closest?.('[data-onehome-redeem-start]');if(redeemStart){event.preventDefault();openCollectorRedeemForm(redeemStart.dataset.onehomeRedeemStart);return;}
      const redeemCancel=event.target?.closest?.('[data-onehome-redeem-cancel]');if(redeemCancel){event.preventDefault();loadCollectorRedeemablesForCurrent();return;}
      const redeemSubmit=event.target?.closest?.('[data-onehome-redeem-submit]');if(redeemSubmit){event.preventDefault();submitCollectorRedemption(redeemSubmit.dataset.onehomeRedeemSubmit,redeemSubmit);return;}
      const cardNode=event.target?.closest?.('.onehome-my-nft-card[data-nft-id]');
      if(cardNode){event.preventDefault();openNftDetails(cardNode.dataset.nftId,cardNode);}
    });
    root.addEventListener('keydown',function(event){
      if(event.key==='Escape'&&!q('oneHomeMyNftDetail')?.hidden){event.preventDefault();closeNftDetails();return;}
      if(event.key!=='Enter'&&event.key!==' ')return;
      const cardNode=event.target?.closest?.('.onehome-my-nft-card[data-nft-id]');
      if(cardNode){event.preventDefault();openNftDetails(cardNode.dataset.nftId,cardNode);}
    });
    return root;
  }

  function setStatus(message,error){const el=q('oneHomeMyNftsStatus');if(!el)return;el.textContent=message||'';el.hidden=!message;el.classList.toggle('is-error',error===true)}
  function setHoldingsLoading(active){const bar=q('oneHomeMyNftsProgress');if(bar)bar.hidden=!active;const status=q('oneHomeMyNftsStatus');if(status&&active)status.hidden=true}
  function walletAddress(row){return String(row&&row.wallet_address||row&&row.normalized_address||row&&row.address||'').trim()}
  function xrplWalletFamily(row){
    const ecosystem=String(row&&row.ecosystem||'').trim().toLowerCase();
    const chainKey=String(row&&row.chain_key||'').trim().toLowerCase();
    const chainLabel=String(row&&row.chain_label||'').trim().toLowerCase();
    return ecosystem==='xrpl'||chainKey==='xrpl'||chainKey.indexOf('xrpl-')===0||chainLabel==='xrp ledger'||chainLabel.indexOf('xrpl ')===0;
  }
  function walletKey(row){
    const family=xrplWalletFamily(row)?'xrpl':String(row&&row.chain_label||'Blockchain').trim().toLowerCase();
    return [family,String(row&&row.provider||'wallet').trim().toLowerCase(),walletAddress(row).toLowerCase()].join('|');
  }
  function itemWalletKey(item){
    const chainKey=String(item&&item.chainKey||'').trim().toLowerCase();
    const chainLabel=String(item&&item.chainLabel||'Blockchain').trim().toLowerCase();
    const family=chainKey.indexOf('xrpl-')===0||chainKey==='xrpl'||chainLabel.indexOf('xrpl ')===0||chainLabel==='xrp ledger'?'xrpl':chainLabel;
    return [family,String(item&&item.walletProvider||'wallet').trim().toLowerCase(),String(item&&item.walletAddress||'').trim().toLowerCase()].join('|');
  }
  function allWallets(){
    const rows=xrplWallets.map(function(row){return Object.assign({chain_label:'XRP Ledger',ecosystem:'xrpl'},row)}).concat(
      evmWallets.map(function(row){return Object.assign({chain_label:row.chain_label||'MetaMask EVM'},row)}),
      stellarWallets.map(function(row){return Object.assign({chain_label:row.chain_label||'Stellar Testnet'},row)})
    );
    const seen=new Set();
    return rows.filter(function(row){const key=walletKey(row);if(!walletAddress(row)||seen.has(key))return false;seen.add(key);return true});
  }
  function sortLoadedCards(grid){
    const cards=Array.from(grid.querySelectorAll('.onehome-my-nft-card'));
    cards.sort(function(a,b){
      const nameA=String(a.dataset.sortName||'').toLowerCase();
      const nameB=String(b.dataset.sortName||'').toLowerCase();
      if(sortMode==='alpha') return nameA.localeCompare(nameB,undefined,{numeric:true,sensitivity:'base'});
      const dateA=Number(a.dataset.mintedAt||0);
      const dateB=Number(b.dataset.mintedAt||0);
      const knownA=dateA>0,knownB=dateB>0;
      if(knownA!==knownB)return knownA?-1:1;
      if(knownA&&dateA!==dateB)return sortMode==='oldest'?dateA-dateB:dateB-dateA;
      // Unknown dates stay after NFTs with an authoritative date. Never infer
      // chronological order from token IDs, issuer order, or serial numbers.
      return nameA.localeCompare(nameB,undefined,{numeric:true,sensitivity:'base'});
    });
    cards.forEach(function(card){grid.appendChild(card)});
  }
  function applyFilters(){
    const grid=q('oneHomeMyNftsGrid');if(!grid)return;let visible=0;
    sortLoadedCards(grid);
    const terms=normalizeSearch(searchQuery).split(' ').filter(Boolean);
    grid.querySelectorAll('.onehome-my-nft-card').forEach(function(card){
      const walletMatch=selectedWalletKey==='all'||card.dataset.walletKey===selectedWalletKey;
      const haystack=normalizeSearch(card.dataset.search||'');
      const searchMatch=!terms.length||terms.every(function(term){return haystack.includes(term)});
      const show=walletMatch&&searchMatch;
      card.hidden=!show;
      card.style.display=show?'':'none';
      if(show)visible+=1;
    });
    let empty=grid.querySelector('.onehome-my-nfts-filter-empty');
    const filtering=selectedWalletKey!=='all'||!!searchQuery;
    if(filtering&&!visible&&loadedIds.size){
      if(!empty){empty=document.createElement('div');empty.className='onehome-my-nfts-empty onehome-my-nfts-filter-empty';grid.appendChild(empty)}
      empty.textContent=searchQuery?'No NFTs match this search.':'No NFTs found for this wallet.';empty.hidden=false;
    }else if(empty)empty.hidden=true;
  }

  function renderWallets(){
    const target=q('oneHomeMyNftsWallets');if(!target)return;
    const wallets=allWallets();const seen=new Set();const options=[];
    wallets.forEach(function(row){const key=walletKey(row);if(seen.has(key))return;seen.add(key);const active=row.is_active===true||row.is_primary===true;options.push('<option value="'+esc(key)+'">'+esc(row.chain_label||'Blockchain')+' · '+esc((row.provider||'wallet').toUpperCase())+' · '+esc(short(walletAddress(row)))+(active?' · primary':'')+'</option>')});
    if(selectedWalletKey!=='all'&&!seen.has(selectedWalletKey))selectedWalletKey='all';
    target.innerHTML='<label class="onehome-my-nfts-wallet-select-wrap"><span>Connected wallets</span><select class="onehome-my-nfts-wallet-select" id="oneHomeMyNftsWalletSelect"'+(wallets.length?'':' disabled')+'><option value="all">All linked wallets ('+wallets.length+')</option>'+options.join('')+'</select></label>';
    const select=q('oneHomeMyNftsWalletSelect');if(select){select.value=selectedWalletKey;select.addEventListener('change',function(){selectedWalletKey=select.value||'all';applyFilters()})}
    applyFilters();
  }
  function scalar(value){
    if(value===null||value===undefined)return '';
    if(['string','number','boolean'].includes(typeof value))return String(value);
    return '';
  }
  function normalizedAttributes(item){
    const candidates=[item&&item.attributes,item&&item.metadata_attributes,item&&item.metadata&&item.metadata.attributes,item&&item.raw&&item.raw.attributes];
    const list=candidates.find(Array.isArray)||[];
    const rows=list.slice(0,100).map(function(entry,index){
      if(entry&&typeof entry==='object'&&!Array.isArray(entry)){
        const label=scalar(entry.trait_type||entry.traitType||entry.name||entry.key||entry.type)||('Attribute '+(index+1));
        const value=scalar(entry.value??entry.display_value??entry.displayValue??entry.val);
        return value?{label:label,value:value}:null;
      }
      const value=scalar(entry);
      return value?{label:'Attribute '+(index+1),value:value}:null;
    }).filter(Boolean);
    const seen=new Set(rows.map(function(row){return String(row.label||'').trim().toLowerCase()}));
    const props=item&&item.metadata_properties&&typeof item.metadata_properties==='object'&&!Array.isArray(item.metadata_properties)?item.metadata_properties:{};
    const mediaKeys=new Set(['image','image_url','image_uri','imageuri','thumbnail','files','media','assets','animation_url','animation','video','audio','display_uri','preview','cover']);
    Object.keys(props).sort().forEach(function(key){
      if(rows.length>=100)return;
      const normalized=String(key||'').trim().toLowerCase();
      if(!normalized||mediaKeys.has(normalized)||seen.has(normalized))return;
      const value=scalar(props[key]);
      if(!value)return;
      rows.push({label:key,value:value});seen.add(normalized);
    });
    return rows;
  }
  function mediaKind(value){
    const kind=String(value||'').trim().toLowerCase();
    return ['image','video','audio','html','text','document','unknown'].includes(kind)?kind:'unknown';
  }
  function inferredMediaKind(url){
    const raw=String(url||'').trim();if(!raw)return 'unknown';
    if(/^data:image\//i.test(raw))return 'image';if(/^data:video\//i.test(raw))return 'video';if(/^data:audio\//i.test(raw))return 'audio';if(/^data:text\/html/i.test(raw))return 'html';if(/^data:text\//i.test(raw))return 'text';
    try{const path=new URL(raw,window.location.origin).pathname.toLowerCase();if(/\.(?:avif|bmp|gif|jpe?g|png|svg|webp)$/.test(path))return 'image';if(/\.(?:mp4|m4v|webm|mov|ogv|mkv|m3u8|mpd)$/.test(path))return 'video';if(/\.(?:mp3|m4a|aac|wav|ogg|oga|flac|opus|m3u)$/.test(path))return 'audio';if(/\.(?:html?|xhtml)$/.test(path))return 'html';if(/\.(?:txt|md|markdown|rtf)$/.test(path))return 'text';if(/\.(?:pdf|epub)$/.test(path))return 'document'}catch(_error){}
    return 'unknown';
  }
  function normalizedMedia(raw){
    const rows=[];const seen=new Set();
    function add(url,kind,mime,role){
      url=String(url||'').trim();if(!url)return;
      kind=mediaKind(kind);if(kind==='unknown')kind=inferredMediaKind(url);
      const key=kind+'|'+url;if(seen.has(key))return;seen.add(key);rows.push({url:url,kind:kind,mime:String(mime||''),role:String(role||'')});
    }
    if(Array.isArray(raw&&raw.media_items))raw.media_items.forEach(function(row){if(row&&typeof row==='object')add(row.url||row.uri,row.kind||row.type,row.mime||row.content_type,row.role)});
    add(raw&&raw.media_url,raw&&raw.media_type,raw&&raw.media_mime,'primary');
    add(raw&&raw.animation_url,'unknown','', 'animation');
    add(raw&&raw.image_url||raw&&raw.image,'image','', 'image');
    (Array.isArray(raw&&raw.media_fallback_urls)?raw.media_fallback_urls:[]).forEach(function(url){add(url,raw&&raw.media_type,raw&&raw.media_mime,'fallback')});
    (Array.isArray(raw&&raw.image_fallback_urls)?raw.image_fallback_urls:[]).forEach(function(url){add(url,'image','', 'image-fallback')});
    return rows;
  }
  function firstPlayableMedia(item){
    const priority={video:0,audio:1,html:2,text:3,document:4};
    return item.mediaItems.filter(function(row){return Object.prototype.hasOwnProperty.call(priority,row.kind)}).sort(function(a,b){return priority[a.kind]-priority[b.kind]})[0]||null;
  }
  function normalizedItem(item){
    const xrplId=String(item&&item.nftoken_id||'').trim();
    const evmId=String(item&&item.token_id||item&&item.token_or_asset_id||'').trim();
    const chainKey=String(item&&item.chain_key||'xrpl-mainnet').trim();
    const tokenId=evmId||xrplId;
    const raw=item||{};
    const mediaItems=normalizedMedia(raw);
    const imageItems=mediaItems.filter(function(row){return row.kind==='image'});
    const imageUrl=String(raw.image_url||raw.image||imageItems[0]&&imageItems[0].url||'');
    const imageFallbacks=[];imageItems.forEach(function(row){if(row.url&&row.url!==imageUrl&&!imageFallbacks.includes(row.url))imageFallbacks.push(row.url)});
    (Array.isArray(raw.image_fallback_urls)?raw.image_fallback_urls:[]).forEach(function(url){url=String(url||'');if(url&&url!==imageUrl&&!imageFallbacks.includes(url))imageFallbacks.push(url)});
    return {
      chainKey:chainKey,
      holdingKey:String(raw.holding_key||chainKey+':'+String(raw.contract_address||raw.contract_or_collection_address||'')+':'+tokenId),
      tokenId:tokenId,
      chainLabel:String(raw.chain_label||(chainKey==='xrpl-mainnet'?'XRPL Mainnet':chainKey.replace(/-/g,' ').replace(/\b\w/g,function(c){return c.toUpperCase()}))),
      standard:String(raw.token_standard||(xrplId?'XRPL NFT':'NFT')),
      contract:String(raw.contract_address||raw.contract_or_collection_address||''),
      name:String(raw.name||'NFT'),
      collection:String(raw.collection||raw.collection_name||''),
      creator:String(raw.creator||raw.creator_display_name||raw.creator_name||raw.raw&&raw.raw.creator_display_name||''),
      description:String(raw.description||raw.metadata&&raw.metadata.description||''),
      imageUrl:imageUrl,
      imageFallbacks:imageFallbacks,
      mediaItems:mediaItems,
      mediaType:mediaKind(raw.media_type||''),
      mediaUrl:String(raw.media_url||''),
      mediaMime:String(raw.media_mime||''),
      textContent:String(raw.text_content||''),
      walletProvider:String(raw.wallet_provider||'wallet'),
      walletAddress:String(raw.wallet_address||''),
      quantity:String(raw.quantity||''),
      mintedAt:String(raw.minted_at||raw.issued_at||raw.issuedAt||raw.completed_at||raw.delivered_at||raw.created_at||''),
      metadataUri:String(raw.metadata_uri||raw.token_uri||raw.uri||''),
      externalUrl:String(raw.external_url||raw.externalUrl||''),
      issuer:String(raw.issuer||''),
      serialNumber:scalar(raw.serial_number||raw.nft_serial||raw.inventory_number),
      taxon:scalar(raw.nftoken_taxon??raw.nft_taxon),
      flags:scalar(raw.flags),
      transferFee:scalar(raw.transfer_fee),
      transactionHash:String(raw.transaction_hash||raw.xrpl_transaction_hash||raw.mint_transaction_hash||''),
      ledgerConfirmed:raw.ledger_confirmed===true,
      source:String(raw.source||''),
      metadataSource:String(raw.metadata_source||''),
      attributes:normalizedAttributes(raw),
      raw:raw
    };
  }
  function publicBrowserUrl(value){
    const raw=String(value||'').trim();if(!raw)return '';
    try{
      const url=new URL(raw,window.location.origin);if(!/^https?:$/.test(url.protocol))return '';
      if(url.username||url.password)return '';
      if(url.port&&!['80','443'].includes(url.port))return '';
      const host=String(url.hostname||'').toLowerCase().replace(/\.$/,'').replace(/^\[/,'').replace(/\]$/,'');
      if(!host||host==='localhost'||/\.(?:localhost|local|internal|lan)$/.test(host))return '';
      const p=host.split('.');
      if(p.length===4&&p.every(function(x){return /^\d{1,3}$/.test(x)&&Number(x)>=0&&Number(x)<=255})){
        const a=Number(p[0]),b=Number(p[1]),c=Number(p[2]);
        if(a===0||a===10||a===127||(a===100&&b>=64&&b<=127)||(a===169&&b===254)||(a===172&&b>=16&&b<=31)||(a===192&&b===168)||(a===192&&b===0&&c===0)||(a===192&&b===0&&c===2)||(a===198&&(b===18||b===19))||(a===198&&b===51&&c===100)||(a===203&&b===0&&c===113)||a>=224)return '';
      }
      if(host.includes(':')){
        if(host==='::'||host==='::1'||/^f[cd][0-9a-f]{2}:/i.test(host)||/^fe[89ab][0-9a-f]:/i.test(host)||/^ff/i.test(host)||/^2001:db8:/i.test(host))return '';
        const mapped=host.match(/::ffff:(\d+\.\d+\.\d+\.\d+)$/i);if(mapped&&!publicBrowserUrl('https://'+mapped[1]))return '';
      }
      return url.toString();
    }catch(_error){return ''}
  }
  function safeHttpHref(value){return publicBrowserUrl(value)}
  function readableDate(value){
    const ms=Date.parse(String(value||''));
    if(!Number.isFinite(ms))return '';
    try{return new Intl.DateTimeFormat(undefined,{dateStyle:'medium',timeStyle:'short'}).format(new Date(ms))}catch(_error){return new Date(ms).toLocaleString()}
  }
  function xrplExplorerUrl(item){
    if(!item||String(item.chainKey||'').toLowerCase()!=='xrpl-mainnet')return '';
    const id=String(item.tokenId||'').trim().toUpperCase();
    return /^[A-F0-9]{64}$/.test(id)?'https://bithomp.com/nft/'+id:'';
  }
  function detailFact(label,value,options){
    value=String(value==null?'':value).trim();
    if(!value)return '';
    options=options||{};
    const display=options.short?short(value):value;
    const href=options.link?safeHttpHref(value):'';
    return '<div class="onehome-my-nft-detail-fact"><dt>'+esc(label)+'</dt><dd>'+(href?'<a href="'+esc(href)+'" target="_blank" rel="noopener noreferrer">'+esc(display)+'</a>':esc(display))+'</dd></div>';
  }
  function safeMediaSrc(value){
    const raw=String(value||'').trim();if(!raw)return '';
    if(/^data:(?:image|video|audio|text)\//i.test(raw)&&raw.length<=2750000)return raw;
    return publicBrowserUrl(raw);
  }
  function imageElement(item,extraClass){
    const candidates=[];if(item.imageUrl)candidates.push(item.imageUrl);item.imageFallbacks.forEach(function(url){url=String(url||'');if(url&&!candidates.includes(url))candidates.push(url)});
    const first=safeMediaSrc(candidates.shift()||'');
    if(!first)return '<div class="onehome-my-nft-media-fallback"><strong>MEDIA</strong><span>Tap for NFT details</span></div>';
    return '<img class="onehome-my-nft-image '+esc(extraClass||'')+'" src="'+esc(first)+'" data-fallbacks="'+esc(JSON.stringify(candidates))+'" data-fallback-index="0" alt="'+esc(item.name)+'" loading="lazy" decoding="async" referrerpolicy="no-referrer">';
  }
  function mediaSources(item,kind){
    const out=[];item.mediaItems.forEach(function(row){if(row.kind!==kind)return;const url=safeMediaSrc(row.url);if(url&&!out.some(function(x){return x.url===url}))out.push({url:url,mime:String(row.mime||'')})});return out;
  }
  function detailMediaMarkup(item){
    const playable=firstPlayableMedia(item);
    if(playable&&playable.kind==='video'){
      const sources=mediaSources(item,'video');
      if(!sources.length){const src=safeMediaSrc(playable.url);if(src)sources.push({url:src,mime:playable.mime||''})}
      const poster=safeMediaSrc(item.imageUrl);
      return '<div class="onehome-my-nft-player-wrap"><video class="onehome-my-nft-video" controls playsinline preload="metadata"'+(poster?' poster="'+esc(poster)+'"':'')+'>'+sources.map(function(row){return '<source src="'+esc(row.url)+'"'+(row.mime?' type="'+esc(row.mime)+'"':'')+'>'}).join('')+'Your browser cannot play this NFT video.</video><span class="onehome-my-nft-media-kind">VIDEO NFT</span></div>';
    }
    if(playable&&playable.kind==='audio'){
      const sources=mediaSources(item,'audio');
      if(!sources.length){const src=safeMediaSrc(playable.url);if(src)sources.push({url:src,mime:playable.mime||''})}
      return '<div class="onehome-my-nft-player-wrap onehome-my-nft-audio-wrap">'+(item.imageUrl?imageElement(item,'onehome-my-nft-audio-cover'):'<div class="onehome-my-nft-media-fallback"><strong>AUDIO NFT</strong><span>Press play below</span></div>')+'<audio class="onehome-my-nft-audio" controls preload="metadata">'+sources.map(function(row){return '<source src="'+esc(row.url)+'"'+(row.mime?' type="'+esc(row.mime)+'"':'')+'>'}).join('')+'Your browser cannot play this NFT audio.</audio><span class="onehome-my-nft-media-kind">AUDIO NFT</span></div>';
    }
    if(playable&&playable.kind==='html'){
      const src=safeMediaSrc(playable.url);if(src)return '<div class="onehome-my-nft-player-wrap"><iframe class="onehome-my-nft-html" src="'+esc(src)+'" title="'+esc(item.name)+'" sandbox="allow-scripts allow-forms allow-pointer-lock" loading="lazy" referrerpolicy="no-referrer"></iframe><a class="onehome-my-nft-open-media" href="'+esc(src)+'" target="_blank" rel="noopener noreferrer">Open original interactive NFT</a><span class="onehome-my-nft-media-kind">INTERACTIVE NFT</span></div>';
    }
    if(playable&&playable.kind==='document'){
      const src=safeMediaSrc(playable.url);if(src)return '<div class="onehome-my-nft-player-wrap"><iframe class="onehome-my-nft-document" src="'+esc(src)+'" title="'+esc(item.name)+' document" sandbox loading="lazy" referrerpolicy="no-referrer"></iframe><a class="onehome-my-nft-open-media" href="'+esc(src)+'" target="_blank" rel="noopener noreferrer">Open original document</a><span class="onehome-my-nft-media-kind">DOCUMENT NFT</span></div>';
    }
    if((playable&&playable.kind==='text')||item.textContent){
      const content=String(item.textContent||'').trim();
      const src=playable?safeMediaSrc(playable.url):'';
      return '<div class="onehome-my-nft-player-wrap onehome-my-nft-text-wrap">'+(content?'<pre class="onehome-my-nft-text">'+esc(content)+'</pre>':'<div class="onehome-my-nft-media-fallback"><strong>TEXT NFT</strong><span>Open the original to read it</span></div>')+(src?'<a class="onehome-my-nft-open-media" href="'+esc(src)+'" target="_blank" rel="noopener noreferrer">Open original text</a>':'')+'<span class="onehome-my-nft-media-kind">TEXT NFT</span></div>';
    }
    if(!item.imageUrl){
      const unknown=item.mediaItems.find(function(row){return row.kind==='unknown'&&safeMediaSrc(row.url)});
      const src=unknown?safeMediaSrc(unknown.url):safeMediaSrc(item.metadataUri);
      if(src)return '<div class="onehome-my-nft-player-wrap"><div class="onehome-my-nft-media-fallback"><strong>NFT MEDIA</strong><span>This source does not identify its media type</span></div><a class="onehome-my-nft-open-media" href="'+esc(src)+'" target="_blank" rel="noopener noreferrer">Open original NFT media</a></div>';
    }
    return imageElement(item,'');
  }
  function cardMediaMarkup(item){
    const playable=firstPlayableMedia(item);
    if(item.imageUrl){return imageElement(item,'')+(playable?'<span class="onehome-my-nft-card-media-badge">'+esc(playable.kind.toUpperCase())+'</span>':'')}
    if(playable){const label=playable.kind==='audio'?'♫ AUDIO NFT':playable.kind==='video'?'▶ VIDEO NFT':playable.kind==='html'?'INTERACTIVE NFT':playable.kind==='document'?'DOCUMENT NFT':'TEXT NFT';return '<div class="onehome-my-nft-media-fallback onehome-my-nft-media-type"><strong>'+esc(label)+'</strong><span>Tap to '+esc(playable.kind==='audio'?'listen':playable.kind==='video'?'watch':'open')+'</span></div>'}
    return '<div class="onehome-my-nft-media-fallback"><strong>MEDIA</strong><span>Tap for NFT details</span></div>';
  }
  async function redemptionApi(action,payload){
    const current=await session();if(!current||!current.access_token)throw new Error('Sign in to your One Home Passport first.');
    const response=await fetch(REDEMPTION_FUNCTION_URL,{method:'POST',cache:'no-store',headers:{'Content-Type':'application/json','apikey':SUPABASE_KEY,'Authorization':'Bearer '+current.access_token},body:JSON.stringify(Object.assign({action:action},payload||{}))});
    const data=await response.json().catch(function(){return {}});if(!response.ok||data.success===false)throw new Error(String(data.error||data.detail||'One Home redemption request failed.'));return data;
  }
  async function physicalApi(action,payload){
    const current=await session();if(!current||!current.access_token)throw new Error('Sign in to your One Home Passport first.');
    const response=await fetch(PHYSICAL_FUNCTION_URL,{method:'POST',cache:'no-store',headers:{'Content-Type':'application/json','apikey':SUPABASE_KEY,'Authorization':'Bearer '+current.access_token},body:JSON.stringify(Object.assign({action:action},payload||{}))});
    const data=await response.json().catch(function(){return {}});if(!response.ok||data.success===false)throw new Error(String(data.error||data.detail||'One Home physical NFT request failed.'));return data;
  }
  async function xrplMetadataApi(payload){
    const current=await session();if(!current||!current.access_token)throw new Error('Sign in to your One Home Passport first.');
    const response=await fetch(XRPL_METADATA_FUNCTION_URL,{method:'POST',cache:'no-store',headers:{'Content-Type':'application/json','apikey':SUPABASE_KEY,'Authorization':'Bearer '+current.access_token},body:JSON.stringify(payload||{})});
    const data=await response.json().catch(function(){return {}});if(!response.ok||data.success===false)throw new Error(String(data.error||data.detail||'XRPL metadata update failed.'));return data;
  }
  function physicalToken(){try{return String(new URLSearchParams(location.search).get('physical_nft')||'').trim()}catch(_e){return ''}}
  function currentDetailItem(){const raw=holdingRecords.get(String(currentDetailKey||''));return raw?normalizedItem(raw):null;}
  function redemptionContext(item){const raw=item&&item.raw||{};return {campaign_id:String(raw.onehome_campaign_id||raw.campaign_id||''),chain_key:String(item.chainKey||raw.chain_key||''),network:String(raw.network||''),nft_id:String(item.tokenId||''),wallet_address:String(item.walletAddress||'')};}
  function redeemDate(value){const ms=Date.parse(String(value||''));if(!Number.isFinite(ms))return'';try{return new Intl.DateTimeFormat(undefined,{dateStyle:'medium',timeStyle:'short'}).format(new Date(ms))}catch(_e){return new Date(ms).toLocaleString()}}
  function benefitCard(row){const redeemed=row.redemption;const state=String(row.availability||'open');const stateLabel=redeemed?'Redeemed':state==='scheduled'?'Opens '+redeemDate(row.starts_at):state==='closed'?'Window closed':state==='open'?'Available':'Unavailable';const canRedeem=!redeemed&&state==='open';const matching=row.configuration&&row.configuration.reward_mode==='matching_set_hold';const required=matching?Math.max(2,Number(row.configuration.required_source_count)||2):0;const max=Math.max(1,Number(row.max_redemptions_per_nft)||1);const physical=(String(row.redeemable_type||'').toLowerCase()==='physical'||row.requires_shipping===true)&&redeemed;return '<article class="onehome-redeem-benefit" data-benefit-id="'+esc(row.id)+'" data-requires-shipping="'+(row.requires_shipping?'1':'0')+'" data-required-sources="'+esc(required)+'" data-max-quantity="'+esc(max)+'"><div class="onehome-redeem-benefit-head"><div><span class="onehome-redeem-type">'+esc(String(row.redeemable_type||'benefit').toUpperCase())+'</span><h4>'+esc(row.title||'Redeemable benefit')+'</h4></div><span class="onehome-redeem-state '+(redeemed?'done':canRedeem?'open':'')+'">'+esc(stateLabel)+'</span></div>'+(row.description?'<p>'+esc(row.description)+'</p>':'')+'<div class="onehome-redeem-meta">'+(row.requires_shipping?'<span>Shipping address required</span>':'<span>No shipping address required</span>')+'<span>Max '+esc(max)+' per NFT</span>'+(matching?'<span>Matching set: '+esc(required)+' NFTs · no burn</span>':'')+(row.ends_at?'<span>Closes '+esc(redeemDate(row.ends_at))+'</span>':'')+'</div>'+(redeemed?'<div class="onehome-redeem-result"><strong>Redeemed '+esc(redeemDate(redeemed.redeemed_at))+'</strong>'+(redeemed.status==='fulfilled'?'<span>Fulfilled</span>':'<span>Waiting for creator fulfillment</span>')+(redeemed.blockchain_mark_status==='pending'?'<span>NFT metadata update available after fulfillment</span>':redeemed.blockchain_mark_status==='confirmed'?'<span>XRPL redemption marker confirmed</span>':'')+'</div>':canRedeem?'<button class="onehome-my-nfts-btn primary onehome-redeem-button" type="button" data-onehome-redeem-start="'+esc(row.id)+'">Redeem Benefit</button>':'')+(physical?'<div class="onehome-physical-link" data-physical-redemption="'+esc(redeemed.id)+'"><div class="onehome-redeem-loading">Checking physical fulfillment…</div></div>':'')+'</article>';}
  async function loadPhysicalStatuses(rows){for(const row of (rows||[])){const red=row.redemption;if(!red||(String(row.redeemable_type||'').toLowerCase()!=='physical'&&row.requires_shipping!==true))continue;const host=document.querySelector('[data-physical-redemption="'+CSS.escape(String(red.id))+'"]');if(!host)continue;try{const data=await physicalApi('collector_status',{redemption_id:red.id,qr_token:physicalToken()});renderPhysicalCollector(red.id,host,data)}catch(error){host.innerHTML='<div class="onehome-redeem-empty is-error">'+esc(error&&error.message||String(error))+'</div>'}}}
  function renderPhysicalCollector(redemptionId,host,data){const f=data.fulfillment||{};const status=String(f.shipping_status||'pending');const proof=String(f.proof_status||'not_started');const linked=proof==='verified';const submitted=proof==='submitted';const rejected=proof==='rejected';const qrReady=data.qr_verified===true||proof==='awaiting_photo';let html='<div class="onehome-physical-card"><strong>Physical item</strong><div class="onehome-redeem-meta"><span>Status: '+esc(status.replace(/_/g,' '))+'</span><span>Verification: '+esc(proof.replace(/_/g,' '))+'</span></div>';if(f.tracking_number)html+='<div class="onehome-physical-tracking"><strong>Shipment:</strong> '+esc(f.carrier||'')+' · '+(f.tracking_url?'<a href="'+esc(f.tracking_url)+'" target="_blank" rel="noopener">'+esc(f.tracking_number)+'</a>':esc(f.tracking_number))+'</div>';if(linked){html+='<div class="onehome-physical-verified"><strong>Physical item verified and linked to this NFT.</strong>'+(data.proof_photo_url?'<img src="'+esc(data.proof_photo_url)+'" alt="Verified physical item">':'')+(f.proof_photo_sha256?'<span>Proof SHA-256: <code>'+esc(f.proof_photo_sha256)+'</code></span>':'')+'</div>';}else if(submitted){html+='<div class="onehome-physical-verified">'+(data.proof_photo_url?'<img src="'+esc(data.proof_photo_url)+'" alt="Submitted physical item proof">':'')+'<strong>Photo submitted — waiting for creator verification.</strong><span>The creator will confirm that this is the correct physical item before One Home marks it linked to the NFT.</span></div>';}else if(rejected){html+='<div class="onehome-redeem-empty is-error"><strong>Creator requested a new photo.</strong><br>Scan the QR included with the physical item again, then take a new verification photo.</div>';}else if(qrReady){html+='<div class="onehome-physical-camera"><p>The QR is verified and this NFT is currently in your Passport wallet. Take a photo of the physical item now. The creator will review it before the physical item is permanently marked as linked to this NFT.</p><input type="file" accept="image/jpeg,image/png,image/webp" capture="environment" hidden data-physical-file="'+esc(redemptionId)+'"><button class="onehome-my-nfts-btn primary" type="button" data-physical-camera="'+esc(redemptionId)+'">Open Camera & Submit Physical Item Photo</button><div class="onehome-physical-status" aria-live="polite"></div></div>';}else if(['shipped','verification_pending','delivered'].includes(status)){html+='<p class="onehome-redeem-help">When the package arrives, scan the QR included with the physical item. The QR returns to this exact NFT and unlocks the camera verification.</p>';}else{html+='<p class="onehome-redeem-help">The creator has not marked this physical item as shipped yet.</p>';}html+='</div>';host.innerHTML=html;host.querySelector('[data-physical-camera]')?.addEventListener('click',function(){host.querySelector('[data-physical-file]')?.click()});const input=host.querySelector('[data-physical-file]');if(input)input.addEventListener('change',function(){const file=input.files&&input.files[0];if(file)submitPhysicalPhoto(redemptionId,file,host)});}
  async function imageDimensions(file){return await new Promise(function(resolve){const url=URL.createObjectURL(file);const img=new Image();img.onload=function(){resolve({width:img.naturalWidth||0,height:img.naturalHeight||0});URL.revokeObjectURL(url)};img.onerror=function(){resolve({width:0,height:0});URL.revokeObjectURL(url)};img.src=url})}
  async function submitPhysicalPhoto(redemptionId,file,host){const status=host.querySelector('.onehome-physical-status');if(status)status.textContent='Preparing secure photo upload…';try{if(file.size>6*1024*1024)throw new Error('The verification photo must be 6 MB or smaller.');const token=physicalToken();if(!token)throw new Error('Scan the physical item QR before taking the verification photo.');const ticket=await physicalApi('proof_upload_ticket',{redemption_id:redemptionId,qr_token:token,mime:file.type,byte_size:file.size});if(ticket.already_verified||ticket.already_submitted){await loadCollectorRedeemablesForCurrent();return}if(status)status.textContent='Uploading verification photo…';const sb=getSupabase();if(!sb)throw new Error('One Home storage is unavailable.');const upload=await sb.storage.from(ticket.bucket).uploadToSignedUrl(ticket.path,ticket.token,file,{contentType:file.type,upsert:false});if(upload.error)throw upload.error;const dims=await imageDimensions(file);if(status)status.textContent='Verifying current NFT ownership and submitting the photo for creator review…';const done=await physicalApi('finalize_proof',{redemption_id:redemptionId,qr_token:token,storage_path:ticket.path,mime:file.type,width:dims.width,height:dims.height,captured_at:new Date().toISOString()});if(status)status.textContent=(done.submitted_for_review||String(done.fulfillment&&done.fulfillment.proof_status||'')==='submitted')?'Photo submitted — waiting for creator verification.':'Photo saved.';await loadCollectorRedeemablesForCurrent();}catch(error){if(status){status.textContent=String(error&&error.message||error);status.classList.add('is-error')}}}

  async function loadCollectorRedeemablesForCurrent(){
    const item=currentDetailItem(),box=q('oneHomeMyNftRedeemables');if(!item||!box)return;const ctx=redemptionContext(item);if(!ctx.campaign_id){box.hidden=true;return;}box.hidden=false;box.innerHTML='<h3>Redeemable Benefits</h3><div class="onehome-redeem-loading">Checking redeemable benefits…</div>';
    try{const data=await redemptionApi('collector_redeemables',ctx);if(currentDetailItem()?.holdingKey!==item.holdingKey)return;const rows=Array.isArray(data.redeemables)?data.redeemables:[];let content='';if(rows.length)content=rows.map(benefitCard).join('');else if(Number(data.configured_count||0)>0)content='<div class="onehome-redeem-empty"><strong>Benefit configured — collector redemption is currently off.</strong><span>The creator must turn it on before holders can redeem.</span></div>';else content='<div class="onehome-redeem-empty"><span>No redeemable benefits are configured for this NFT.</span></div>';box.innerHTML='<h3>Redeemable Benefits</h3>'+content;await loadPhysicalStatuses(rows);}catch(error){box.innerHTML='<h3>Redeemable Benefits</h3><div class="onehome-redeem-empty is-error">'+esc(error&&error.message||String(error))+'</div>';}
  }
  function openCollectorRedeemForm(id){const item=currentDetailItem(),box=q('oneHomeMyNftRedeemables');if(!item||!box)return;const card=box.querySelector('[data-benefit-id="'+CSS.escape(String(id||''))+'"]');if(!card)return;const shipping=card.dataset.requiresShipping==='1';const required=Math.max(0,Number(card.dataset.requiredSources)||0);const max=Math.max(1,Number(card.dataset.maxQuantity)||1);card.querySelectorAll('[data-onehome-redeem-start]').forEach(function(b){b.remove()});card.insertAdjacentHTML('beforeend','<form class="onehome-redeem-form" onsubmit="return false"><h5>Confirm Redemption</h5>'+(max>1?'<label>Quantity<input data-redeem-field="quantity" type="number" min="1" max="'+max+'" value="1"></label>':'')+(shipping?'<div class="onehome-redeem-shipping"><label>Recipient name<input data-redeem-field="recipient_name" autocomplete="name"></label><label>Address<input data-redeem-field="address_line1" autocomplete="address-line1"></label><label>Address line 2 (optional)<input data-redeem-field="address_line2" autocomplete="address-line2"></label><div class="onehome-redeem-form-grid"><label>City<input data-redeem-field="city" autocomplete="address-level2"></label><label>State / region<input data-redeem-field="region" autocomplete="address-level1"></label><label>Postal code<input data-redeem-field="postal_code" autocomplete="postal-code"></label><label>Country<input data-redeem-field="country" autocomplete="country-name"></label></div><label>Email (optional)<input data-redeem-field="email" type="email" autocomplete="email"></label><label>Phone (optional)<input data-redeem-field="phone" autocomplete="tel"></label></div>':'')+(required?'<label>Matching-set NFT IDs<textarea data-redeem-field="source_ids" rows="'+Math.min(required+1,8)+'" placeholder="Paste exactly '+required+' NFT IDs, one per line">'+esc(item.tokenId)+'</textarea><span class="onehome-redeem-help">One Home verifies that every listed NFT is still in your linked Passport wallets. Nothing is burned.</span></label>':'')+'<div class="onehome-redeem-confirm">Redeeming creates a permanent One Home redemption record for this NFT. Ownership is verified again before the redemption is accepted.</div><div class="onehome-redeem-actions"><button class="onehome-my-nfts-btn primary" type="button" data-onehome-redeem-submit="'+esc(id)+'">Confirm Redeem</button><button class="onehome-my-nfts-btn" type="button" data-onehome-redeem-cancel="1">Cancel</button></div><div class="onehome-redeem-form-status" aria-live="polite"></div></form>');}
  async function submitCollectorRedemption(id,button){const item=currentDetailItem(),box=q('oneHomeMyNftRedeemables');if(!item||!box)return;const card=button.closest('[data-benefit-id]'),form=button.closest('.onehome-redeem-form');if(!card||!form)return;const get=name=>String(form.querySelector('[data-redeem-field="'+name+'"]')?.value||'').trim();const sourceIds=get('source_ids').split(/\r?\n/).map(function(v){return v.trim()}).filter(Boolean);const status=form.querySelector('.onehome-redeem-form-status');button.disabled=true;if(status)status.textContent='Verifying current ownership and recording redemption…';try{const ctx=redemptionContext(item);await redemptionApi('collector_redeem',Object.assign({},ctx,{redeemable_id:id,quantity:Math.max(1,Number(get('quantity'))||1),source_nft_ids:sourceIds,claimant_details:{recipient_name:get('recipient_name'),address_line1:get('address_line1'),address_line2:get('address_line2'),city:get('city'),region:get('region'),postal_code:get('postal_code'),country:get('country'),email:get('email'),phone:get('phone')}}));if(status)status.textContent='Redeemed successfully.';await loadCollectorRedeemablesForCurrent();}catch(error){if(status){status.textContent=String(error&&error.message||error);status.classList.add('is-error')}button.disabled=false;}}
  function closeNftDetails(){
    const modal=q('oneHomeMyNftDetail');if(!modal)return;
    modal.hidden=true;modal.setAttribute('aria-hidden','true');document.body.classList.remove('onehome-my-nft-detail-open');
    const prior=lastDetailFocus;lastDetailFocus=null;currentDetailKey='';
    if(prior&&document.contains(prior)){setTimeout(function(){try{prior.focus({preventScroll:true})}catch(_error){try{prior.focus()}catch(_e){}}},0)}
  }
  function ensureNftDetail(){
    let modal=q('oneHomeMyNftDetail');if(modal)return modal;
    const root=ensurePage();
    modal=document.createElement('div');modal.id='oneHomeMyNftDetail';modal.className='onehome-my-nft-detail';modal.hidden=true;modal.setAttribute('aria-hidden','true');
    modal.innerHTML='<div class="onehome-my-nft-detail-backdrop" data-onehome-nft-detail-close="1"></div><section class="onehome-my-nft-detail-card" role="dialog" aria-modal="true" aria-labelledby="oneHomeMyNftDetailTitle"><button class="onehome-my-nft-detail-close" type="button" aria-label="Close NFT details" data-onehome-nft-detail-close="1">×</button><div id="oneHomeMyNftDetailBody"></div></section>';
    root.appendChild(modal);return modal;
  }
  function openNftDetails(key,source){
    const raw=holdingRecords.get(String(key||''));if(!raw)return;
    const item=normalizedItem(raw);const modal=ensureNftDetail();const body=q('oneHomeMyNftDetailBody');if(!body)return;
    lastDetailFocus=source||document.activeElement;
    const attrs=item.attributes.length?'<section class="onehome-my-nft-detail-section"><h3>Metadata attributes</h3><dl class="onehome-my-nft-attributes">'+item.attributes.map(function(row){return '<div><dt>'+esc(row.label)+'</dt><dd>'+esc(row.value)+'</dd></div>'}).join('')+'</dl></section>':'';
    let fee='';if(item.transferFee){const n=Number(item.transferFee);fee=Number.isFinite(n)?((n/1000).toLocaleString(undefined,{maximumFractionDigits:3})+'%'):item.transferFee;}
    const date=readableDate(item.mintedAt);const playable=firstPlayableMedia(item);
    const facts=[
      detailFact('Chain',item.chainLabel+' · '+item.standard.toUpperCase()),
      detailFact('Media',playable?playable.kind.toUpperCase():(item.imageUrl?'IMAGE':'Not identified')),
      detailFact('Wallet',item.walletProvider.toUpperCase()+' · '+item.walletAddress),
      detailFact('Token / NFToken ID',item.tokenId),
      detailFact('Serial / inventory number',item.serialNumber),
      detailFact(item.contract?'Contract':'Issuer',item.contract||item.issuer),
      item.contract&&item.issuer?detailFact('Issuer',item.issuer):'',
      detailFact('NFToken taxon',item.taxon),
      detailFact('Transfer fee',fee),
      detailFact('Flags',item.flags),
      detailFact('Minted / completed',date),
      item.ledgerConfirmed?detailFact('Ledger status','Confirmed'):'',
      detailFact('Transaction',item.transactionHash),
      detailFact('Metadata URI',item.metadataUri,{link:true}),
      detailFact('Metadata source',item.metadataSource),
      detailFact('External page',item.externalUrl,{link:true}),
      detailFact('XRP Ledger explorer',xrplExplorerUrl(item),{link:true})
    ].filter(Boolean).join('');
    currentDetailKey=String(key||'');const hasCampaign=!!String(item.raw&&item.raw.onehome_campaign_id||item.raw&&item.raw.campaign_id||'');
    body.innerHTML='<div class="onehome-my-nft-detail-layout"><div class="onehome-my-nft-detail-media">'+detailMediaMarkup(item)+'</div><div class="onehome-my-nft-detail-copy"><p class="onehome-my-nft-detail-kicker">NFT DETAILS</p><h2 id="oneHomeMyNftDetailTitle">'+esc(item.name)+'</h2>'+(item.collection?'<p class="onehome-my-nft-detail-collection">'+esc(item.collection)+'</p>':'')+(item.creator?'<p class="onehome-my-nft-detail-creator"><strong>Creator:</strong> '+esc(item.creator)+'</p>':'')+(item.description?'<p class="onehome-my-nft-detail-description">'+esc(item.description)+'</p>':'')+(hasCampaign?'<section class="onehome-my-nft-detail-section onehome-redeemables onehome-redeemables-priority" id="oneHomeMyNftRedeemables"><h3>Redeemable Benefits</h3><div class="onehome-redeem-loading">Checking redeemable benefits…</div></section>':'')+'<dl class="onehome-my-nft-detail-facts">'+facts+'</dl></div></div>'+attrs;
    modal.hidden=false;modal.setAttribute('aria-hidden','false');document.body.classList.add('onehome-my-nft-detail-open');
    if(hasCampaign)loadCollectorRedeemablesForCurrent();
    setTimeout(function(){try{modal.querySelector('.onehome-my-nft-detail-close')?.focus({preventScroll:true})}catch(_error){}},0);
  }
  function card(raw){
    const item=normalizedItem(raw);
    const media=cardMediaMarkup(item);
    const collection=item.collection?'<p class="onehome-my-nft-collection">'+esc(item.collection)+'</p>':'';
    const contract=item.contract?'<span><strong>Contract:</strong> '+esc(short(item.contract))+'</span>':'';
    const quantity=item.standard.toLowerCase()==='erc1155'&&item.quantity?'<span><strong>Quantity:</strong> '+esc(item.quantity)+'</span>':'';
    const searchText=normalizeSearch([item.name,item.chainLabel,item.creator,item.collection,item.chainKey,item.standard,item.walletProvider].join(' '));
    const mintedAtMs=Date.parse(item.mintedAt)||0;
    return '<article class="onehome-my-nft-card" data-nft-id="'+esc(item.holdingKey)+'" data-wallet-key="'+esc(itemWalletKey(item))+'" data-search="'+esc(searchText)+'" data-sort-name="'+esc(item.name)+'" data-minted-at="'+esc(mintedAtMs)+'" data-issuer="'+esc(item.issuer)+'" data-serial="'+esc(Number(item.serialNumber)||0)+'" tabindex="0" role="button" aria-label="View details for '+esc(item.name)+'">'+
      '<div class="onehome-my-nft-media">'+media+'</div>'+
      '<h2 class="onehome-my-nft-name">'+esc(item.name)+'</h2>'+collection+
      '<div class="onehome-my-nft-meta">'+
        '<span><strong>Chain:</strong> '+esc(item.chainLabel)+' · '+esc(item.standard.toUpperCase())+'</span>'+ 
        '<span><strong>Wallet:</strong> '+esc(item.walletProvider.toUpperCase())+' · '+esc(short(item.walletAddress))+'</span>'+contract+
        '<span><strong>Token:</strong> '+esc(short(item.tokenId))+'</span>'+quantity+
        '<span class="onehome-my-nft-open-hint">Tap for details</span>'+ 
      '</div>'+ 
    '</article>';
  }
  function appendHoldings(items,reset){
    const grid=q('oneHomeMyNftsGrid');if(!grid)return;
    if(reset)grid.innerHTML='';
    const html=[];
    (items||[]).forEach(function(raw){
      const item=normalizedItem(raw);if(!item.tokenId||!item.holdingKey||loadedIds.has(item.holdingKey))return;
      loadedIds.add(item.holdingKey);holdingRecords.set(item.holdingKey,raw);html.push(card(raw));
    });
    if(html.length)grid.insertAdjacentHTML('beforeend',html.join(''));applyFilters();
  }
  function showEmptyIfNeeded(){
    const grid=q('oneHomeMyNftsGrid');if(!grid)return;
    if(!loadedIds.size)grid.innerHTML='<div class="onehome-my-nfts-empty">No NFTs found.</div>';
  }
  function updateMore(){const btn=q('oneHomeMyNftsMore');if(!btn)return;btn.hidden=!xrplHasMore;btn.disabled=loading;btn.textContent=loading?'Loading…':'Load More NFTs'}
  async function chainFetch(url,current,body){
    const response=await fetch(url,{method:'POST',cache:'no-store',headers:{'Content-Type':'application/json','apikey':SUPABASE_KEY,'Authorization':'Bearer '+current.access_token},body:JSON.stringify(body||{})});
    const data=await response.json().catch(function(){return {}});
    if(!response.ok||data.success===false)throw new Error(String(data.error||'NFT holdings could not be loaded.'));
    return data;
  }
  function updateStatus(errors){
    renderWallets();
    const wallets=allWallets().length;
    const total=xrplTotal+evmTotal+stellarTotal;
    if(errors&&errors.length&&total===0){setStatus('NFT refresh failed.',true);return}
    setStatus(total+' current NFT'+(total===1?'':'s')+' · '+wallets+' linked wallet'+(wallets===1?'':'s'),false);
  }

  async function load(options){
    options=options||{};if(loading)return;
    const reset=options.reset!==false;
    ensurePage();
    const current=await session();
    if(!current||!current.access_token){setHoldingsLoading(false);setStatus('Sign in to view My NFTs.',true);return}
    if(reset){
      xrplNextOffset=0;xrplTotal=0;xrplHasMore=false;evmTotal=0;stellarTotal=0;xrplWallets=[];evmWallets=[];stellarWallets=[];loadedIds=new Set();holdingRecords=new Map();
      searchQuery=normalizeSearch(q('oneHomeMyNftsSearch')?.value||'');
      const grid=q('oneHomeMyNftsGrid');if(grid)grid.innerHTML='';
    }
    loading=true;updateMore();setHoldingsLoading(true);
    try{
      if(!reset){
        const data=await chainFetch(XRPL_FUNCTION_URL,current,{offset:xrplNextOffset,limit:PAGE_SIZE});
        xrplWallets=Array.isArray(data.linked_wallets)?data.linked_wallets:xrplWallets;
        xrplTotal=Math.max(0,Number(data.total_count)||0);
        xrplHasMore=data.has_more===true;
        xrplNextOffset=Number.isFinite(Number(data.next_offset))?Number(data.next_offset):(xrplNextOffset+(Array.isArray(data.holdings)?data.holdings.length:0));
        appendHoldings(Array.isArray(data.holdings)?data.holdings:[],false);
        updateStatus([]);
        return;
      }

      const errors=[];let firstRendered=false;
      async function loadXrpl(){try{const data=await chainFetch(XRPL_FUNCTION_URL,current,{offset:0,limit:PAGE_SIZE});xrplWallets=Array.isArray(data.linked_wallets)?data.linked_wallets:[];xrplTotal=Math.max(0,Number(data.total_count)||0);xrplHasMore=data.has_more===true;xrplNextOffset=Number.isFinite(Number(data.next_offset))?Number(data.next_offset):(Array.isArray(data.holdings)?data.holdings.length:0);appendHoldings(Array.isArray(data.holdings)?data.holdings:[],!firstRendered);firstRendered=true;updateStatus(errors);}catch(_error){errors.push('XRPL holdings could not refresh.');}}
      async function loadEvm(){try{const data=await chainFetch(EVM_FUNCTION_URL,current,{});evmWallets=Array.isArray(data.linked_wallets)?data.linked_wallets:[];evmTotal=Math.max(0,Number(data.total_count)||0);appendHoldings(Array.isArray(data.holdings)?data.holdings:[],!firstRendered);firstRendered=true;updateStatus(errors);}catch(_error){errors.push('EVM holdings could not refresh.');}}
      async function loadStellar(){try{const data=await chainFetch(STELLAR_FUNCTION_URL,current,{});stellarWallets=Array.isArray(data.linked_wallets)?data.linked_wallets:[];stellarTotal=Math.max(0,Number(data.total_count)||0);appendHoldings(Array.isArray(data.holdings)?data.holdings:[],!firstRendered);firstRendered=true;updateStatus(errors);}catch(_error){errors.push('Stellar holdings could not refresh.');}}
      setStatus('Checking linked wallets… NFTs will appear as each chain finishes.',false);
      await Promise.allSettled([loadXrpl(),loadEvm(),loadStellar()]);
      showEmptyIfNeeded();updateStatus(errors);
    }catch(error){
      setStatus(String(error&&error.message||error||'Current NFT holdings could not be loaded.'),true);
    }finally{
      loading=false;setHoldingsLoading(false);updateMore();
    }
  }

  async function openPhysicalDeepLink(token){if(!token)return;try{ensurePage();showPageSafe('mintedItemsPage');const data=await physicalApi('resolve_qr',{qr_token:token});const raw=data.holding;if(!raw)throw new Error('One Home could not load the NFT linked to this QR.');const item=normalizedItem(raw);if(!item.holdingKey)throw new Error('The linked NFT could not be opened.');holdingRecords.set(item.holdingKey,raw);loadedIds.add(item.holdingKey);openNftDetails(item.holdingKey,null)}catch(error){setStatus(String(error&&error.message||error),true)}}
  function watchPhysicalDeepLink(){const token=physicalToken();if(!token||window.__oneHomePhysicalLinkWatching)return;window.__oneHomePhysicalLinkWatching=true;let tries=0;const check=async function(){tries++;const current=await session();if(current&&current.access_token){clearInterval(timer);window.oneHomeV1448OpenMyNfts();setTimeout(function(){openPhysicalDeepLink(token)},300);return}if(tries>300)clearInterval(timer)};const timer=setInterval(check,1000);check()}

  window.oneHomeV1448OpenMyNfts=function(){ensurePage();showPageSafe('mintedItemsPage');setTimeout(function(){load({reset:true})},60)};
  window.doodV144OpenMintedItems=window.oneHomeV1448OpenMyNfts;
  window.oneHomeV1414OpenMintedItems=window.oneHomeV1448OpenMyNfts;

  function patchPassportButton(){
    document.querySelectorAll('#onehomeV1414PassportIdentityNav button').forEach(function(button){
      if(/Minted Items|My NFTs/i.test(button.textContent||'')){
        button.textContent='My NFTs';button.onclick=window.oneHomeV1448OpenMyNfts;button.setAttribute('onclick','window.oneHomeV1448OpenMyNfts()');
      }
    });
  }
  function boot(){try{localStorage.removeItem('dood_v144_minted_items')}catch(_error){}ensurePage();patchPassportButton();watchPhysicalDeepLink()}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
  [300,900,1800,3200].forEach(function(ms){setTimeout(patchPassportButton,ms)});
  if(window.MutationObserver){const target=document.querySelector('main')||document.body;let queued=false;new MutationObserver(function(){if(queued)return;queued=true;setTimeout(function(){queued=false;patchPassportButton()},60)}).observe(target,{childList:true,subtree:true})}
})();
