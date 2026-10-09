"""Extract attributed review blocks from saved readable public web documents.
No network calls. Owner responses, photo captions and sub-ratings are excluded.
"""
import json,re,hashlib,datetime,argparse
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
def parse(document,strict=False):
 document=re.sub(r'(?<!\n)(?=L\d+:)', '\n', document)
 lines=[re.sub(r'^L\d+:\s*','',l) for l in document.splitlines() if re.match(r'^L\d+:',l)]
 rows=[]
 for i,l in enumerate(lines):
  m=re.fullmatch(r'([1-5](?:\.0)?) of 5 bubbles',l.strip())
  heading=l.strip()=='###'
  if not m and not heading:continue
  prior=[x.strip() for x in lines[max(0,i-9):i] if x.strip() and 'Image' not in x]
  if not prior:continue
  if strict and not any(re.search(r'contributions|篇投稿',x,re.I) for x in prior):continue
  authors=[x for x in prior if 'cite' in x]
  if not authors:continue
  author=authors[-1];author=re.search(r'†([^†]+)',author)
  if not author:continue
  author=author[1].strip()
  if author.startswith('Written') or author.lower() in ['read more','show original','transparency report','write a review']:continue
  j=i+1
  while j<len(lines) and (not lines[j].strip() or lines[j].strip()=='###'):j+=1
  if j>=len(lines) or 'cite' not in lines[j]:continue
  title=re.search(r'†([^†]+)',lines[j])
  if not title or re.search(r'^\(?\d+ reviews\)?$',title[1]):continue
  j+=1;body=[];date=''
  for x in lines[j:]:
   if x.strip()=='###':break
   if body and 'cite' in x and 'Image' not in x:break
   if x.startswith('Written '):date=x[8:];break
   if 'This review is the subjective' in x:break
   if x.strip() and not any(y in x for y in ['cite','Read more','Show original','Machine Translated','Review collected','This business uses','of 5 bubbles']) and x.strip() not in ['Value','Service','Food','Atmosphere']:
    # Month-of-visit is metadata, not part of the review body.
    if re.match(r'^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]* \d{4}(?:\s*•.*)?$',x):continue
    body.append(x)
  if not body:continue
  for fmt in ['%B %d, %Y','%d %B %Y']:
   try:date=datetime.datetime.strptime(date,fmt).date().isoformat();break
   except ValueError:pass
  if date and not re.fullmatch(r'\d{4}-\d{2}-\d{2}',date):continue
  if any(r['author']==author and r['date']==date and r['content']=='\n'.join(body) for r in rows):continue
  rows.append(dict(author=author,date=date,score=float(m[1]) if m else None,title=title[1].strip(),content='\n'.join(body)))
 return rows
if __name__=='__main__':
 ap=argparse.ArgumentParser();ap.add_argument('--research-dir',default='v6');ap.add_argument('--strict',action='store_true');ap.add_argument('--output',default='reviews-web-bulk.json');args=ap.parse_args()
 research=ROOT/'research'/args.research_dir
 targets=json.loads((research/'web-targets.json').read_text());out=[]
 for t in targets:
  file=research/'.raw-cache'/('web-'+t['id']+'.txt')
  if not file.exists():continue
  doc=file.read_text();comments=parse(doc,strict=args.strict)
  verified=bool(re.search(r'-d'+t['id'].split('-')[-1]+r'-Reviews',doc))
  for c in comments:
   c.update(id='ta-web-'+hashlib.sha256((t['source']+c['author']+(c['date'] or c['content'])).encode()).hexdigest()[:16],idKind='source_author_written_date',source=t['source'],platform='Tripadvisor',fingerprint=hashlib.sha256(re.sub(r'[^\w]','',c['content'].casefold()).encode()).hexdigest())
  age=re.search(r'Crawled:\s*([^;]+)',doc)
  address=re.search(r'†([^†\n]+)†maps.google.com',doc)
  out.append(dict(**t,status='readable_public_document' if verified else 'unverified_document',comments=comments[:10] if verified else [],retrieval='Readable web source; cached snapshot, not live browser pagination',visibleReviewBlocks=len(comments),cacheAgeLabel=age[1] if age else None,sourceAddress=address[1] if address else None))
 (research/'.raw-cache'/args.output).write_text(json.dumps(out,ensure_ascii=False,indent=2)+'\n')
 print(json.dumps([dict(id=r['id'],n=len(r['comments']),cacheAgeLabel=r['cacheAgeLabel']) for r in out],ensure_ascii=False))
