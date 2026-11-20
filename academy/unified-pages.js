'use strict';
/* Public resources mounted in the application's existing workspace, not an iframe. */
window.SCMUnifiedPages = (() => {
 const base=new URL('./',document.currentScript.src);let generation=0;
 const route=()=>{const match=location.hash.match(/^#resources\/(.*)$/);return match?match[1]:null;};
 const valid=path=>/^(?:guides(?:\/[a-z0-9-]+)?|documents|regulations|classifiers)\/$/.test(path);
 const labels={'guides/':'Знания','documents/':'Документы','regulations/':'Нормативная база','classifiers/':'ОКПДТР–2026'};
 function placeholder(){return '<div id="unified-page" class="unified-content" aria-busy="true"><p role="status">Открываем раздел…</p></div>';}
 function go(path,search='',anchor=''){if(!valid(path))return false;history.pushState(null,'',base.pathname+search+'#resources/'+path+(anchor?'~'+anchor:''));window.dispatchEvent(new HashChangeEvent('hashchange'));return true;}
 async function mount(){const host=document.querySelector('#unified-page');if(!host)return;const token=++generation,raw=route()||'', [path,anchor]=raw.split('~');if(!valid(path)){host.textContent='Раздел не найден.';return;}
 try{const url=new URL(path,base),response=await fetch(url);if(!response.ok)throw Error();const html=new DOMParser().parseFromString(await response.text(),'text/html'),source=html.querySelector('main');if(!source)throw Error();if(token!==generation||!host.isConnected)return;
 const scripts=[...source.querySelectorAll('script[src]')].map(s=>new URL(s.getAttribute('src'),url));source.querySelectorAll('script').forEach(s=>s.remove());
 for(const el of source.querySelectorAll('[href],[src]'))for(const attr of ['href','src'])if(el.hasAttribute(attr)){const value=el.getAttribute(attr);if(!value.startsWith('data:'))el.setAttribute(attr,new URL(value,url).href);}
 const nav=document.createElement('nav');nav.className='resource-tabs';nav.setAttribute('aria-label','Разделы базы академии');for(const [href,label]of Object.entries(labels)){const a=document.createElement('a');a.href=new URL(href,base);a.textContent=label;if(path.startsWith(href))a.setAttribute('aria-current','page');nav.append(a);}
 host.replaceChildren(nav,...source.childNodes);host.setAttribute('aria-busy','false');document.title=html.title;if(path==='documents/')window.SCMDocumentDirectory?.mount(host);if(path==='guides/growth/'){const p=new URLSearchParams(location.search);window.dispatchEvent(new CustomEvent('scm-open-task',{detail:{channel:p.get('utm_source')||'library',campaign:p.get('utm_campaign')||''}}));}
 for(const scriptUrl of scripts)if(scriptUrl.origin===base.origin&&/\/(classifier|registry)\.js$/.test(scriptUrl.pathname)){const script=document.createElement('script');script.src=scriptUrl.href;host.append(script);}
 if(anchor){const target=[...host.querySelectorAll('[id]')].find(el=>el.id===anchor);target?.scrollIntoView();}else{host.querySelector('h1')?.setAttribute('tabindex','-1');host.querySelector('h1')?.focus({preventScroll:true});}
 }catch{if(host.isConnected){host.replaceChildren();const p=document.createElement('p');p.textContent='Не удалось открыть раздел. Проверьте соединение или подготовьте офлайн-пакет.';const b=document.createElement('button');b.className='button';b.textContent='Повторить';b.onclick=mount;host.append(p,b);host.setAttribute('aria-busy','false');}}}
 function intercept(event){const a=event.target.closest('a[href]');if(!a||a.hasAttribute('download')||a.target==='_blank'||event.ctrlKey||event.metaKey||event.shiftKey||event.altKey||event.button>0)return;const url=new URL(a.href,location.href);if(url.origin!==base.origin||!url.pathname.startsWith(base.pathname))return;const path=url.pathname.slice(base.pathname.length).replace(/index\.html$/,'');if(!valid(path))return;event.preventDefault();event.stopImmediatePropagation();if(route()?.split('~')[0]===path&&url.hash){const id=decodeURIComponent(url.hash.slice(1));[...document.querySelectorAll('#unified-page [id]')].find(e=>e.id===id)?.scrollIntoView();return;}go(path,url.search,url.hash.slice(1));}
 document.addEventListener('click',intercept,true);
 return {route,placeholder,mount,go};
})();
