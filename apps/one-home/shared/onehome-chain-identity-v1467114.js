/* One Home v14.67.114 — canonical chain identity/display resolver.
   `network` is an environment (mainnet/testnet), never a blockchain identity.
   Chain identity comes from chain_key/deployment metadata first, then explicit
   wallet/provider/currency evidence for legacy XRPL/Stellar/EVM records. */
(function(w){
  'use strict';
  var CHAINS={
    'avalanche-fuji':{label:'Avalanche Fuji',ecosystem:'evm',environment:'testnet',symbol:'AVAX'},
    'avalanche-mainnet':{label:'Avalanche Mainnet (Locked)',ecosystem:'evm',environment:'mainnet',symbol:'AVAX',locked:true},
    'xrpl-mainnet':{label:'XRP Ledger',ecosystem:'xrpl',environment:'mainnet',symbol:'XRP'},
    'xrpl-testnet':{label:'XRP Ledger Testnet',ecosystem:'xrpl',environment:'testnet',symbol:'XRP'},
    'stellar-testnet':{label:'Stellar Testnet',ecosystem:'stellar',environment:'testnet',symbol:'XLM'},
    'ethereum-sepolia':{label:'Ethereum Sepolia',ecosystem:'evm',environment:'testnet',symbol:'ETH'},
    'base-sepolia':{label:'Base Sepolia',ecosystem:'evm',environment:'testnet',symbol:'ETH'},
    'polygon-amoy':{label:'Polygon Amoy',ecosystem:'evm',environment:'testnet',symbol:'POL'},
    'optimism-sepolia':{label:'OP Sepolia',ecosystem:'evm',environment:'testnet',symbol:'ETH'},
    'arbitrum-sepolia':{label:'Arbitrum Sepolia',ecosystem:'evm',environment:'testnet',symbol:'ETH'},
    'linea-sepolia':{label:'Linea Sepolia',ecosystem:'evm',environment:'testnet',symbol:'ETH'},
    'bsc-testnet':{label:'BNB Smart Chain Testnet',ecosystem:'evm',environment:'testnet',symbol:'tBNB'},
    'bnb-testnet':{label:'BNB Smart Chain Testnet',ecosystem:'evm',environment:'testnet',symbol:'tBNB'},
    'hedera-testnet':{label:'Hedera Testnet',ecosystem:'evm',environment:'testnet',symbol:'HBAR'},
    'sei-atlantic-2':{label:'Sei Atlantic-2',ecosystem:'evm',environment:'testnet',symbol:'SEI'},
    'ethereum-mainnet':{label:'Ethereum',ecosystem:'evm',environment:'mainnet',symbol:'ETH'},
    'base-mainnet':{label:'Base',ecosystem:'evm',environment:'mainnet',symbol:'ETH'},
    'polygon-mainnet':{label:'Polygon',ecosystem:'evm',environment:'mainnet',symbol:'POL'},
    'optimism-mainnet':{label:'Optimism',ecosystem:'evm',environment:'mainnet',symbol:'ETH'},
    'arbitrum-mainnet':{label:'Arbitrum One',ecosystem:'evm',environment:'mainnet',symbol:'ETH'},
    'linea-mainnet':{label:'Linea',ecosystem:'evm',environment:'mainnet',symbol:'ETH'},
    'bsc-mainnet':{label:'BNB Smart Chain',ecosystem:'evm',environment:'mainnet',symbol:'BNB'},
    'hedera-mainnet':{label:'Hedera',ecosystem:'evm',environment:'mainnet',symbol:'HBAR'},
    'sei-mainnet':{label:'Sei',ecosystem:'evm',environment:'mainnet',symbol:'SEI'}
  };
  function text(v){return String(v==null?'':v).trim();}
  function lower(v){return text(v).toLowerCase();}
  function pick(){for(var i=0;i<arguments.length;i++){var v=text(arguments[i]);if(v)return v;}return '';}
  function classic(v){return /^r[1-9A-HJ-NP-Za-km-z]{24,34}$/.test(text(v));}
  function evm(v){return /^0x[a-fA-F0-9]{40}$/.test(text(v));}
  function stellar(v){return /^G[A-Z2-7]{55}$/.test(text(v).toUpperCase());}
  function nested(o,path){var cur=o;for(var i=0;i<path.length;i++){if(!cur||typeof cur!=='object')return '';cur=cur[path[i]];}return cur;}
  function keyOf(o){o=o||{};var raw=lower(pick(
    o.chain_key,o.chainKey,o.network_key,o.destination_chain_key,o.payment_chain_key,
    nested(o,['network','chain_key']),nested(o,['chain','chain_key']),nested(o,['deployment','chain_key']),
    nested(o,['payment_option','configuration','chain_key']),nested(o,['payment_option','configuration','destination_chain_key']),
    nested(o,['configuration','chain_key']),nested(o,['configuration','destination_chain_key'])
  ));
  if(raw==='mainnet'||raw==='testnet')return '';
  if(raw==='xrpl'){
    var env=lower(pick(o.network,nested(o,['network','environment']),o.environment));
    return env==='mainnet'?'xrpl-mainnet':env==='testnet'?'xrpl-testnet':'xrpl';
  }
  return raw;
  }
  function environmentOf(o,key){var known=CHAINS[key];if(known)return known.environment;var env=lower(pick(nested(o||{},['network','environment']),(o||{}).environment,(o||{}).network));return env==='mainnet'||env==='testnet'?env:'';}
  function ecosystemOf(o,key){o=o||{};var explicit=lower(pick(o.ecosystem,nested(o,['network','ecosystem']),nested(o,['chain','ecosystem'])));if(['xrpl','evm','stellar'].includes(explicit))return explicit;if(CHAINS[key])return CHAINS[key].ecosystem;if(key.startsWith('xrpl'))return 'xrpl';if(key.includes('stellar'))return 'stellar';
    var provider=lower(pick(o.wallet_provider,o.provider,nested(o,['wallet','provider'])));if(provider==='metamask')return 'evm';if(provider==='freighter')return 'stellar';if(['xaman','crossmark','joey','xaman-crossmark'].includes(provider))return 'xrpl';
    var addresses=[o.issuer_wallet,o.inventory_wallet,o.creator_wallet,o.wallet_address,o.normalized_address,nested(o,['wallet','expected_from'])];if(addresses.some(evm))return 'evm';if(addresses.some(stellar))return 'stellar';if(addresses.some(classic))return 'xrpl';
    var currency=text(pick(o.native_symbol,o.payment_currency_code,o.currency_code,nested(o,['mint','native_symbol']))).toUpperCase();if(currency==='XLM')return 'stellar';if(currency==='XRP'&&addresses.some(classic))return 'xrpl';return '';
  }
  function humanize(key){return text(key).split(/[-_]+/).filter(Boolean).map(function(p){var u=p.toUpperCase();if(['OP','BNB','BSC','EVM','XRPL'].includes(u))return u;return p.charAt(0).toUpperCase()+p.slice(1);}).join(' ');}
  function describe(o){o=o||{};var key=keyOf(o);var ecosystem=ecosystemOf(o,key);var environment=environmentOf(o,key);var known=CHAINS[key]||null;
    var explicitLabel=pick(o.chain_display_name,o.chain_name,nested(o,['network','display_name']),nested(o,['chain','display_name']));
    var label=known?known.label:explicitLabel||(key&&key!=='xrpl'?humanize(key):'');
    if(!label&&ecosystem==='xrpl')label=environment==='mainnet'?'XRP Ledger':environment==='testnet'?'XRP Ledger Testnet':'XRP Ledger';
    if(!label&&ecosystem==='stellar')label=environment==='mainnet'?'Stellar':'Stellar Testnet';
    if(!label&&ecosystem==='evm')label=environment==='mainnet'?'EVM Mainnet':'EVM Test Network';
    if(!label)label=environment==='mainnet'?'Mainnet':environment==='testnet'?'Test Network':'Network not identified';
    var symbol=text(pick(o.native_symbol,nested(o,['network','native_symbol']),nested(o,['mint','native_symbol']),o.payment_currency_code,o.currency_code,known&&known.symbol));
    if(!symbol)symbol=ecosystem==='xrpl'?'XRP':ecosystem==='stellar'?'XLM':'Native asset';
    return {key:key,ecosystem:ecosystem,environment:environment,label:label,symbol:symbol,testOnly:environment==='testnet',known:!!known};
  }
  w.OneHomeChainIdentity={describe:describe,keyOf:keyOf,chains:CHAINS,isXrplAddress:classic,isEvmAddress:evm,isStellarAddress:stellar};
})(window);
