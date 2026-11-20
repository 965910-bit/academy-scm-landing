/* Optional Chromium integration; no live accounts or production database. */
'use strict';
const {chromium}=require('playwright-core'),assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {createService}=require('../../server/server.cjs');
(async()=>{
 if(!process.env.CHROMIUM_PATH)throw Error('Set CHROMIUM_PATH.');
 const directory=fs.mkdtempSync(path.join(os.tmpdir(),'scm-shared-browser-')),service=createService({directory,secure:false});
 let browser;
 try{
 await new Promise(r=>service.server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+service.server.address().port;
 browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH,headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--disable-gpu']});
 const context=await browser.newContext(),p=await context.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.goto(base+'/academy/');await p.locator('#account-button').click();await p.locator('#login-form [name=name]').fill('Герасимов Дмитрий Сергеевич');await p.locator('#login-form button[type=submit]').click();await p.locator('#local-account-create').waitFor();
 const roles=['applicant','admissions','learner','teacher','curator','alumni','employer','auditor','superadmin'];
 for(const role of roles){await p.locator('#local-account-create [name=name]').fill('Тестовый Профиль '+role);await p.locator('#local-account-create [name=role]').selectOption(role);await p.locator('#local-account-create button').click();}
 const accounts=await p.evaluate(()=>JSON.parse(localStorage.getItem('scm-academy-local-accounts-v1'))),id=role=>accounts.find(u=>u.role===role).id;
 async function enter(role){if(await p.locator('[data-local-return]').count())await p.locator('[data-local-return]').click();if(!await p.locator('#local-account-create').count())await p.locator('[data-tab=accounts]').click();await p.locator('#local-account-create').waitFor();await p.locator(`[data-local-open="${id(role)}"]`).click();await p.locator('[data-local-return]').waitFor();await p.locator('[data-tab=workflows]').click();await p.locator('#workflow-filter').waitFor();}
 await p.locator('[data-tab=workflows]').click();await p.locator('#workflow-filter').waitFor();await p.locator('#workflow-type').locator('..').locator('summary').click();
 await p.locator('#workflow-type [name=type]').selectOption('application');await p.locator('#workflow-type button').click();await p.locator('#workflow-type').locator('..').locator('summary').click();
 await p.locator('#workflow-create [name=title]').fill('Сквозная заявка');await p.locator('#workflow-create [name=ownerId]').selectOption(id('applicant'));await p.locator('#workflow-create [name=assigneeId]').selectOption(id('admissions'));await p.locator('#workflow-create button').click();await p.locator('.workflow-record').waitFor();
 await enter('applicant');await p.locator('.workflow-command [name=body]').fill('Прошу рассмотреть');await p.locator('.workflow-command [name=action]').selectOption('submitted');await p.locator('.workflow-command button').click();await p.getByText('Приём: заявки · Подана',{exact:true}).waitFor();
 await enter('admissions');for(const to of ['reviewed','enrolled']){await p.locator('.workflow-command [name=body]').first().fill('Решение комиссии');await p.locator('.workflow-command [name=action]').first().selectOption(to);await p.locator('.workflow-command button').first().click();await p.getByText('Приём: заявки · '+(to==='reviewed'?'Проверена':'Зачислен'),{exact:true}).waitFor();}
 await enter('applicant');assert.equal(await p.locator('.workflow-record').count(),2);
 for(const role of roles){await enter(role);for(const width of [320,390,768,1440]){await p.setViewportSize({width,height:900});assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'overflow '+role+' '+width);}if(role==='auditor'){assert.equal(await p.locator('#workflow-create').count(),0);assert.equal(await p.locator('.workflow-command').count(),0);}}
 assert.deepEqual(errors,[]);console.log('PASS: owner passwordless login, nine profiles, shared admissions/enrollment lifecycle, ten role contexts, read-only auditor, widths 320/390/768/1440.');
 }finally{await browser?.close();await new Promise(r=>service.server.close(r));service.db.close();fs.rmSync(directory,{recursive:true,force:true});}
})().catch(err=>{console.error(err);process.exitCode=1;});
