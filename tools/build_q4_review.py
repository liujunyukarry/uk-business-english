#!/usr/bin/env python3
"""Build Q4 lesson candidate pages on a REVIEW branch. Never auto-publish to main."""
from __future__ import annotations
import html, json, re, shutil, subprocess
from datetime import date, timedelta
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
DRAFTS=[
"planning/extension-2026-days70-89-draft.json",
"planning/extension-2026-days90-109-draft.json",
"planning/extension-2026-days110-129-draft.json",
]
def ipa_of(sentence):
    exe=shutil.which("espeak-ng") or shutil.which("espeak")
    if not exe: raise RuntimeError("espeak-ng/espeak unavailable; stop rather than omit IPA")
    result=subprocess.run([exe,"-v","en-uk-rp","--ipa=3","-q",sentence],capture_output=True,text=True,check=True).stdout
    # Convert the raw eSpeak pronunciation alphabet to broad English-learning notation.
    # Draft must still receive a separate human phonetic review before merging to main.
    result=" ".join(result.split())
    result=re.sub(r"[\u200b-\u200f\ufeff]","",result)
    for old,new in [("ɹ","r"),("ɐ","ə"),("ɛ","e"),("ɚ","ə"),("ɝ","ɜː")]:
        result=result.replace(old,new)
    # eSpeak writes lexical stress on some one-syllable words. That is not
    # appropriate for the phonemic word transcriptions used by the site.
    vowels="aeiouɪʊəæɑɒɔɜʌøœɨʉy"
    def fix_word(token):
        if len(re.findall("["+vowels+"]+",token))<=1:
            token=token.replace("ˈ","").replace("ˌ","")
        else:
            # If first syllable carries primary stress, move the stress
            # marker to the onset of the word.
            m=re.match(r"^([^"+vowels+r"ˈˌ]*?)ˈ",token)
            if m: token="ˈ"+m.group(1)+token[m.end():]
        return token
    result=" ".join(fix_word(tok) for tok in result.split())
    if not result or re.search(r"[ɹɐ\u200b-\u200f\ufffd]|\bnull\b",result):
        raise AssertionError("Bad phoneme string for: "+sentence+" = "+result)
    return "/"+result+"/"

def escape(v): return html.escape(str(v), quote=True)
def css_and_script():
    prev=(ROOT/"day69.html").read_text(encoding="utf-8")
    css=re.search(r"<style>([\s\S]*?)</style>",prev).group(1)
    script=re.search(r"<script>([\s\S]*?)</script>",prev).group(1)
    return css,script
def item(i,en,ipa,zh,note):
    star='<span class="badge">★ 高频重点</span>' if i in (1,3,5) else ""
    return f'<div class="item"><div class="n">{i}</div><div class="txt">{star}<p class="en" lang="en-GB">{escape(en)}</p><p class="ipa">{escape(ipa)}</p><p class="zh">{escape(zh)}</p><div class="usage">{escape(note)}</div><button data-say="{escape(en)}">🔊 播放</button></div></div>'
def turn(role,en,ipa,zh):
    return f'<div class="turn"><b>{escape(role)}</b><p class="en" lang="en-GB">{escape(en)}</p><p class="ipa">{escape(ipa)}</p><p class="zh">{escape(zh)}</p><button data-say="{escape(en)}">🔊 播放</button></div>'
def make_page(day,entries,css,script):
    number=day["day"]
    body='<h3 style="margin:16px 0 3px;color:var(--brand)">重点掌握 · 6 句</h3>'
    for i,e in enumerate(entries[:6],1): body+=item(i,*e)
    body+='<h3 style="margin:16px 0 3px;color:var(--brand)">自然表达 / 听懂也很有用 · 4 句</h3>'
    for i,e in enumerate(entries[6:],7): body+=item(i,*e)
    dialogues=""
    for j in range(3):
        a,b=entries[j*2],entries[j*2+1]
        dialogues+=f'<div class="dialogue"><h3>对话 {j+1}｜场景接话 {j+1}</h3>'+turn("A",a[0],a[1],a[2])+turn("B",b[0],b[1],b[2])+'</div>'
    nav='<a href="day%02d.html">← 前一天</a><a href="index.html">课程目录</a>'%(number-1)
    nav+=('<a href="day%02d.html">后一天 →</a>'%(number+1)) if number<129 else "<span>当前最后一课 · Day129</span>"
    out=f'''<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><meta name="color-scheme" content="light dark"><title>Day {number}｜{escape(day["title"])}</title><style>{css}</style></head><body><main><nav><a href="index.html">← 全部课程</a><span>{escape(day["category"])} · UK English</span></nav><header><p>{day["date"]} · DAY {number}</p><h1>{escape(day["title"])}</h1><p lang="en-GB">{escape(day["english"])}</p><p>真实英国出差生活和工作中的自然口语，十分钟掌握重点表达。</p><div class="chips"><span>10句实用口语</span><span>BrE IPA（待逐句复核）</span><span>逐句解释</span></div></header><section class="card"><h2>今天的10句</h2><p class="note">前6句重点掌握，后4句自然表达/听懂也很有用。★ 是今天最值得优先记的3句。</p>{body}</section><section class="card"><h2>3组真实迷你对话</h2>{dialogues}</section><footer><div class="foot">{nav}</div><p>{day["date"]} · Day {number}</p></footer></main><script>{script}</script></body></html>'''
    qa={
        "item":out.count('class="item"'),
        "star":out.count("★ 高频重点"),
        "dialogue":out.count('class="dialogue"'),
        "turn":out.count('class="turn"'),
        "ipa":out.count('class="ipa"'),
        "tts":out.count('data-say='),
        "zh":out.count('class="zh"'),
    }
    if qa!={"item":10,"star":3,"dialogue":3,"turn":6,"ipa":16,"tts":16,"zh":16}:
        raise AssertionError("Page QA failure "+str(number)+":"+repr(qa))
    for bad in ("ɹ","ɐ","\u200b","\u200c","\u200d","localStorage"):
        if bad in out: raise AssertionError("Invalid page character/token "+bad)
    if "<a href=\"day%02d.html\""%(number-1) not in out: raise AssertionError("missing previous navigation")
    return out,qa

