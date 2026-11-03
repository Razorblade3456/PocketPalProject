const test=require('node:test');const assert=require('node:assert/strict');const vm=require('node:vm');const fs=require('node:fs');const path=require('node:path');
test('desktop window stays transparent and only the trusted timer can resize it',async()=>{
 const handlers={},handles={},windows=[],menus=[],writes=[];let savedJson=JSON.stringify({x:1820,y:980,snapshot:JSON.stringify({pet:"mochi",coins:41,inventory:{food:3},tasks:[{id:"keep"}]})});const originalSnapshot=JSON.parse(savedJson).snapshot;const area={x:0,y:0,width:1920,height:1080};
 class Window {constructor(options){this.options=options;this.bounds={...options};this.webContents={on(){},send(){},setFrameRate(){},setWindowOpenHandler(){}};windows.push(this);}setAlwaysOnTop(){}on(){}async loadFile(){}isDestroyed(){return false;}getBounds(){return this.bounds;}getContentBounds(){return this.bounds;}getPosition(){return [this.bounds.x,this.bounds.y];}setPosition(x,y){Object.assign(this.bounds,{x,y});}setContentSize(width,height){Object.assign(this.bounds,{width,height});}}
 const electron={app:{requestSingleInstanceLock:()=>true,on(){},whenReady:()=>Promise.resolve(),getPath:()=>'.',quit(){},exit(){}},BrowserWindow:Window,ipcMain:{handle:(name,fn)=>handles[name]=fn,on:(name,fn)=>handlers[name]=fn},Menu:{buildFromTemplate:template=>{menus.push(template);return {popup(){}};}},shell:{},screen:{getPrimaryDisplay:()=>({workArea:area}),getDisplayNearestPoint:()=>({workArea:area}),on(){}},dialog:{showErrorBox:(_,error)=>{throw Error(error);}}};
 vm.runInNewContext(fs.readFileSync(path.join(__dirname,'main.cjs'),'utf8'),{require:name=>name==='electron'?electron:name==='node:fs'?{readFileSync:()=>savedJson,writeFileSync:(_,value)=>{savedJson=value;writes.push(JSON.parse(value));}}:require(name),__dirname,console:{log(){},error(){}}});
 await new Promise(resolve=>setImmediate(resolve));const pet=windows[0];assert.ok(pet);
 for(const [key,value] of Object.entries({frame:false,transparent:true,backgroundColor:'#00000000',alwaysOnTop:true,resizable:false,hasShadow:false,skipTaskbar:true}))assert.equal(pet.options[key],value,key);
 assert.equal(pet.bounds.width,160);assert.equal(pet.bounds.height,168);
 handlers['pet:timer-visible']({sender:{}},true);assert.equal(pet.bounds.height,168);
 handlers['pet:timer-visible']({sender:pet.webContents},true);assert.equal(pet.bounds.height,226);assert.equal(pet.bounds.width,160);assert.ok(pet.bounds.y+pet.bounds.height<=1080);
 handlers['pet:timer-visible']({sender:pet.webContents},false);assert.equal(pet.bounds.height,168);
 handlers['pet:timer-visible']({sender:pet.webContents},'true');assert.equal(pet.bounds.height,168);
 handlers['pet:menu']({sender:pet.webContents});const choices=menus[0].find(item=>item.label==='Change Pet').submenu;assert.deepEqual(Array.from(choices,item=>item.label),['Mochi','Pippin','Crumb','Rattle']);
 for(const [index,kind]of ['mochi','pippin','crumb','rattle'].entries()){choices[index].click();assert.equal(handles['pet:settings']({sender:pet.webContents}).kind,kind);assert.equal(writes.at(-1).kind,kind);}
 assert.equal(writes.at(-1).snapshot,originalSnapshot);
 handles['pet:select']({sender:{}},'mochi');assert.equal(writes.at(-1).kind,'rattle');handles['pet:select']({sender:pet.webContents},'invalid');assert.equal(writes.at(-1).kind,'rattle');
 vm.runInNewContext(fs.readFileSync(path.join(__dirname,'main.cjs'),'utf8'),{require:name=>name==='electron'?electron:name==='node:fs'?{readFileSync:()=>savedJson,writeFileSync(){}}:require(name),__dirname,console:{log(){},error(){}}});
 await new Promise(resolve=>setImmediate(resolve));assert.equal(handles['pet:settings']({sender:windows[1].webContents}).kind,'rattle');assert.equal(handles['pet:settings']({sender:windows[1].webContents}).snapshot,originalSnapshot);
});
