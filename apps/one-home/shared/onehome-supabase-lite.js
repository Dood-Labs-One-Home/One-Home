(function(global){
'use strict';
function createClient(url,key,options){
  const base=String(url||'').replace(/\/$/,'');
  const storageKey=options&&options.auth&&options.auth.storageKey||'onehome-admin-auth-v2';
  const listeners=[];
  const readSession=()=>{try{return JSON.parse(localStorage.getItem(storageKey)||'null');}catch(_){return null;}};
  const writeSession=s=>{try{s?localStorage.setItem(storageKey,JSON.stringify(s)):localStorage.removeItem(storageKey);}catch(_){ } listeners.forEach(fn=>{try{fn(s?'SIGNED_IN':'SIGNED_OUT',s);}catch(_){}});};
  const errObj=async r=>{let body={};try{body=await r.json();}catch(_){body={message:r.statusText};}return {message:body.msg||body.message||body.error_description||body.error||('Request failed ('+r.status+')'),code:body.code||String(r.status),details:body.details||'',hint:body.hint||''};};
  const authHeaders=()=>{const s=readSession();return {'apikey':key,'Authorization':'Bearer '+(s&&s.access_token?s.access_token:key)};};
  async function authFetch(path,init){const r=await fetch(base+'/auth/v1'+path,Object.assign({},init,{headers:Object.assign({'apikey':key,'Content-Type':'application/json'},init&&init.headers||{})}));if(!r.ok)return {data:{user:null,session:null},error:await errObj(r)};const j=await r.json();return {data:j,error:null};}
  const auth={
    async signInWithPassword({email,password}){const out=await authFetch('/token?grant_type=password',{method:'POST',body:JSON.stringify({email,password})});if(out.error)return out;const session=out.data;writeSession(session);return {data:{user:session.user,session},error:null};},
    async getSession(){return {data:{session:readSession()},error:null};},
    async refreshSession(){const s=readSession();if(!s||!s.refresh_token)return {data:{session:null,user:null},error:{message:'No refresh session'}};const out=await authFetch('/token?grant_type=refresh_token',{method:'POST',body:JSON.stringify({refresh_token:s.refresh_token})});if(out.error)return out;writeSession(out.data);return {data:{session:out.data,user:out.data.user},error:null};},
    async signOut(){const s=readSession();try{if(s&&s.access_token)await fetch(base+'/auth/v1/logout',{method:'POST',headers:{apikey:key,Authorization:'Bearer '+s.access_token}});}catch(_){ }writeSession(null);return {error:null};},
    onAuthStateChange(fn){listeners.push(fn);return {data:{subscription:{unsubscribe(){const i=listeners.indexOf(fn);if(i>=0)listeners.splice(i,1);}}}};}
  };
  class Query{
    constructor(table){this.table=table;this.method='GET';this.params=new URLSearchParams();this.headers={};this.body=null;this.wantSingle=false;}
    select(cols='*'){this.params.set('select',cols);if(this.method!=='GET')this.headers.Prefer=(this.headers.Prefer?this.headers.Prefer+',':'')+'return=representation';return this;}
    eq(c,v){this.params.append(c,'eq.'+String(v));return this;}
    ilike(c,v){this.params.append(c,'ilike.'+String(v));return this;}
    limit(n){this.params.set('limit',String(n));return this;}
    order(c,o){this.params.set('order',c+'.'+(o&&o.ascending===false?'desc':'asc'));return this;}
    insert(v){this.method='POST';this.body=v;this.headers.Prefer='return=representation';return this;}
    update(v){this.method='PATCH';this.body=v;this.headers.Prefer='return=representation';return this;}
    delete(){this.method='DELETE';this.headers.Prefer='return=representation';return this;}
    upsert(v,o){this.method='POST';this.body=v;this.headers.Prefer='resolution=merge-duplicates,return=representation';if(o&&o.onConflict)this.params.set('on_conflict',o.onConflict);return this;}
    single(){this.wantSingle=true;this.headers.Accept='application/vnd.pgrst.object+json';return this;}
    then(resolve,reject){this.exec().then(resolve,reject);}
    async exec(){try{const qs=this.params.toString();const r=await fetch(base+'/rest/v1/'+encodeURIComponent(this.table)+(qs?'?'+qs:''),{method:this.method,headers:Object.assign({'apikey':key,'Authorization':authHeaders().Authorization,'Content-Type':'application/json'},this.headers),body:this.body==null?undefined:JSON.stringify(this.body)});if(!r.ok)return {data:null,error:await errObj(r)};if(r.status===204)return {data:null,error:null};const t=await r.text();let data=t?JSON.parse(t):null;if(this.wantSingle&&Array.isArray(data))data=data[0]||null;return {data,error:null};}catch(e){return {data:null,error:{message:e&&e.message||String(e)}};}}
  }
  const storage={from(bucket){return {
    async upload(path,file,opts){try{const s=readSession();const headers={'apikey':key,'Authorization':'Bearer '+(s&&s.access_token?s.access_token:key),'Content-Type':opts&&opts.contentType||file.type||'application/octet-stream','x-upsert':opts&&opts.upsert?'true':'false'};const r=await fetch(base+'/storage/v1/object/'+encodeURIComponent(bucket)+'/'+path.split('/').map(encodeURIComponent).join('/'),{method:'POST',headers,body:file});if(!r.ok)return {data:null,error:await errObj(r)};return {data:await r.json(),error:null};}catch(e){return {data:null,error:{message:e.message||String(e)}};}},
    getPublicUrl(path){return {data:{publicUrl:base+'/storage/v1/object/public/'+encodeURIComponent(bucket)+'/'+path.split('/').map(encodeURIComponent).join('/')}};}
  };}};
  return {auth,from:t=>new Query(t),storage};
}
global.supabase={createClient};
})(window);
