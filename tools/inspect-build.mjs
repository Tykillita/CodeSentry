import {readdir,readFile,stat,writeFile} from 'node:fs/promises';
import {resolve,relative} from 'node:path';
import {gzipSync} from 'node:zlib';
const root=resolve(import.meta.dirname,'..');const dist=resolve(root,'dist');
async function walk(folder){const entries=await readdir(folder,{withFileTypes:true});return (await Promise.all(entries.map(e=>e.isDirectory()?walk(resolve(folder,e.name)):[resolve(folder,e.name)]))).flat();}
const files=await walk(dist);const bytes=await Promise.all(files.map(async file=>({path:relative(dist,file).replaceAll('\\','/'),bytes:(await stat(file)).size})));
const js=await Promise.all(files.filter(f=>f.endsWith('.js')).map(async f=>({path:relative(dist,f).replaceAll('\\','/'),gzip:gzipSync(await readFile(f)).length})));
const pages=await Promise.all(['es','en'].map(async lang=>{const html=await readFile(resolve(dist,lang,'index.html'),'utf8');return {lang,projectCards:(html.match(/class="panel project-panel/g)||[]).length,details:(html.match(/class="fallback-detail"/g)||[]).length,privatePaths:/[CD]:[\\/]|\.env\b|BEGIN PRIVATE KEY/.test(html),audioElementOnEntry:/<audio\b/.test(html)};}));
const report={generated:new Date().toISOString(),pages,totalBytes:bytes.reduce((n,f)=>n+f.bytes,0),javascriptGzipBytes:js.reduce((n,f)=>n+f.gzip,0),javascript:js,media:bytes.filter(f=>f.path.startsWith('media/')),routes:bytes.filter(f=>f.path.endsWith('.html')).map(f=>f.path)};
await writeFile(resolve(root,'docs/build-report.json'),JSON.stringify(report,null,2));
console.log(JSON.stringify(report,null,2));
