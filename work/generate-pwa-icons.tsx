import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { Pet } from '../src/Pets';
import { writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire('C:/Users/abrah/Documents/Codex/pocketpal-icon-tools/package.json');
const { Resvg } = require('@resvg/resvg-js');
const markup = renderToStaticMarkup(createElement(Pet,{ level:0, kind:'mochi', preview:true, calm:true }));
const pet = markup.replaceAll("var(--pet-dark)","#8f9d70").replaceAll("var(--pet)","#abb78b").match(/<svg[\s\S]*?<\/svg>/)![0].replace(/<svg[^>]*>/,'<svg x="100" y="80" width="312" height="352" viewBox="0 0 320 340">');
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512"><rect width="512" height="512" fill="#25212c"/>${pet}</svg>`;
writeFileSync('public/icon-source.svg',svg);
for (const size of [192,512,180]) writeFileSync(size===180?'public/apple-touch-icon.png':`public/icon-${size}.png`,new Resvg(svg,{fitTo:{mode:'width',value:size}}).render().asPng());

