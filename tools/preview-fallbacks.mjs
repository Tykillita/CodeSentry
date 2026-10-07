// Local inspection only. Serves the production output without scripts (4323)
// or with the deferred WebGL module deliberately unavailable (4324).
import {createServer} from 'node:http';
import {readFile,stat} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
const root=resolve(import.meta.dirname,'../dist');
const mime={'.html':'text/html; charset=utf-8','.css':'text/css','.js':'text/javascript','.svg':'image/svg+xml','.webp':'image/webp','.woff2':'font/woff2','.woff':'font/woff','.ogg':'audio/ogg','.wav':'audio/wav','.txt':'text/plain'};
for(const [port,mode] of [[4323,'nojs'],[4324,'webgl-failure']]) {
  createServer(async(req,res)=>{
    try {
      const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
      let file=resolve(root,'.'+pathname);
      if(file!==root&&!file.startsWith(root+sep)){res.writeHead(403).end();return;}
      if((await stat(file)).isDirectory())file=resolve(file,'index.html');
      if(mode==='webgl-failure'&&file.includes('SakuraCanvas.')){res.writeHead(503,{'Content-Type':'text/javascript'}).end('/* Deliberate local failure */');return;}
      const type=extname(file);let data=await readFile(file);
      if(type==='.html'&&mode==='nojs')data=Buffer.from(data.toString().replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'').replace(/<\/?noscript>/gi,''));
      res.writeHead(200,{'Content-Type':mime[type]||'application/octet-stream','Cache-Control':'no-store'}).end(data);
    }catch {res.writeHead(404).end('Not found');}
  }).listen(port,'127.0.0.1',()=>console.log(`${mode}: http://127.0.0.1:${port}/es/`));
}
