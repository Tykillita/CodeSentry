const urls = [
  'https://istargetsleeping.web.app/',
  'https://github.com/Tykillita/isTargetSleeping',
  'https://vetcentercaninosyfelinos.web.app/',
  'https://github.com/Tykillita/CentroVeterinario',
  'https://cwspace.web.app/novedades',
  'https://vigilia-health.vercel.app/',
  'https://vigilia-project-pi.vercel.app/',
  'https://github.com/rgkue/vigilia-project',
];
const results=await Promise.allSettled(urls.map(async url=>{
  const response=await fetch(url,{signal:AbortSignal.timeout(15000),headers:{'User-Agent':'CodeSentry-public-link-review'}});
  const html=await response.text();
  return {url,status:response.status,final:response.url,title:html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.trim()};
}));
results.forEach((result,i)=>console.log(JSON.stringify({url:urls[i],...result.status==='fulfilled'?result.value:{error:String(result.reason)}})));
