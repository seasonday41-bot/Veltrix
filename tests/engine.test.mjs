import test from 'node:test';
import assert from 'node:assert/strict';
import {calculateFormulaSet,calculateVeltrix} from '../lib/veltrix-engine.js';

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
  const rows=[
    {top3:'279',bottom2:'62'},
    {top3:'502',bottom2:'47'},
    {top3:'710',bottom2:'54'},
    {top3:'980',bottom2:'82'},
    {top3:'426',bottom2:'87'},
    {top3:'333',bottom2:'10'},
    {top3:'404',bottom2:'43'},
    {top3:'193',bottom2:'38'},
    {top3:'148',bottom2:'77'},
    {top3:'886',bottom2:'15'}
  ];
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
});
