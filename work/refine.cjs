const fs=require('fs');let p='src/model.test.ts',s=fs.readFileSync(p,'utf8');s=s.replace('  const s = setup();\n  assert.deepEqual(decay(s, now + 23 * hour).care, s.care);','  const s = setup();\n  s.tasks = [];\n  assert.deepEqual(decay(s, now + 23 * hour).care, s.care);');s=s.replace('  s = changeSettings(s, { cozy: false }, now);\n  const a = setOutcome(s, "a", dateKey(now), "missed", now);','  s.settings.cozy = false;\n  s.baseline.cozy = false;\n  const a = setOutcome(s, "a", dateKey(now), "missed", now);');fs.writeFileSync(p,s);
p='src/App.tsx';s=fs.readFileSync(p,'utf8');s=s.replace('  initial,\n','').replace('  validState,\n','').replace('sleep={night && level < 5}','sleep={night && level < 2}');fs.writeFileSync(p,s);
p='src/model.ts';s=fs.readFileSync(p,'utf8');s=s.replace('      const s = parseState(JSON.parse(raw));\n      if (s) return s;',`      const parsed = JSON.parse(raw);
      const s = parseState(parsed);
      if (s) {
        if (parsed.version === 1 && !localStorage.getItem('pocketpal-before-outcomes')) {
          try { localStorage.setItem('pocketpal-before-outcomes',raw); } catch { /* Leave the original save available if storage is full. */ }
        }
        return s;
      }`);fs.writeFileSync(p,s);
p='public/sw.js';s=fs.readFileSync(p,'utf8').replace('pocketpal-shell-v1','pocketpal-shell-v2');fs.writeFileSync(p,s);
