const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const html = fs.readFileSync(process.argv[2] || 'index.html', 'utf8');
const scripts = [...html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g)].map(match => match[1]);
scripts.forEach(script => new vm.Script(script));
const app = scripts.find(script => script.includes('const DB='));
assert(app, 'Recipe script is present');
function block(start, end) {
  const from = app.indexOf(start);
  const to = app.indexOf(end, from + start.length);
  assert(from >= 0 && to > from, 'Missing app code: ' + start);
  return app.slice(from, to);
}
const dishes = {children: [], insertAdjacentHTML(_, markup) {this.children.push(card(markup, this.children.length));}};
function card(markup, position) {
  const note = {textContent:''};
  return {markup, dataset:{dishKey:markup.match(/data-dish-key="([^"]+)"/)[1]},
    querySelector(){return note;}, set outerHTML(next){dishes.children[position]=card(next,position);}};
}
const state={settings:{availableIngredients:'鸡腿肉、西兰花、胡萝卜'},plans:{old:[0,0,0,0]},aiInfo:{}};
const context=vm.createContext({state,todayKey:'today',viewDate:'today',rng:()=>()=>0,hash:()=>0,$:()=>dishes});
const run=code=>vm.runInContext(code,context);
run(block('const DB=', 'const PHOTO_SHEET=') + block('const PHOTO_SHEET=', 'const KEY=') +
    block('const proteins =', 'for(let i=0;i<=daysElapsed;i++') + block('function menuCandidates()', 'function currentIds('));
assert.equal(run('Object.values(DB).flat().length'),1000);
assert.equal(run('new Set(Object.values(DB).flat().map(d=>d.n)).size'),1000);
assert(run('Object.values(DB).flat().every(d=>d.i&&d.m)'));
assert.equal(run('recipeId(ensure("old"),3)'),'soup:0');
assert(run('photoFor("soup:0","旧菜单")').includes('<img '));
assert(run('photoFor("meat:6","专属图片")').includes('/recipes-v1/meat-6.jpg'));
assert(run('photoFor("side:26","新增菜")').includes('/recipes-v4/side-26.jpg'));
const addedPhotos=run('Object.entries(DB).flatMap(([slot,rows])=>rows.slice(originalCounts[slot]).map((dish,i)=>photoFor(slot+":"+(i+originalCounts[slot]),dish.n)))');
assert.equal(addedPhotos.length,896);
assert.equal(new Set(addedPhotos.map(tag=>tag.match(/src="([^"]+)"/)[1])).size,896);
assert(addedPhotos.every(tag=>tag.includes('的成品菜示意图')));
assert(run('Object.entries(DB).every(([slot,rows])=>rows.every((d,i)=>photoFor(slot+":"+i,d.n).includes("<img ")))'));
assert(run('ensure("today").every(id=>pantryMatch(id,pantryItems()).present.length)'));
const candidates=run('menuCandidates()');
assert.equal(candidates.length,64);
for(const slot of ['meat','mixed1','mixed2','veg'])assert.equal(candidates.filter(d=>d.slot===slot).length,16);
assert.equal(run('new Set(ensure("today")).size'),4);
const render=block('const plan=ensure(viewDate), names', ";document.querySelectorAll('[data-swap]')");
const draw=()=>run('{const list=ensure(viewDate).map((_,i)=>recipeFor(recipeId(ensure(viewDate),i)));'+render+';}');
draw();
const before=dishes.children.slice();
run('ensure("today")[1]=chooseDish("mixed1",ensure("today"))');
draw();
assert.notEqual(dishes.children[1],before[1]);
for(const i of [0,2,3])assert.equal(dishes.children[i],before[i], 'Unchanged dish card remains mounted');
assert(app.includes('photoFor(recipeId(plan,j),x.n)'), 'Weekly report uses the same photo mapping');
assert(html.includes('id="prefIngredients"') && app.includes('availableIngredients:String(raw.availableIngredients'));
assert(/<div class="actions">[^\n]*id="usePantry"/.test(html), 'Pantry action is on the main menu');
const fields = new Map();
function field(id){
  if(!fields.has(id)){
    const flags=new Set(id==='#settingsPanel'?['hidden']:[]);
    fields.set(id,{contains:target=>target===id,classList:{contains:key=>flags.has(key),add:key=>flags.add(key),remove:key=>flags.delete(key),toggle:key=>flags.has(key)?flags.delete(key):flags.add(key)},focus(){}});
  }
  return fields.get(id);
}
let clickOutside;
const ui={document:{addEventListener(name,fn){assert.equal(name,'click');clickOutside=fn;}},$:field,viewDate:'today',todayKey:'today',state:{plans:{},aiInfo:{}},loadPrefs(){},savePrefs(){throw Error('Home action must use saved settings');},save(){},update(){},toast(){},pantryItems:()=>['鸡腿肉'],makePlan:()=>['meat:0','side:26','side:27','veg:0']};
vm.runInNewContext(block("$('#settingsToggle').onclick=","$('#prev').onclick="),ui);
field('#settingsToggle').onclick();
assert(!field('#settingsPanel').classList.contains('hidden'));
clickOutside({target:'#settingsPanel'});
assert(!field('#settingsPanel').classList.contains('hidden'));
clickOutside({target:'outside'});
assert(field('#settingsPanel').classList.contains('hidden'));
field('#usePantry').onclick();
assert.equal(ui.state.plans.today.length,4);
ui.pantryItems=()=>[];
field('#usePantry').onclick();
clickOutside({target:'#usePantry'});
assert(!field('#settingsPanel').classList.contains('hidden'));
console.log('Passed: all recipe images, pantry ranking, no-soup menus, legacy history, single-card update, and settings interactions');
