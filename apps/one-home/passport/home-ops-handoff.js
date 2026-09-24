(function(){
  'use strict';

  if(window.__ONEHOME_HOME_OPS_HANDOFF_V146784__)return;
  window.__ONEHOME_HOME_OPS_HANDOFF_V146784__=true;

  var SUPABASE_URL='https://fshvettlltcujmwvikfq.supabase.co';
  var SUPABASE_KEY='sb_publishable_ARrX-vYhy8l-yhs6384S_g_n6214taB';
  var HANDOFF_ENDPOINT=SUPABASE_URL+'/functions/v1/onehome-homeops-handoff';
  var HOME_OPS_ORIGIN='https://one-home-ops.netlify.app';
  var HOME_OPS_CALLBACK_PATH='/auth/one-home/callback';
  var inFlight=false;

  function client(){
    try{
      if(window.oneHomePassportSupabase&&window.oneHomePassportSupabase.auth)return window.oneHomePassportSupabase;
      if(window.doodProfileSupabase&&window.doodProfileSupabase.auth)return window.doodProfileSupabase;
      if(window.doodSupabase&&window.doodSupabase.auth)return window.doodSupabase;
      if(window.supabaseClient&&window.supabaseClient.auth)return window.supabaseClient;
      if(window.supabase&&typeof window.supabase.createClient==='function'){
        window.oneHomePassportSupabase=window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY);
        return window.oneHomePassportSupabase;
      }
    }catch(_error){}
    return null;
  }

  function setStatus(node,message,isError){
    if(!node)return;
    node.textContent=message||'';
    node.hidden=!message;
    node.classList.toggle('is-error',Boolean(isError));
  }

  function friendlyError(code){
    switch(String(code||'')){
      case 'ONE_HOME_SESSION_REQUIRED':
      case 'ONE_HOME_SESSION_EXPIRED':
        return 'Your One Home session has expired. Please sign in again, then open Home Ops.';
      case 'ONE_HOME_PASSPORT_REQUIRED':
        return 'Complete your One Home Passport before opening Home Ops.';
      case 'ORIGIN_NOT_ALLOWED':
        return 'This One Home address is not approved for the Home Ops handoff.';
      case 'HOME_OPS_CALLBACK_NOT_CONFIGURED':
      case 'HOME_OPS_PRODUCTION_CALLBACK_INVALID':
      case 'HOME_OPS_PRODUCTION_CALLBACK_MUST_USE_HTTPS':
        return 'Home Ops is not configured for the production callback yet.';
      case 'HANDOFF_CREATE_FAILED':
        return 'One Home could not create the secure Home Ops pass. Please try again.';
      default:
        return 'Home Ops could not be opened securely. Please try again.';
    }
  }

  function validatedRedirect(raw,audience){
    if(audience!=='home-ops')throw new Error('HANDOFF_AUDIENCE_INVALID');
    var url=new URL(String(raw||''));
    if(url.origin!==HOME_OPS_ORIGIN||url.pathname!==HOME_OPS_CALLBACK_PATH){
      throw new Error('HANDOFF_REDIRECT_INVALID');
    }
    if(url.username||url.password||url.hash)throw new Error('HANDOFF_REDIRECT_INVALID');
    var codes=url.searchParams.getAll('code');
    if(codes.length!==1||!/^[A-Za-z0-9_-]{40,60}$/.test(codes[0])){
      throw new Error('HANDOFF_CODE_INVALID');
    }
    if(Array.from(url.searchParams.keys()).some(function(key){return key!=='code'})){
      throw new Error('HANDOFF_REDIRECT_INVALID');
    }
    return url;
  }

  async function open(button,status){
    if(inFlight)return;
    inFlight=true;
    var originalLabel=button?button.textContent:'Open Home Ops';
    if(button){button.disabled=true;button.textContent='Opening Home Ops…';}
    setStatus(status,'Creating your secure one-time Home Ops pass…',false);

    try{
      var authClient=client();
      if(!authClient)throw new Error('ONE_HOME_SESSION_REQUIRED');

      var sessionResult=await authClient.auth.getSession();
      var session=sessionResult&&sessionResult.data&&sessionResult.data.session;
      if(sessionResult&&sessionResult.error)throw new Error('ONE_HOME_SESSION_EXPIRED');
      if(!session||!session.user||!session.access_token)throw new Error('ONE_HOME_SESSION_REQUIRED');

      var response=await fetch(HANDOFF_ENDPOINT,{
        method:'POST',
        cache:'no-store',
        credentials:'omit',
        headers:{
          'Accept':'application/json',
          'Content-Type':'application/json',
          'apikey':SUPABASE_KEY,
          'Authorization':'Bearer '+session.access_token
        },
        body:JSON.stringify({action:'create'})
      });
      var data=await response.json().catch(function(){return {}});
      if(!response.ok||data.ok!==true)throw new Error(String(data.error||'HANDOFF_CREATE_FAILED'));

      var redirect=validatedRedirect(data.redirect_url,data.audience);
      setStatus(status,'Secure pass created. Opening Home Ops…',false);
      window.location.assign(redirect.toString());
    }catch(error){
      var code=error&&error.message?error.message:'HANDOFF_FAILED';
      setStatus(status,friendlyError(code),true);
      if(button){button.disabled=false;button.textContent=originalLabel;}
      inFlight=false;
    }
  }

  window.OneHomeHomeOpsHandoff={
    open:open,
    version:'14.67.84'
  };
})();
