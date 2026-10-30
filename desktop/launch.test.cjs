const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');
const { EventEmitter } = require('node:events');
const source = fs.readFileSync(path.join(__dirname, 'launch.cjs'), 'utf8');
function simulate() {
  const child = new EventEmitter(); child.stdout = new EventEmitter(); child.stderr = new EventEmitter();
  const messages = []; let invocation;
  const fakeProcess = { version:'v22.17.0', versions:{node:'22.17.0'}, arch:'x64', env:{ TEMP:'C:\\Windows\\Temp', ELECTRON_RUN_AS_NODE:'1', ELECTRON_OVERRIDE_DIST_PATH:'wrong' }, stdout:{write(){}}, stderr:{write(){}} };
  const directory = 'C:\\Program Files\\Pocket Pal\\desktop';
  const executable = 'C:\\Program Files\\Pocket Pal\\node_modules\\electron\\dist\\electron.exe';
  vm.runInNewContext(source, {
    __dirname:directory, process:fakeProcess, console:{error:line=>messages.push(line)},
    require:id=> {
      if(id==='node:fs') return {writeFileSync(){},appendFileSync(){},mkdirSync(){},existsSync:()=>true};
      if(id==='node:child_process') return {spawn:(...args)=>{invocation=args; return child;}};
      if(id==='electron') { assert.match(fakeProcess.env.TEMP,/node_modules/); return executable; }
      if(id==='electron/package.json') return {version:'test'};
      return require(id);
    },
  });
  return {child,messages,invocation,fakeProcess,executable,directory};
}
test('launcher keeps paths with spaces intact and restores Windows temp before spawning',()=>{
  const {child,invocation,fakeProcess,executable,directory}=simulate();
  assert.equal(invocation[0],executable);
  assert.equal(invocation[1].length,1);
  assert.equal(invocation[1][0],path.join(directory,'main.cjs'));
  assert.equal(invocation[2].cwd,path.resolve(directory,'..'));
  assert.equal(invocation[2].env.TEMP,'C:\\Windows\\Temp');
  assert.equal(invocation[2].env.ELECTRON_RUN_AS_NODE,undefined);
  assert.equal(invocation[2].env.ELECTRON_OVERRIDE_DIST_PATH,undefined);
  child.emit('close',0,null); assert.equal(fakeProcess.exitCode,undefined);
});
test('native crash displays exact exit code and diagnostic command',()=>{
  const {child,messages,fakeProcess}=simulate(); child.emit('close',2147483651,null);
  assert.equal(fakeProcess.exitCode,1);
  assert.match(messages.join('\n'),/0x80000003/);
  assert.match(messages.join('\n'),/No PocketPal main-entry marker/);
  assert.match(messages.join('\n'),/--version/);
});
test('app failures are distinguished from native startup failures, including split log chunks',()=>{
  const {child,messages}=simulate();
  child.stdout.emit('data',Buffer.from('[PocketPal desktop] main '));
  child.stdout.emit('data',Buffer.from('entry reached\n'));
  child.emit('close',1,null);
  assert.match(messages.join('\n'),/PocketPal main entry was reached/);
  assert.doesNotMatch(messages.join('\n'),/No PocketPal main-entry marker/);
});
