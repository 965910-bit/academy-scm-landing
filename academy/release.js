'use strict';
/* Refresh public application files without deleting profiles, records or attachments. */
(()=>{
 const version='document-folders-20261119-25';
 window.SCMRelease=version;
 const status=text=>{const node=document.querySelector('#build-status');if(node)node.textContent=' · '+text;};
 window.addEventListener('error',event=>{if(event.target?.tagName==='SCRIPT')status('Не загружен модуль: '+event.target.getAttribute('src')+'. Нажмите «Обновить файлы».');},true);
 document.addEventListener('DOMContentLoaded',()=>{
  const current=new URL(location.href);if(current.searchParams.get('build')===version){current.searchParams.delete('build');current.searchParams.delete('refresh');history.replaceState(null,'',current.href);}
  document.querySelector('#refresh-build')?.addEventListener('click',async event=>{
   event.target.disabled=true;status('Проверяем обновление…');
   try{
    if('serviceWorker' in navigator){const reg=await navigator.serviceWorker.getRegistration('./');if(reg)await reg.update();}
    const url=new URL(location.href);url.searchParams.set('build',version);url.searchParams.set('refresh',String(Date.now()));location.replace(url.href);
   }catch(error){event.target.disabled=false;status('Обновление не выполнено: '+error.message);}
  });
  const required=['SCMIdentity','SCMAssembly','SCMWorkflowEngine','SCMWorkflows'];
  const missing=required.filter(name=>!window[name]);if(missing.length)status('Модули не загрузились: '+missing.join(', ')+'. Нажмите «Обновить файлы».');
  if('serviceWorker' in navigator)navigator.serviceWorker.getRegistration('./').then(reg=>reg?.update()).catch(()=>{});
 });
})();
