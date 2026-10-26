const fs=require('fs');let p='src/App.tsx',s=fs.readFileSync(p,'utf8');s=s.replace('  Coins,','  Coins,\n  Home, ShoppingBag, Shirt, PackageOpen,');s=s.replace('  buySupply,','  buyItem,\n  recordAttempt,correctAttempt,deleteAttempt,taskCounts,goalFor,rewardKey,equipOutfit,\n  type Outfit,type ShopItem,');s=s.replace('import { Supplies } from "./Supplies";',`import { Supplies } from "./Supplies";
import {Boutique,Wardrobe} from './Boutique';
import {Inventory,type IncomingFood} from './Inventory';
import {favorites,itemName} from './catalog';`);
s=s.replace('"onboard" | "health" | null','"onboard" | "health" | "shop" | "wardrobe" | null');
s=s.replace('  const [edit, setEdit]',`  const [inventoryOpen,setInventoryOpen]=useState(false);
  const [incoming,setIncoming]=useState<IncomingFood|null>(null);
  const [feeding,setFeeding]=useState<Supply|null>(null);
  const [feedToken,setFeedToken]=useState(0);
  const petRef=useRef<HTMLButtonElement>(null);
  const actionLocks=useRef(new Map<string,number>());
  const [edit, setEdit]`);
