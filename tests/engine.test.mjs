import test from 'node:test';
import assert from 'node:assert/strict';
import {calculateFormulaSet,calculateVeltrix} from '../lib/veltrix-engine.js';
import {enhanceVeltrixWithRud} from '../lib/rud-ai.js';
import {settlePrediction,buildErrorMemory} from '../lib/error-memory.js';

const rows=[
  {id:'r10',draw_date:'2026-08-10',top3:'279',bottom2:'62'},
  {id:'r09',draw_date:'2026-08-09',top3:'502',bottom2:'47'},
  {id:'r08',draw_date:'2026-08-08',top3:'710',bottom2:'54'},
  {id:'r07',draw_date:'2026-08-07',top3:'980',bottom2:'82'},
  {id:'r06',draw_date:'2026-08-06',top3:'426',bottom2:'87'},
  {id:'r05',draw_date:'2026-08-05',top3:'333',bottom2:'10'},
  {id:'r04',draw_date:'2026-08-04',top3:'404',bottom2:'43'},
  {id:'r03',draw_date:'2026-08-03',top3:'193',bottom2:'38'},
  {id:'r02',draw_date:'2026-08-02',top3:'148',bottom2:'77'},
  {id:'r01',draw_date:'2026-08-01',top3:'886',bottom2:'15'}
];

test('formula set matches 279-62 reference',()=>{
  assert.deepEqual(calculateFormulaSet({top3:'279',bottom2:'62'}),{
    'สูตร 1':'89',
    'สูตร 2':'6',
    'สูตร 2.1':'67',
    'สูตร 2.2':'931',
    'สูตร 3-9%':'251',
    'สูตร 3-7%':'953',
    'สูตร 3-6%':'846',
    'สูตร 3-99%':'95'
  });
});

test('all downstream outputs stay inside the same WIN6',()=>{
  const out=calculateVeltrix(rows,{targetDate:'2026-08-11'}).A;
  const win=new Set(out.win6);

  assert.equal(out.win6.length,6);
  assert.equal(win.size,6);
  assert.ok(win.has(out.rudTop));
  assert.ok(win.has(out.rudBottom));
  assert.equal(out.pair2Shared.length,5);
  assert.equal(out.pair3Top.length,3);
  for(const pair of out.pair2Shared)for(const d of pair)assert.ok(win.has(d));
  for(const triple of out.pair3Top)for(const d of triple)assert.ok(win.has(d));
  assert.equal(out.doubleWatch.length,3);
  for(const d of out.doubleWatch)assert.ok(win.has(d));
  assert.ok(Number.isInteger(out.driftScore));
  assert.ok(out.driftScore>=0&&out.driftScore<=100);
  assert.equal(out.baseWeight+out.recentWeight,100);
  assert.equal(out.errorMemoryApplied,false);
  assert.equal(out.errorMemorySamples,0);
});

test('linked RUD AI keeps primary and secondary inside final WIN6 while reserve stays outside',()=>{
  const core=calculateVeltrix(rows,{targetDate:'2026-08-11'});
  const out=enhanceVeltrixWithRud(rows,core).A;
  const win=new Set(out.win6);

  assert.equal(win.size,6);
  assert.equal(out.relationshipLocked,true);
  assert.ok(win.has(out.rudTop));
  assert.ok(win.has(out.rudBottom));
  assert.notEqual(out.rudTop,out.rudBottom);
  assert.ok(!win.has(out.reserve7));
  assert.equal(out.rudAI?.relationshipLocked,true);
  for(const pair of out.pair2Shared)for(const d of pair)assert.ok(win.has(d));
  for(const triple of out.pair3Top)for(const d of triple)assert.ok(win.has(d));
});

test('settlement records missing digits, reserve rescue and downstream outcomes',()=>{
  const prediction={
    win6:'123456',reserve7:'7',rudTop:'1',rudBottom:'2',
    pair2Shared:['12','34','56','23','45'],pair3Top:['123','345','456'],
    doubleWatch:['1','3','5'],doubleChance:40,driftScore:31,driftLevel:'เริ่มเปลี่ยน',
    baseWeight:60,recentWeight:40,formulaOutputs:{'สูตร 2':'1'},formulaReliability:{'สูตร 2':.7}
  };
  const settled=settlePrediction(prediction,{id:'actual1',draw_date:'2026-08-11',top3:'177',bottom2:'62'},{
    market_id:'m1',source_result_id:'source1',target_result_id:'actual1',source_date:'2026-08-10',target_date:'2026-08-11'
  });

  assert.equal(settled.details.win6_hit_count_5,3);
  assert.deepEqual(settled.details.missing_digits,['7']);
  assert.deepEqual(settled.details.reserve_rescue_digits,['7']);
  assert.deepEqual(settled.details.double_actual_digits,['7']);
  assert.equal(settled.details.double_watch_hit,false);
  assert.equal(settled.rud_top_hit,true);
  assert.equal(settled.rud_bottom_hit,true);
});

test('error memory learns repeated misses and can be applied without breaking coherence',()=>{
  const details=[
    {
      target_result_id:'a3',target_date:'2026-08-10',actual_digits:'90724',win6:'123456',
      missing_digits:['9','0','7'],false_positive_digits:['1','3','5','6'],
      win6_full_5:false,win6_at_least_4:false,win6_at_least_3:false,
      double_actual_digits:['9'],double_watch:['1','3','5']
    },
    {
      target_result_id:'a2',target_date:'2026-08-09',actual_digits:'98123',win6:'123456',
      missing_digits:['9','8'],false_positive_digits:['4','5','6'],
      win6_full_5:false,win6_at_least_4:false,win6_at_least_3:true,
      double_actual_digits:[],double_watch:['1','3','5']
    },
    {
      target_result_id:'a1',target_date:'2026-08-08',actual_digits:'94567',win6:'123456',
      missing_digits:['9','7'],false_positive_digits:['1','2','3'],
      win6_full_5:false,win6_at_least_4:false,win6_at_least_3:true,
      double_actual_digits:['9'],double_watch:['1','3','5']
    }
  ];
  const memory=buildErrorMemory(details);
  assert.equal(memory.samples,3);
  assert.ok(memory.confidence>0);
  assert.ok(memory.digitBias['9']>memory.digitBias['1']);

  const out=calculateVeltrix(rows,{targetDate:'2026-08-11',errorMemory:memory}).A;
  const win=new Set(out.win6);
  assert.equal(out.errorMemoryApplied,true);
  assert.equal(out.errorMemorySamples,3);
  assert.ok(out.errorMemoryConfidence>0);
  assert.equal(win.size,6);
  assert.ok(win.has(out.rudTop));
  assert.ok(win.has(out.rudBottom));
  for(const pair of out.pair2Shared)for(const d of pair)assert.ok(win.has(d));
  for(const triple of out.pair3Top)for(const d of triple)assert.ok(win.has(d));
  for(const d of out.doubleWatch)assert.ok(win.has(d));
});
