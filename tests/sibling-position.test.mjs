import test from 'node:test';
import assert from 'node:assert/strict';
import {calculateSiblingPosition,isSiblingPair} from '../lib/sibling-position-ai.js';

const rows=[
  {top3:'497',bottom2:'89'},
  {top3:'672',bottom2:'63'},
  {top3:'922',bottom2:'27'},
  {top3:'292',bottom2:'11'},
  {top3:'229',bottom2:'45'},
  {top3:'771',bottom2:'66'}
];

test('Sibling pairs include circular 09/90 and ignore non-neighbors',()=>{
  for(const p of ['01','10','12','21','89','98','90','09'])assert.equal(isSiblingPair(p),true,p);
  for(const p of ['00','22','13','57'])assert.equal(isSiblingPair(p),false,p);
});

test('Sibling Position AI reports top/bottom position only, not pair selection',()=>{
  const out=calculateSiblingPosition(rows);
  assert.equal(out.version,'SIBLING_POSITION_AI_V1');
  assert.equal(out.top.label,'พี่น้องบน');
  assert.equal(out.top.scope,'2ตัวบน');
  assert.equal(out.bottom.label,'พี่น้องล่าง');
  assert.equal(out.bottom.scope,'2ตัวล่าง');
  assert.ok(out.top.chance>=0&&out.top.chance<=68);
  assert.ok(out.bottom.chance>=0&&out.bottom.chance<=62);
  assert.equal('pair' in out,false);
  assert.equal('digits' in out,false);
});
