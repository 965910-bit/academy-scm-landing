"""Download public reference documents; never substitute them for Academy records."""
import concurrent.futures, hashlib, json, pathlib, re, urllib.request
ROOT = pathlib.Path(__file__).resolve().parents[1]
OUT = ROOT / 'academy/documents/sources'
DATE = '2026-11-19'
# id, canonical folder, title, publisher, URL, kind
ITEMS = [
 ('dpo-266','01/ministry','Приказ № 266 от 24.03.2025 — порядок ДПО','Российская газета','https://cdnstatic.rg.ru/uploads/attachments/2025/04/24/81928_c82.pdf','normative'),
 ('spo-906','01/ministry','Приказ № 906 от 14.10.2022 — заполнение и выдача дипломов СПО','Российская газета','https://cdnstatic.rg.ru/uploads/attachments/2022/11/28/71119_137.pdf','normative'),
 ('vo-645','03/diplomas','Приказ № 645 от 22.07.2021 — образцы дипломов ВО','УралГУФК (копия нормативного акта)','https://uralgufk.ru/sites/default/files/no_645_ot_22.07.21.pdf','normative'),
 ('education-273','01/federal-laws','273-ФЗ «Об образовании» — редакция от 23.05.2025 (историческая копия)','МЧС России','https://mchs.gov.ru/uploads/document/2025-06-09/3d787dc89e68d89fd30ef0dca9435f79.pdf','historical'),
]
COLLEGE='ГБПОУ КО «Губернаторский аграрный колледж»'
for id,folder,title,url in [
 ('local-procedure','01/local-acts','Порядок разработки локальных актов','2017/poloj-akt.pdf'),
 ('pedagogical-council','01/local-acts','Положение о педагогическом совете','2023/polojPedsovet.pdf'),
 ('departments','01/local-acts','Положение о структурном подразделении','2023/polojStruktPodraz.pdf'),
 ('academic-department','01/local-acts','Положение об учебной части','2023/polojUch.pdf'),
 ('disputes','01/local-acts','Порядок урегулирования споров','2023/PoryadokSpor.pdf'),
 ('personal-data','01/local-acts','Положение о персональных данных','2019/poloj-pd.pdf'),
 ('paid-services','02/contracts','Положение о платных образовательных услугах','2022/PolojPlata.pdf'),
 ('transfer-expulsion','04/orders','Порядок перевода, отчисления и восстановления','2022/poloj-otchislen.pdf'),
 ('practical-training','04/methods','Положение о практической подготовке','2023/polojPraktObuch.pdf'),
 ('admission-rules','02/rules','Правила приёма (копия 2024 года)','2024/pravila.pdf'),
 ('additional-admission','02/rules','Правила приёма по дополнительным образовательным программам','2023/PravilaDopObr.pdf'),
 ('education-relations','01/local-acts','Порядок оформления образовательных отношений','2019/poloj-otnoshen.pdf'),
 ('additional-programs','04/programs','Проектирование и утверждение дополнительных общеобразовательных программ','2023/polojDopProgram.pdf'),
 ('dpo-delivery','04/programs','Положение о профессиональном обучении и ДПО','2022/poloj-po-dpo.pdf'),
 ('po-dpo-admission','02/rules','Правила приёма на профессиональное обучение и ДПО','2016/zentr1/pravila.pdf'),
 ('assessment','03/gia','Положение о промежуточной и итоговой аттестации','2019/poloj-attest-uz.pdf'),
 ('exam-commission','03/commissions','Положение об экзаменационной комиссии','2019/poloj-ekzam-uz.pdf'),
 ('admission-commission','02/commission','Положение о приёмной комиссии','2022/polojPriem.pdf'),
]:
 ITEMS.append((id,folder,title,COLLEGE,'https://detak.ru/images/'+url,'example'))
