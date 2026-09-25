/* One Home v14.67.46 — resilient Supabase browser auth storage.
   Keeps the same Supabase session available across ordinary browsers and
   embedded mobile browsers by mirroring auth storage to localStorage and
   sessionStorage. Supabase's supported custom storage interface is used. */
(function(){
  'use strict';
  if(window.OneHomeAuthStorage&&window.OneHomeAuthStorage.version==='14.67.46')return;

  const VERSION='14.67.46';
  const memory=Object.create(null);

  function read(store,key){
    try{
      const value=store&&store.getItem?store.getItem(key):null;
      return value==null?'':String(value);
    }catch(_error){return '';}
  }
  function write(store,key,value){
    try{
      if(store&&store.setItem){store.setItem(key,String(value));return true;}
    }catch(_error){}
    return false;
  }
  function remove(store,key){
    try{if(store&&store.removeItem)store.removeItem(key);}catch(_error){}
  }

  const storage={
    getItem:function(key){
      const local=read(window.localStorage,key);
      if(local){memory[key]=local;return local;}
      const session=read(window.sessionStorage,key);
      if(session){memory[key]=session;return session;}
      return Object.prototype.hasOwnProperty.call(memory,key)?memory[key]:null;
    },
    setItem:function(key,value){
      const text=String(value);
      memory[key]=text;
      write(window.localStorage,key,text);
      write(window.sessionStorage,key,text);
    },
    removeItem:function(key){
      delete memory[key];
      remove(window.localStorage,key);
      remove(window.sessionStorage,key);
    }
  };

  function authOptions(options){
    const next=Object.assign({},options||{});
    next.auth=Object.assign({},next.auth||{}, {
      storage:storage,
      persistSession:true,
      autoRefreshToken:true
    });
    return next;
  }

  function storeRaw(key,value){
    if(!key)return false;
    try{storage.setItem(key,typeof value==='string'?value:JSON.stringify(value));return true;}catch(_error){return false;}
  }

  window.OneHomeAuthStorage={
    version:VERSION,
    storage:storage,
    authOptions:authOptions,
    storeRaw:storeRaw
  };
})();
