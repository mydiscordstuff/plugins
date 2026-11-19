const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const source = fs.readFileSync(path.join(__dirname, "../plugins/pin-dms/index.js"), "utf8");
const tick = () => new Promise(r => setImmediate(r));
const copy = x => JSON.parse(JSON.stringify(x));
const base = { groups: [
  { id:"one", name:"Amigos", color:"#37DC75", collapsed:false, ids:["b","a"] },
  { id:"two", name:"Jogos", color:"#DF0044", collapsed:true, ids:["c"] },
], labels:{ b:{name:"Bia",color:"#00ABCD"} } };
function element(type, props, ...kids) {
  return { type, props:{...props,...(kids.length ? {children:kids.length===1 ? kids[0] : kids} : {})} };
}
async function host(initial = base) {
  let current="me", data={accounts:{me:copy(initial)}}, route, section, state=[], ptr=0, tasks=[];
  const callbacks=[], finders={}, userEvents=new Set();
  const channels={a:"André",b:"Beatriz",c:"Caio",d:"Dani"};
  const R={createElement:element,isValidElement:e=>!!e?.type,cloneElement:(el,props,...kids)=>element(el.type,{...el.props,...props},...kids),
    useSyncExternalStore:(sub,get)=>get(),useMemo:f=>f(),
    useState(v){const i=ptr++;if(!(i in state))state[i]=v;return [state[i],x=>{state[i]=typeof x==="function"?x(state[i]):x;}];},
    useEffect(f,deps){const i=ptr++;if(!state[i] || !deps.every((x,j)=>x===state[i][j])){state[i]=deps;tasks.push(f);}}};
  const node={TextInput:"input",View:"view",ScrollView:"scroll",Pressable:"press",Keyboard:{dismiss(){}},
    Alert:{alert:(_title,_text,choices)=>choices.at(-1).onPress()}};
  const stores={UserStore:{getCurrentUser:()=>({id:current}),addChangeListener:f=>userEvents.add(f),removeChangeListener:f=>userEvents.delete(f)},
    PrivateChannelSortStore:{getSortedChannels:()=>[[{channelId:"a"}],["b","c","d"].map(channelId=>({channelId}))]},
    ChannelStore:{getChannel:id=>({id,name:channels[id]})}};
  const settings={onSettingsModulesLoaded:fn=>{fn();return ()=>{};},registerSettingsItem(k,s){route=s;return ()=>route=null;},
    addSettingsItemToSection(k){section=k;return ()=>section=null;},refreshSettings(){}};
  const api={react:{React:R,ReactNative:node},components:{},discord:{flux:{Stores:stores},design:{Design:{TableRow:"row",TableRowGroup:"group",Text:"text"}},
    modules:{settings},utils:{modules:{finders:{getModuleWithImportedPath(p,fn){
      const mod={default:{type:props=>props.tree}};finders[p.split("/").at(-1).replace(".tsx","")]=mod.default;fn(mod);return ()=>{};
    }}}}},patcher:{instead(o,k,fn){const original=o[k];o[k]=function(...args){return fn.call(this,args,original);};return ()=>{o[k]=original;};}}};
  const pl=vm.runInNewContext(source,{valenced:api,plugin:x=>x}).default;
  pl.start({jsonStorage:{get:async()=>data,set:async x=>{data=copy(x);}},cleanup:cb=>callbacks.push(cb)});
  await tick();
  function draw(){ptr=0;const nested=route.screen.getComponent()({});const result=nested.type(nested.props);tasks.splice(0).forEach(f=>f());return result;}
  function pick(k,v){function find(n){if(!n || typeof n!=="object")return undefined;if(n.props?.[k]===v)return n;
    return [n.props?.children].flat(2).map(find).find(Boolean);}
    const n=find(draw());assert.ok(n,k+" "+v);return n.props;}
  return {data:()=>data,section:()=>section,finders,pick,draw,R,account(id){current=id;userEvents.forEach(f=>f());},
    async stop(){callbacks.reverse().forEach(f=>f());await tick();assert.equal(section,null);assert.equal(route,null);assert.equal(userEvents.size,0);}};
}
const leaf = el => el.type(el.props);
const dm = (id,kind="channel")=>({channelId:id,kind});
for (const kind of ["Flash","Legend"]) test(kind+" groups native rows, preserves suggestions and toggles collapse",async()=>{
  const h=await host();assert.equal(h.section(),"VALENCED");
  const orig=[dm("a","favorite"),dm("b"),dm("c"),dm("d"),{kind:"friendsHeader"},{kind:"suggestedFriend"}];
  const props={data:orig,stickyHeaderIndices:[4],keyExtractor:r=>r.channelId||r.kind,getItemType:r=>r.kind,getFixedItemSize:()=>60,
    renderItem:({item})=>element("native",{id:item.channelId,stickyAt:240})};
  const render=()=>leaf(h.finders["Messages"+kind+"List"].type({tree:element("list",props),listItemHeight:60})).props;
  let ui=render();assert.deepEqual(Array.from(ui.data,r=>r.channelId||r.key||r.kind),["one","b","a","two","other","d","friendsHeader","suggestedFriend"]);
  assert.equal(ui.stickyHeaderIndices[0],6);assert.equal(ui.renderItem({item:ui.data[6]}).props.stickyAt,312);
  assert.equal(ui.getFixedItemSize(ui.data[0]),44);assert.equal(ui.getItemType(ui.data[0]),"pin-dms-header");
  assert.equal(ui.keyExtractor(ui.data[0]),"pin-dms:one");
  const press=leaf(ui.renderItem({item:ui.data[0]}));press.props.onPress();await tick();ui=render();
  assert.deepEqual(Array.from(ui.data,r=>r.channelId||r.key||r.kind),["one","two","other","d","friendsHeader","suggestedFriend"]);
  assert.equal(orig.length,6);h.account("second");assert.strictEqual(render().data,orig);
  await h.stop();assert.equal(h.data().accounts.me.groups[0].collapsed,true);
});
test("FastestList translates virtual indices to original unread rows, keys, headers and sizes",async()=>{
  const h=await host(),data={channelFavorites:[dm("a")],channels:["b","c","d"].map(id=>dm(id))};
  const p={sections:[1,3,1,2,0],renderItem:(s,r)=>s+":"+r,keyExtractor:(t,s,r)=>[t,s,r].join(":"),itemSize:s=>[60,60,8,32,60][s],
    sectionHeaderSize:s=>s===3?20:0,renderSectionHeader:s=>"section "+s};
  const next=leaf(h.finders.MessagesFastestList.type({tree:element("list",p),data})).props;
  assert.deepEqual(Array.from(next.sections),[1,2,1,1,0,1,1,2,0]);
  assert.equal(next.renderItem(1,0),"1:0");assert.equal(next.renderItem(1,1),"0:0");assert.equal(next.renderItem(5,0),"1:2");
  assert.equal(next.itemSize(0,0),44);assert.equal(next.itemSize(6),8);
  assert.equal(next.keyExtractor(0,1,0),"0:1:0");assert.equal(next.keyExtractor(0,2,0),"pin-dms:two");
  assert.equal(next.sectionHeaderSize(7),20);assert.equal(next.renderSectionHeader(7),"section 3");await h.stop();
});
test("settings create, recolor, move and delete categories; DM names stay local",async()=>{
  const h=await host({groups:[],labels:{}});h.draw();const tap=text=>h.pick("label",text).onPress();
  const type=(hint,v)=>h.pick("placeholder",hint).onChangeText(v);
  tap("Criar categoria");type("Nome da categoria","Dupla");type("Cor da categoria (#RRGGBB)","#bb3344");tap("Salvar nome e cor");
  tap("Beatriz");tap("Dupla");tap("Beatriz");type("Apelido local (opcional)","Bia");type("Cor do nome (opcional)","#00abcd");tap("Salvar nome e cor");
  await tick();const saved=h.data().accounts.me;assert.equal(saved.groups[0].color,"#BB3344");assert.deepEqual(saved.groups[0].ids,["b"]);
  const tree=element("box",{},element("name",{lineClamp:1,ellipsizeMode:"tail"},"Beatriz"),element("preview",{},"mensagem"));
  const out=leaf(h.finders.MessagesItemChannelContent.type({tree,channel:{id:"b",name:"Beatriz"}}));
  assert.equal(out.props.children[0].props.children,"Bia");assert.equal(out.props.children[0].props.style[1].color,"#00ABCD");
  assert.equal(tree.props.children[0].props.children,"Beatriz");assert.equal(out.props.children[1],tree.props.children[1]);
  tap("Dupla");tap("Excluir categoria");await h.stop();assert.deepEqual(h.data().accounts.me.groups,[]);assert.equal(h.data().accounts.me.labels.b.name,"Bia");
});
