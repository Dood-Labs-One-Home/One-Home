/* One Home v14.67.83 — named wallets and active-account-aware Freighter multi-link. */
(function(){
  'use strict';

  if(window.__oneHomeStellarWallets) return;
  window.__oneHomeStellarWallets=true;

  var SUPABASE_URL='https://fshvettlltcujmwvikfq.supabase.co';
  var SUPABASE_KEY='sb_publishable_ARrX-vYhy8l-yhs6384S_g_n6214taB';
  var ENDPOINT=SUPABASE_URL+'/functions/v1/onehome-stellar-wallet';
  var SDK_PATH='/assets/vendor/onehome-stellar-freighter-sdk-6.0.1.js';
  var TESTNET_PASSPHRASE='Test SDF Network ; September 2015';
  var mountedManager=null;
  var sdkPromise=null;
  var linkBusy=false;
  var actionBusy=false;
  var linkedRows=[];

  function q(id){return document.getElementById(id);}

  function supabase(){
    if(window.oneHomePassportSupabase&&window.oneHomePassportSupabase.auth)return window.oneHomePassportSupabase;
    if(window.doodProfileSupabase&&window.doodProfileSupabase.auth)return window.doodProfileSupabase;
    if(window.doodSupabase&&window.doodSupabase.auth)return window.doodSupabase;
    if(window.supabaseClient&&window.supabaseClient.auth)return window.supabaseClient;
    return null;
  }

  async function passportSession(){
    var client=supabase();
    if(!client) throw new Error('Your One Home Passport is still loading.');
    var result=await client.auth.getSession();
    if(result.error) throw result.error;
    var session=result.data&&result.data.session;
    if(!session||!session.user||!session.access_token){
      throw new Error('Sign in to your One Home Passport first.');
    }
    return session;
  }

  function setStatus(message,type){
    var el=q('oneHomeV1455WalletStatus');
    if(!el) return;
    el.textContent=String(message||'');
    el.className='onehome-v1455-wallet-status'+(type?' is-'+type:'');
  }

  function setBusy(busy){
    linkBusy=busy;
    var button=q('oneHomeV146782ConnectFreighter');
    if(!button) return;
    if(busy){
      if(!button.dataset.originalText) button.dataset.originalText=button.textContent;
      button.disabled=true;
      button.textContent='Check Freighter…';
    }else{
      button.disabled=false;
      if(button.dataset.originalText){
        button.textContent=button.dataset.originalText;
        delete button.dataset.originalText;
      }
    }
  }

  function friendlyError(error){
    var code=Number(error&&error.code);
    var message=String(error&&error.message||error||'Freighter could not finish connecting.');
    if(code===4001||/reject|denied|cancel/i.test(message)) return 'The Freighter request was cancelled.';
    if(/TESTNET_REQUIRED|testnet/i.test(message)) return 'Switch Freighter to Testnet, then try again.';
    if(/not funded|account was not found|account_not_funded/i.test(message)) return 'This Stellar Testnet account is not funded yet. Fund it with Friendbot, then try again.';
    if(/already linked to another/i.test(message)) return 'This Freighter wallet is already linked to another One Home Passport.';
    if(/expired/i.test(message)) return 'The wallet proof expired. Please try again.';
    if(/install|not connected|extension/i.test(message)) return 'Open or install the Freighter browser extension, switch it to Testnet, then try again.';
    return message;
  }

  function loadSdk(){
    if(window.OneHomeStellarSDK&&window.OneHomeStellarSDK.freighter){
      return Promise.resolve(window.OneHomeStellarSDK);
    }
    if(sdkPromise) return sdkPromise;
    sdkPromise=new Promise(function(resolve,reject){
      var prior=document.querySelector('script[data-onehome-stellar-sdk]');
      var script=prior||document.createElement('script');
      function ready(){
        if(window.OneHomeStellarSDK&&window.OneHomeStellarSDK.freighter) resolve(window.OneHomeStellarSDK);
        else reject(new Error('Freighter access did not finish loading. Refresh and try again.'));
      }
      script.addEventListener('load',ready,{once:true});
      script.addEventListener('error',function(){reject(new Error('Freighter access could not load. Refresh and try again.'));},{once:true});
      if(!prior){
        script.src=SDK_PATH;
        script.async=true;
        script.dataset.onehomeStellarSdk='1';
        document.head.appendChild(script);
      }
    }).catch(function(error){sdkPromise=null;throw error;});
    return sdkPromise;
  }

  function sdkError(result,fallback){
    if(result&&result.error){
      var error=new Error(result.error.message||fallback);
      error.code=result.error.code;
      throw error;
    }
  }

  async function requireTestnet(freighter){
    var details=await freighter.getNetworkDetails();
    sdkError(details,'Freighter could not report its selected network.');
    if(String(details.networkPassphrase||'')!==TESTNET_PASSPHRASE){
      var error=new Error('TESTNET_REQUIRED');
      error.code='TESTNET_REQUIRED';
      throw error;
    }
    return details;
  }

  async function callFunction(token,body){
    var response=await fetch(ENDPOINT,{
      method:'POST',
      headers:{
        'Content-Type':'application/json',
        'apikey':SUPABASE_KEY,
        'Authorization':'Bearer '+token
      },
      body:JSON.stringify(body||{})
    });
    var data=await response.json().catch(function(){return {};});
    if(!response.ok||data.error){
      var error=new Error(data.error||'The Stellar wallet request could not be completed.');
      error.code=data.code||response.status;
      throw error;
    }
    return data;
  }

  function signatureBase64(value){
    if(typeof value==='string'&&value.trim()) return value.trim();
    if(value&&typeof value.toString==='function'){
      try{
        var encoded=value.toString('base64');
        if(encoded&&encoded!=='[object Object]') return encoded;
      }catch(_error){}
    }
    var bytes=null;
    if(value instanceof Uint8Array) bytes=value;
    else if(value&&Array.isArray(value.data)) bytes=new Uint8Array(value.data);
    if(!bytes||!bytes.length) throw new Error('Freighter did not return a valid wallet signature.');
    var binary='';
    for(var i=0;i<bytes.length;i+=1) binary+=String.fromCharCode(bytes[i]);
    return btoa(binary);
  }

  async function link(){
    if(linkBusy||actionBusy) return;
    setBusy(true);
    setStatus('Open Freighter, select Stellar Testnet, and approve the connection.');
    try{
      var passport=await passportSession();
      var sdk=await loadSdk();
      var freighter=sdk.freighter;
      var connected=await freighter.isConnected();
      sdkError(connected,'Freighter could not be reached.');
      if(!connected||!connected.isConnected) throw new Error('The Freighter extension is not connected.');
      await requireTestnet(freighter);

      await loadRows();
      var access=await freighter.requestAccess();
      sdkError(access,'Freighter did not approve wallet access.');
      var current=typeof freighter.getAddress==='function'?await freighter.getAddress():access;
      sdkError(current,'Freighter did not return its active account.');
      var address=String(current&&current.address||access&&access.address||'').trim();
      if(!/^G[A-Z2-7]{55}$/.test(address)) throw new Error('Freighter did not return a valid Stellar account.');
      await requireTestnet(freighter);

      var alreadyVisible=linkedRows.some(function(row){
        return String(row.wallet_address||'').trim()===address;
      });
      if(alreadyVisible){
        setStatus('Freighter is still using '+shortWallet(address)+'. Open Freighter, switch to a different Testnet account, then click Link Another Freighter Wallet.','error');
        return;
      }

      setStatus('Sign the One Home wallet proof shown in Freighter. This does not send XLM.');
      var challenge=await callFunction(passport.access_token,{
        action:'challenge',
        wallet_address:address,
        network:'testnet'
      });
      if(challenge.already_linked){
        if(challenge.wallet_id) await activateWallet(challenge.wallet_id);
        await loadRows();
        setStatus('Freighter Stellar Testnet is already linked and is now active.','success');
        return;
      }

      var signed=await freighter.signMessage(challenge.challenge_message,{
        address:address,
        networkPassphrase:TESTNET_PASSPHRASE
      });
      sdkError(signed,'Freighter did not sign the wallet proof.');
      if(String(signed.signerAddress||'')!==address) throw new Error('Freighter signed with a different Stellar account. Please try again.');

      var completed=await callFunction(passport.access_token,{
        action:'complete',
        challenge_id:challenge.challenge_id,
        wallet_address:address,
        signature:signatureBase64(signed.signedMessage),
        network:'testnet'
      });
      await loadRows();
      setStatus('Freighter Stellar Testnet is now linked and active.','success');
      try{window.dispatchEvent(new CustomEvent('onehome-stellar-wallet-linked',{detail:{wallet_id:completed.wallet_id,wallet_address:address,network:'testnet'}}));}catch(_error){}
    }catch(error){
      setStatus(friendlyError(error),'error');
    }finally{
      setBusy(false);
    }
  }

  function shortWallet(value){
    var wallet=String(value||'').trim();
    return wallet.length>22?wallet.slice(0,10)+'…'+wallet.slice(-8):wallet;
  }

  function defaultWalletLabel(){return 'Freighter Stellar Testnet';}

  function savedWalletLabel(row){
    return String(row&&row.wallet_label||'').trim()||defaultWalletLabel();
  }

  function esc(value){
    return String(value==null?'':value)
      .replace(/&/g,'&amp;')
      .replace(/</g,'&lt;')
      .replace(/>/g,'&gt;')
      .replace(/"/g,'&quot;')
      .replace(/'/g,'&#39;');
  }

  async function activateWallet(walletId){
    var client=supabase();
    if(!client) throw new Error('Your One Home Passport is still loading.');
    await passportSession();
    var result=await client.rpc('onehome_set_active_chain_wallet',{p_wallet_id:walletId});
    if(result.error) throw result.error;
    return Array.isArray(result.data)?result.data[0]:result.data;
  }

  async function makeActive(walletId){
    if(!walletId||actionBusy||linkBusy) return;
    actionBusy=true;
    setStatus('Updating your active Stellar wallet…');
    try{
      await activateWallet(walletId);
      await loadRows();
      setStatus('Freighter Stellar Testnet is now active.','success');
      try{window.dispatchEvent(new CustomEvent('onehome-chain-wallet-changed',{detail:{wallet_id:walletId,ecosystem:'stellar'}}));}catch(_error){}
    }catch(error){
      setStatus(friendlyError(error),'error');
    }finally{
      actionBusy=false;
    }
  }

  async function unlinkWallet(walletId,address){
    if(!walletId||actionBusy||linkBusy) return;
    if(!confirm('Unlink Freighter Stellar Testnet '+shortWallet(address)+' from your One Home Passport?\n\nThis does not delete the wallet, XLM, tokens, or NFTs.')) return;
    actionBusy=true;
    setStatus('Unlinking Freighter Stellar Testnet wallet…');
    try{
      var client=supabase();
      if(!client) throw new Error('Your One Home Passport is still loading.');
      await passportSession();
      var result=await client.rpc('onehome_unlink_chain_wallet',{p_wallet_id:walletId});
      if(result.error) throw result.error;
      await loadRows();
      setStatus('Freighter Stellar Testnet wallet unlinked.','success');
      try{window.dispatchEvent(new CustomEvent('onehome-chain-wallet-changed',{detail:{wallet_id:walletId,ecosystem:'stellar',unlinked:true}}));}catch(_error){}
    }catch(error){
      setStatus(friendlyError(error),'error');
    }finally{
      actionBusy=false;
    }
  }

  async function nameWallet(walletId,currentLabel){
    if(!walletId||actionBusy||linkBusy) return;
    var next=prompt(
      'Name this wallet so you can recognize it.\n\nExamples: Edge Stellar 1, Chrome Stellar, XLM Test\n\nLeave it blank to restore the automatic name.',
      currentLabel===defaultWalletLabel()?'':currentLabel
    );
    if(next===null) return;
    next=String(next||'').trim();
    if(next.length>40){
      setStatus('Wallet names can be up to 40 characters.','error');
      return;
    }
    actionBusy=true;
    setStatus('Saving this wallet name…');
    try{
      var client=supabase();
      if(!client) throw new Error('Your One Home Passport is still loading.');
      await passportSession();
      var result=await client.rpc('onehome_set_chain_wallet_label',{p_wallet_id:walletId,p_label:next});
      if(result.error) throw result.error;
      await loadRows();
      setStatus(next?'Wallet name saved.':'Automatic wallet name restored.','success');
    }catch(error){
      setStatus(friendlyError(error),'error');
    }finally{
      actionBusy=false;
    }
  }

  async function copyAddress(address){
    var value=String(address||'').trim();
    if(!value) return;
    try{
      if(navigator.clipboard&&window.isSecureContext) await navigator.clipboard.writeText(value);
      else{
        var field=document.createElement('textarea');
        field.value=value;
        field.setAttribute('readonly','');
        field.style.position='fixed';
        field.style.opacity='0';
        document.body.appendChild(field);
        field.select();
        document.execCommand('copy');
        field.remove();
      }
      setStatus('Full Stellar address copied.','success');
    }catch(_error){
      setStatus('The address could not be copied automatically. Press and hold the address to copy it.','error');
    }
  }

  function renderRows(rows){
    var list=q('oneHomeStellarWalletList');
    var summary=q('oneHomeStellarWalletSummary');
    var data=Array.isArray(rows)?rows:[];
    if(summary) summary.textContent='Freighter Stellar Wallets ('+data.length+')';
    if(!list) return;
    if(!data.length){
      list.innerHTML='<div class="onehome-v1455-empty">No Freighter Stellar wallets linked yet.</div>';
      var emptyButton=q('oneHomeV146782ConnectFreighter');
      if(emptyButton) emptyButton.textContent='Link Freighter — Stellar Testnet';
      return;
    }
    var button=q('oneHomeV146782ConnectFreighter');
    if(button) button.textContent='Link Another Freighter Wallet';
    list.innerHTML=data.map(function(row){
      var address=String(row.wallet_address||'');
      var walletId=String(row.id||'');
      var label=savedWalletLabel(row);
      var active=!!row.is_primary;
      return '<div class="onehome-v1455-wallet-row">'+
        '<span class="onehome-stellar-wallet-mark" aria-hidden="true">✦</span>'+
        '<span><span class="onehome-v1455-wallet-name">'+esc(label)+(active?' <span class="onehome-v1455-wallet-active">Active</span>':'')+'</span>'+
        '<span class="onehome-v1455-wallet-address" title="'+esc(address)+'">'+esc(shortWallet(address))+'</span>'+
        '<span class="onehome-stellar-wallet-meta"><span class="onehome-stellar-wallet-chip">Verified</span><span class="onehome-stellar-wallet-chip">Testnet</span></span></span>'+
        '<span class="onehome-v1455-row-actions">'+
          (active?'':'<button class="onehome-v1455-mini-btn" type="button" data-onehome-stellar-wallet-use="'+esc(walletId)+'">Make Active</button>')+
          '<button class="onehome-v1455-mini-btn" type="button" data-onehome-stellar-wallet-name="'+esc(walletId)+'" data-onehome-stellar-current-label="'+esc(label)+'">Name</button>'+
          '<button class="onehome-v1455-mini-btn" type="button" data-onehome-stellar-wallet-copy="'+esc(address)+'">Copy Address</button>'+
          '<button class="onehome-v1455-mini-btn onehome-v1455-unlink-btn" type="button" data-onehome-stellar-wallet-unlink="'+esc(walletId)+'" data-onehome-stellar-address="'+esc(address)+'">Unlink</button>'+
        '</span>'+
      '</div>';
    }).join('');
    if(typeof window.oneHomeV1456ApplyWalletNeon==='function') window.oneHomeV1456ApplyWalletNeon();
  }

  async function loadRows(){
    var client=supabase();
    if(!client){renderRows([]);return [];}
    try{
      var session=await passportSession();
      var result=await client.from('passport_chain_wallets')
        .select('id,provider,ecosystem,verification_chain_key,wallet_address,status,is_primary,verified_at,wallet_label')
        .eq('owner_user_id',session.user.id)
        .eq('provider','freighter')
        .eq('ecosystem','stellar')
        .eq('status','verified')
        .order('verified_at',{ascending:true});
      if(result.error) throw result.error;
      linkedRows=result.data||[];
      renderRows(result.data||[]);
      return result.data||[];
    }catch(error){
      linkedRows=[];
      renderRows([]);
      setStatus(friendlyError(error),'error');
      return [];
    }
  }

  function mount(){
    var manager=q('oneHomeV1455WalletManager');
    if(!manager) return false;
    var connectGrid=manager.querySelector('.onehome-v1455-connect-grid');
    var anchor=q('oneHomeMetaMaskLinkedWallets')||q('oneHomeV1455LinkedWallets');
    if(!connectGrid||!anchor) return false;
    if(mountedManager===manager&&q('oneHomeStellarLinkedWallets')&&q('oneHomeV146782ConnectFreighter')) return true;

    if(!q('oneHomeStellarLinkedWallets')){
      var details=document.createElement('details');
      details.className='onehome-v1455-wallet-details';
      details.id='oneHomeStellarLinkedWallets';
      details.innerHTML='<summary><span id="oneHomeStellarWalletSummary">Freighter Stellar Wallets</span></summary><div class="onehome-v1455-wallet-list" id="oneHomeStellarWalletList"></div>';
      anchor.insertAdjacentElement('afterend',details);
    }

    var walletList=q('oneHomeStellarWalletList');
    if(walletList&&!walletList.dataset.onehomeActionsBound){
      walletList.dataset.onehomeActionsBound='1';
      walletList.addEventListener('click',function(event){
        var use=event.target&&event.target.closest?event.target.closest('[data-onehome-stellar-wallet-use]'):null;
        if(use){
          event.preventDefault();
          makeActive(String(use.getAttribute('data-onehome-stellar-wallet-use')||''));
          return;
        }
        var name=event.target&&event.target.closest?event.target.closest('[data-onehome-stellar-wallet-name]'):null;
        if(name){
          event.preventDefault();
          nameWallet(
            String(name.getAttribute('data-onehome-stellar-wallet-name')||''),
            String(name.getAttribute('data-onehome-stellar-current-label')||'')
          );
          return;
        }
        var copy=event.target&&event.target.closest?event.target.closest('[data-onehome-stellar-wallet-copy]'):null;
        if(copy){
          event.preventDefault();
          copyAddress(String(copy.getAttribute('data-onehome-stellar-wallet-copy')||''));
          return;
        }
        var unlink=event.target&&event.target.closest?event.target.closest('[data-onehome-stellar-wallet-unlink]'):null;
        if(unlink){
          event.preventDefault();
          unlinkWallet(String(unlink.getAttribute('data-onehome-stellar-wallet-unlink')||''),String(unlink.getAttribute('data-onehome-stellar-address')||''));
        }
      });
    }

    if(!q('oneHomeV146782ConnectFreighter')){
      var button=document.createElement('button');
      button.className='onehome-v1455-connect-btn onehome-stellar-connect-btn';
      button.id='oneHomeV146782ConnectFreighter';
      button.type='button';
      button.textContent='Link Freighter — Stellar Testnet';
      button.addEventListener('click',link);
      connectGrid.appendChild(button);
    }

    mountedManager=manager;
    loadRows();
    if(typeof window.oneHomeV1456ApplyWalletNeon==='function') window.oneHomeV1456ApplyWalletNeon();
    return true;
  }

  window.OneHomeStellarWallets={mount:mount,link:link,refresh:loadRows,setActive:makeActive,unlink:unlinkWallet};

  function scan(){mount();}
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',scan);
  else scan();

  if(window.MutationObserver&&document.documentElement){
    new MutationObserver(function(){
      if(!q('oneHomeV1455WalletManager')) return;
      mount();
    }).observe(document.documentElement,{childList:true,subtree:true});
  }

  window.addEventListener('onehome:page-activated',function(event){
    if(event&&event.detail&&event.detail.pageId==='profilePage') setTimeout(function(){
      var manager=q('oneHomeV1455WalletManager');
      var alreadyMounted=mountedManager===manager;
      mount();
      if(alreadyMounted) loadRows();
    },0);
  });
})();
