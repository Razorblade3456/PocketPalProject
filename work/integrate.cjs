const fs=require('fs');let p='src/model.ts',s=fs.readFileSync(p,'utf8');s=s.replace(/sequence: \+\+lastSequence,\s*\}\);/g,'sequence: ++lastSequence, rewardCare: 0, rewardCoins: BALANCE.completedCoins, });');fs.writeFileSync(p,s);
p='src/TaskOutcomes.tsx';s=fs.readFileSync(p,'utf8');s=`import type {RewardSource} from './Jar';\n`+s;s=s.replace('onChange: (status: OutcomeStatus) => void;','onChange: (status: OutcomeStatus,source?:RewardSource) => void;');s=s.replace('title="I completed this task · +10 care"','title="I completed this task · +5 coins"');s=s.replace('onClick={() => onChange("completed")}','onClick={e=>{const r=e.currentTarget.getBoundingClientRect();onChange("completed",{x:r.left+r.width/2,y:r.top+r.height/2})}}');s=s.replace('onChange: (t: Task, status: OutcomeStatus, date: string) => void;','onChange: (t: Task, status: OutcomeStatus, date: string,source?:RewardSource) => void;');s=s.replace('onChange={(status) => onChange(o.task, status, selected)}','onChange={(status,source) => onChange(o.task, status, selected,source)}');s=s.replace('jar rewards are recalculated together.','jar rewards and coins are recalculated together. Bought supplies stay yours; any spent-coin shortfall is reserved from future wins.');fs.writeFileSync(p,s);
p='src/App.tsx';s=fs.readFileSync(p,'utf8');s=s.replace('  Trophy,','  Trophy,\n  Coins,');s=s.replace('  categories,','  categories,\n  SUPPLIES,\n  buySupply,\n  useSupply,\n  petRhythm,\n  occurrenceKey,\n  type Supply,');s=s.replace('const icons =',`import {Jar,RewardFlights,type JarFlight,type RewardSource} from './Jar';
import {Supplies} from './Supplies';
const icons =`);
const jstart=s.indexOf('function Jar('),jend=s.indexOf('export default function App()',jstart);s=s.slice(0,jstart)+s.slice(jend);
s=s.replace('  const [now, setNow]',`  const [flights,setFlights] = useState<JarFlight[]>([]);
  const [landed,setLanded] = useState<string>();
  const [jarPulse,setJarPulse] = useState(0);
  const jarRef=useRef<HTMLDivElement>(null);
  const [now, setNow]`);
s=s.replace('  const todayTasks =','  const rhythm=petRhythm(now);\n  const todayTasks =');
s=s.replace('  const reward = (t: Task, status: OutcomeStatus, date = today) => {','  const reward = (t: Task, status: OutcomeStatus, date = today,source?:RewardSource) => {');
s=s.replace('    setS((p) => setOutcome(p, t.id, date, status));',`    setS((p) => setOutcome(p, t.id, date, status));
    const key=occurrenceKey(t.id,date);
    setFlights(prev=>prev.filter(f=>f.key!==key));
    if(status==='completed'&&date===today&&!panel){
      const origin=source||{x:window.innerWidth/2,y:window.innerHeight/2};
      setFlights(prev=>[...prev,{key,token:crypto.randomUUID(),category:t.category,source:origin}]);
    }`);
