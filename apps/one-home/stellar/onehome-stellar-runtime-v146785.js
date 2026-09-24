(function(global){
"use strict";

function loadShared(){
  return new Promise(function(resolve,reject){
    if(global.OneHomeStellar)return resolve(global.OneHomeStellar);
    var script=document.createElement("script");
    script.src="/stellar/onehome-stellar-shared-v146785.js?v=146785";
    script.onload=function(){
      global.OneHomeStellar?resolve(global.OneHomeStellar):reject(new Error("Stellar shared runtime did not load."));
    };
    script.onerror=function(){reject(new Error("Stellar shared runtime failed to load."));};
    document.head.appendChild(script);
  });
}

function campaignId(){
  var match=location.pathname.match(/\/mint\/([0-9a-f-]{36})/i);
  if(match)return match[1];
  return new URLSearchParams(location.search).get("campaign")||"";
}

function chainHint(){
  return (new URLSearchParams(location.search).get("chain")||"").toLowerCase()==="stellar-testnet";
}

function by(id){return document.getElementById(id);}
function setText(id,value){var node=by(id);if(node)node.textContent=String(value==null?"":value);}
function shortAddress(value){var text=String(value||"");return text.length>16?text.slice(0,7)+"…"+text.slice(-7):text;}

function setStatus(title,detail,klass){
  var box=by("founderMintStatus");
  if(!box)return;
  box.className="founder-mint-status "+(klass||"");
  box.innerHTML="<strong>"+title+"</strong><span>"+detail+"</span>";
}

function hideLegacy(){
  ["founderMintXamanBtn","founderMintCrossmarkBtn","founderMintMetaMaskBtn"].forEach(function(id){
    var node=by(id);if(node)node.hidden=true;
  });
}

function ensureButton(){
  var button=by("founderMintFreighterBtn");
  if(button)return button;
  var actions=document.querySelector(".founder-mint-actions")||by("founderMintStatus")?.parentElement;
  if(!actions)return null;
  button=document.createElement("button");
  button.id="founderMintFreighterBtn";
  button.type="button";
  button.className="founder-mint-button";
  button.innerHTML="<span><small>MINT WITH</small><strong>FREIGHTER · STELLAR TESTNET</strong></span>";
  actions.appendChild(button);
  return button;
}

function ensureQty(max){
  var input=by("oneHomeStellarQty");
  if(input){input.max=String(max);return input;}
  var note=by("founderMintPaymentNote");
  if(!note)return null;
  var wrap=document.createElement("div");
  wrap.id="oneHomeStellarQtyWrap";
  wrap.style.cssText="display:flex;gap:10px;align-items:center;margin:12px 0;flex-wrap:wrap";
  wrap.innerHTML='<label for="oneHomeStellarQty" style="font-weight:800">QUANTITY</label><input id="oneHomeStellarQty" type="number" min="1" max="'+max+'" value="1" inputmode="numeric" style="width:84px;padding:10px;border-radius:10px"><small>Up to '+max+' this session</small>';
  note.insertAdjacentElement("afterend",wrap);
  return by("oneHomeStellarQty");
}

async function loadPublicCampaign(id){
  var supabaseUrl=global.DOOD_SUPABASE_URL||"https://fshvettlltcujmwvikfq.supabase.co";
  var publicKey=global.DOOD_SUPABASE_KEY||"sb_publishable_ARrX-vYhy8l-yhs6384S_g_n6214taB";
  var response=await fetch(supabaseUrl+"/functions/v1/list-test-mints",{
    method:"POST",
    cache:"no-store",
    headers:{"Content-Type":"application/json","apikey":publicKey},
    body:JSON.stringify({action:"list_all"})
  });
  var payload=await response.json().catch(function(){return {};});
  if(!response.ok||payload.success===false)return null;
  var mint=(Array.isArray(payload.testnet)?payload.testnet:[]).find(function(item){return String(item&&item.id||"")===String(id)&&String(item&&item.chain_key||"").toLowerCase()==="stellar-testnet";});
  if(!mint)return null;
  return {
    campaign:{
      id:mint.id,name:mint.name,description:mint.description,status:mint.status,
      public_page_enabled:mint.public_page_enabled===true,minting_enabled:mint.minting_enabled===true,
      cover_image_url:mint.cover_image_url||null,artwork_url:mint.artwork_url||null,banner_url:mint.banner_url||null,
      supply:Number(mint.total_supply||0),minted:Number(mint.minted||0),remaining:Number(mint.remaining||0),
      per_wallet_limit:Number(mint.per_wallet_limit||1),max_per_mint:1
    },
    wallet:{address:"",remaining:Number(mint.per_wallet_limit||1)},
    price:{xlm:String(mint.price||0)}
  };
}

function renderCampaign(data){
  var campaign=data.campaign||{};
  var wallet=data.wallet||{};
  var price=data.price||{};
  var remaining=Math.max(0,Number(campaign.remaining||0));
  var supply=Math.max(0,Number(campaign.supply||0));
  var isOpen=campaign.public_page_enabled===true&&campaign.minting_enabled===true&&["published","active","open","live"].includes(String(campaign.status||"").toLowerCase())&&remaining>0;

  setText("founderMintPathSection","PUBLIC MINT");
  setText("founderMintHeaderPath","STELLAR TESTNET");
  setText("founderMintDropLabel","STELLAR TESTNET MINT");
  setText("founderMintSealStatus",remaining<=0?"SOLD OUT":isOpen?"OPEN":"NOT OPEN");
  setText("founderMintName",campaign.name||"Stellar Testnet Mint");
  setText("founderMintDescription",campaign.description||"One Home Stellar Testnet NFT mint.");
  setText("founderMintPrice",String(price.xlm||"0")+" XLM");
  setText("founderMintSupply",String(remaining)+" / "+String(supply));
  setText("founderMintStatusLabel",remaining<=0?"SOLD OUT":isOpen?"OPEN":"NOT OPEN");
  setText("founderMintQuantity",String(campaign.per_wallet_limit||1)+" / wallet");
  setText("founderMintWallet",wallet.address?"Freighter · "+shortAddress(wallet.address):"Freighter");
  setText("founderMintArtEyebrow","Stellar Testnet");
  setText("founderMintRevealTitle","SOROBAN NFT");
  setText("founderMintAccessLabel","Freighter");

  var paymentNote=by("founderMintPaymentNote");
  if(paymentNote)paymentNote.textContent="Stellar Testnet · XLM · Freighter";

  var image=by("founderMintArtwork");
  if(image){
    var source=String(campaign.cover_image_url||campaign.artwork_url||campaign.banner_url||"/assets/one-home-logo.png?v=107");
    image.src=source;
    image.alt=(campaign.name||"Stellar Testnet mint")+" cover";
    image.hidden=false;
  }
  return isOpen;
}

async function boot(){
  var id=campaignId();
  if(!id)return;
  var hinted=chainHint();
  if(hinted){
    document.documentElement.dataset.onehomeStellarMint="1";
    hideLegacy();
  }
  var Stellar=await loadShared();

  var publicData=null;
  if(hinted){
    try{publicData=await loadPublicCampaign(id);if(publicData)renderCampaign(publicData);}catch(_publicError){}
  }

  var data;
  try{
    data=await Stellar.invoke("stellar-campaign-mint",{action:"status",campaign_id:id});
  }catch(error){
    if(hinted){
      hideLegacy();
      setStatus("STELLAR TESTNET",Stellar.esc(error.message),"is-preparing");
    }
    return;
  }
  if(!data||data.mode!=="stellar_testnet")return;

  hideLegacy();
  document.documentElement.dataset.onehomeStellarMint="1";
  var campaign=data.campaign||{};
  var wallet=data.wallet||{};
  var pageOpen=renderCampaign(data);
  var remaining=Math.max(0,Number(campaign.remaining||0));
  var walletRemaining=Math.max(0,Number(wallet.remaining||0));
  var max=Math.max(1,Math.min(Number(campaign.max_per_mint||1),remaining||1,walletRemaining||1));
  var qty=ensureQty(max);
  var button=ensureButton();
  if(!button)return;

  button.disabled=!pageOpen||remaining<=0||walletRemaining<=0;
  if(button.disabled){
    if(remaining<=0){
      setStatus("STELLAR TESTNET SOLD OUT","This collection has no remaining NFTs.","is-error");
    }else if(walletRemaining<=0){
      setStatus("WALLET LIMIT REACHED","This Freighter wallet has reached the creator's mint limit.","is-error");
    }else{
      setStatus("STELLAR TESTNET","This mint is not currently open.","is-preparing");
    }
    return;
  }

  setStatus("READY TO MINT","Freighter will show every Stellar Testnet transaction before approval.","is-ready");
  button.onclick=async function(){
    if(button.disabled)return;
    var count=Math.max(1,Math.min(max,Number(qty&&qty.value||1)));
    button.disabled=true;
    if(qty)qty.disabled=true;
    var results=[];
    try{
      await Stellar.address(wallet.address);
      for(var i=0;i<count;i++){
        setStatus("PREPARING STELLAR MINT","Preparing NFT "+(i+1)+" of "+count+".","is-preparing");
        var prepared=await Stellar.invoke("stellar-campaign-mint",{action:"prepare",campaign_id:id,wallet_address:wallet.address});
        var signed=await Stellar.sign(prepared.transaction,prepared.wallet.expected_from);
        setStatus("SUBMITTING STELLAR MINT","Freighter approval received for NFT "+(i+1)+" of "+count+".","is-preparing");
        var finalResult=await Stellar.confirm("stellar-campaign-mint",{action:"confirm",campaign_id:id,order_id:prepared.order_id,wallet_address:signed.address,signed_xdr:signed.signedXdr});
        results.push(finalResult);
      }
      var last=results[results.length-1]||{};
      setStatus("MINT SUCCESSFUL",count+" Stellar Testnet NFT"+(count===1?"":"s")+" delivered. "+(last.transaction_hash?"Transaction "+last.transaction_hash.slice(0,10)+"…":""),"is-success");
      setText("founderMintStatusLabel","MINTED");
      if(qty)qty.disabled=false;
      var share=by("founderMintShareXBtn");if(share)share.hidden=false;
      if(typeof global.oneHomeShowMintSuccessReceipt==="function")await Promise.resolve(global.oneHomeShowMintSuccessReceipt(last));
      setTimeout(function(){boot().catch(function(){});},1200);
    }catch(error){
      setStatus("STELLAR MINT NEEDS ATTENTION",Stellar.esc(error.message),"is-error");
      button.disabled=false;
      if(qty)qty.disabled=false;
    }
  };
}

function start(){
  setTimeout(function(){boot().catch(function(error){console.error("One Home Stellar runtime",error);});},450);
}

document.readyState==="loading"?document.addEventListener("DOMContentLoaded",start,{once:true}):start();
})(window);
