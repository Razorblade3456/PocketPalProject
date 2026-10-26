const fs=require('fs');const p='src/model.ts';let s=fs.readFileSync(p,'utf8');
s=s.replace('export type PetKind',`export type Supply = 'food' | 'water' | 'soap';
export const SUPPLIES:Record<Supply,{name:string;price:number;category:Category;boost:number;morale:number}> = {food:{name:'Food',price:5,category:'food',boost:15,morale:4},water:{name:'Water',price:4,category:'water',boost:15,morale:4},soap:{name:'Soap',price:6,category:'clean',boost:15,morale:4}};
export const petRhythm=(n=Date.now())=>{const h=new Date(n).getHours();return {sleeping:h>=21||h<6,calm:h>=19&&h<21}};
export type PetKind`);
s=s.replace('  legacy?: boolean;','  legacy?: boolean;\n  rewardCare: number;\n  rewardCoins: number;');
s=s.replace('  | { kind: "revive"; at: number; sequence: number };',`  | { kind: "revive"; at: number; sequence: number }
  | {kind:'buy';id:string;at:number;sequence:number;item:Supply;cost:number}
  | {kind:'use';id:string;at:number;sequence:number;item:Supply;boost:number;morale:number};`);
s=s.replace('  version: 2;','  version: 3;\n  coins: number;\n  debt: number;\n  inventory: Record<Supply,number>;');
s=s.replace('  completed: 10,','  completed: 0,\n  completedCoins: 5,');
s=s.replace('    version: 2,','    version: 3,\n    coins: 0,\n    debt: 0,\n    inventory: {food:0,water:0,soap:0},');
s=s.replace('  let recovered = false;','  let recovered = false;\n  let spent=0;\n  const inventory:Record<Supply,number>={food:0,water:0,soap:0};');
s=s.replace('    if ("kind" in e) {\n      if (e.kind === "revive")',`    if ("kind" in e) {
      if(e.kind === 'buy'){spent += e.cost; inventory[e.item]++; continue;}
      if(e.kind === 'use'){
        if(inventory[e.item]>0){
          const before=stage({care,settings:{...s.settings,cozy}});
          inventory[e.item]--;
          const category=SUPPLIES[e.item].category;
          care[category]=clamp(care[category]+e.boost,cozy?5:0);
          care.happy=clamp(care.happy+e.morale,cozy?5:0);
          if(before>=3&&stage({care,settings:{...s.settings,cozy}})<3)recovered=true;
        }
        continue;
      }
      if (e.kind === "revive")`);
s=s.replace('if (e.status === "completed") amount = BALANCE.completed;','if (e.status === "completed") amount = e.rewardCare;');
s=s.replace('    care,\n    completions,','    care,\n    coins: Math.max(0,s.outcomes.filter(o=>o.status===\'completed\').reduce((sum,o)=>sum+o.rewardCoins,0)-spent),\n    debt: Math.max(0,spent-s.outcomes.filter(o=>o.status===\'completed\').reduce((sum,o)=>sum+o.rewardCoins,0)),\n    inventory,\n    completions,');
s=s.replace('          sequence: ++lastSequence,','          sequence: ++lastSequence,\n          rewardCare: 0,\n          rewardCoins: BALANCE.completedCoins,');
// The pending-to-missed spread must preserve existing historical reward metadata.
s=s.replace('        sequence: s.lastSequence + 1,\n      };','        sequence: s.lastSequence + 1,\n        rewardCare: 0,\n        rewardCoins: BALANCE.completedCoins,\n      };');
const insertion=s.indexOf('export function streak(');
s=s.slice(0,insertion)+`export function buySupply(s:State,item:Supply,n=Date.now()):State {
 s=decay(s,n);const supply=SUPPLIES[item];if(!supply||s.coins<supply.price)return s;
 return project({...s,lastSequence:s.lastSequence+1,careEvents:[...s.careEvents,{kind:'buy',id:crypto.randomUUID(),item,cost:supply.price,at:n,sequence:s.lastSequence+1}]},n);
}
export function useSupply(s:State,item:Supply,n=Date.now()):State {
 s=decay(s,n);const supply=SUPPLIES[item];if(!supply||s.inventory[item]<1||stage(s)===5)return s;
 return project({...s,lastSequence:s.lastSequence+1,careEvents:[...s.careEvents,{kind:'use',id:crypto.randomUUID(),item,boost:supply.boost,morale:supply.morale,at:n,sequence:s.lastSequence+1}]},n);
}
`+s.slice(insertion);
s=s.replace('export function validState(x: unknown): x is State {','function validModel(x: unknown,version:number): x is State {').replace('    s.version === 2 &&','    (s.version as number) === version &&');
s=s.replace('        (e.kind === "revive" ||','        (e.kind === "revive" ||\n          (version===3 && ((e.kind===\'buy\' && typeof e.id===\'string\' && !!SUPPLIES[e.item] && Number.isSafeInteger(e.cost) && e.cost>0 && e.cost<=1000) || (e.kind===\'use\' && typeof e.id===\'string\' && !!SUPPLIES[e.item] && Number.isFinite(e.boost) && e.boost>=0 && e.boost<=100 && Number.isFinite(e.morale) && e.morale>=0 && e.morale<=100))) ||');
s=s.replace('        typeof o.automatic === "boolean" &&','        typeof o.automatic === "boolean" &&\n        (version===2 || Number.isFinite(o.rewardCare)&&o.rewardCare>=0&&o.rewardCare<=28&&Number.isSafeInteger(o.rewardCoins)&&o.rewardCoins>=0&&o.rewardCoins<=5) &&');
const validator=`export function validState(x:unknown):x is State {
 if(!validModel(x,3))return false;const s=x as State;
 if(!Number.isSafeInteger(s.coins)||s.coins<0||!Number.isSafeInteger(s.debt)||s.debt<0||!s.inventory||!(['food','water','soap'] as Supply[]).every(i=>Number.isSafeInteger(s.inventory[i])&&s.inventory[i]>=0))return false;
 const inventory:Record<Supply,number>={food:0,water:0,soap:0};const ids=new Set<string>();
 const sequences=[...s.outcomes.map(o=>o.sequence),...s.careEvents.map(e=>e.sequence)];
 if(new Set(sequences).size!==sequences.length)return false;
 for(const e of [...s.careEvents].sort((a,b)=>a.at-b.at||a.sequence-b.sequence)){
  if(e.kind!=='buy'&&e.kind!=='use')continue;
  if(ids.has(e.id))return false;ids.add(e.id);
  inventory[e.item]+=e.kind==='buy'?1:-1;if(inventory[e.item]<0)return false;
 }
 return true;
}
`;
s=s.replace('export function parseState(x: unknown, n = Date.now()): State | null {',validator+`export function parseState(x: unknown, n = Date.now()): State | null {
  if(validModel(x,2)) {
    const old=x as State;
    const upgraded:State={...old,version:3,coins:0,debt:0,inventory:{food:0,water:0,soap:0},outcomes:old.outcomes.map(o=>({...o,rewardCare:o.status==='completed'?10:0,rewardCoins:BALANCE.completedCoins}))};
    return decay(upgraded,n);
  }`);
s=s.replace('    sequence: i + 1,\n    ...c,','    sequence: i + 1,\n    rewardCare:0,\n    rewardCoins:BALANCE.completedCoins,\n    ...c,');
s=s.replace('          parsed.version === 1 &&','          parsed.version < 3 &&').replace('"pocketpal-before-outcomes"','"pocketpal-before-supplies"');
fs.writeFileSync(p,s);
