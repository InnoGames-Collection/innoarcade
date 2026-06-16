import { spawn } from 'node:child_process';
import WebSocket from 'ws';
import { writeFileSync } from 'node:fs';
const CHROME='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const BASE='http://localhost:5173';
const chrome=spawn(CHROME,['--headless=new','--disable-gpu','--no-first-run','--no-sandbox','--window-size=440,1000','--remote-debugging-address=127.0.0.1','--remote-debugging-port=9498','--user-data-dir=/tmp/cshow','about:blank'],{stdio:'ignore'});
const wait=ms=>new Promise(r=>setTimeout(r,ms));
async function gj(){for(let i=0;i<40;i++){try{return await (await fetch('http://127.0.0.1:9498/json')).json();}catch{await wait(400);}}}
const t=(await gj()).find(x=>x.type==='page');
const ws=new WebSocket(t.webSocketDebuggerUrl,{perMessageDeflate:false});let id=0;const p=new Map();
const send=(m,pr={})=>{const i=++id;ws.send(JSON.stringify({id:i,method:m,params:pr}));return new Promise(r=>p.set(i,r));};
ws.on('message',d=>{const m=JSON.parse(d);if(m.id&&p.has(m.id)){p.get(m.id)(m);p.delete(m.id);}});
await new Promise(r=>ws.on('open',r));await send('Runtime.enable');await send('Page.enable');
const ev=async e=>{const r=await send('Runtime.evaluate',{expression:e,returnByValue:true,awaitPromise:true});return r.result&&r.result.result?r.result.result.value:undefined;};
await send('Page.navigate',{url:BASE+'/'});await wait(4000);
// sign in through the gate
await ev(`document.querySelector('#sgBtn')?.click()`);await wait(800);
await ev(`(()=>{const i=document.querySelector('#phone');i.value='+251911000000';})()`);
await ev(`document.querySelector('#go').click()`);await wait(2500);
await ev(`(()=>{const i=document.querySelector('#code');if(i)i.value='123456';})()`);
await ev(`document.querySelector('#go').click()`);await wait(3500);
console.log('gate gone:', await ev(`!document.querySelector('#signinGate')`));
await ev(`[...document.querySelectorAll('.seg-btn')].find(b=>b.dataset.filter==='all')?.click()`);await wait(500);
await ev(`[...document.querySelectorAll('.cat-shelf .game-card')].find(a=>/Candy/.test(a.querySelector('h4')?.textContent||''))?.scrollIntoView({block:'center'})`);await wait(500);
const r=await send('Page.captureScreenshot',{format:'png'});writeFileSync('/tmp/candyshow.png',Buffer.from(r.result.data,'base64'));
console.log('saved');
chrome.kill();process.exit(0);
