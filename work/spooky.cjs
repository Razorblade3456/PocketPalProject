const fs=require('fs');let p='src/Pets.tsx',s=fs.readFileSync(p,'utf8');
s=s.replace('  preview = false,','  preview = false,\n  calm = false,');s=s.replace('  preview?: boolean;','  preview?: boolean;\n  calm?: boolean;');s=s.replace('${sleep ? "sleeping" : ""}', '${sleep ? "sleeping" : ""} ${calm ? "calm" : ""}');
const art=s.indexOf('function Mochi(');const wear=`function SpookyWear({kind,level}:{kind:PetKind;level:number}){
 if(level<3)return null;
 const critical=level>=4;
 return <g className="spooky-wear" data-damage-species={kind} data-damage-stage={level} strokeLinecap="round" strokeLinejoin="round">
 {kind==='mochi'?<>
  <path d={critical?'M91 225l15-10 9 8 13-2 10 16-14 17-21-3-9 7-9-14z':'M94 231l12-8 14 7-4 14-17 2z'} fill="#77685e" stroke="#78806a" strokeWidth="3"/>
  <path d={critical?'M98 231l12-8 10 6 8 8-10 10-16-3z':'M100 232l8-4 6 7-9 6z'} fill="#c89192"/>
  <path d="M95 227l-8-6m24-4l2-10m14 22l11-2m-36 20l-5 10" stroke="#d7d5b7" strokeWidth="3"/>
  <path d="M219 174l12 7m-13 1l10 5" stroke="#a66266" strokeWidth="2.5"/>
  <path d="M108 245q-4 8 1 10q6-2 0-10" fill="#a66266"/>
  {critical&&<><path d="M203 85l13 8-7 10 13 7-8 11" fill="none" stroke="#a46970" strokeWidth="4"/><path d="M211 115q-6 9 0 12q6-3 0-12" fill="#a66266"/><path d="M190 249l17-7 9 13-14 12-16-8z" fill="#b77e83" stroke="#78806a" strokeWidth="3"/><path d="M192 247l5 10m8-14l4 12" stroke="#f0dec2" strokeWidth="2"/><ellipse cx="112" cy="140" rx="16" ry="20" fill="none" stroke="#879376" strokeWidth="5" opacity=".7"/></>}
 </>:kind==='pippin'?<>
  <path d={critical?'M40 183l16-17 14 9-5 13 17 11-11 19-21-5-15 8z':'M45 189l14-11 15 15-8 15-17-4z'} fill="#817c84" stroke="#86927e" strokeWidth="3"/>
  <path d={critical?'M47 185l11-10 8 9-5 12 12 5-8 11-15-7z':'M51 190l9-5 8 9-7 9-9-4z'} fill="#c69aab"/>
  <path d="M44 184l-8-5m24-8l2-11m10 41l10 2m-28 9l-4 10" stroke="#e6dac5" strokeWidth="3"/>
  <path d="M60 206q-6 9 0 12q6-3 0-12M206 233l12 7" fill="#a46b7a" stroke="#a46b7a" strokeWidth="2"/>
  {critical&&<><path d="M241 177l17-9 18 14-11 12 12 13-20 12-15-17z" fill="#b98d9b" stroke="#7e8a78" strokeWidth="3"/><path d="M245 180l14 18m5-25l-13 21m-2 16l15-3" stroke="#e5cfbf" strokeWidth="2"/><path d="M248 100q-9 15 2 25l-4 9" fill="none" stroke="#a57782" strokeWidth="3" strokeDasharray="3 5"/><path d="M253 212q-5 10 1 12q5-3-1-12" fill="#a46b7a"/></>}
 </>:<>
  <path d={critical?'M177 77l20-10 17 11-8 13 13 14-17 11-22-11 4-12z':'M181 82l15-7 12 12-9 15-16-8z'} fill="#81745f" stroke="#7e886c" strokeWidth="3"/>
  <path d={critical?'M185 81l13-6 9 7-8 10 10 9-8 7-12-9z':'M187 84l8-3 7 7-6 8-8-5z'} fill="#c39382"/>
  <path d="M180 83l-9-4m22-10l-2-8m16 30l10-1m-20 20l-4 7" stroke="#e3d1ac" strokeWidth="3"/>
  <path d="M204 110q-6 9 0 12q6-3 0-12M91 169l10 7m-12 1l9 5" fill="#a56262" stroke="#a56262" strokeWidth="2"/>
  {critical&&<><path d="M100 225l16-10 13 13-6 19-18 4-9-13z" fill="#b7857a" stroke="#7a8569" strokeWidth="3"/><path d="M106 224l6 18m8-19l-11 8m-9 9l22-2" stroke="#ebd5b4" strokeWidth="2"/><path d="M110 247q-7 11 0 14q7-4 0-14" fill="#a56262"/><path d="M148 44l5 17 12-7m-8 8l10 8" stroke="#a76e68" fill="none" strokeWidth="3"/></>}
 </>}
 </g>
}
`;
s=s.slice(0,art)+wear+s.slice(art);
s=s.replace('      </g>\n      <g transform={`translate(${look.x},${look.y})`} className="face">','        <SpookyWear kind="mochi" level={level}/>\n      </g>\n      <g transform={`translate(${look.x},${look.y+(level>=3?6:0)})`} className="face">');
s=s.replace('      <g transform={`translate(${look.x},${look.y})`}>','      <SpookyWear kind="pippin" level={level}/>\n      <g transform={`translate(${look.x},${look.y})`}>');
s=s.replace('      </g>\n      <g transform={`translate(${look.x},${look.y + (curl ? 17 : 0)})`}>','        <SpookyWear kind="crumb" level={level}/>\n      </g>\n      <g transform={`translate(${look.x},${look.y + (curl ? 17 : 0)})`}>');
s=s.replace('Completed tasks give +10 care. Missed tasks take up to 8 care.','Completed tasks earn 5 coins. Buy food, water or soap, then use it for +15 care and +4 happiness. Missed tasks take up to 8 care.');
fs.writeFileSync(p,s);
