const fs=require('fs');let p='src/main.tsx',s=fs.readFileSync(p,'utf8');s=s.replace('createRoot(document.getElementById("root")!).render(',`const root = import.meta.hot?.data.root ?? createRoot(document.getElementById("root")!);
if(import.meta.hot) import.meta.hot.data.root = root;
root.render(`);fs.writeFileSync(p,s);
