// One Home v14.67.266 — native + Admin-approved community Open Mints.
(function(){
  'use strict';

  const SUPABASE_URL='https://fshvettlltcujmwvikfq.supabase.co';
  const SUPABASE_KEY='sb_publishable_ARrX-vYhy8l-yhs6384S_g_n6214taB';
  const PLACEHOLDER='/assets/one-home-image-placeholder.png';
  let liveMints=[];
  let testMints=[];
  let allMints=[];
  let lastFocusedCard=null;
  let activeDetailMint=null;
  const liveDetailStateCache=new Map();
  let liveDetailRefreshTimer=null;

  const loading=document.getElementById('loadingState');
  const error=document.getElementById('errorState');
  const noResults=document.getElementById('noResultsState');
  const liveEmpty=document.getElementById('liveEmptyState');
  const testEmpty=document.getElementById('testEmptyState');
  const liveGrid=document.getElementById('liveMintGrid');
  const testGrid=document.getElementById('testMintGrid');
  const testLoadNote=document.getElementById('testLoadNote');
  const resultLine=document.getElementById('resultLine');
  const resultCount=document.getElementById('resultCount');
  const search=document.getElementById('mintSearch');
  const clearSearch=document.getElementById('clearSearch');
  const overlay=document.getElementById('detailOverlay');

  function escapeHTML(value){
    return String(value??'').replace(/[&<>"']/g,function(character){
      return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[character];
    });
  }

  function validCollectionId(value){
    const id=String(value||'').trim();
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)?id:'';
  }

  function validCampaignId(value){
    const id=String(value||'').trim();
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)?id:'';
  }

  function safeImage(value){
    return String(value||PLACEHOLDER).trim()||PLACEHOLDER;
  }

  function mintCover(mint){
    return safeImage(mint?.cover_image_url||mint?.artwork_url);
  }

  async function hydrateCanonicalCovers(items){
    const ids=Array.from(new Set((items||[]).map(item=>validCampaignId(item?.id)).filter(Boolean)));
    if(!ids.length)return items;
    try{
      const response=await fetch(`${SUPABASE_URL}/rest/v1/rpc/onehome_public_mint_covers`,{
        method:'POST',
        headers:{'Content-Type':'application/json','apikey':SUPABASE_KEY},
        body:JSON.stringify({p_campaign_ids:ids})
      });
      const rows=await response.json().catch(function(){return [];});
      if(!response.ok||!Array.isArray(rows))return items;
      const covers=new Map(rows.map(row=>[String(row?.campaign_id||''),String(row?.cover_image_url||'').trim()]));
      (items||[]).forEach(function(mint){const cover=covers.get(String(mint?.id||''));if(cover)mint.cover_image_url=cover+(cover.includes('?')?'&':'?')+'ohcover='+Date.now();});
    }catch(error){console.warn('One Home canonical mint covers',error);}
    return items;
  }

  function mintMethodLabel(value){
    return String(value||'').toLowerCase()==='on_demand'?'Mint':'Pre-Minted Collection';
  }

  function chainDescriptor(mint){return window.OneHomeChainIdentity.describe(mint||{});}

  function looksLikeEvmMint(mint){return chainDescriptor(mint).ecosystem==='evm';}

  function isTestMint(mint){
    const descriptor=chainDescriptor(mint);
    return mint?.test_only===true||descriptor.environment==='testnet'||String(mint?.network||'').toLowerCase()==='testnet';
  }

  function retiredPublicTestnet(mint){
    const descriptor=chainDescriptor(mint);
    if(descriptor.key==='base-sepolia'||descriptor.key==='xrpl-testnet')return true;
    return descriptor.ecosystem==='xrpl'&&descriptor.environment==='testnet';
  }

  function isDirectoryOpen(mint){
    const status=String(mint?.directory_status||mint?.status||'').trim().toLowerCase();
    if(status==='sold_out'||status==='closed'||status==='draft')return false;
    if(Number.isFinite(Number(mint?.remaining))&&Number(mint.remaining)<=0)return false;
    if(mint?.public_page_enabled===false||mint?.minting_enabled===false)return false;
    return ['open','active','live','published'].includes(status);
  }

  function nativeSymbol(mint){return chainDescriptor(mint).symbol;}

  function chainLabel(mint){
    const descriptor=chainDescriptor(mint);
    if(descriptor.ecosystem==='xrpl')return descriptor.environment==='testnet'?'XRPL — Testnet':'XRPL';
    if(descriptor.ecosystem==='stellar')return 'Stellar — Testnet';
    if(descriptor.ecosystem==='evm'){
      const family=String(descriptor.key||'').toLowerCase().replace(/-(?:mainnet|sepolia|amoy|testnet|atlantic-2)$/,'');
      const names={ethereum:'Ethereum',base:'Base',polygon:'Polygon',optimism:'Optimism',arbitrum:'Arbitrum',linea:'Linea',bsc:'BNB Chain',bnb:'BNB Chain',hedera:'Hedera',sei:'Sei'};
      const name=names[family]||String(descriptor.label||'EVM').replace(/\s+(Mainnet|Sepolia|Amoy|Testnet|Atlantic[- ]?2)$/i,'').trim();
      return name+(descriptor.environment==='testnet'?' — Testnet':'');
    }
    return descriptor.label;
  }

  function walletLabel(mint){
    const explicit=String(mint?.wallet_provider||'').trim().toLowerCase();
    if(explicit==='freighter')return 'Freighter';
    if(explicit==='metamask')return 'MetaMask';
    if(explicit==='xaman-crossmark')return 'Xaman + Crossmark';
    const ecosystem=chainDescriptor(mint).ecosystem;
    if(ecosystem==='stellar')return 'Freighter';
    if(ecosystem==='evm')return 'MetaMask';
    if(ecosystem==='xrpl')return 'Xaman + Crossmark';
    return 'Wallet';
  }

  function testStatusLabel(mint){
    const status=String(mint?.directory_status||mint?.status||'draft').toLowerCase();
    if(status==='open'||status==='active'||status==='live')return 'OPEN';
    if(status==='sold_out')return 'SOLD OUT';
    if(status==='closed')return 'CLOSED';
    return 'DRAFT';
  }

  function canonicalUrl(mint){
    if(mint?.source_type==='community_external')return String(mint.external_url||'#');
    const id=validCampaignId(mint?.id);
    if(!id)return '#';
    const descriptor=chainDescriptor(mint);
    if(descriptor.key&&descriptor.ecosystem!=='xrpl')return String(mint.public_url||(`/mint/${encodeURIComponent(id)}?chain=${encodeURIComponent(descriptor.key)}&v=1467114`));
    if(descriptor.ecosystem==='xrpl')return String(mint.public_url||(`/mint/${encodeURIComponent(id)}?network=${encodeURIComponent(descriptor.environment==='mainnet'?'mainnet':'testnet')}&v=1467114`));
    if(descriptor.key)return String(mint.public_url||(`/mint/${encodeURIComponent(id)}?chain=${encodeURIComponent(descriptor.key)}&v=1467114`));
    return String(mint.public_url||(`/mint/${encodeURIComponent(id)}?v=1467114`));
  }

  function shareMintOnX(mint){
    if(!mint)return;
    const api=window.OneHomeMintSource;
    const base=canonicalUrl(mint);
    const url=new URL(base,window.location.origin);
    url.searchParams.set('source','x');
    if(api?.shareMintToX){api.shareMintToX({name:String(mint.name||'this mint'),url:url.toString(),afterMint:false});return;}
    const intent='https://x.com/intent/tweet?text='+encodeURIComponent('Mint '+String(mint.name||'this mint')+' on One Home 🏠')+'&url='+encodeURIComponent(url.toString());
    window.open(intent,'_blank','noopener,noreferrer');
  }

  function card(mint,index){
    const id=validCampaignId(mint.id);
    if(!id)return '';
    const test=isTestMint(mint);
    const chips=test
      ? `<span class="mint-card-chip test">TESTNET</span><span class="mint-card-chip">${escapeHTML(chainLabel(mint))}</span><span class="mint-card-chip">${escapeHTML(testStatusLabel(mint))}</span>`
      : `<span class="mint-card-chip">LIVE</span><span class="mint-card-chip">${escapeHTML(chainLabel(mint))}</span>`;
    return `<button class="mint-card${test?' mint-card-test':''}" type="button" data-mint-index="${index}" aria-label="View details for ${escapeHTML(mint.name||'this mint')}"><span class="mint-card-art"><img src="${escapeHTML(mintCover(mint))}" alt="${escapeHTML(mint.name||'Collection artwork')}"></span><span class="mint-card-name">${escapeHTML(mint.name||'Untitled Mint')}</span><span class="mint-card-meta">${chips}</span></button>`;
  }

  function repairImages(container){
    container.querySelectorAll('img').forEach(function(image){
      image.addEventListener('error',function(){
        image.src=PLACEHOLDER;
      },{once:true});
    });
  }

  function matchesSearch(mint){
    const query=search.value.trim().toLowerCase();
    if(!query)return true;
    return [
      mint.name,
      mint.creator_display_name,
      mint.creator,
      mint.description,
      mint.chain_name,
      mint.chain_key,
      mint.native_symbol
    ].some(function(value){
      return String(value||'').toLowerCase().includes(query);
    });
  }

  function renderGrid(container,items){
    container.innerHTML=items.map(function(mint){
      return card(mint,allMints.indexOf(mint));
    }).join('');
    repairImages(container);
    container.hidden=!items.length;
    container.querySelectorAll('[data-mint-index]').forEach(function(button){
      button.addEventListener('click',function(){
        openDetails(Number(button.dataset.mintIndex),button);
      });
    });
  }

  function render(){
    // Production/live mints always lead the directory. Test mints stay below
    // them so a collector never has to scroll past testing campaigns first.
    allMints=[...liveMints,...testMints];
    const filteredTest=testMints.filter(matchesSearch);
    const filteredLive=liveMints.filter(matchesSearch);
    const total=filteredTest.length+filteredLive.length;
    const hasAny=allMints.length>0;
    const searching=!!search.value.trim();

    renderGrid(liveGrid,filteredLive);
    renderGrid(testGrid,filteredTest);

    testEmpty.hidden=filteredTest.length>0||(searching&&testMints.length>0);
    liveEmpty.hidden=filteredLive.length>0||(searching&&liveMints.length>0);
    noResults.hidden=!searching||total>0;
    resultLine.hidden=!hasAny;
    resultCount.textContent=String(total);
    clearSearch.hidden=!search.value.trim();
  }

  function badgesFor(mint){
    if(mint?.source_type==='community_external')return [chainLabel(mint),'Community Mint'];
    const badges=[mintMethodLabel(mint.mint_method)];
    if(isTestMint(mint)){
      badges.unshift('TESTNET',chainLabel(mint),testStatusLabel(mint));
    }
    if(mint.reveal_enabled===true)badges.push('Reveal Collection');
    if(mint.physical_enabled===true)badges.push('Physical Item');
    if(mint.travel_tracker_enabled===true)badges.push('Travel Tracker');
    return badges;
  }

  function normalizeRpcRecord(value){
    let current=value;
    if(current&&typeof current==='object'&&!Array.isArray(current)&&Object.prototype.hasOwnProperty.call(current,'data')){
      current=current.data;
    }
    if(Array.isArray(current)){
      current=current.find(function(row){return row&&typeof row==='object';})||null;
    }
    return current&&typeof current==='object'?current:null;
  }

  function finiteNumber(){
    for(let index=0;index<arguments.length;index+=1){
      const value=arguments[index];
      if(value===null||value===undefined||value==='')continue;
      const number=Number(value);
      if(Number.isFinite(number))return number;
    }
    return null;
  }

  function fixedMintSupply(mint,currentMint,tierData){
    const value=finiteNumber(
      currentMint?.collection?.supply,
      currentMint?.collection?.total_supply,
      currentMint?.campaign?.total_supply,
      currentMint?.mint?.max_supply,
      currentMint?.total_supply,
      tierData?.total_supply,
      mint?.total_supply
    );
    return Number.isFinite(value)?Math.max(0,value):null;
  }

  function currentMintRemaining(currentMint){
    const value=finiteNumber(
      currentMint?.remaining,
      currentMint?.mint?.remaining,
      currentMint?.inventory?.remaining,
      currentMint?.availability?.remaining,
      currentMint?.available_count,
      currentMint?.campaign?.remaining,
      currentMint?.collection?.remaining
    );
    return Number.isFinite(value)?Math.max(0,value):null;
  }

  function remainingFromTierState(tierData,totalSupply){
    if(!tierData||typeof tierData!=='object')return null;
    if(tierData.available===false)return 0;
    const explicit=finiteNumber(tierData.remaining,tierData.available_count,tierData.remaining_supply);
    if(Number.isFinite(explicit))return Math.max(0,explicit);
    const nextPosition=finiteNumber(tierData.next_position);
    if(Number.isFinite(nextPosition)&&Number.isFinite(totalSupply)&&nextPosition>=1){
      return Math.max(0,totalSupply-nextPosition+1);
    }
    return null;
  }

  function staticDetailState(mint){
    return {
      price_label:String(Number(mint?.price||0))+' '+nativeSymbol(mint),
      remaining:Math.max(0,Number(mint?.remaining)||0),
      total_supply:Math.max(0,Number(mint?.total_supply)||0),
      authoritative:false
    };
  }

  async function authoritativeLiveDetailState(mint,force){
    const campaignId=validCampaignId(mint?.id);
    if(!campaignId||isTestMint(mint))return staticDetailState(mint);

    const cached=liveDetailStateCache.get(campaignId);
    if(!force&&cached&&Date.now()-cached.saved_at<5000)return cached.state;

    // Campaign IDs are globally unique. Ask get-public-mint for the campaign
    // directly instead of carrying directory network metadata into the lookup.
    // The mint page itself uses this same campaign source for its displayed supply.
    const results=await Promise.allSettled([
      fetch(`${SUPABASE_URL}/functions/v1/get-public-mint`,{
        method:'POST',
        headers:{'Content-Type':'application/json','apikey':SUPABASE_KEY,'Cache-Control':'no-cache'},
        cache:'no-store',
        body:JSON.stringify({campaign_id:campaignId})
      }).then(async function(response){
        const data=await response.json().catch(function(){return null;});
        if(!response.ok||!data||data.success===false)throw new Error(data?.error||'Mint state could not be loaded.');
        const returnedId=String(data?.campaign?.id||'').trim().toLowerCase();
        if(returnedId&&returnedId!==campaignId.toLowerCase())throw new Error('Mint state campaign mismatch.');
        return data;
      }),
      fetch(`${SUPABASE_URL}/rest/v1/rpc/onehome_public_mint_price_tiers`,{
        method:'POST',
        headers:{'Content-Type':'application/json','apikey':SUPABASE_KEY,'Cache-Control':'no-cache'},
        cache:'no-store',
        body:JSON.stringify({p_campaign_id:campaignId})
      }).then(async function(response){
        const data=await response.json().catch(function(){return null;});
        if(!response.ok)throw new Error('Tier price could not be loaded.');
        const normalized=normalizeRpcRecord(data);
        if(!normalized)throw new Error('Tier price response was empty.');
        return normalized;
      })
    ]);

    const currentMint=results[0].status==='fulfilled'?results[0].value:null;
    const tierData=results[1].status==='fulfilled'?results[1].value:null;
    if(results[0].status==='rejected')console.warn('One Home Open Mints authoritative campaign state',results[0].reason);
    if(results[1].status==='rejected')console.warn('One Home Open Mints authoritative tier price',results[1].reason);

    const currentSupply=fixedMintSupply(mint,currentMint,tierData);
    const publicRemaining=currentMintRemaining(currentMint);
    const tierRemaining=remainingFromTierState(tierData,currentSupply);
    const currentRemaining=Number.isFinite(publicRemaining)?publicRemaining:tierRemaining;
    const state={
      price_label:'Current price unavailable',
      remaining:Number.isFinite(currentRemaining)?Math.max(0,currentRemaining):null,
      total_supply:Number.isFinite(currentSupply)?Math.max(0,currentSupply):null,
      authoritative:true
    };

    if(tierData){
      const tierPrice=finiteNumber(tierData.next_public_price);
      const nextPosition=finiteNumber(tierData.next_position);
      const tiers=Array.isArray(tierData.tiers)?tierData.tiers:[];
      if(tierData.available===false){
        state.price_label='Sold out';
      }else if(Number.isFinite(tierPrice)&&tierPrice>=0){
        const currency=String(tierData.currency_code||currentMint?.settings?.currency||'XRP').trim()||'XRP';
        state.price_label=String(tierPrice)+' '+currency+(tiers.length>1&&Number.isFinite(nextPosition)?' · MINT #'+nextPosition:'');
      }
    }

    // Never use the directory's saved REMAINING count for a live campaign.
    // If get-public-mint is temporarily unavailable, the already-authoritative
    // tier RPC can still resolve remaining supply from next_position + the fixed
    // collection supply. This is the same outgoing-mint sequence that sets price.
    if(Number.isFinite(currentRemaining))mint.remaining=state.remaining;
    if(Number.isFinite(currentSupply))mint.total_supply=state.total_supply;

    liveDetailStateCache.set(campaignId,{state:state,saved_at:Date.now()});
    return state;
  }

  async function refreshOpenDetail(force){
    const mint=activeDetailMint;
    if(!mint||overlay.hidden||isTestMint(mint)||mint.source_type==='community_external')return;
    const detailPrice=document.getElementById('detailPrice');
    const detailAvailable=document.getElementById('detailAvailable');
    try{
      const state=await authoritativeLiveDetailState(mint,force===true);
      if(activeDetailMint!==mint||overlay.hidden)return;
      if(detailPrice)detailPrice.textContent=state.price_label;
      if(detailAvailable){
        detailAvailable.textContent=Number.isFinite(state.remaining)&&Number.isFinite(state.total_supply)
          ? String(state.remaining)+' of '+String(state.total_supply)
          : 'Current availability unavailable';
      }
    }catch(error){
      console.warn('One Home Open Mints authoritative detail refresh',error);
      if(activeDetailMint!==mint||overlay.hidden)return;
      if(detailPrice)detailPrice.textContent='Current price unavailable';
      if(detailAvailable)detailAvailable.textContent='Current availability unavailable';
    }
  }

  function scheduleOpenDetailRefresh(){
    if(liveDetailRefreshTimer)clearTimeout(liveDetailRefreshTimer);
    liveDetailRefreshTimer=setTimeout(async function tick(){
      if(!overlay.hidden&&activeDetailMint&&!isTestMint(activeDetailMint)&&document.visibilityState!=='hidden'){
        await refreshOpenDetail(true);
      }
      liveDetailRefreshTimer=setTimeout(tick,8000);
    },8000);
  }

  function openDetails(index,sourceButton){
    const mint=allMints[index];
    if(!mint)return;
    const id=validCampaignId(mint.id);
    if(!id)return;
    const test=isTestMint(mint);
    const external=mint.source_type==='community_external';
    activeDetailMint=mint;
    lastFocusedCard=sourceButton||null;
    document.getElementById('detailKicker').textContent=test?'Testnet Mint':'Open Mint';
    document.getElementById('detailName').textContent=mint.name||'Untitled Mint';
    const creatorLine=document.getElementById('detailCreator');
    if(test){creatorLine.textContent=chainLabel(mint)+' · '+walletLabel(mint);creatorLine.hidden=false;}
    else{const creatorName=String(mint.creator_display_name||mint.creator||'').trim();creatorLine.textContent=creatorName?'Creator: '+creatorName:'';creatorLine.hidden=!creatorName;}
    const description=document.getElementById('detailDescription');description.textContent=mint.description||'';description.hidden=!description.textContent;
    const detailPrice=document.getElementById('detailPrice');
    const detailAvailable=document.getElementById('detailAvailable');
    document.getElementById('detailStats').hidden=external;
    if(external){
      detailPrice.textContent='';detailAvailable.textContent='';
    }else if(test){
      detailPrice.textContent=String(Number(mint.price||0))+' '+nativeSymbol(mint);
      detailAvailable.textContent=String(Math.max(0,Number(mint.remaining)||0))+' of '+String(Math.max(0,Number(mint.total_supply)||0));
    }else{
      detailPrice.textContent='Checking current price…';
      detailAvailable.textContent='Checking current availability…';
      refreshOpenDetail(true);
      scheduleOpenDetailRefresh();
    }
    document.getElementById('detailBadges').innerHTML=badgesFor(mint).map(function(label){return `<span class="badge">${escapeHTML(label)}</span>`;}).join('');
    const image=document.getElementById('detailImage');
    image.src=mintCover(mint);
    image.alt=String(mint.name||'Collection')+' artwork';
    image.onerror=function(){image.onerror=null;image.src=PLACEHOLDER;};
    const openLink=document.getElementById('detailOpenMint');
    openLink.href=canonicalUrl(mint);
    openLink.textContent=test?(testStatusLabel(mint)==='OPEN'?'Open Testnet Mint':'View Testnet Mint'):'Open Mint';
    openLink.target=external?'_blank':'';openLink.rel=external?'noopener noreferrer':'';
    overlay.hidden=false;
    document.body.classList.add('detail-open');
    document.getElementById('detailClose').focus();
  }

  function closeDetails(){
    overlay.hidden=true;
    activeDetailMint=null;
    if(liveDetailRefreshTimer){clearTimeout(liveDetailRefreshTimer);liveDetailRefreshTimer=null;}
    document.body.classList.remove('detail-open');
    if(lastFocusedCard)lastFocusedCard.focus();
  }

  async function fetchPublicMintDirectory(){
    const response=await fetch(`${SUPABASE_URL}/functions/v1/get-public-mint`,{
      method:'POST',
      headers:{'Content-Type':'application/json','apikey':SUPABASE_KEY},
      body:JSON.stringify({action:'list_open'})
    });
    const data=await response.json().catch(function(){return {};});
    if(!response.ok||data.success===false)throw new Error('Public mint directory could not be loaded.');
    const live=(Array.isArray(data.mainnet)?data.mainnet:[]).filter(function(mint){
      return String(mint.network||'').toLowerCase()==='mainnet'&&validCampaignId(mint.id);
    }).map(function(mint){return {...mint,test_only:false};});
    const test=(Array.isArray(data.testnet)?data.testnet:[]).filter(function(mint){
      return validCampaignId(mint.id)&&isDirectoryOpen(mint)&&!retiredPublicTestnet(mint);
    }).map(function(mint){return {...mint,test_only:true,test_source:'public-directory'};});
    return {live:live,test:test};
  }

  async function fetchTestMints(){
    const response=await fetch(`${SUPABASE_URL}/functions/v1/list-test-mints`,{
      method:'POST',
      headers:{'Content-Type':'application/json','apikey':SUPABASE_KEY},
      body:JSON.stringify({action:'list_open'})
    });
    const data=await response.json().catch(function(){return {};});
    if(!response.ok||data.success===false)throw new Error(data.error||'Test mints could not be loaded.');
    return (Array.isArray(data.testnet)?data.testnet:[]).filter(function(mint){
      return validCampaignId(mint.id)&&isDirectoryOpen(mint)&&!retiredPublicTestnet(mint);
    }).map(function(mint){return {...mint,test_only:true,test_source:'test-directory'};});
  }

  async function fetchCommunityMints(){
    const response=await fetch(`${SUPABASE_URL}/functions/v1/onehome-open-mints`,{
      method:'POST',headers:{'Content-Type':'application/json','apikey':SUPABASE_KEY},
      body:JSON.stringify({action:'public_list'})
    });
    const data=await response.json().catch(function(){return {};});
    if(!response.ok||data.success===false)throw new Error('Community mints could not be loaded.');
    return (Array.isArray(data.mints)?data.mints:[]).filter(function(mint){return validCampaignId(mint.id)&&mint.source_type==='community_external';});
  }

  function mergeTestMints(directoryMints,publicMints){
    const merged=new Map();
    (publicMints||[]).forEach(function(mint){
      const id=validCampaignId(mint?.id);
      if(id)merged.set(id,{...mint,test_only:true});
    });
    (directoryMints||[]).forEach(function(mint){
      const id=validCampaignId(mint?.id);
      if(!id)return;
      const previous=merged.get(id)||{};
      merged.set(id,{...previous,...mint,test_only:true});
    });
    return Array.from(merged.values()).filter(isDirectoryOpen).sort(function(a,b){
      const aTime=Date.parse(a.updated_at||a.created_at||0)||0;
      const bTime=Date.parse(b.updated_at||b.created_at||0)||0;
      return bTime-aTime;
    });
  }

  async function load(){
    loading.hidden=false;
    error.hidden=true;
    noResults.hidden=true;
    liveGrid.hidden=true;
    testGrid.hidden=true;
    resultLine.hidden=true;
    testLoadNote.hidden=true;

    const results=await Promise.allSettled([
      fetchPublicMintDirectory(),
      fetchTestMints(),
      fetchCommunityMints()
    ]);

    const publicResult=results[0];
    const testResult=results[1];
    const publicDirectory=publicResult.status==='fulfilled'?publicResult.value:{live:[],test:[]};
    const fullTestDirectory=testResult.status==='fulfilled'?testResult.value:[];
    const communityResult=results[2];
    const communityMints=communityResult.status==='fulfilled'?communityResult.value:[];

    liveMints=[...communityMints,...(publicDirectory.live||[])];
    testMints=mergeTestMints(fullTestDirectory,publicDirectory.test||[]);
    await hydrateCanonicalCovers([...liveMints,...testMints]);

    loading.hidden=true;

    if(testResult.status==='rejected'){
      console.error('Test Mints',testResult.reason);
      testLoadNote.hidden=false;
    }

    if(publicResult.status==='rejected'){
      console.error('Public Mint Directory',publicResult.reason);
    }

    if(communityResult.status==='rejected')console.error('Community Open Mints',communityResult.reason);

    if(publicResult.status==='rejected'&&testResult.status==='rejected'&&communityResult.status==='rejected'){
      error.hidden=false;
      return;
    }

    render();

    if(location.hash==='#test-mints'){
      setTimeout(function(){
        document.getElementById('test-mints')?.scrollIntoView({behavior:'smooth',block:'start'});
      },80);
    }
  }

  document.getElementById('searchForm').addEventListener('submit',function(event){event.preventDefault();render();});
  clearSearch.addEventListener('click',function(){search.value='';render();search.focus();});
  document.getElementById('retryBtn').addEventListener('click',load);
  document.getElementById('detailClose').addEventListener('click',closeDetails);
  document.getElementById('detailCloseBottom').addEventListener('click',closeDetails);
  document.getElementById('detailShareX').addEventListener('click',function(){shareMintOnX(activeDetailMint);});
  overlay.addEventListener('click',function(event){if(event.target===overlay)closeDetails();});
  document.addEventListener('keydown',function(event){if(event.key==='Escape'&&!overlay.hidden)closeDetails();});
  window.addEventListener('focus',function(){if(!overlay.hidden)refreshOpenDetail(true);});
  document.addEventListener('visibilitychange',function(){if(document.visibilityState==='visible'&&!overlay.hidden)refreshOpenDetail(true);});
  load();
})();