s=s.replace('          : indicator,','          : "+5 coins · a little win!",');
s=s.replace('? "Back to pending. Care and jar rewards restored."','? (next.debt>0 ? `Back to pending. ${next.debt} coins reserved from future wins; supplies stay yours.` : "Back to pending. Coins, care and jar rewards recalculated.")');
s=s.replace('? "Past-day result corrected. Care and jar rewards recalculated."','? (next.debt>0 ? `Past result corrected. ${next.debt} coins reserved from future wins.` : "Past result corrected. Coins, care and jar rewards recalculated.")');
s=s.replace('? indicator + " · A little win for you and your pal."','? (next.debt>0?`+5 coins earned · ${next.debt} still reserved from future wins.`:"+5 coins · A little win! Pick up a supply to care for your pal.")');
const ret=s.indexOf('  return (\n    <MotionConfig');s=s.slice(0,ret)+`  const land=(flight:JarFlight)=>{
    setFlights(prev=>prev.filter(f=>f.token!==flight.token));
    setLanded(flight.key);setJarPulse(p=>p+1);tone(s.settings.sound,0);
  };
  useEffect(()=>{
    setFlights(prev=>{const next=prev.filter(f=>s.outcomes.some(o=>occurrenceKey(o.taskId,o.date)===f.key&&o.status==='completed'));return next.length===prev.length?prev:next});
  },[s.outcomes]);
  const purchase=(item:Supply)=>{
    const next=buySupply(s,item);
    if(next.careEvents.length===s.careEvents.length){setMessage('A few more little wins will stock this shelf.');return;}
    setS(p=>buySupply(p,item));tone(s.settings.sound,0);setMessage(SUPPLIES[item].name+' tucked onto your shelf. Use it whenever your pal needs care.');
  };
  const careFor=(item:Supply)=>{
    const next=useSupply(s,item);
    if(next.careEvents.length===s.careEvents.length){setMessage(level===5?'Revive your pal before using a supply.':'Your shelf needs a refill first.');return;}
    setS(p=>useSupply(p,item));
    const v=SUPPLIES[item],gain=Math.round((next.care[v.category]-s.care[v.category])*10)/10;
    setReaction(({food:'🍎',water:'💧',soap:'✨'})[item]+' +'+Math.max(0,gain)+' '+labels[v.category]);
    tone(s.settings.sound,1);setMessage(v.name+' used · +'+Math.max(0,gain)+' '+labels[v.category]+' and a little happiness.');
  };
`+s.slice(ret);
s=s.replace('            <span className="date">',`            <a className="wallet" href="#supplies" aria-label={'Wallet: '+s.coins+' coins'+(s.debt?', '+s.debt+' reserved from future rewards':'')} title="Complete little things to earn coins for care supplies"><Coins size={16}/><b>{s.coins}</b><span>coins</span>{s.debt>0&&<small>{s.debt} reserved</small>}</a>
            <span className="date">`);
s=s.replace('onChange={(status) => reward(t, status)}','onChange={(status,source) => reward(t, status,today,source)}');
s=s.replace('sleep={night && level < 2}','sleep={rhythm.sleeping && level < 3}\n                  calm={rhythm.calm}');
s=s.replace('{night && level < 2\n                    ? "Dreaming of little adventures"\n                    : stages[level]}','{rhythm.sleeping && level < 3\n                    ? "Dreaming of little adventures"\n                    : rhythm.calm && level < 2 ? "Winding down for the evening" : stages[level]}');
s=s.replace('<Jar balls={earned} />','<Jar balls={earned} jarRef={jarRef} incoming={flights.map(f=>f.key)} landed={landed} pulse={jarPulse}/>');
s=s.replace('              </div>\n            </section>\n          </div>\n          <section className="care-section">','              </div>\n              <Supplies s={s} onBuy={purchase} onUse={careFor}/>\n            </section>\n          </div>\n          <section className="care-section">');
s=s.replace('        <AnimatePresence>\n          {message && (','        <RewardFlights flights={flights} jar={jarRef.current} onLand={land} enabled={s.settings.motion}/>\n        <AnimatePresence>\n          {message && (');
s=s.replace('                    Gentle reminders','                    Gentle reminders');
s=s.replace('                  Care decay\n','                  Care decay\n');
s=s.replace('                  Time estimates start from full care after the first-day grace','                  Sleep follows your local clock: 9pm–6am. Theme changes only the room lighting. Time estimates start from full care after the first-day grace');
s=s.replace('                  period. Every completed task restores care. Petting gives','                  period. Tasks earn coins; using supplies restores care. Petting gives');
fs.writeFileSync(p,s);

