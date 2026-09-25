/* One Home v14.47 — Rare Routes live holdings
   Displays only Season 1 Route Ticket NFTs currently held on XRPL by wallets
   linked to the signed-in One Home Passport. No browser ownership cache. */
(function(){
  'use strict';
  if(window.__oneHomeRareRoutesHoldingsV1447) return;
  window.__oneHomeRareRoutesHoldingsV1447=true;

  const SUPABASE_URL=window.DOOD_SUPABASE_URL||'https://fshvettlltcujmwvikfq.supabase.co';
  const SUPABASE_KEY=window.DOOD_SUPABASE_KEY||'sb_publishable_ARrX-vYhy8l-yhs6384S_g_n6214taB';
  const DEFAULT_CAMPAIGN_ID='e7a97a65-aec2-4d0e-9075-fb100b692fc7';
  const FUNCTION_URL=SUPABASE_URL+'/functions/v1/passport-campaign-holdings';
  const REQUIRED=8;
  let inFlight=null;
  let lastRefreshAt=0;
  let periodicTimer=null;

  function q(selector,root){return (root||document).querySelector(selector);}
  function qa(selector,root){return Array.from((root||document).querySelectorAll(selector));}
  function text(value){return String(value==null?'':value).trim();}
  function isUuid(value){return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(text(value));}
  function plural(count,one,many){return Number(count)===1?one:(many||one+'s');}
  function pageActive(){return !!q('#rareRoutesRewardsPage.page-view.active');}

  function getSupabase(){
    if(window.oneHomePassportSupabase&&window.oneHomePassportSupabase.auth) return window.oneHomePassportSupabase;
    if(window.doodProfileSupabase&&window.doodProfileSupabase.auth) return window.doodProfileSupabase;
    if(window.doodSupabase&&window.doodSupabase.auth) return window.doodSupabase;
    if(window.supabaseClient&&window.supabaseClient.auth) return window.supabaseClient;
    if(window.supabase&&window.supabase.createClient){
      window.oneHomeRareRoutesSupabase=window.oneHomeRareRoutesSupabase||window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY);
      return window.oneHomeRareRoutesSupabase;
    }
    return null;
  }

  function campaignId(){
    const configured=text(window.ONE_HOME_RARE_ROUTES&&window.ONE_HOME_RARE_ROUTES.mintCampaignId);
    return isUuid(configured)?configured:DEFAULT_CAMPAIGN_ID;
  }

  function setStatus(message,isError){
    const el=q('#rareRoutesHoldingsStatus');
    if(!el) return;
    el.textContent=message;
    el.classList.toggle('is-error',isError===true);
  }

  function setRewardState(distinct,complete){
    const verification=q('#rareRoutesVerificationState');
    const reward=q('#rareRoutesRewardNftState');
    if(verification){
      verification.textContent=complete
        ? 'Complete set verified · all 8 ticket designs currently held'
        : String(distinct)+' of 8 ticket designs verified';
    }
    if(reward){
      reward.textContent=complete
        ? 'Complete set verified · reward redemption is not open yet'
        : 'Locked until all 8 different tickets are held';
    }
  }

  function clearSlots(){
    qa('#rareRoutesRewardsPage [data-route-ticket-position]').forEach(function(slot){
      slot.classList.remove('is-owned');
      const art=q('.rare-routes-ticket-art',slot);
      const state=q('.rare-routes-ticket-state',slot);
      if(art){art.replaceChildren();art.classList.remove('has-art');art.setAttribute('aria-hidden','true');}
      if(state) state.textContent='Not held';
    });
    setRewardState(0,false);
  }

  function render(data){
    clearSlots();
    const summary=Array.isArray(data&&data.design_summary)?data.design_summary:[];
    const byPosition=new Map();
    summary.forEach(function(item){
      const position=Number(item&&item.design_position||0);
      if(Number.isInteger(position)&&position>=1&&position<=REQUIRED) byPosition.set(position,item);
    });

    for(let position=1;position<=REQUIRED;position+=1){
      const slot=q('#rareRoutesRewardsPage [data-route-ticket-position="'+position+'"]');
      const item=byPosition.get(position);
      if(!slot||!item||Number(item.count||0)<=0) continue;
      const count=Math.max(1,Number(item.count)||1);
      slot.classList.add('is-owned');
      const state=q('.rare-routes-ticket-state',slot);
      if(state) state.textContent=count>1?'Held ×'+count:'Held';
      const art=q('.rare-routes-ticket-art',slot);
      const artworkUrl=text(item.artwork_url);
      if(art&&artworkUrl){
        const img=document.createElement('img');
        img.src=artworkUrl;
        img.alt='';
        img.loading='lazy';
        img.decoding='async';
        img.referrerPolicy='no-referrer';
        art.replaceChildren(img);
        art.classList.add('has-art');
      }
    }

    const total=Math.max(0,Number(data&&data.total_owned)||0);
    const distinct=Math.max(0,Math.min(REQUIRED,Number(data&&data.distinct_designs_owned)||0));
    const wallets=Array.isArray(data&&data.linked_wallets)?data.linked_wallets.length:0;
    const complete=data&&data.complete_set===true&&distinct>=REQUIRED;
    setRewardState(distinct,complete);

    if(!wallets){
      setStatus('Link an XRPL wallet to this Passport to verify Route Tickets.',false);
      return;
    }
    if(complete){
      setStatus(
        '8 of 8 ticket designs collected · '+total+' Route '+plural(total,'Ticket')+' held across '+wallets+' linked '+plural(wallets,'wallet')+'. Complete set verified. Reward redemption is not open yet.',
        false
      );
      return;
    }
    setStatus(
      distinct+' of 8 ticket designs collected · '+total+' Route '+plural(total,'Ticket')+' held across '+wallets+' linked '+plural(wallets,'wallet')+'.',
      false
    );
  }

  async function session(){
    const sb=getSupabase();
    if(!sb) return null;
    try{
      const result=await sb.auth.getSession();
      return result&&result.data&&result.data.session?result.data.session:null;
    }catch(_error){return null;}
  }

  async function loadHoldings(options){
    options=options||{};
    const force=options.force===true;
    const now=Date.now();
    if(inFlight) return inFlight;
    if(!force&&now-lastRefreshAt<2500) return null;

    inFlight=(async function(){
      const current=await session();
      if(!current||!current.access_token){
        clearSlots();
        setStatus('Sign in to your One Home Passport to verify Route Tickets.',false);
        return null;
      }

      setStatus('Checking Route Tickets held across your linked Passport wallets…',false);
      try{
        const response=await fetch(FUNCTION_URL,{
          method:'POST',
          cache:'no-store',
          headers:{
            'Content-Type':'application/json',
            'apikey':SUPABASE_KEY,
            'Authorization':'Bearer '+current.access_token
          },
          body:JSON.stringify({campaign_id:campaignId()})
        });
        const data=await response.json().catch(function(){return {};});
        if(response.status===401){
          clearSlots();
          setStatus('Sign in to your One Home Passport to verify Route Tickets.',false);
          return data;
        }
        if(!response.ok||data.success===false){
          const message=text(data&&data.error)||'Route Ticket verification is temporarily unavailable. Refresh in a moment.';
          setStatus(message,true);
          return data;
        }
        render(data);
        lastRefreshAt=Date.now();
        return data;
      }catch(_error){
        setStatus('The XRP Ledger is temporarily busy. Your Route Tickets are safe; refresh in a moment.',true);
        return null;
      }
    })();

    try{return await inFlight;}finally{inFlight=null;}
  }

  window.oneHomeRareRoutesRefreshHoldings=function(){return loadHoldings({force:true});};

  function schedule(){
    clearInterval(periodicTimer);
    periodicTimer=setInterval(function(){
      if(pageActive()&&!document.hidden) loadHoldings({force:false});
    },60000);
  }

  function init(){
    clearSlots();
    schedule();
    window.addEventListener('focus',function(){if(pageActive()) loadHoldings({force:false});});
    document.addEventListener('visibilitychange',function(){if(!document.hidden&&pageActive()) loadHoldings({force:false});});
    document.addEventListener('click',function(event){
      const target=event.target&&event.target.closest?event.target.closest('#rareRoutesRewardsBtn'):null;
      if(target) setTimeout(function(){loadHoldings({force:true});},120);
    });
    if(pageActive()) loadHoldings({force:true});
    // The Rare Routes page builder performs one delayed rebuild on startup.
    // Refresh after that rebuild so a verified ticket never gets reset to the placeholder state.
    setTimeout(function(){if(pageActive()) loadHoldings({force:true});},220);
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init,{once:true});
  else init();
})();
