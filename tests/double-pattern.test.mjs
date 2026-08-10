import test from 'node:test';
import assert from 'node:assert/strict';
import {calculateDoublePattern} from '../lib/double-pattern-ai.js';

const rows=[
  {top3:'497',bottom2:'89'},
  {top3:'672',bottom2:'63'},
  {top3:'922',bottom2:'27'},
  {top3:'292',bottom2:'11'},
  {top3:'229',bottom2:'45'},
  {top3:'771',bottom2:'66'}
];

test('Double Pattern AI reports position/type only, no double digit selection',()=>{
  const out=calculateDoublePattern(rows);
  assert.equal(out.version,'DOUBLE_PATTERN_AI_V1');
  assert.ok(['AAB','ABA','ABB','AAA'].includes(out.top.type));
  assert.ok(['เบิ้ลหน้า','หาม','เบิ้ลหลัง','ตอง'].includes(out.top.label));
  assert.equal(out.bottom.type,'AA');
  assert.equal(out.bottom.label,'เบิ้ลล่าง');
  assert.ok(out.top.chance>=0&&out.top.chance<=75);
  assert.ok(out.bottom.chance>=0&&out.bottom.chance<=45);
  assert.equal('watch' in out,false);
  assert.equal('digits' in out,false);
});