GOV = [('licensing-1490','Лицензирование образовательной деятельности — постановление № 1490','https://government.ru/docs/all/130013/'),('paid-1441','Правила платных образовательных услуг — постановление № 1441','https://government.ru/docs/all/129897/'),('frdo-825','ФИС ФРДО — постановление № 825','https://government.ru/docs/all/134483/'),('distance-1678','Электронное обучение и ДОТ — постановление № 1678','https://government.ru/docs/all/149993/')]
for id,folder,title,n in [
 ('mond-issue','03/issued-register','Инструкция о заполнении и выдаче документов',108),
 ('mond-process','04/programs','Положение об организации учебного процесса',110),
 ('mond-final','03/gia','Положение об итоговой аттестации',112),
 ('mond-rules','01/local-acts','Правила внутреннего распорядка',113),
 ('mond-safety','01/local-acts','Инструкция по охране труда',109),
 ('mond-dpo','01/local-acts','Положение об отделе ДПО',111),
 ('mond-admission','02/rules','Правила приёма',114),
]: ITEMS.append((id,folder,title,'ГОБУЗ «Мурманский областной наркологический диспансер» (публичный пример 2020 года)','https://mond51.ru/index.php?do=download&id='+str(n),'example'))
RG=[('school-545','Образцы аттестатов — приказ № 545','https://rg.ru/documents/2020/12/29/minpros-prikaz545-site-dok.html'),('school-546','Выдача аттестатов — приказ № 546','https://rg.ru/2020/12/25/minpros-prikaz546-site-dok.html'),('spo-390','Образцы дипломов СПО — приказ № 390','https://rg.ru/documents/2022/08/15/minpros-prikaz390-site-dok.html')]
ITEMS += [
 ('licensing-copy','01/government','Постановление № 1490 — копия без изменений 2026 года','МБМ (справочная копия)','https://dp.mbm.ru/upload/iblock/732/%D0%9F%D0%9F%20%D0%A0%D0%A4%20%E2%84%961490%20%D0%BE%D1%82%2018.09.2020.pdf','historical'),
 ('paid-copy','01/government','Постановление № 1441 — исходная редакция, без продления 2026 года','САО РАН (справочная копия)','https://www.sao.ru/educat/Docs/Postanovlenie_Prav_1441.pdf','historical'),
 ('frdo-copy','01/government','Постановление № 825 — ФИС ФРДО, справочная копия','Хакасский институт развития образования','https://ipk19.ru/upload/iblock/e47/0byjmrm8o0qic9u69b7wngi9uf73nu0b/Postanovlenie-Pravitelstva-RF-_-825-ot-31.05.2021-O-federalnoi_-informatsionnoi_-sisteme-Federalnyi_-reestr-svedenii_-o-dokumentakh-ob-ob.pdf','normative'),
 ('distance-copy','01/government','Постановление № 1678 — электронное обучение и ДОТ, справочная копия','РГУП','https://spec.rgup.ru/img/2026/docs/PRZ_1678.pdf','normative'),
 ('personal-data-152','01/federal-laws','152-ФЗ «О персональных данных» — справочная копия, проверить редакцию','МЦКО (справочная копия)','https://rcoi.mcko.ru/resources/upload/RichFilemanager/documents/new/152_fz.pdf','normative'),
]
ITEMS += [
 ('education-273-copy','01/federal-laws','273-ФЗ — редакция от 28.02.2025 (историческая копия)','Минздрав России','https://edu.rosminzdrav.ru/fileadmin/user_upload/documents/zakoni/Federalnyi_zakon_ot_29_12_2012_N_273_FZ_red_ot_28_02_2025.pdf','historical'),
 ('privacy-152-copy','01/federal-laws','152-ФЗ «О персональных данных» — справочная копия, проверить редакцию','ДЦ № 2 Департамента здравоохранения Москвы','https://dc2.mos.ru/doc/152.pdf','normative'),
 ('paid-1441-copy','01/government','Постановление № 1441 — исходная редакция без продления 2026 года','Образовательная организация (справочная копия)','https://xn--164--43dw7bi0a0gn.com/images/obshie_dokumenti/platnie_uslugi/decree1441.pdf','historical'),
 ('vo-670','01/ministry','Приказ № 670 от 27.07.2021 — заполнение и выдача дипломов ВО','Портал ФГОС ВО','https://fgosvo.ru/uploadfiles/npo/Pr_MON_670_27072021.pdf','normative'),
]
def read(url):
 import subprocess
 result=subprocess.run(['curl','--fail','--location','--max-time','25','--connect-timeout','8','--silent','--show-error','--max-filesize','31457280','--user-agent','Mozilla/5.0',url],capture_output=True,timeout=30)
 if result.returncode: raise ValueError(result.stderr.decode(errors='replace')[-300:])
 return result.stdout,url