const d=s.indexOf('  const done ='),dend=s.indexOf('  useEffect(() => {',d);s=s.slice(0,d)+`  const dailyTarget=todayTasks.reduce((sum,t)=>sum+goalFor(t),0);
  const done=earned.length;
  const percent=dailyTarget?Math.round(todayTasks.reduce((sum,t)=>sum+Math.min(goalFor(t),taskCounts(s,t.id,today).completed),0)/dailyTarget*100):earned.length?100:0;
`+s.slice(dend);
s=s.replace('(!outcomeFor(s, t.id, today) ||\n            outcomeFor(s, t.id, today)?.status === "pending")','(taskCounts(s,t.id,today).completed < (goalFor(t)||1))');
const rs=s.indexOf('  const reward ='),re=s.indexOf('  const land =',rs);
s=s.slice(0,rs)+`  const openShop=()=>{setInventoryOpen(false);setIncoming(null);setPanel('shop')};
  const openPantry=()=>{setPanel(null);setEdit(undefined);setInventoryOpen(true);requestAnimationFrame(()=>{const r=petRef.current?.getBoundingClientRect();if(r&&(window.innerWidth<800||r.top<70||r.bottom>window.innerHeight))petRef.current?.scrollIntoView({block:'center',behavior:'instant'})})};
  const reward=(t:Task,status:'completed'|'missed',date=today,source?:RewardSource)=>{
    const at=Date.now(),lock='task:'+t.id;if(at-(actionLocks.current.get(lock)||0)<350)return;actionLocks.current.set(lock,at);
    const id=crypto.randomUUID(),next=recordAttempt(s,t.id,date,status,at,id);const entry=next.outcomes.find(o=>o.id===id);if(!entry)return;
    setS(p=>recordAttempt(p,t.id,date,status,at,id));
    if(status==='completed'&&date===today&&!panel)setFlights(prev=>[...prev,{key:entry.ballId,token:id,category:entry.category,source:source||{x:window.innerWidth/2,y:window.innerHeight/2}}]);
    const difference=Math.max(0,Math.round((s.care[entry.category]-next.care[entry.category])*10)/10);
    setReaction(status==='completed'?'+5 coins · another little win!':'−'+difference+' '+labels[entry.category]);tone(s.settings.sound,status==='completed'?1:-3);
    setMessage(status==='completed'?next.debt?'+5 coins earned · '+next.debt+' still reserved from future wins.':'+5 coins · Every little moment counts.':difference?'−'+difference+' '+labels[entry.category]+' · A missed attempt, a fresh next step.':'Missed attempt recorded. Your daily care cushion softened the damage.');
  };
  const correct=(id:string,status:OutcomeStatus)=>{setS(p=>correctAttempt(p,id,status));setMessage('That entry has been corrected. Its date stays the same; care, coins and jar rewards are recalculated.');};
  const removeEntry=(id:string)=>{setS(p=>deleteAttempt(p,id));setMessage('Just that entry was removed. Bought items stay yours; any coin shortfall is reserved from future wins.');};
`+s.slice(re);
s=s.replace('occurrenceKey(o.taskId, o.date) === f.key &&\n            o.status === "completed"','rewardKey(o) === f.key &&\n            o.status === "completed" && !o.deleted');
const ps=s.indexOf('  const purchase ='),pe=s.indexOf('  const pat =',ps);s=s.slice(0,ps)+`  const purchase=(item:ShopItem)=>{
    const at=Date.now(),lock='buy:'+item;if(at-(actionLocks.current.get(lock)||0)<350)return;actionLocks.current.set(lock,at);
    const id=crypto.randomUUID(),next=buyItem(s,item,at,id);if(next.careEvents.length===s.careEvents.length){setMessage('Save up a few more little wins, or find this outfit in your wardrobe.');return;}
    setS(p=>buyItem(p,item,at,id));tone(s.settings.sound,0);setMessage(itemName(item)+' is yours. Find it in your inventory.');
  };
`+s.slice(pe);
const cs=s.indexOf('  const careFor ='),ce=s.indexOf('  return (\n    <MotionConfig',cs);s=s.slice(0,cs)+`  useEffect(()=>{if(!feeding)return;const timer=setTimeout(()=>setFeeding(null),1500);return()=>clearTimeout(timer)},[feedToken]);
  useEffect(()=>{if(!inventoryOpen)return;const escape=(e:KeyboardEvent)=>{if(e.key==='Escape'){setInventoryOpen(false);setIncoming(null)}};window.addEventListener('keydown',escape);return()=>window.removeEventListener('keydown',escape)},[inventoryOpen]);
  const careFor=(item:Supply):boolean=>{
    const at=Date.now(),lock='use:'+item;if(at-(actionLocks.current.get(lock)||0)<350)return false;actionLocks.current.set(lock,at);
    const id=crypto.randomUUID(),next=useSupply(s,item,at,id);if(next.careEvents.length===s.careEvents.length){setMessage(level===5?'Revive your pal before feeding.':'Your pantry needs a refill first.');return false;}
    setS(p=>useSupply(p,item,at,id));const v=SUPPLIES[item],gain=Math.max(0,Math.round((next.care[v.category]-s.care[v.category])*10)/10);const favorite=(favorites[s.pet] as readonly Supply[]).includes(item);
    setFeeding(item);setFeedToken(t=>t+1);setReaction((favorite?'A favorite! ':'Yum! ')+'+'+gain+' '+labels[v.category]);tone(s.settings.sound,1);setMessage(v.name+' enjoyed · +'+gain+' '+labels[v.category]+' and +'+Math.max(0,Math.round(next.care.happy-s.care.happy))+' happiness.');return true;
  };
`+s.slice(ce);
s=s.replace('        </header>\n        <main>',`        </header>
        <nav className="game-nav" aria-label="PocketPal pages"><button aria-pressed={!panel&&!inventoryOpen} onClick={()=>{close();setInventoryOpen(false);setIncoming(null)}}><Home size={14}/>Home</button><button aria-pressed={panel==='shop'} onClick={openShop}><ShoppingBag size={14}/>Shop</button><button aria-pressed={panel==='wardrobe'} onClick={()=>{setInventoryOpen(false);setPanel('wardrobe')}}><Shirt size={14}/>Wardrobe</button><button aria-pressed={inventoryOpen} onClick={()=>inventoryOpen?(setInventoryOpen(false),setIncoming(null)):openPantry()}><PackageOpen size={14}/>Inventory</button></nav>
        <main>`);
