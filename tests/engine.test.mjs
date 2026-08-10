import test from 'node:test';
import assert from 'node:assert/strict';
import {calculateFormulaSet,calculateVeltrix} from '../lib/veltrix-engine.js';
import {enhanceVeltrixWithRud} from '../lib/rud-ai.js';
import {applyWorldWinFusion,normalizeWorldWin} from '../lib/world-win.js';
import {settlePrediction,buildErrorMemory} from '../lib/error-memory.js';

const rows=[{id:'r10',draw_date:'2026-08-10',top3:'279',bottom2:'62'},{id:'r09',draw_date:'2026-08-09',top3:'502',bottom2:'47'},{id:'r08',draw_date:'2026-08-08',top3:'710',bottom2:'54'},{id:'r07',draw_date:'2026-08-07',top3:'980',bottom2:'82'},{id:'r06',draw_date:'2026-08-06',top3:'426',bottom2:'87'},{id:'r05',draw_date:'2026-08-05',top3:'333',bottom2:'10'},{id:'r04',draw_date:'2026-08-04',top3:'404',bottom2:'43'},{id:'r03',draw_date:'2026-08-03',top3:'193',bottom2:'38'},{id:'r02',draw_date:'2026-08-02',top3:'148',bottom2:'77'},{id:'r01',draw_date:'2026-08-01',top3:'886',bottom2:'15'}];

test('formula set matches 279-62 reference',()=>assert.deepEqual(calculateFormulaSet({top3:'279',bottom2:'62'}),{'สูตร 1':'89','สูตร 2':'6','สูตร 2.1':'67','สูตร 2.2':'931','สูตร 3-9%':'251','สูตร 3-7%':'953','สูตร 3-6%':'846','สูตร 3-99%':'95'}));

test('v17 RUD-first seeds two RUD digits then WIN ranking fills four',()=>{
 const core=calculateVeltrix(rows,{targetDate:'2026-08-11'}),out=enhanceVeltrixWithRud(rows,core).A,win=[...out.win6],set=new Set(win);
 assert.equal(out.rudFirst,true);assert.equal(out.rudFirstVersion,'RUD_FIRST_WIN6_V17');assert.equal(set.size,6);assert.equal(win[0],out.rudTop);assert.equal(win[1],out.rudBottom);assert.notEqual(out.rudTop,out.rudBottom);assert.ok(!set.has(out.reserve7));
 for(const pair of out.pair2Shared)for(const d of pair)assert.ok(set.has(d));for(const triple of out.pair3Top)for(const d of triple)assert.ok(set.has(d));for(const d of out.doubleWatch)assert.ok(set.has(d));
});

test('World WIN stays assistive before v17 RUD-first selection',()=>{assert.equal(normalizeWorldWin('112233789'),'123789');const core=calculateVeltrix(rows,{targetDate:'2026-08-11'}),fused=applyWorldWinFusion(core,'123789'),out=enhanceVeltrixWithRud(rows,fused).A,set=new Set(out.win6);assert.equal(out.worldWin,'123789');assert.equal(out.fusionBonus?.worldWin?.forced,false);assert.equal([...set].length,6);assert.equal(out.win6[0],out.rudTop);assert.equal(out.win6[1],out.rudBottom);assert.ok(!set.has(out.reserve7));});

test('v16 output specialists remain downstream of v17 WIN6',()=>{const out=enhanceVeltrixWithRud(rows,calculateVeltrix(rows,{targetDate:'2026-08-11'})).A,set=new Set(out.win6);assert.equal(out.specialistVersion,'OUTPUT_SPECIALISTS_V16');assert.deepEqual(out.specialists,{pair2:'PAIR2_POSITION_SPECIALIST_V1',pair3:'PAIR3_FORMULA_PRIORITY_SPECIALIST_V1',double:'DOUBLE_BALANCED_SPECIALIST_V1'});assert.equal(out.pair2Shared.length,5);assert.equal(out.pair3Top.length,3);assert.equal(out.doubleWatch.length,3);for(const pair of out.pair2Shared)for(const d of pair)assert.ok(set.has(d));for(const triple of out.pair3Top)for(const d of triple)assert.ok(set.has(d));for(const d of out.doubleWatch)assert.ok(set.has(d));});

test('settlement and error memory remain compatible',()=>{const prediction={win6:'123456',reserve7:'7',rudTop:'1',rudBottom:'2',pair2Shared:['12','34','56','23','45'],pair3Top:['123','345','456'],doubleWatch:['1','3','5'],doubleChance:40,driftScore:31,driftLevel:'เริ่มเปลี่ยน',baseWeight:60,recentWeight:40,formulaOutputs:{'สูตร 2':'1'},formulaReliability:{'สูตร 2':.7},specialistVersion:'OUTPUT_SPECIALISTS_V16'};const settled=settlePrediction(prediction,{id:'actual1',draw_date:'2026-08-11',top3:'177',bottom2:'62'},{market_id:'m1',source_result_id:'source1',target_result_id:'actual1',source_date:'2026-08-10',target_date:'2026-08-11'});assert.equal(settled.details.win6_hit_count_5,3);assert.deepEqual(settled.details.reserve_rescue_digits,['7']);const memory=buildErrorMemory([settled.details]);assert.equal(memory.samples,1);});
