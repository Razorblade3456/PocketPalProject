const fs=require('fs');let p='src/model.ts',s=fs.readFileSync(p,'utf8');const a=s.indexOf('export type Supply ='),b=s.indexOf('export const petRhythm');s=s.slice(0,a)+`import {SUPPLIES,OUTFITS,SUPPLY_IDS,OUTFIT_IDS,isSupply,isOutfit,emptyInventory,type Supply,type Outfit,type OutfitSlot,type ShopItem} from './catalog';
export {SUPPLIES,OUTFITS,SUPPLY_IDS,OUTFIT_IDS,isSupply,isOutfit,emptyInventory} from './catalog';
export type {Supply,Outfit,OutfitSlot,ShopItem} from './catalog';
`+s.slice(b);
s=s.replace('  createdAt?: number;','  createdAt?: number;\n  repetitions?: "once"|"multiple"|"goal"|"unlimited";\n  dailyGoal?: number;');s=s.replace('export type Completion = {','export type Completion = {\n  id?:string;\n  ballId?:string;');s=s.replace('export type Occurrence = Completion & {','export type Occurrence = Completion & {\n  id:string;\n  ballId:string;\n  penalty:number;\n  deleted?:boolean;');s=s.replace('      kind: "buy";\n      id: string;\n      at: number;\n      sequence: number;\n      item: Supply;','      kind: "buy";\n      id: string;\n      at: number;\n      sequence: number;\n      item: ShopItem;');s=s.replace('  version: 3;','  version: 4;\n  ownedOutfits:Outfit[];\n  equipped:Partial<Record<OutfitSlot,Outfit>>;');s=s.replace('    version: 3,','    version: 4,\n    ownedOutfits:[],\n    equipped:{},');s=s.replace('inventory: { food: 0, water: 0, soap: 0 }','inventory: emptyInventory()');s=s.replace('const inventory: Record<Supply, number> = { food: 0, water: 0, soap: 0 };','const inventory = emptyInventory();\n  const ownedOutfits=new Set<Outfit>();');s=s.replace('        inventory[e.item]++;','        if(isSupply(e.item))inventory[e.item]++;else ownedOutfits.add(e.item);');s=s.replace('    if (e.status === "missed") {','    if (e.status === "missed" && !e.deleted) {');s=s.replace('          BALANCE.missed,','          e.penalty ?? BALANCE.missed,');s=s.replace('.filter((o) => o.status === "completed")','.filter((o) => o.status === "completed" && !o.deleted)');s=s.replace('.map(({ taskId, name, category, at, date }) => ({','.map(({ id,ballId,taskId, name, category, at, date }) => ({\n      id,ballId,');s=s.replace('    inventory,\n    completions,','    inventory,\n    ownedOutfits:[...ownedOutfits],\n    equipped:Object.fromEntries(Object.entries(s.equipped||{}).filter(([,id])=>ownedOutfits.has(id as Outfit))),\n    completions,');s=s.replace('      completions.some((c) => c.taskId === t.id && c.date === day),','      taskCounts(s,t.id,day).completed >= goalFor(t),');
const dec=s.indexOf('export function decay('),decEnd=s.indexOf('export function setOutcome(',dec);
s=s.slice(0,dec)+`export function decay(s:State,n=Date.now()):State {
 if((s.version as number)!==4){const upgraded=parseState(s,n);if(!upgraded)throw Error('This save could not be upgraded safely.');return upgraded;}
 const today=dateKey(n),outcomes=[...s.outcomes];let settledThrough=s.settledThrough,lastSequence=s.lastSequence;
 for(let day=shiftDate(settledThrough,1);day<today;day=shiftDate(day,1)){
  for(const task of s.tasks){if(!due(task,+localDate(day)))continue;
   const records=outcomes.filter(o=>o.taskId===task.id&&o.date===day&&!o.deleted);
   const recorded=records.filter(o=>o.status!=='pending').length;
   const shortfall=Math.max(0,goalFor(task)-recorded);
   const pending=records.filter(o=>o.status==='pending');
   for(let i=0;i<shortfall;i++){
    const old=pending[i];const id=old?.id??JSON.stringify(['auto',task.id,day,i]);
    const occurrence:Occurrence={...(old||{}),id,ballId:old?.ballId??'ball:'+id,taskId:task.id,name:old?.name??task.name,category:old?.category??task.category,at:endOfDay(day),date:day,status:'missed',task:old?.task??{...task,days:[...task.days]},automatic:true,sequence:++lastSequence,rewardCare:0,rewardCoins:BALANCE.completedCoins,penalty:BALANCE.missed};
    if(old)outcomes[outcomes.indexOf(old)]=occurrence;else outcomes.push(occurrence);
   }
  }
  settledThrough=day;
 }
 return project({...s,outcomes,settledThrough,lastSequence},Math.max(n,s.baseline.at));
}
`+s.slice(decEnd);
s=s.replace('  const old = outcomeFor(s, id, date),','  const old = outcomeFor(s, id, date),');s=s.replace('    : {\n        taskId: id,','    : {\n        id:crypto.randomUUID(),ballId:crypto.randomUUID(),penalty:BALANCE.missed,\n        taskId: id,');
const counts=s.indexOf('/** Recompute');s=s.slice(0,counts)+`export const goalFor=(task:Task)=>task.repetitions==='unlimited'?0:task.repetitions==='goal'?Math.max(1,Math.min(100,Math.round(task.dailyGoal||1))):1;
export function taskCounts(s:State,id:string,date:string){const entries=s.outcomes.filter(o=>o.taskId===id&&o.date===date&&!o.deleted);return {completed:entries.filter(o=>o.status==='completed').length,missed:entries.filter(o=>o.status==='missed').length,latest:[...entries].filter(o=>o.status!=='pending').sort((a,b)=>b.sequence-a.sequence)[0]};}
export const rewardKey=(c:Completion)=>c.ballId||c.id||occurrenceKey(c.taskId,c.date);
export function recordAttempt(s:State,taskId:string,date:string,status:'completed'|'missed',n=Date.now(),id=crypto.randomUUID()):State {
 s=decay(s,n);if(s.outcomes.some(o=>o.id===id)||date>dateKey(n))return s;
 const task=s.tasks.find(t=>t.id===taskId);if(!task||!due(task,+localDate(date)))return s;
 const entry:Occurrence={id,ballId:'ball:'+id,taskId,date,status,at:date===dateKey(n)?n:endOfDay(date),name:task.name,category:task.category,task:{...task,days:[...task.days]},automatic:false,sequence:s.lastSequence+1,rewardCare:0,rewardCoins:BALANCE.completedCoins,penalty:BALANCE.missed};
 return project({...s,lastSequence:s.lastSequence+1,outcomes:[...s.outcomes,entry]},n);
}
export function correctAttempt(s:State,id:string,status:OutcomeStatus,n=Date.now()):State {
 s=decay(s,n);const old=s.outcomes.find(o=>o.id===id&&!o.deleted);if(!old||old.status===status)return s;
 return project({...s,outcomes:s.outcomes.map(o=>o.id===id?{...o,status,automatic:false,rewardCare:status==='completed'?0:o.rewardCare,...(o.legacy?{legacyRetired:true}:{})}:o)},n);
}
export function deleteAttempt(s:State,id:string,n=Date.now()):State {
 s=decay(s,n);const old=s.outcomes.find(o=>o.id===id&&!o.deleted);if(!old)return s;
 return project({...s,outcomes:s.outcomes.map(o=>o.id===id?{...o,deleted:true,status:'pending',...(o.legacy?{legacyRetired:true}:{})}:o)},n);
}
export function undoLatest(s:State,taskId:string,date:string,n=Date.now()):State {s=decay(s,n);const latest=taskCounts(s,taskId,date).latest;return latest?deleteAttempt(s,latest.id,n):s;}
`+s.slice(counts);
// Keep the previous single-result API available for old callers and migration tests.
s=s.replace('return s.outcomes.find((o) => o.taskId === id && o.date === date);','return s.outcomes.find((o) => o.taskId === id && o.date === date && !o.deleted);');
const buy=s.indexOf('export function buySupply('),buyEnd=s.indexOf('export function useSupply(',buy);
s=s.slice(0,buy)+`export function buyItem(s:State,item:ShopItem,n=Date.now(),id=crypto.randomUUID()):State {
 s=decay(s,n);if(s.careEvents.some(e=>'id'in e&&e.id===id))return s;
 const product=isSupply(item)?SUPPLIES[item]:isOutfit(item)?OUTFITS[item]:null;
 if(!product||s.coins<product.price||isOutfit(item)&&s.ownedOutfits.includes(item))return s;
 return project({...s,lastSequence:s.lastSequence+1,careEvents:[...s.careEvents,{kind:'buy',id,item,cost:product.price,at:n,sequence:s.lastSequence+1}]},n);
}
export const buySupply=(s:State,item:Supply,n=Date.now(),id=crypto.randomUUID())=>buyItem(s,item,n,id);
export function equipOutfit(s:State,item:Outfit|null,n=Date.now()):State {
 s=decay(s,n);if(item===null)return {...s,equipped:{}};if(!isOutfit(item)||!s.ownedOutfits.includes(item))return s;
 const slot=OUTFITS[item].slot,equipped={...s.equipped};if(equipped[slot]===item)delete equipped[slot];else equipped[slot]=item;
 return {...s,equipped};
}
`+s.slice(buyEnd);
s=s.replace('export function useSupply(s: State, item: Supply, n = Date.now()): State {','export function useSupply(s: State, item: Supply, n = Date.now(), id=crypto.randomUUID()): State {');s=s.replace('  const supply = SUPPLIES[item];\n  if (!supply || s.inventory[item] < 1','  if(s.careEvents.some(e=>\'id\' in e&&e.id===id))return s;\n  const supply = SUPPLIES[item];\n  if (!supply || s.inventory[item] < 1');s=s.replace('          id: crypto.randomUUID(),','          id,');
s=s.replace('(t.createdAt === undefined || Number.isFinite(t.createdAt));','(t.createdAt === undefined || Number.isFinite(t.createdAt)) && (t.repetitions===undefined||["once","multiple","goal","unlimited"].includes(t.repetitions)) && (t.dailyGoal===undefined||Number.isInteger(t.dailyGoal)&&t.dailyGoal>=1&&t.dailyGoal<=100);');
s=s.replace('version === 3','version >= 3');s=s.replace('(["food", "water", "soap"] as Supply[]).includes(e.item)','(isSupply(e.item)||isOutfit(e.item))',1);s=s.replace('(["food", "water", "soap"] as Supply[]).includes(e.item)','isSupply(e.item)');
s=s.replace('    new Set(s.outcomes.map((o) => occurrenceKey(o.taskId, o.date))).size ===\n      s.outcomes.length','    (version<4 ? new Set(s.outcomes.map(o=>occurrenceKey(o.taskId,o.date))).size===s.outcomes.length : s.outcomes.every(o=>typeof o.id===\'string\'&&typeof o.ballId===\'string\'&&Number.isFinite(o.penalty)&&o.penalty>=0&&o.penalty<=8&&(o.deleted===undefined||typeof o.deleted===\'boolean\'))&&new Set(s.outcomes.map(o=>o.id)).size===s.outcomes.length&&new Set(s.outcomes.map(o=>o.ballId)).size===s.outcomes.length)');
const val=s.indexOf('export function validState('),valEnd=s.indexOf('export function parseState(',val);
s=s.slice(0,val)+`export function validState(x:unknown):x is State {
 if(!validModel(x,4))return false;const s=x as State;
 if(!Number.isSafeInteger(s.coins)||s.coins<0||!Number.isSafeInteger(s.debt)||s.debt<0||!s.inventory||!SUPPLY_IDS.every(i=>Number.isSafeInteger(s.inventory[i])&&s.inventory[i]>=0)||!Array.isArray(s.ownedOutfits)||!s.ownedOutfits.every(isOutfit)||new Set(s.ownedOutfits).size!==s.ownedOutfits.length||!s.equipped||typeof s.equipped!=='object'||!Object.entries(s.equipped).every(([slot,id])=>isOutfit(id)&&OUTFITS[id].slot===slot&&s.ownedOutfits.includes(id)))return false;
 const inventory=emptyInventory(),ids=new Set<string>(),owned=new Set<Outfit>();const sequences=[...s.outcomes.map(o=>o.sequence),...s.careEvents.map(e=>e.sequence)];
 if(new Set(sequences).size!==sequences.length)return false;
 for(const e of [...s.careEvents].sort((a,b)=>a.at-b.at||a.sequence-b.sequence)){
  if(e.kind!=='buy'&&e.kind!=='use')continue;if(ids.has(e.id))return false;ids.add(e.id);
  if(e.kind==='buy'&&isOutfit(e.item)){if(owned.has(e.item))return false;owned.add(e.item);continue;}
  if(!isSupply(e.item))return false;inventory[e.item]+=e.kind==='buy'?1:-1;if(inventory[e.item]<0)return false;
 }
 return true;
}
const upgradedEntry=(o:Occurrence,index:number):Occurrence=>{const id=o.id||JSON.stringify(['migrated',o.taskId,o.date,o.sequence||index+1]);return {...o,id,ballId:o.ballId||'ball:'+id,penalty:o.penalty??BALANCE.missed};};
`+s.slice(valEnd);
s=s.replace('  if (validModel(x, 2)) {','  if(validModel(x,3)){const old=x as State;return decay({...old,version:4,ownedOutfits:[],equipped:{},inventory:{...emptyInventory(),...old.inventory},outcomes:old.outcomes.map(upgradedEntry)},n);}\n  if (validModel(x, 2)) {');s=s.replace('      version: 3,','      version: 4,\n      ownedOutfits:[],\n      equipped:{},');s=s.replace('outcomes: old.outcomes.map((o) => ({','outcomes: old.outcomes.map((o,i) => ({\n        ...upgradedEntry(o,i),');s=s.replace('    sequence: i + 1,','    id:JSON.stringify(["v1",c.taskId,c.date,i]),ballId:JSON.stringify(["v1-ball",c.taskId,c.date,i]),penalty:BALANCE.missed,\n    sequence: i + 1,');s=s.replace('parsed.version < 3','parsed.version < 4').replace('pocketpal-before-supplies','pocketpal-before-boutique');
fs.writeFileSync(p,s);
