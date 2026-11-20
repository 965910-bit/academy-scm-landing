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
def read(url):
 req=urllib.request.Request(url,headers={'User-Agent':'Mozilla/5.0 (public education reference collection)'})
 with urllib.request.urlopen(req,timeout=80) as r:
  data=r.read(30*1024*1024+1)
  if len(data)>30*1024*1024: raise ValueError('File exceeds 30 MB')
  return data,r.geturl()
def collect(item):
 id,folder,title,publisher,url,kind=item
 try:
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
 with concurrent.futures.ThreadPoolExecutor(max_workers=6) as pool: results=list(pool.map(collect,ITEMS))
 records=[]
 for record,error in results:
  if record: records.append(record)
  else: errors.append(error)
 manifest=dict(asOf=DATE,notice='Оригинальные общедоступные PDF. Чужие локальные акты — только примеры, не акты Академии. Исходная публикация закона не гарантирует действующую редакцию.',records=records,failures=errors)
 (OUT/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
 (OUT/'catalog.js').write_text('window.SCMDocumentSources = '+json.dumps(records,ensure_ascii=False,indent=2)+';\n')
 print(f'Downloaded {len(records)} PDFs; failures {len(errors)}')
 print(json.dumps(errors,ensure_ascii=False,indent=2))
 if not records: raise SystemExit('No PDFs downloaded')
if __name__=='__main__': main()