def main():
    # Fails closed: source pages in main must remain unchanged on any error.
    plan_path=ROOT/"course-plan.json"
    plan=json.loads(plan_path.read_text(encoding="utf-8"))
    if len(plan["lessons"])==129 and plan["lessons"][68]["day"]==69 and plan["lessons"][-1]["day"]==129:
        # Idempotent re-build on review branch after transcription improvements.
        plan["lessons"]=plan["lessons"][:69]
    assert len(plan["lessons"])==69 and plan["lessons"][-1]["day"]==69 and plan["lessons"][-1]["date"]=="2026-11-01","Unexpected existing lesson inventory"
    lessons=[]
    for p in DRAFTS:
        payload=json.loads((ROOT/p).read_text(encoding="utf-8"))
        if payload.get("status")!="draft, not approved for publication":raise AssertionError("wrong draft status")
        lessons.extend(payload["lessons"])
    if len(lessons)!=60: raise AssertionError("Need exactly 60 new Day pages")
    base=date(2026,8,25)
    all_phrases=set()
    seen_titles=set()
    for i,day in enumerate(lessons):
        number=70+i
        if day["day"]!=number or day["date"]!=(base+timedelta(days=number-1)).isoformat():
            raise AssertionError("Day/date discontinuity: "+repr(day))
        if day["category"]!=("工作" if number%2==0 else "日常"):
            raise AssertionError("Category mix mismatch "+str(number))
        if day["title"] in seen_titles: raise AssertionError("Repeated scene title")
        seen_titles.add(day["title"])
        if len(day["lines"])!=10: raise AssertionError("Expected 10 lines "+str(number))
        for en,zh,note in day["lines"]:
            if not all((en.strip(),zh.strip(),note.strip())):raise AssertionError("Empty line")
            if not 4<=len(en.split())<=25:raise AssertionError("Suspicious sentence length "+en)
            norm=re.sub(r"[^a-z0-9 ]","",en.lower()).strip()
            if norm in all_phrases:raise AssertionError("Repeated sentence "+en)
            all_phrases.add(norm)
            if len(note.strip())<8:raise AssertionError("Explanatory note too short: "+repr(note))
    css,script=css_and_script()
    compiled={}
    report=[]
    for d in lessons:
        entries=[]
        for en,zh,note in d["lines"]:
            entries.append((en,ipa_of(en),zh,note))
        candidate,qa=make_page(d,entries,css,script)
        compiled[f"day{d['day']:02d}.html"]=candidate
        report.append({"day":d["day"],"date":d["date"],"title":d["title"],"checks":qa,
            "sample_ipa":[[entries[0][0],entries[0][1]],[entries[2][0],entries[2][1]]],
            "needs_editorial_ipa_review":True})
        plan["lessons"].append({k:d[k] for k in ["day","date","category","title","english"]}|{"path":f"day{d['day']:02d}.html"})
    assert len(plan["lessons"])==129
    plan["version"]="ukbe-q4-review-only-20261016"
    plan["updated"]="2026-10-16"
    # Commit the review-branch output atomically only after *all* pages pass checks.
    for name,content in compiled.items():(ROOT/name).write_text(content,encoding="utf-8")
    plan_path.write_text(json.dumps(plan,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
    (ROOT/"planning/extension-2026-qa-review.json").write_text(json.dumps({
       "status":"AUTOMATED CHECKS PASSED — MANUAL IPA AND SEMANTIC REVIEW REQUIRED BEFORE PUBLISHING",
       "pages":len(compiled),"main_sentences":len(all_phrases),"daily":30,"work":30,
       "first_date":"2026-11-02","last_date":"2026-12-31","per_page":report
    },ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
    print("Generated candidates",len(compiled),"unique phrases",len(all_phrases),"QA report saved")
if __name__=="__main__":main()
