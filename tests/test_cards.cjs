'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
(async () => {
  const elements = new Map(), downloads = [], events = [], drawing = [], observers = [];
  const native = process.env.TRIPBOX_CANVAS_MODULE ? require(process.env.TRIPBOX_CANVAS_MODULE) : null;
  const surface = native?.createCanvas(1800, 1200);
  const nativeCtx = surface?.getContext('2d');
  const ctx = new Proxy({
    measureText: text => nativeCtx ? nativeCtx.measureText(text) : ({width: text.length * 25}),
    fillRect: (...args) => { drawing.push(['rect',...args]); nativeCtx?.fillRect(...args); },
    fillText: (...args) => { drawing.push(['text',...args]); nativeCtx?.fillText(...args); },
    drawImage: (image,...args) => { drawing.push(['image',...args]); if(nativeCtx) nativeCtx.drawImage(image.native,...args); }
  }, {set(target,key,value) { target[key]=value; if(nativeCtx) nativeCtx[key]=value; return true; }});
  function element(id) {
    if (elements.has(id)) return elements.get(id);
    const e = {value: '', disabled: false, hidden: false, children: [], listeners: {},
      addEventListener(type, cb) { this.listeners[type]=cb; },
      replaceChildren() {this.children=[];this.value='';},
      append(option) {this.children.push(option);if(this.children.length===1)this.value=String(option.value);},
      click() {downloads.push({name:this.download,href:this.href});}
    };
    if(id==='card-preview') {
      Object.defineProperties(e,{width:{get:()=>surface?.width||e._width,set:v=>{e._width=v;if(surface)surface.width=v;}},height:{get:()=>surface?.height||e._height,set:v=>{e._height=v;if(surface)surface.height=v;}}});
      e.getContext=()=>ctx;
      e.toBlob=callback=>callback(native ? new Blob([surface.toBuffer('image/png')],{type:'image/png'}) : new Blob(['test'],{type:'image/png'}));
    }
    elements.set(id,e);return e;
  }
  element('card-type').value='postcard';
  element('card-heading').value='Wish you were here';
  element('card-message').value='A memory worth keeping.';
  let photoImage;
  if(native) {
    const fixture=native.createCanvas(900,600),f=fixture.getContext('2d');
    f.fillStyle='#386f9c';f.fillRect(0,0,900,600);f.fillStyle='#f4cf78';f.beginPath();f.arc(240,260,150,0,Math.PI*2);f.fill();
    photoImage=fixture.toBuffer('image/png');
  }
  const photos=[];
  class TestImage {
    constructor(){this.naturalWidth=900;this.naturalHeight=600;}
    async decode(){if(native){this.native=await native.loadImage(photoImage);this.naturalWidth=this.native.width;this.naturalHeight=this.native.height;}}
  }
  const context={document:{getElementById:element,createElement:()=>element('generated-'+Math.random())},Image:TestImage,photos,
    window:{posthog:{capture:(...args)=>events.push(args)}},navigator:{clipboard:{writeText:async text=>{context.copied=text;}}},
    MutationObserver:class{constructor(cb){observers.push(cb);}observe(){}},URL:{createObjectURL:blob=>{context.lastBlob=blob;return 'blob:test';},revokeObjectURL(){}},setTimeout,console};
  vm.createContext(context);vm.runInContext(fs.readFileSync('docs/prototype/cards.js','utf8'),context);
  const settle=async()=>{for(let i=0;i<10;i++)await new Promise(r=>setTimeout(r,5));};
  await settle();assert.equal(element('card-download').disabled,true);
  photos.push({id:1,name:'Synthetic fixture.png',selected:true,excluded:false,originalUrl:'local-test'});
  observers[0]();await settle();
  assert.equal(element('card-download').disabled,false);
  for(const [type,width,height] of [['postcard',1800,1200],['thanks',2100,1500],['invitation',1500,2100],['birthday',1500,2100]]) {
    element('card-type').value=type;element('card-type').listeners.change();await settle();
    const canvas=element('card-preview');assert.equal(canvas.width,width);assert.equal(canvas.height,height);
    assert.match(element('canva-handoff').href,/^https:\/\/www.canva.com\//);
    assert.equal(element('card-download').disabled,false);
    element('card-download').listeners.click();await settle();
    assert.equal(downloads.at(-1).name,`tripbox-${type}.png`);
    assert.equal(context.lastBlob.type,'image/png');
    if(native&&process.env.TRIPBOX_CARD_OUTPUT&&type==='postcard')fs.writeFileSync(process.env.TRIPBOX_CARD_OUTPUT,Buffer.from(await context.lastBlob.arrayBuffer()));
  }
  await element('card-copy').listeners.click();assert.match(context.copied,/Happy Birthday!/);
  assert.equal(events.length,4);assert.deepEqual(Object.keys(events[0][1]),['card_type']);
  const image=drawing.find(row=>row[0]==='image');assert.equal(Math.round(image[3]/image[4]*100),150,'Photo composition must retain the original 3:2 ratio');
  photos[0].selected=false;observers[0]();await settle();assert.equal(element('card-download').disabled,true);assert.equal(element('card-preview').hidden,true);
  console.log('Card studio: empty state, 4 formats, uncropped image, PNG download, text copy, analytics privacy, and selection reset passed'+(native?' with native PNG encoding.':'.'));
})();

