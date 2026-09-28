(function(){
'use strict';
if(window.__ONEHOME_MASTER_LAYOUT_V1467143__)return;window.__ONEHOME_MASTER_LAYOUT_V1467143__=true;
var LAB_URL='https://xrplhome.io/';
function q(id){return document.getElementById(id)}
function esc(v){return String(v==null?'':v).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
function activeId(){var p=document.querySelector('.page-view.active[id]');return p?p.id:'onehomeStartHerePage'}
function dispatch(id){try{window.dispatchEvent(new CustomEvent('onehome:page-activated',{detail:{pageId:id}}))}catch(_e){}}
function directShow(id){document.querySelectorAll('.page-view').forEach(function(p){p.classList.remove('active')});var p=q(id);if(p)p.classList.add('active');try{window.scrollTo({top:0,behavior:'auto'})}catch(_e){window.scrollTo(0,0)};dispatch(id)}
function show(id){try{if(window.OneHomeNavigation&&typeof window.OneHomeNavigation.goPage==='function'){window.OneHomeNavigation.goPage(id);return}}catch(_e){}try{if(typeof window.showPage==='function')window.showPage(id);else directShow(id)}catch(_e2){directShow(id)}setTimeout(function(){dispatch(id)},25)}
function goUrl(url){try{if(window.OneHomeNavigation&&typeof window.OneHomeNavigation.goUrl==='function'){window.OneHomeNavigation.goUrl(url);return}}catch(_e){}window.location.assign(url)}
function soon(title,msg,back){try{if(typeof window.openComingSoon==='function'){window.openComingSoon(title,back||activeId(),msg||'This room is being built.');return}}catch(_e){}alert((title||'Coming Soon')+'\\n\\n'+(msg||'This room is being built.'))}
function ensurePage(id){var p=q(id);if(p)return p;var main=q('top')||document.querySelector('main')||document.body;p=document.createElement('div');p.className='page-view';p.id=id;main.appendChild(p);return p}
function door(label,action){return '<button class="onehome-v15-btn oh-room-button" type="button" onclick="'+action+'">'+esc(label)+'</button>'}
function directory(buttons,cls){return '<div class="oh-room-directory"><div class="oh-room-grid '+(cls||'')+'">'+buttons.join('')+'</div></div>'}
function setDirectory(id,html){var p=ensurePage(id);p.setAttribute('data-oh-master-layout','1467143');p.innerHTML=html;return p}

function renderFeaturePages(){
  setDirectory('projectsPage','<div class="oh-functional-room onehome-browser-page"><section class="creator-city-panel"><div class="onehome-browser-toolbar"><h2>Creator Projects</h2><div class="onehome-browser-search" role="search"><input id="oneHomeCreatorProjectSearchInput" type="search" autocomplete="off" placeholder="Search my projects" aria-label="Search my projects"><button class="creator-city-btn onehome-user-neon" id="oneHomeCreatorProjectSearchBtn" type="button">Search</button></div></div><div class="creator-city-actions"><button class="creator-city-btn" type="button" onclick="window.doodV128OpenQuests&&window.doodV128OpenQuests()">Creator Quests</button></div><div class="onehome-banner-grid" id="projectCityGrid" aria-live="polite"></div></section></div>');
  setDirectory('activityFeedPage','<div class="oh-functional-room"><section class="creator-city-panel"><h2>Activity Feed</h2><div class="creator-feed-list" id="doodV128GlobalFeed"></div></section></div>');
  setDirectory('notificationsPage','<div class="oh-functional-room"><section class="creator-city-panel"><div class="onehome-browser-toolbar"><div><h2>Notifications</h2><p>Community updates and significant One Home events.</p></div><button class="creator-city-btn primary onehome-user-neon" type="button" onclick="window.OneHomeCommunityEvents&&window.OneHomeCommunityEvents.openComposer(\'community_update\')">Post Community Update</button></div><div id="oneHomeCommunityEventsStatus" class="onehome-community-status" hidden></div><div class="onehome-community-feed" id="oneHomeCommunityEventsList"></div><div class="onehome-community-feed-actions"><button id="oneHomeCommunityOlderToggle" class="creator-city-btn onehome-user-neon" type="button" hidden>View Older Updates ▼</button></div></section></div>');
  setDirectory('creatorQuestsPage','<div class="oh-functional-room"><section class="creator-city-panel"><h2>Creator Quests</h2><div class="creator-feed-list" id="doodV128QuestList"></div></section></div>');
  setDirectory('socialInboxPage','<div class="oh-functional-room"><section class="creator-city-panel"><h2>Social Inbox</h2><div class="creator-form-grid"><input id="socialPlatformInput" placeholder="Platform"><input id="socialFromInput" placeholder="From / username"><input id="socialSubjectInput" placeholder="Subject"><textarea class="creator-full-width" id="socialBodyInput" placeholder="Paste message or comment here"></textarea></div><div class="creator-city-actions"><button class="creator-city-btn primary" type="button" onclick="window.doodV128AddSocial&&window.doodV128AddSocial()">Add Social Message</button></div><div class="creator-feed-list" id="doodV128SocialInboxList"></div></section></div>');
}

function renderDirectories(){
  setDirectory('onehomeStartHerePage',directory([
    door('Explore Rooms',"window.oneHomeV15Show('onehomeExplorePage')"),
    door('Open Mints',"window.oneHomeV15GoUrl('/open-mints.html')"),
    door('Ask Ember',"window.oneHomeV15Show('onehomeEmberPage')"),
    door('Founder Page',"window.oneHomeV15Show('onehomeFounderPage')")
  ],'cols-2'));
  setDirectory('onehomeExplorePage',directory([
    door('Mimi & Pops Shop',"window.oneHomeV15Show('shopPage')"),
    door('Rare Ink Studio',"window.oneHomeV15Show('onehomeRareInkPage')"),
    door('XRPL Home',"window.open('"+LAB_URL+"','_blank','noopener')"),
    door('Rollies Arcade',"window.oneHomeV15Show('arcadePage')"),
    door('Night Shots',"window.oneHomeV15Show('nightShotsPage')"),
    door('Community Command',"window.oneHomeV15Show('socialCommandPage')"),
    door('Ask Ember',"window.oneHomeV15Show('onehomeEmberPage')"),
    door('Founder Page',"window.oneHomeV15Show('onehomeFounderPage')"),
    door('Dood U',"window.oneHomeV15Show('doodUPage')"),
    door('Open Mints',"window.oneHomeV15GoUrl('/open-mints.html')")
  ],'cols-2'));
  setDirectory('futureShopsPage',directory([
    door('Featured Shops',"window.oneHomeV15Soon('Featured Shops','Featured creator shops and partner businesses will rotate here.','futureShopsPage')"),
    door('Most Visited Shops',"window.oneHomeV15Soon('Most Visited Shops','Most visited shops will appear here when shop tracking is connected.','futureShopsPage')"),
    door('New Merch',"window.oneHomeV15Soon('New Merch','New creator merchandise and physical products will appear here.','futureShopsPage')"),
    door('NFT Storefronts & Private Galleries',"window.oneHomeV15Soon('NFT Storefronts & Private Galleries','NFT storefronts and private gallery releases will appear here.','futureShopsPage')")
  ],'cols-2'));
  setDirectory('onehomeRareInkPage',directory([
    door('Creative Studio',"window.oneHomeV15Show('onehomeCreatePage')"),
    door('Podcast Studio',"window.oneHomeOpenPodcastStudio()"),
    door('Collectibles & Stickers',"window.oneHomeV15Show('onehomeCollectiblesPage')")
  ]));
  setDirectory('onehomeCreatePage',directory([
    door('NFT Creator',"window.oneHomeOpenNftCreator()"),
    door('Mint Studio',"window.oneHomeV15GoUrl('/mint-studio.html')"),
    door('Open Mints',"window.oneHomeV15GoUrl('/open-mints.html')"),
    door('Creator Projects',"window.oneHomeOpenCreatorProjects()"),
    door('Other Creative Tools',"window.oneHomeV15Show('onehomeOtherCreativeToolsPage')")
  ]));
  setDirectory('onehomeCollectiblesPage',directory([
    door('Stickers',"window.oneHomeV15Soon('Stickers','The sticker room is being connected.','onehomeCollectiblesPage')"),
    door('Physical Collectibles',"window.oneHomeV15Soon('Physical Collectibles','Physical collectibles are being connected.','onehomeCollectiblesPage')"),
    door('Future Rare Ink Merch',"window.oneHomeV15Soon('Future Rare Ink Merch','Future Rare Ink merchandise will appear here.','onehomeCollectiblesPage')")
  ]));
  setDirectory('onehomeOtherCreativeToolsPage',directory([
    door('Burn to Build',"window.oneHomeV15GoUrl('/burn-to-build.html')"),
    door('Time Capsule',"window.oneHomeV15GoUrl('/time-capsule.html')"),
    door('Dood-el',"window.oneHomeOpenLegacyTool('doodEl')"),
    door('Dot-dood',"window.oneHomeOpenLegacyTool('dotDood')"),
    door('Noggins',"window.oneHomeOpenLegacyTool('noggins')")
  ]));
  setDirectory('nightShotsPage','<div class="oh-coming-room"><div><div class="oh-coming-label">Coming Soon</div><h1>Night Shots</h1></div><div class="oh-room-grid">'+
    door('Photo Journals',"window.oneHomeV15Soon('Photo Journals','Photo Journals are planned for Night Shots.','nightShotsPage')")+
    door('Family Archives',"window.oneHomeV15Soon('Family Archives','Family Archives are planned for Night Shots.','nightShotsPage')")+
    door('AI Organization',"window.oneHomeV15Soon('AI Organization','AI Organization is planned for Night Shots.','nightShotsPage')")+
    '</div></div>');
  setDirectory('socialCommandPage',directory([
    door('Messages',"window.oneHomeOpenMessages()"),
    door('Social Inbox',"window.oneHomeOpenSocialInbox()"),
    door('Notifications',"window.oneHomeOpenNotifications()"),
    door('Social Settings',"window.oneHomeV15Soon('Social Settings','Social settings are being connected inside Community Command.','socialCommandPage')"),
    door('Discord',"window.oneHomeV15Soon('Discord','Discord connection is planned inside Community Command.','socialCommandPage')"),
    door('X',"window.oneHomeV15Soon('X','X connection is planned inside Community Command.','socialCommandPage')"),
    door('TikTok',"window.oneHomeV15Soon('TikTok','TikTok connection is planned inside Community Command.','socialCommandPage')"),
    door('Future Social Platforms',"window.oneHomeV15Soon('Future Social Platforms','Additional social platforms will appear here.','socialCommandPage')")
  ],'cols-2'));
  setDirectory('onehomeEmberPage',directory([
    door('Ask Ember',"window.oneHomeV15Soon('Ask Ember','The full Ember guide is being connected here.','onehomeEmberPage')"),
    door('Create Replies with Ember',"window.oneHomeV15Show('onehomeEmberRepliesPage')"),
    door('Future Ember Tools',"window.oneHomeV15Soon('Future Ember Tools','Future Ember tools will appear here.','onehomeEmberPage')")
  ]));
  setDirectory('onehomeEmberRepliesPage','<div class="oh-coming-room"><div><div class="oh-coming-label">Ember</div><h1>Create Replies with Ember</h1><p>This Ember reply workspace is being built here as its own tool.</p></div></div>');
  setDirectory('onehomeFounderPage',directory([
    door('Founder Benefits',"window.oneHomeV15Soon('Founder Benefits','Founder benefit details are being organized here.','onehomeFounderPage')"),
    door('Founder Dashboard',"window.oneHomeOpenFounderDashboard()")
  ],'cols-2'));
}

function normalizeMainEntry(){
  [['passportChoicePassportBtn','Passport'],['passportChoiceHomeBtn','Explore Rooms'],['passportChoiceRareRoutesBtn','Rare Routes'],['passportChoiceOpenMintsBtn','Open Mints']].forEach(function(pair){var b=q(pair[0]);if(!b)return;b.textContent=pair[1];b.classList.remove('onehome-main-entry-image-button');b.classList.add('onehome-v15-btn','onehome-main-entry-neon-button');Array.prototype.forEach.call(b.querySelectorAll('img'),function(i){i.remove()})});
}

function client(){try{if(window.oneHomePassportSupabase&&window.oneHomePassportSupabase.auth)return window.oneHomePassportSupabase;if(window.doodProfileSupabase&&window.doodProfileSupabase.auth)return window.doodProfileSupabase;if(window.doodSupabase&&window.doodSupabase.auth)return window.doodSupabase}catch(_e){}return null}
async function openMyPublicPassport(){try{var c=client();if(!c){show('profilePage');return}var sr=await c.auth.getSession();var u=sr&&sr.data&&sr.data.session&&sr.data.session.user;if(!u){show('profilePage');return}var r=await c.from('dood_profiles').select('username,is_public').eq('user_id',u.id).maybeSingle();if(r&&r.data&&r.data.username&&r.data.is_public&&typeof window.openDoodPublicProfile==='function'){window.openDoodPublicProfile(r.data.username);return}}catch(_e){}show('profilePage')}
function creatorRole(value){var role=String(value||'').trim().toLowerCase();return role==='creator'||role==='artist'||role==='both'||role==='creator + collector'||role==='creator+collector'||role.indexOf('creator')>=0}
async function creatorEligible(){try{var c=client();if(!c)return false;var sr=await c.auth.getSession();var u=sr&&sr.data&&sr.data.session&&sr.data.session.user;if(!u)return false;try{if(window.DoodIdentity&&typeof window.DoodIdentity.getProfileMe==='function'){var me=await window.DoodIdentity.getProfileMe(false);var doodRole=me&&me.profile&&me.profile.role_type;if(creatorRole(doodRole))return true;var ds=window.DoodIdentity.getSession&&window.DoodIdentity.getSession();if(creatorRole(ds&&ds.profile&&ds.profile.role_type))return true}}catch(_doodError){}var metaRole=(u.user_metadata&&(u.user_metadata.role_type||u.user_metadata.profile_type))||(u.app_metadata&&(u.app_metadata.role_type||u.app_metadata.profile_type))||'';if(creatorRole(metaRole))return true;var p=await c.from('dood_profiles').select('profile_type,role_type').eq('user_id',u.id).maybeSingle();var role=String((p&&p.data&&(p.data.role_type||p.data.profile_type))||'').toLowerCase();if(creatorRole(role))return true;var d=await c.from('mint_drafts').select('id').eq('owner_user_id',u.id).limit(1);if(!d.error&&d.data&&d.data.length)return true;var n=await c.from('nft_collections').select('id').eq('owner_user_id',u.id).limit(1);if(!n.error&&n.data&&n.data.length)return true}catch(_e){}return false}
function creatorListHtml(rows,kind){
  if(!rows||!rows.length)return '<div class="oh-passport-creator-empty">No '+(kind==='mint'?'mints':'creations')+' yet.</div>';
  return rows.map(function(r,i){var name=r.name||(kind==='mint'?'Untitled Mint':'Untitled Collection');var status=r.status||(kind==='mint'?'draft':'saved');if(kind==='mint'&&r.campaign_id)status+=' · Published';var share=(kind==='mint'&&r.campaign_id)?'<button class="onehome-journey-button oh-passport-mint-share" type="button" data-oh-share-campaign="'+esc(r.campaign_id)+'" data-oh-share-name="'+esc(name)+'">Share Mint on X</button>':'';return '<div class="oh-passport-creator-row'+(i>=3?' oh-creator-extra':'')+'"'+(i>=3?' hidden':'')+'><strong>'+esc(name)+'</strong><small>'+esc(status)+'</small>'+share+'</div>'}).join('');
}
function wireCreatorMintShares(container){if(!container)return;container.querySelectorAll('[data-oh-share-campaign]').forEach(function(btn){btn.onclick=function(e){e.preventDefault();e.stopPropagation();var id=String(btn.getAttribute('data-oh-share-campaign')||'').trim();if(!/^[0-9a-f-]{36}$/i.test(id))return;var name=String(btn.getAttribute('data-oh-share-name')||'this mint');var api=window.OneHomeMintSource;var url=window.location.origin+'/mint/'+encodeURIComponent(id)+'?source=x';if(api&&typeof api.shareMintToX==='function'){api.shareMintToX({name:name,url:url,campaignId:id});return}window.open('https://x.com/intent/tweet?text='+encodeURIComponent('Mint '+name+' on One Home 🏠')+'&url='+encodeURIComponent(url),'_blank','noopener,noreferrer')}})}
function wireCreatorDropdown(section){if(!section)return;var btn=section.querySelector('.oh-creator-list-toggle');if(!btn)return;var extras=section.querySelectorAll('.oh-creator-extra');var caret=btn.querySelector('.oh-creator-chevron');if(!extras.length){btn.classList.add('no-extra');btn.setAttribute('aria-expanded','false');if(caret)caret.hidden=true;return}btn.onclick=function(){var open=btn.getAttribute('aria-expanded')==='true';btn.setAttribute('aria-expanded',open?'false':'true');extras.forEach(function(row){row.hidden=open});if(caret)caret.textContent=open?'⌄':'⌃'}}
function ensurePassportCreatorPage(){var p=ensurePage('onehomePassportCreatorPage');if(p.getAttribute('data-oh-creator-page')==='1')return p;p.setAttribute('data-oh-creator-page','1');p.innerHTML='<div class="oh-passport-creator-page"><section class="oh-passport-creator-hero"><h1>Creator</h1><div class="oh-passport-creator-actions"><button class="onehome-journey-button" type="button" data-c-admin>Creator Mint Admin</button><button class="onehome-journey-button" type="button" data-c-redeemables>Redeemables</button><button class="onehome-journey-button" type="button" data-c-nft>NFT Creator</button><button class="onehome-journey-button" type="button" data-c-mint>Create a Mint</button><button class="onehome-journey-button" type="button" data-c-mymints>My Mints &amp; Minted NFTs</button><button class="onehome-journey-button" type="button" data-c-allowlists>Allow Lists</button><button class="onehome-journey-button" type="button" data-c-mintlinks>Mint Links</button><button class="onehome-journey-button" type="button" data-c-package-upload>Upload Mint Package for Creator</button><button class="onehome-journey-button" type="button" data-c-package-pending>Pending Mint Packages</button><button class="onehome-journey-button" type="button" data-c-updates>NFT Updates</button><button class="onehome-journey-button" type="button" data-c-projects>Creator Projects</button><button class="onehome-journey-button" type="button" data-c-community>Post Community Update</button></div></section><div class="oh-passport-creator-sections"><section class="oh-passport-creator-section" data-creator-section="creations"><button class="oh-creator-list-toggle" type="button" aria-expanded="false"><span>My Creations</span><span class="oh-creator-chevron">⌄</span></button><div id="ohPassportCreatorCollections" class="oh-passport-creator-list"></div></section><section class="oh-passport-creator-section" data-creator-section="mints"><button class="oh-creator-list-toggle" type="button" aria-expanded="false"><span>My Mints</span><span class="oh-creator-chevron">⌄</span></button><div id="ohPassportCreatorMints" class="oh-passport-creator-list"></div></section></div></div>';p.querySelector('[data-c-redeemables]').onclick=function(){goUrl('/creator-mint-admin.html?view=redeemables')};p.querySelector('[data-c-admin]').onclick=function(){goUrl('/creator-mint-admin.html')};p.querySelector('[data-c-nft]').onclick=function(){window.oneHomeOpenNftCreator()};p.querySelector('[data-c-mint]').onclick=function(){goUrl('/mint-studio.html')};p.querySelector('[data-c-mymints]').onclick=function(){goUrl('/mint-studio.html#my-mints')};p.querySelector('[data-c-allowlists]').onclick=function(){goUrl('/mint-allow-lists.html')};p.querySelector('[data-c-mintlinks]').onclick=function(){goUrl('/mint-links.html')};p.querySelector('[data-c-package-upload]').onclick=function(){goUrl('/mint-package-handoff.html#upload')};p.querySelector('[data-c-package-pending]').onclick=function(){goUrl('/mint-package-handoff.html#pending')};p.querySelector('[data-c-updates]').onclick=function(){goUrl('/nft-updates.html')};p.querySelector('[data-c-projects]').onclick=function(){window.oneHomeOpenCreatorProjects()};p.querySelector('[data-c-community]').onclick=function(){window.OneHomeCommunityEvents&&window.OneHomeCommunityEvents.openComposer('build_update')};return p}
async function loadCreatorPage(){var page=ensurePassportCreatorPage();var collections=q('ohPassportCreatorCollections'),mints=q('ohPassportCreatorMints');if(collections)collections.innerHTML='<div class="oh-passport-creator-empty">Loading…</div>';if(mints)mints.innerHTML='<div class="oh-passport-creator-empty">Loading…</div>';try{var c=client();if(!c)throw new Error('No session');var sr=await c.auth.getSession();var u=sr&&sr.data&&sr.data.session&&sr.data.session.user;if(!u)throw new Error('Sign in');var col=await c.from('nft_collections').select('id,name,status,created_at').eq('owner_user_id',u.id).order('created_at',{ascending:false}).limit(50);if(collections)collections.innerHTML=!col.error?creatorListHtml(col.data||[],'creation'):'<div class="oh-passport-creator-empty">Unable to load creations.</div>';var md=await c.from('mint_drafts').select('id,name,status,campaign_id,updated_at').eq('owner_user_id',u.id).order('updated_at',{ascending:false}).limit(50);if(mints){mints.innerHTML=!md.error?creatorListHtml(md.data||[],'mint'):'<div class="oh-passport-creator-empty">Unable to load mints.</div>';wireCreatorMintShares(mints)}}catch(_e){if(collections)collections.innerHTML='<div class="oh-passport-creator-empty">Sign in to view your creations.</div>';if(mints)mints.innerHTML='<div class="oh-passport-creator-empty">Sign in to view your mints.</div>'}wireCreatorDropdown(page.querySelector('[data-creator-section="creations"]'));wireCreatorDropdown(page.querySelector('[data-creator-section="mints"]'))}
async function patchPassport(){var page=q('onehomePassportJourneyPage'),content=q('oneHomeJourneyContent');if(!page||!content)return;var hero=page.querySelector('.onehome-journey-hero');if(hero)hero.remove();var shell=page.querySelector('.onehome-journey-shell')||page;var nav=q('onehomeV1414PassportIdentityNav');if(!nav){nav=document.createElement('section');nav.id='onehomeV1414PassportIdentityNav';nav.className='onehome-v1414-passport-center';shell.insertBefore(nav,content)}
  nav.innerHTML='<div class="onehome-v1414-passport-actions">'+
    '<button class="onehome-journey-button" type="button" data-oh-public>View My Public Passport</button>'+ 
    '<button class="onehome-journey-button" type="button" data-oh-community>Community Passports</button>'+ 
    '<button class="onehome-journey-button" type="button" data-oh-wallets>Wallets</button>'+ 
    '<button class="onehome-journey-button" type="button" data-oh-nfts>My NFTs</button>'+ 
    '<button class="onehome-journey-button" type="button" data-oh-homeops>Open Home Ops</button>'+ 
    '<button class="onehome-journey-button" type="button" data-oh-creator hidden aria-expanded="false">Creator</button>'+
    '<button class="onehome-journey-button" type="button" data-oh-community-post>Post Community Update</button>'+ 
    '<div class="onehome-homeops-status" data-oh-homeops-status role="status" aria-live="polite" hidden></div></div>';
  nav.querySelector('[data-oh-public]').onclick=function(){openMyPublicPassport()};
  nav.querySelector('[data-oh-community]').onclick=function(){if(typeof window.openDoodProfilesDirectory==='function')window.openDoodProfilesDirectory();else show('profilesPage')};
  nav.querySelector('[data-oh-wallets]').onclick=function(){if(typeof window.oneHomeV1455OpenWallets==='function')window.oneHomeV1455OpenWallets();else show('profilePage')};
  nav.querySelector('[data-oh-nfts]').onclick=function(){if(typeof window.doodV144OpenMintedItems==='function')window.doodV144OpenMintedItems();else show('mintedItemsPage')};
  var homeOps=nav.querySelector('[data-oh-homeops]'),homeOpsStatus=nav.querySelector('[data-oh-homeops-status]');homeOps.onclick=function(){if(window.OneHomeHomeOpsHandoff&&typeof window.OneHomeHomeOpsHandoff.open==='function'){window.OneHomeHomeOpsHandoff.open(homeOps,homeOpsStatus);return}homeOpsStatus.textContent='Home Ops could not be opened. Refresh One Home and try again.';homeOpsStatus.classList.add('is-error');homeOpsStatus.hidden=false};
  nav.querySelector('[data-oh-community-post]').onclick=function(){window.OneHomeCommunityEvents&&window.OneHomeCommunityEvents.openComposer('community_update')};
  var creator=nav.querySelector('[data-oh-creator]');var ok=await creatorEligible();creator.hidden=!ok;creator.removeAttribute('aria-expanded');creator.onclick=function(){ensurePassportCreatorPage();show('onehomePassportCreatorPage');setTimeout(loadCreatorPage,30)};
  var customize=q('oneHomeJourneyCustomizeProfile');if(customize)customize.textContent='Edit My Passport';
}

function patchProfileWizard(){var title=q('oneHomeProfileWizardTitle');if(title)title.textContent='Update My Passport';var save=q('oneHomeProfileWizardSaveBtn');if(save)save.textContent='Save My Passport'}
function patchRareRoutesFuture(){var label=q('rareRoutesFutureSeason1');if(!label)return;var card=label.closest('.rare-routes-future-card');if(!card)return;card.dataset.seasonOneLink='1';card.setAttribute('role','button');card.setAttribute('tabindex','0');card.setAttribute('aria-label','Open Season 1');function open(){show('rareRoutesSystemPage');try{window.oneHomeRareRoutesRefreshHoldings&&window.oneHomeRareRoutesRefreshHoldings()}catch(_e){}}card.onclick=open;card.onkeydown=function(e){if(e.key==='Enter'||e.key===' '){e.preventDefault();open()}}}
function buildMessagesPage(){var p=ensurePage('onehomeMessagesPage');if(q('doodV92MessagePanel'))return p;p.innerHTML='<div class="oh-functional-room"><section id="doodV92MessagePanel" class="dood-v92-message-panel"><h3>Messages</h3><div class="dood-v92-message-tools"><button class="primary" type="button" id="doodV92LoadInboxBtn">Open Inbox</button><button type="button" id="doodV92RefreshInboxBtn">Refresh</button><button type="button" id="doodV92MarkReadBtn">Mark All Read</button><select id="doodV92InboxFilter"><option value="all">All Messages</option><option value="unread">Unread Only</option><option value="read">Read Only</option></select><span id="doodV92InboxStatus"></span></div><div id="doodV92InboxList" class="dood-v92-message-list" style="display:none"></div></section></div>';var load=q('doodV92LoadInboxBtn'),refresh=q('doodV92RefreshInboxBtn'),mark=q('doodV92MarkReadBtn'),filter=q('doodV92InboxFilter');if(load)load.onclick=function(){window.loadDoodInbox&&window.loadDoodInbox(true)};if(refresh)refresh.onclick=function(){window.loadDoodInbox&&window.loadDoodInbox(true)};if(mark)mark.onclick=function(){window.markDoodMessagesRead&&window.markDoodMessagesRead()};if(filter)filter.onchange=function(){window.loadDoodInbox&&window.loadDoodInbox(true)};return p}

window.oneHomeV15Show=show;window.oneHomeV15GoUrl=goUrl;window.oneHomeV15AskEmber=function(){show('onehomeEmberPage')};window.oneHomeV15Soon=soon;
window.oneHomeOpenNftCreator=function(){goUrl('/tools/nft-creator/index.html?v=146741')};
window.oneHomeOpenCreatorProjects=function(){show('projectsPage');setTimeout(function(){try{window.OneHomeCreatorGames&&window.OneHomeCreatorGames.refreshCreatorProjects()}catch(_e){}},30)};
window.oneHomeOpenLegacyTool=function(key){try{if(typeof window.openTool==='function'){window.openTool(key);return}}catch(_e){}soon(key,'This creative tool is being connected.','onehomeOtherCreativeToolsPage')};
window.oneHomeOpen88Squared=function(){try{window.open('https://88squared.pizza/','_blank','noopener');}catch(_e){location.href='https://88squared.pizza/';}};
window.oneHomeOpenDoodSmooth=function(){window.open('https://doodsmooth.com/','_blank','noopener');};
window.oneHomeOpenPodcastStudio=function(){try{if(typeof window.openPodcastStudio==='function'){window.openPodcastStudio();return}}catch(_e){}soon('Podcast Studio','Podcast Studio is being connected.','onehomeRareInkPage')};
window.oneHomeOpenMessages=function(){buildMessagesPage();show('onehomeMessagesPage');setTimeout(function(){try{window.loadDoodInbox&&window.loadDoodInbox(true)}catch(_e){}},120)};
window.oneHomeOpenSocialInbox=function(){show('socialInboxPage');setTimeout(function(){try{window.doodV128OpenSocialInbox&&window.doodV128OpenSocialInbox()}catch(_e){}},30)};
window.oneHomeOpenNotifications=function(){show('notificationsPage');setTimeout(function(){try{window.OneHomeCommunityEvents&&window.OneHomeCommunityEvents.load()}catch(_e){}},30)};
window.oneHomeOpenFounderDashboard=function(){if(q('onehomeMyHomePage'))show('onehomeMyHomePage');else soon('Founder Dashboard','The Founder dashboard is being organized here.','onehomeFounderPage')};

function resync(){normalizeMainEntry();patchProfileWizard();patchRareRoutesFuture();if(q('onehomePassportJourneyPage')&&q('onehomePassportJourneyPage').classList.contains('active'))patchPassport()}
function restoreReturnTarget(){try{if(window.OneHomeNavigation&&window.OneHomeNavigation.pendingReturn&&window.OneHomeNavigation.pendingReturn())return !!window.OneHomeNavigation.restorePendingReturn()}catch(_e){}return false}
function finishReturn(){try{window.OneHomeNavigation&&window.OneHomeNavigation.finalizePendingReturn&&window.OneHomeNavigation.finalizePendingReturn()}catch(_e){}}
function init(){renderFeaturePages();renderDirectories();normalizeMainEntry();patchProfileWizard();patchRareRoutesFuture();ensurePassportCreatorPage();patchPassport();var restored=restoreReturnTarget();if(restored){requestAnimationFrame(function(){requestAnimationFrame(finishReturn)})}else{setTimeout(function(){if(restoreReturnTarget())requestAnimationFrame(finishReturn);else finishReturn()},80)}}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
window.addEventListener('onehome:page-activated',function(e){var id=e&&e.detail&&e.detail.pageId||'';if(id==='onehomePassportJourneyPage')patchPassport();if(id==='onehomePassportCreatorPage')loadCreatorPage();if(id==='rareRoutesFuturePage')patchRareRoutesFuture();normalizeMainEntry();patchProfileWizard()});
function refreshCreatorAccess(){var page=q('onehomePassportJourneyPage');if(page&&page.classList.contains('active'))patchPassport()}
window.addEventListener('dood_identity_profile_me',function(){refreshCreatorAccess()});
window.addEventListener('onehome:profile-saved',function(){setTimeout(refreshCreatorAccess,50);setTimeout(refreshCreatorAccess,500)});
})();
