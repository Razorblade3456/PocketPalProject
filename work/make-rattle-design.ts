import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {writeFileSync} from 'node:fs';
import {Pet} from '../src/Pets';
import {excellentCare} from '../src/careVisuals';
import {OUTFITS,OUTFIT_IDS} from '../src/catalog';
const cells = [100,75,50,25,10].map(happy=>[happy===100?'Smug':happy===75?'Unimpressed':happy===50?'Pouty':happy===25?'Mad':'Fuming',{care:{...excellentCare,happy}}]);
const outfits=OUTFIT_IDS.map(id=>[OUTFITS[id].name,{equipped:{[OUTFITS[id].slot]:id},care:excellentCare}]);
function row(items:any[],size=170){return `<div class="row">${items.map(([label,props])=>`<section><b>${label}</b><div class="art" style="width:${size}px;height:${size}px">${renderToStaticMarkup(createElement(Pet,{kind:'rattle',level:0,...props}))}</div></section>`).join('')}</div>`;}
writeFileSync('work/rattle-design.html',`<!doctype html><html><head><meta charset="UTF-8"><link rel="stylesheet" href="/src/style.css"><link rel="stylesheet" href="/src/careVisuals.css"><style>body{background:#19191f;color:#e6dfd2;padding:24px;font:12px system-ui}h1{font:24px Georgia;margin:0 0 7px}h2{font:14px system-ui;margin:18px 0 9px}.row{display:flex;justify-content:center;gap:10px;flex-wrap:wrap}.row section{background:#24212c;padding:8px;border-radius:6px;text-align:center}.art{position:relative; margin:auto}.art .pet-button{position:relative;inset:auto;margin:0;padding:0;width:100%;height:100%;background:transparent;border:0;box-shadow:none;filter:none}.pet-reaction{display:none}</style></head><body><h1>Rattle · Skull gremlin</h1><p>Bone mask. Bad attitude. Tiny boots.</p>${row(cells)}<h2>Small floating sizes · 100px / 140px</h2>${row([['100px',{care:excellentCare}]],100)}${row([['140px',{care:excellentCare}]],140)}<h2>Existing outfits</h2>${row(outfits,130)}</body></html>`);
