"""Read answer key where the answer option is typed in red (KUB 42-43). Usage: python3 auditor/tools/parse_key_red.py <set_id>  · notes may attach to the wrong question (text boxes) — check by eye."""
import pymupdf,re,json,sys
sid=sys.argv[1]
d=pymupdf.open(f'/home/user/medlibeta/auditor/source/{sid}__key.pdf')
QS=re.compile(r"^\s*(\d{1,3})\s*[.)]\s"); OP=re.compile(r"^\s*([a-eA-E])\s*[.)]\s*(.*)")
key={}; cur=None
for pi,pg in enumerate(d):
  for b in pg.get_text('dict')['blocks']:
    for l in b.get('lines',[]):
      txt=''.join(s['text'] for s in l['spans']).strip()
      if not txt: continue
      red=sum(len(s['text'].strip()) for s in l['spans'] if s['color']==0xff0000)
      tot=sum(len(s['text'].strip()) for s in l['spans'])
      m=QS.match(txt)
      if m and red<tot/2:
        cur=m.group(1); key.setdefault(cur,{"answers":[],"note":"","page":pi+1}); continue
      if cur is None: continue
      o=OP.match(txt)
      if o and red>=tot*0.6 and red>0:
        L=o.group(1).upper()
        if L not in key[cur]['answers']: key[cur]['answers'].append(L)
      elif red>0 and not o:
        key[cur]['note']=(key[cur]['note']+' '+''.join(s['text'] for s in l['spans'] if s['color']==0xff0000)).strip()
json.dump(key,open(f'/home/user/medlibeta/auditor/data/work/{sid}.key.json','w'),ensure_ascii=False,indent=1)
print(len(key), ' '.join(f"{n}:{''.join(v['answers']) or '-'}" for n,v in key.items()))
for n,v in key.items():
  if v['note']: print(n,'NOTE',v['note'][:150])