s=s.replace('{todayTasks.length}',"{dailyTarget || '∞'}");s=s.replace('status = outcomeFor(s, t.id, today)?.status || "pending";','counts = taskCounts(s,t.id,today),\n                      status = counts.completed?"completed":counts.missed?"missed":"pending";');s=s.replace('                          status={status}\n                          name={t.name}','                          counts={counts} goal={goalFor(t)} canUndo={!!counts.latest} onUndo={()=>{if(counts.latest)removeEntry(counts.latest.id)}}\n                          name={t.name}');
s=s.replace('                  level={level}\n                  kind={s.pet}', '                  level={level}\n                  kind={s.pet}\n                  petRef={petRef} equipped={s.equipped} incoming={incoming} feeding={feeding}');
s=s.replace('<Supplies s={s} onBuy={purchase} onUse={careFor} />','<Supplies s={s} onBuy={purchase} onUse={careFor} onShop={openShop} onInventory={openPantry}/>');
s=s.replace('        <dialog\n          ref={dialog}',`        {inventoryOpen&&<Inventory s={s} petRef={petRef} onClose={()=>{setInventoryOpen(false);setIncoming(null)}} onShop={openShop} onFeed={careFor} onEquip={item=>setS(p=>equipOutfit(p,item))} onApproach={setIncoming}/>}
        <dialog
          className={panel==='shop'||panel==='wardrobe'?'boutique-dialog':''}
          ref={dialog}`);
s=s.replace('            ) : panel === "health" ? (','            ) : panel === "shop" ? (<Boutique s={s} onBuy={purchase} onInventory={openPantry} onWardrobe={()=>setPanel(\'wardrobe\')}/>) : panel === "wardrobe" ? (<Wardrobe s={s} onEquip={item=>setS(p=>equipOutfit(p,item))} onShop={()=>setPanel(\'shop\')}/>) : panel === "health" ? (');s=s.replace('<OutcomeHistory s={s} onChange={reward} />','<OutcomeHistory s={s} onCorrect={correct} onDelete={removeEntry} />');
s=s.replace('key={c.at + c.taskId}','key={rewardKey(c)}');s=s.replace('      category: "happy",','      category: "happy",\n      repetitions:"once",dailyGoal:1,');s=s.replace('      <label>\n        Give your pal',`      <label>Daily entries<select value={t.repetitions||'once'} onChange={e=>update({repetitions:e.target.value as Task['repetitions']})}><option value="once">Once per day</option><option value="multiple">Multiple times per day</option><option value="goal">Custom daily goal</option><option value="unlimited">Unlimited repetitions</option></select></label>
      {t.repetitions==='goal'&&<label>Daily goal<input type="number" min={1} max={100} required value={t.dailyGoal||1} onChange={e=>update({dailyGoal:Number(e.target.value)})}/></label>}
      <p className="fine">Daily goals are gentle targets, never limits. You can keep adding moments after reaching them. Unlimited tasks never receive automatic misses.</p>
      <label>
        Care category`);
s=s.replace('Suggested from your task name. Choose any reward that feels right.','Every success earns 5 coins. The category chooses its jar color and the need affected by a missed attempt.');fs.writeFileSync(p,s);
p='src/model.ts';s=fs.readFileSync(p,'utf8').replace('inventory: { food: 0, water: 0, soap: 0 },','inventory: emptyInventory(),');fs.writeFileSync(p,s);
p='src/Supplies.tsx';s=fs.readFileSync(p,'utf8');s=s.replace('  onUse,','  onUse,\n  onShop, onInventory,').replace('  onUse: (item: Supply) => void;','  onUse: (item: Supply) => void;\n  onShop:()=>void;onInventory:()=>void;').replace('(Object.keys(SUPPLIES) as Supply[])','(["food","water","soap"] as const)');s=s.replace('      <p className="supply-hint">','      <div className="shelf-links"><button onClick={onShop}>PocketPal Shop</button><button onClick={onInventory}>Open inventory</button></div>\n      <p className="supply-hint">');fs.writeFileSync(p,s);
p='src/Jar.tsx';s=fs.readFileSync(p,'utf8').replace('occurrenceKey,','rewardKey,').replace('balls.slice(-70).map((b)','balls.map((b)').replace('occurrenceKey(b.taskId, b.date)','rewardKey(b)');s=s.replace('    <motion.div\n      ref={jarRef}','    <motion.div\n      style={{"--jar-ball-size":Math.max(1,Math.min(small?12:24,Math.floor(Math.sqrt((small?64*70:128*145)/Math.max(1,balls.length)))-(balls.length>100?0:2)))+"px","--jar-ball-gap":balls.length>100?"0px":"2px"} as import("react").CSSProperties}\n      ref={jarRef}');fs.writeFileSync(p,s);
