const fs=require('fs');
const p='src/App.tsx',s=fs.readFileSync(p,'utf8');
let svg=s.slice(s.indexOf('      <svg'),s.indexOf('      </svg>')+12);
svg=svg.replace('id="felt"','id={texture}').replace('id="belly"','id={belly}').replace('filter="url(#felt)"','filter={`url(#${texture})`}').replace('fill="url(#belly)"','fill={`url(#${belly})`}');
svg=svg.replace('d="M84 80Q56 50 73 28Q91 29 111 65Q146 51 190 65Q219 26 239 35Q253 53 232 86Q258 114 253 194L245 249Q241 284 202 291L111 289Q72 283 68 247L65 148Q64 103 84 80"',`d={level < 1 ? "M84 80Q56 50 73 28Q91 29 111 65Q146 51 190 65Q219 26 239 35Q253 53 232 86Q258 114 253 194L245 249Q241 284 202 291L111 289Q72 283 68 247L65 148Q64 103 84 80" : level < 3 ? "M84 80Q47 56 57 94Q74 113 99 84Q146 51 190 65Q244 65 262 105Q249 118 232 86Q258 114 253 194L245 249Q241 284 202 291L111 289Q72 283 68 247L65 148Q64 103 84 80" : "M84 80Q35 100 56 127Q80 131 99 84Q146 51 190 65Q266 89 263 135Q240 147 232 86Q258 114 253 194L245 249Q241 284 202 291L111 289Q72 283 68 247L65 148Q64 103 84 80"}`);
svg=svg.replace('sleep || level === 1','sleep || level === 1 || sad').replace('{sleep ? (','{sleep || sad ? (');
svg=svg.replace('{level > 2 && (','{level > 1 && (');
svg=svg.replace('        </g>\n        <g transform=',`          {level >= 4 && <g stroke="#636f59" strokeWidth="3" fill="none"><path d="M92 238l17-11 9 17-12 8z" fill="#6f7965"/><path d="M92 237l-8-8m21-2l3-9m9 20l10 1M210 82l-9 13 10 8-8 13"/></g>}
        </g>
        <g transform=`);
const header=`import {useId,useState} from 'react';\nimport {motion} from 'motion/react';\nimport type {PetKind} from './model';\nexport const stages=['Healthy','Tired','Unwell','Zombie-like','Critical','Dead'];\nexport const pets:Record<PetKind,{name:string;description:string}>= {mochi:{name:'Mochi',description:'Cheerful little felt monster'},pippin:{name:'Pippin',description:'Shy, sleepy & affectionate'},crumb:{name:'Crumb',description:'Curious, clumsy & always hungry'}};\ntype ArtProps={level:number;sleep:boolean;sad:boolean;look:{x:number;y:number}};\nfunction Mochi({level,sleep,sad,look}:ArtProps){const texture=useId(),belly=useId();return (${svg});}\n`;
fs.writeFileSync('src/Pets.tsx',header);
const start=s.indexOf('function Pet('),end=s.indexOf('function Jar(');
fs.writeFileSync(p,s.slice(0,start)+s.slice(end));
