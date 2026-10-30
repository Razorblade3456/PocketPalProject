import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { writeFileSync } from 'node:fs';
import { Pet, pets } from '../src/Pets';
import { excellentCare } from '../src/careVisuals';
import type { PetKind } from '../src/model';
const cases = [
 ['Idle',{},{}],['Hungry',{food:10},{}],['Thirsty',{water:10},{}],['Dirty',{clean:10},{}],
 ['Pout',{happy:65},{}],['Upset',{happy:40},{}],['Teary / mad',{happy:20},{}],['Sobbing / fuming',{happy:5},{}],
 ['Sleeping',{food:10,water:10,clean:10,happy:10},{sleep:true}],
 ['Zombie',{food:20,water:20,clean:20,happy:20},{level:3}],['Critical',{food:5,water:5,clean:5,happy:5},{level:4}],['Dead',{food:0,water:0,clean:0,happy:0},{level:5}],
 ['Eating while thirsty/sad',{water:10,happy:10},{feeding:'food',reaction:'YUM!'}],
 ['Drinking',{water:10,happy:10},{feeding:'water',reaction:'Refreshing!'}],['Bath',{clean:10,happy:10},{feeding:'soap',reaction:'Clean!'}],['Pat',{happy:5},{reaction:'♥ Yippee!'}],
 ['Outfits',{food:20,water:20,clean:20,happy:20},{equipped:{head:'beanie',neck:'scarf',body:'pajamas',back:'backpack'}}],
];
const columns=(Object.keys(pets) as PetKind[]);
const rows=cases.map(([label,patch,props])=>`<section><h2>${label}</h2><div class="row">${columns.map(kind=>`<div class="cell"><b>${pets[kind].name}</b>${renderToStaticMarkup(createElement(Pet,{kind,level:0,care:{...excellentCare,...patch as object},...props as object}))}</div>`).join('')}</div></section>`).join('');
writeFileSync('work/pet-audit.html',`<!doctype html><html><head><link rel="stylesheet" href="/src/style.css"><link rel="stylesheet" href="/src/careVisuals.css"><link rel="stylesheet" href="/src/alternative.css"><style>body{background:#19191f;color:#e6dfd2;padding:16px;font:12px system-ui}h2{margin:10px 0;font:14px system-ui}.row{display:grid;grid-template-columns:repeat(4,1fr);gap:8px}.cell{height:215px;position:relative;text-align:center;background:#24212c;border-radius:10px;padding:8px}.cell .pet-button{width:180px;height:185px;position:absolute;left:50%;bottom:0;margin-left:-90px;padding:0;background:none;border:0}.cell .pet-reaction{font-size:9px;padding:3px;top:15px}.cell b{display:block}section{margin-bottom:15px}</style></head><body><h1>Pet visual audit</h1>${rows}</body></html>`);
