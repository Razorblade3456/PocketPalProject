const fs=require('fs');const p='src/App.tsx';let s=fs.readFileSync(p,'utf8');
s=s.replace('  complete,','  setOutcome,\n  outcomeFor,\n  saveTask,\n  deleteTask,\n  changeSettings,\n  revive,\n  parseState,\n  type OutcomeStatus,');
s=s.replace('const icons =',`import {Pet,PetChoices,LifeGuide,stages,pets} from './Pets';
import {OutcomeControls,OutcomeHistory} from './TaskOutcomes';
const icons =`);
const st=s.indexOf('const stages ='),en=s.indexOf('function tone(');s=s.slice(0,st)+s.slice(en);
s=s.replace('"tasks" | "onboard" | null','"tasks" | "onboard" | "health" | null');
s=s.replace('    v: State["settings"][K],\n  ) => setS((p) => ({ ...p, settings: { ...p.settings, [k]: v } }));','    v: State["settings"][K],\n  ) => setS((p) => changeSettings(p, { [k]: v }));');
const rstart=s.indexOf('  const reward ='),rend=s.indexOf('  return (\n    <MotionConfig',rstart);
s=s.slice(0,rstart)+`  const reward = (t: Task, status: OutcomeStatus, date = today) => {
    if ((outcomeFor(s,t.id,date)?.status || 'pending') === status) return;
    const next = setOutcome(s,t.id,date,status);
    setS(p=>setOutcome(p,t.id,date,status));
    const difference = Math.round((next.care[t.category]-s.care[t.category])*10)/10;
    const indicator = (difference>0?'+':difference<0?'−':'')+Math.abs(difference)+' '+labels[t.category];
    setReaction(status==='pending'?'↶ care restored':status==='missed'?'−'+Math.abs(difference)+' '+labels[t.category]:indicator);
    tone(s.settings.sound,status==='completed'?1:status==='missed'?-3:0);
    setMessage(status==='pending'?'Back to pending. Care and jar rewards restored.':date!==today?'Past-day result corrected. Care and jar rewards recalculated.':status==='completed'?indicator+' · A little win for you and your pal.':difference===0?'Miss recorded. Your daily care cushion softened the damage.':indicator+' · Tomorrow is another little beginning.');
  };
`+s.slice(rend);
s=s.replace('t.time <= time && !earned.some((c) => c.taskId === t.id)',`t.time <= time && (!outcomeFor(s,t.id,today) || outcomeFor(s,t.id,today)?.status === 'pending')`);
s=s.replace('s.tasks, s.completions]);','s.tasks, s.outcomes]);');
s=s.replace('checked = earned.some((c) => c.taskId === t.id);',`status = outcomeFor(s,t.id,today)?.status || 'pending';`);
s=s.replace('className={`task-card ${checked ? "completed" : ""}`}','className={`task-card outcome-card ${status}`}');
const bstart=s.indexOf('                        <button\n                          className={`check-button');const bend=s.indexOf('                        <div className="task-content">',bstart);s=s.slice(0,bstart)+s.slice(bend);
s=s.replace('                        <button\n                          className="edit-button"',`                        <OutcomeControls status={status} name={t.name} onChange={status=>reward(t,status)}/>
                        <button
                          className="edit-button"`);
s=s.replace('color={s.color}','kind={s.pet}');
s=s.replace('                  {night && level < 5','                  {night && level < 2');
const rvstart=s.indexOf('                      setS((p) => ({\n                        ...p,\n                        updated: Date.now(),');const rvend=s.indexOf('                      setReaction("♥ hello again!");',rvstart);s=s.slice(0,rvstart)+'                      setS(p=>revive(p));\n'+s.slice(rvend);
s=s.replace('              <div className="room-footer">',`              <button className="life-guide-button" onClick={()=>setPanel('health')}><Heart size={13}/> Pet health & life stages <ChevronRight size={13}/></button>
              <div className="room-footer">`);
s=s.replace('                <TaskEditor\n','                <TaskEditor\n');
const tsStart=s.indexOf('                  setS((p) => ({\n                    ...p,\n                    tasks: edit');const tsEnd=s.indexOf('                  close();',tsStart);s=s.slice(0,tsStart)+'                  setS(p=>saveTask(p,t));\n'+s.slice(tsEnd);
const tdStart=s.indexOf('                        setS((p) => ({\n                          ...p,\n                          tasks: p.tasks.filter');const tdEnd=s.indexOf('                        close();',tdStart);s=s.slice(0,tdStart)+'                        setS(p=>deleteTask(p,edit.id));\n'+s.slice(tdEnd);
// Replace both recolor selectors with illustrated creature choices, retaining the user's custom name.
s=s.replace(/                  <label>\s+A little personality[\s\S]*?<\/label>/,`                  <PetChoices value={s.pet} onChange={pet=>{setS(p=>({...p,pet}));if(Object.values(pets).some(p=>p.name===draftName))setDraftName(pets[pet].name)}}/>`);
s=s.replace(/                <label>\s+Appearance[\s\S]*?<\/label>/,`                <PetChoices value={s.pet} onChange={pet=>setS(p=>({...p,pet}))}/>`);
const cs=s.indexOf('                      setS((p) => {\n                        const next = decay(p);');const ce=s.indexOf('                    }}',cs);s=s.slice(0,cs)+'                      setting("speed",Number(e.target.value));\n'+s.slice(ce);
s=s.replace('if (!validState(data)) throw Error();','const restored = parseState(data);\n                      if (!restored) throw Error();').replace('setS(decay(data));','setS(restored);');
s=s.replace('            ) : panel === "history" ? (',`            ) : panel === "health" ? (<LifeGuide kind={s.pet} actual={level}/>) : panel === "history" ? (`);
s=s.replace('                <h3>Your past jars</h3>','                <OutcomeHistory s={s} onChange={reward}/>\n                <h3>Your past jars</h3>');
s=s.replace('[...new Set(s.completions.map((c) => c.date))]','[...new Set(s.outcomes.map((c) => c.date))]');
s=s.replace('                {!s.completions.length && (','                {!s.outcomes.length && (');
// Jar identity follows the occurrence, not its array position, so corrections do not replay other balls.
s=s.replace('balls: { category: Category; at: number }[];','balls: { category: Category; at: number; taskId?: string; date?: string }[];').replace('key={b.at + "-" + i}','key={b.taskId ? JSON.stringify([b.taskId,b.date]) : b.at + "-" + i}');
fs.writeFileSync(p,s);
