'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import sections from './questions.json';
import { createRoot } from 'react-dom/client';

type Selected={section:number,question:number};
const total=sections.reduce((n,s)=>n+s.questions.length,0);
function shuffle(count:number,seed:number){const result=Array.from({length:count},(_,i)=>i);let x=seed>>>0;function random(){x+=0x6D2B79F5;let t=x;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return ((t^(t>>>14))>>>0)/4294967296;}for(let i=count-1;i>0;i--){const j=Math.floor(random()*(i+1));[result[i],result[j]]=[result[j],result[i]];}return result;}
export default function Conversation(){
 const [seed,setSeed]=useState<number|null>(null),[completed,setCompleted]=useState<Set<string>>(new Set()),[expanded,setExpanded]=useState<Set<number>>(new Set()),[selected,setSelected]=useState<Selected|null>(null),[error,setError]=useState(''),[auth,setAuth]=useState(false),[loading,setLoading]=useState(true),[pending,setPending]=useState<Set<string>>(new Set());
 const [orders,setOrders]=useState<Record<string,number[]>>({});
 const dialog=useRef<HTMLDialogElement>(null);
 const pendingRef=useRef(new Set<string>());
 const storageKey='tell-me-more-v1';
 const load=useCallback(()=>{
  try {
   const raw=localStorage.getItem(storageKey);
   if(raw){const data=JSON.parse(raw);if(!Number.isInteger(data.seed)||!Array.isArray(data.completed))throw Error();
    setSeed(data.seed);setCompleted(new Set(data.completed.filter((id:unknown)=>typeof id==='string' && /^\d+:\d+$/.test(id))));
    const valid:Record<string,number[]>={};for(const [section,order] of Object.entries(data.orders||{})){const count=sections[Number(section)]?.questions.length;if(Array.isArray(order)&&order.length===count&&new Set(order).size===count&&order.every(q=>Number.isInteger(q)&&q>=0&&q<count))valid[section]=order;}
    setOrders(valid);
   }else setSeed(crypto.getRandomValues(new Uint32Array(1))[0]);
  }catch{setSeed(crypto.getRandomValues(new Uint32Array(1))[0]);setError('Saved progress could not be read. You can keep playing, but this browser may not remember your changes.');}
  finally{setLoading(false);}
 },[]);
 useEffect(()=>{load();},[load]);
 function persist(){try{localStorage.setItem(storageKey,JSON.stringify({seed,completed:[...completed],orders}));setError('');}catch{setError('This browser could not save your progress. Keep this tab open to continue.');}}
 useEffect(()=>{if(!loading&&seed!==null)persist();},[seed,completed,orders,loading]);
 useEffect(()=>{if(selected&&!dialog.current?.open)dialog.current?.showModal();},[selected]);
 function save(id:string,value:boolean,order?:number[]){setCompleted(prev=>{const next=new Set(prev);if(value)next.add(id);else next.delete(id);return next;});if(order)setOrders(prev=>({...prev,[id.split(':')[0]]:order}));}
 function retry(){persist();}
 function reveal(s:number,q:number){const id=`${s}:${q}`;if(!completed.has(id))save(id,true);setSelected({section:s,question:q});}
 function toggleList(index:number){setExpanded(prev=>{const next=new Set(prev);if(next.has(index))next.delete(index);else next.add(index);return next;});}
 function skip(){
  if(!selected || seed===null)return;
  const {section:s,question:q}=selected,id=`${s}:${q}`;
  if(pendingRef.current.has(id))return;
  const current=orders[s]||shuffle(sections[s].questions.length,seed+s*7937);
  const unanswered=current.filter(question=>question===q||!completed.has(`${s}:${question}`));
  let randomized=shuffle(unanswered.length,crypto.getRandomValues(new Uint32Array(1))[0]).map(i=>unanswered[i]);
  if(randomized.length>1&&randomized.every((n,i)=>n===unanswered[i]))randomized=[...randomized.slice(1),randomized[0]];
  let index=0;const next=current.map(question=>question!==q&&completed.has(`${s}:${question}`)?question:randomized[index++]);
  setOrders(prev=>({...prev,[s]:next}));save(id,false,next);close();
 }
 function close(){dialog.current?.close();setSelected(null);}
 return <>
 <header className="topbar"><a className="brand" href="#"><span className="brand-mark" aria-hidden="true">t<span>m</span></span>Tell Me More<span className="brand-dot">.</span></a><label className="header-explore" htmlFor="jump">Explore a Chapter <select id="jump" defaultValue="0" onChange={e=>document.getElementById(`section-${e.target.value}`)?.scrollIntoView({behavior:'smooth',block:'start'})}>{sections.map((s,i)=><option key={s.title} value={i}>{s.title}</option>)}</select></label></header>
 <main>
 <div className="intro"><div><div className="eyebrow">GOOD CONVERSATIONS START HERE</div><h1>There’s always more<br className="desktop-break"/> to the story.</h1></div><div className="overview"><strong>{completed.size}<span> / {total}</span></strong><span>questions uncovered</span><div className="progress-track"><span style={{width:`${completed.size/total*100}%`}}/></div></div></div>
 <div className="toolbar conversation-line"><p>Pick a square, any square. Let's see where it leads....</p><span className="sync" role="status">{pending.size?'Saving…':seed!==null&&!error?'Progress saved in this browser':''}</span></div>
 {error&&<div className="notice" role="alert">{error}<button onClick={retry}>Try again</button></div>}
 {auth?<div className="welcome"><h2>Your stories, saved.</h2><p>Sign in with ChatGPT to keep the same squares and checkmarks across your devices.</p><a className="primary" href="/signin-with-chatgpt?return_to=%2F">Sign in with ChatGPT</a></div>:loading?<div className="welcome" role="status">Getting your questions ready…</div>:seed===null?<div className="welcome">Once your progress loads, your question squares will appear here.</div>:sections.map((section,s)=>{const count=section.questions.filter((_,q)=>completed.has(`${s}:${q}`)).length;return <section id={`section-${s}`} key={section.title} className={`chapter tone-${s%4}`}><div className="section-heading"><div className="heading-left"><span className="chapter-number">{String(s+1).padStart(2,'0')}</span><h2>{section.title}</h2><button className={'triangle-toggle '+(expanded.has(s)?'expanded':'')} aria-label={`${expanded.has(s)?'Collapse':'Expand'} ${section.title} checklist`} aria-expanded={expanded.has(s)} aria-controls={`list-${s}`} onClick={()=>toggleList(s)}><span aria-hidden="true">▸</span></button></div><span className="chapter-count">{count} / {section.questions.length}<span className="count-label"> uncovered</span></span></div>
 {s===14&&<p className="year-note">Choose a year together, then picture everyday life back then.</p>}
 <div id={`list-${s}`} hidden={!expanded.has(s)} className="checklist"><div className="list-instruction">Double-click or double-tap a checked box to cover its square again.</div><ol>{section.questions.map((question,q)=>{const id=`${s}:${q}`,done=completed.has(id);return <li key={id} className={done?'done':''}><button role="checkbox" aria-checked={done} aria-label={`${done?'Restore':'Mark uncovered'} question ${q+1}: ${question}`} aria-disabled={pending.has(id)} className="checkbox" onClick={e=>{if(pendingRef.current.has(id))return;if(!done)save(id,true);else{const now=Date.now();const last=Number(e.currentTarget.dataset.last||0);e.currentTarget.dataset.last=String(now);if(now-last<500)save(id,false);}}} onDoubleClick={()=>{if(done)save(id,false);}} onKeyDown={e=>{if(e.key===' '||e.key==='Enter'){e.preventDefault();save(id,!done);}}}>{done?'✓':''}</button><span className="list-number">{q+1}.</span><span>{question}</span></li>;})}</ol></div>
 <div className="question-grid">{(orders[s]||shuffle(section.questions.length,seed+s*7937)).map((q,position)=>{const id=`${s}:${q}`,done=completed.has(id);return <button key={id} className={'tile '+(done?'revealed':'covered')} onClick={()=>reveal(s,q)} aria-label={done?section.questions[q]:`Reveal square ${position+1} in ${section.title}`} aria-haspopup="dialog"><span className="tile-number">{String(position+1).padStart(2,'0')}</span>{done?<><span className="tile-question">{section.questions[q]}</span><span className="tile-status" aria-hidden="true">✓</span></>:<span className="tile-symbol" aria-hidden="true">+</span>}</button>;})}</div>
 </section>;})}
 <footer>Tell Me More<span>Take your time. Follow the interesting part.</span></footer>
 </main>
 <dialog ref={dialog} onCancel={()=>setSelected(null)} onClick={e=>{if(e.target===e.currentTarget)close();}} aria-labelledby="question-title"><div className="reading-panel">{selected&&<><div className="panel-top"><span>{sections[selected.section].title}</span><button className="close" onClick={close} aria-label="Close question">×</button></div><span className="question-label">QUESTION {selected.question+1}</span><h2 id="question-title">{sections[selected.section].questions[selected.question]}</h2><div className="panel-bottom"><span>Let the story wander.</span><div className="panel-actions"><button className="skip" onClick={skip} disabled={pending.has(`${selected.section}:${selected.question}`)}>SKIP</button><button className="primary" onClick={close}>Back to the squares</button></div></div></>}</div></dialog>
 </>;
}

createRoot(document.getElementById("root")!).render(<Conversation/>);
