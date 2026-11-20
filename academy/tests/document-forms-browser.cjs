'use strict';
const {chromium}=require('playwright-core'),assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {createService}=require('../../server/server.cjs');
(async()=>{
 if(!process.env.CHROMIUM_PATH)throw Error('Set CHROMIUM_PATH.');const directory=fs.mkdtempSync(path.join(os.tmpdir(),'scm-doc-forms-')),service=createService({directory,secure:false});let browser;
 try{
 await new Promise(r=>service.server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+service.server.address().port;
 browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH,headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});const context=await browser.newContext(),p=await context.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.goto(base+'/academy/');await p.locator('#account-button').click();await p.locator('#login-form [name=name]').fill('Герасимов Дмитрий Сергеевич');await p.locator('#login-form button[type=submit]').click();await p.locator('#local-account-create').waitFor();await p.locator('.sidebar [data-tab=documents]').click();await p.locator('[data-document-folder=all]').click();assert.equal(await p.locator('[data-document-draft]').count(),54);
 await p.locator('[data-document-draft=gradebook]').click();await p.locator('#document-editor [name=recipient]').fill('Обучающийся Тестовый');await p.locator('#document-editor [name=organization]').fill('Учебная организация');await p.locator('#document-editor [name=number]').fill('ТЕСТ-ЗК-1');await p.locator('[data-document-table-add=exams]').click();await p.locator('[name=table_exams_0_0]').fill('1');await p.locator('[name=table_exams_0_1]').fill('Управление запасами');await p.locator('[name=table_exams_0_4]').fill('Отлично');await p.locator('#document-editor button[type=submit]').click();
 await p.locator('[data-document-preview]').click();const srcdoc=await p.locator('#document-print-frame').getAttribute('srcdoc');assert.match(srcdoc,/Управление запасами/);
 for(const width of [320,390,768,1440]){await p.setViewportSize({width,height:900});assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'editor overflow '+width);}
 await p.reload();await p.locator('.sidebar [data-tab=documents]').click();await p.locator('[data-document-edit]').click();assert.equal(await p.locator('[name=table_exams_0_4]').inputValue(),'Отлично');
 const preview=await context.newPage();await preview.setContent(srcdoc);const book=await preview.pdf({preferCSSPageSize:true,printBackground:true});assert.ok(book.byteLength>1000);assert.ok((book.toString('latin1').match(/\/Type\s*\/Page\b/g)||[]).length>=6,'cover + five academic sections');
 const ids=await p.evaluate(()=>window.SCMDocumentCatalog.map(t=>t.id));for(const id of ids){await preview.goto(base+'/academy/documents/forms/'+id+'.html');for(const width of [320,1440]){await preview.setViewportSize({width,height:900});assert.ok(await preview.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'print form overflow '+id+' '+width);}const pdf=await preview.pdf({preferCSSPageSize:true});assert.ok(pdf.byteLength>1000,id);}
 assert.deepEqual(errors,[]);console.log('PASS: 54 public layouts + PDF, gradebook table editing/persistence/preview, 6+ print pages, widths 320/390/768/1440.');
 }finally{await browser?.close();await new Promise(r=>service.server.close(r));service.db.close();fs.rmSync(directory,{recursive:true,force:true});}
})().catch(err=>{console.error(err);process.exitCode=1;});
