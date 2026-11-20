'use strict';
/* Old/bookmarked public URLs enter the same shell; static content remains for no-JS readers. */
(()=>{const base=new URL('./',document.currentScript.src),path=location.pathname.slice(base.pathname.length).replace(/index\.html$/,'');if(location.pathname.startsWith(base.pathname)&&/^(?:guides(?:\/[a-z0-9-]+)?|documents|regulations|classifiers)\/$/.test(path))location.replace(base.pathname+location.search+'#resources/'+path+(location.hash?'~'+location.hash.slice(1):''));})();