def collect(item):
 id,folder,title,publisher,url,kind=item
 try:
  print("Downloading "+id,flush=True)
  data,final=read(url)
  if not data.lstrip().startswith(b'%PDF-'): raise ValueError('Response is not PDF')
  dest=OUT/folder/(id+'.pdf');dest.parent.mkdir(parents=True,exist_ok=True);dest.write_bytes(data)
  return dict(id=id,folder=folder,title=title,publisher=publisher,source=url,resolvedSource=final,kind=kind,path=str(dest.relative_to(ROOT/'academy')),downloadedAt=DATE,bytes=len(data),sha256=hashlib.sha256(data).hexdigest(),verification='Формат PDF и SHA-256 проверены. Полнота и актуальная редакция юридически не удостоверены. Перед применением сверить первоисточник.'),None
 except Exception as e: return None,dict(id=id,source=url,error=str(e))
def main():
 OUT.mkdir(parents=True,exist_ok=True)
 errors=[]
 for id,title,url in GOV:
  try:
   html,_=read(url); html=html.decode('utf-8')
   links=re.findall(r'href=[\"\']([^\"\']+\.pdf(?:\?[^\"\']*)?)[\"\']',html,re.I)
   if not links: raise ValueError('PDF link not found')
   from urllib.parse import urljoin
   ITEMS.append((id,'01/government',title,'Правительство России (исходная публикация, не консолидированная редакция)',urljoin(url,links[0]),'normative'))
  except Exception as e: errors.append(dict(id=id,source=url,error=str(e)))
 for id,title,url in RG:
  try:
   html,_=read(url)
   links=re.findall(r'https://cdnstatic\.rg\.ru/[^\s\"<>]+\.pdf',html.decode('utf-8'))
   if not links: raise ValueError('PDF link not found')
   ITEMS.append((id,'01/ministry',title,'Российская газета (исходная публикация)',links[0],'normative'))
  except Exception as e: errors.append(dict(id=id,source=url,error=str(e)))
 with concurrent.futures.ThreadPoolExecutor(max_workers=6) as pool: results=list(pool.map(collect,ITEMS))
 records=[]
 for record,error in results:
  if record: records.append(record)
  else: errors.append(error)
 old_path=OUT/'manifest.json'
 if old_path.exists():
  old=json.loads(old_path.read_text())['records']
  existing={r['id'] for r in records}
  records += [r for r in old if r['id'] not in existing and (ROOT/'academy'/r['path']).exists()]
 manifest=dict(asOf=DATE,notice='Оригинальные общедоступные PDF. Чужие локальные акты — только примеры, не акты Академии. Исходная публикация закона не гарантирует действующую редакцию.',records=records,failures=errors)
 (OUT/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
 (OUT/'catalog.js').write_text('window.SCMDocumentSources = '+json.dumps(records,ensure_ascii=False,indent=2)+';\n')
 print(f'Downloaded {len(records)} PDFs; failures {len(errors)}')
 print(json.dumps(errors,ensure_ascii=False,indent=2))
 if not records: raise SystemExit('No PDFs downloaded')
if __name__=='__main__': main()
