const fs=require('fs');let p='src/model.test.ts',s=fs.readFileSync(p,'utf8');s=s.replace('  BALANCE,','  BALANCE,\n  buySupply,\n  useSupply,\n  petRhythm,\n  SUPPLIES,');s=s.replace('positive and negative give exactly +10 or -8 in the selected category','positive earns 5 coins without direct care, while a miss applies -8');s=s.replace('  assert.equal(positive.care.water, 95);','  assert.equal(positive.care.water, 85);\n  assert.equal(positive.coins,5);');s=s.replace('  assert.equal(a.care.water, 95);','  assert.equal(a.care.water, 85);\n  assert.equal(a.coins,5);');
s=s.replace('  const a = complete(s, "a", now);\n  assert.equal(a.care.water, 100);',`  const recorded = complete(s,'a',now);
  const a=parseState({...recorded,version:2,outcomes:recorded.outcomes.map(({rewardCare,rewardCoins,...o})=>o)},now)!;
  assert.equal(a.care.water, 100);`);
s=s.replace('  assert.equal(a.care.water, 100);\n  a = setOutcome(a, "a", dateKey(now), "pending", now + 100);',`  a=parseState({...a,version:2,outcomes:a.outcomes.map(({rewardCare,rewardCoins,...o})=>o)},now+100)!;
  assert.equal(a.care.water, 100);
  a = setOutcome(a, "a", dateKey(now), "pending", now + 100);`);
// One historical-replay assertion must keep the old +10 behavior.
s=s.replace('  assert.equal(a.care.water, 85);\n  assert.equal(a.coins,5);\n  assert.equal(a.completions.length, 1);\n});\n\ntest("daily,','  assert.equal(a.care.water, 95);\n  assert.equal(a.completions.length, 1);\n});\n\ntest("daily,');
s=s.replace('  s = complete(s, "a", now);\n  assert.equal(s.care.water, 100);','  s = complete(s, "a", now);\n  s = useSupply(buySupply(s,"water",now),"water",now);\n  assert.equal(s.care.water, 100);').replace('  assert.equal(s.care.water, 90);\n  assert.deepEqual(reload(s).care, s.care);','  assert.equal(s.care.water, 100);\n  assert.equal(s.debt,4);\n  assert.deepEqual(reload(s).care, s.care);');
fs.writeFileSync(p,s);
p='src/model.ts';s=fs.readFileSync(p,'utf8').replace('!!SUPPLIES[e.item]','(["food","water","soap"] as Supply[]).includes(e.item)');fs.writeFileSync(p,s);
p='src/Jar.tsx';s=fs.readFileSync(p,'utf8').replace('<div className="jar-lid" />','<motion.div className="jar-lid" animate={!small&&incoming.length&&!reduce?{x:48,y:-28,rotate:18}:{x:0,y:0,rotate:0}} transition={{duration:.25}}/>');fs.writeFileSync(p,s);
