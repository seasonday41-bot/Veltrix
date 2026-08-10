import test from 'node:test';
import assert from 'node:assert/strict';
import {calculateDoubleDigit} from '../lib/double-digit-ai.js';

const rows=[
  {top3:'497',bottom2:'89'},
  {top3:'922',bottom2:'27'},
  {top3:'292',bottom2:'11'},
  {top3:'229',bottom2:'45'},
  {top3:'771',bottom2:'66'},
  {top3:'155',bottom2:'14'},
  {top3:'331',bottom2:'65'}
];
const prediction={win6:'270145',reserve7:'9',rudTop:'2',rudBottom:'7',rankScores:{0:.4,1:.5,2:.9,3:.6,4:.4,5:.7,6:.3,7:.8,8:.2,9:.5}};

test('Double Digit AI selects digit candidates only and does not mutate drill outputs',()=>{
  const out=calculateDoubleDigit(rows,prediction);
  assert.equal(out.version,'DOUBLE_DIGIT_AI_V1');
  assert.equal(out.purpose,'select_double_digit_only');
  assert.equal(out.top.focus.length,2);
  assert.equal(out.bottom.focus.length,2);
  assert.equal(out.top.watch.length,3);
  assert.equal(out.bottom.watch.length,3);
  assert.equal(new Set(out.top.watch).size,3);
  assert.equal(new Set(out.bottom.watch).size,3);
  for(const d of [...out.top.watch,...out.bottom.watch])assert.match(d,/^\d$/);
  assert.equal(out.relationship.changesWin6,false);
  assert.equal(out.relationship.changesPair2,false);
  assert.equal(out.relationship.changesPair3,false);
});

test('Double Digit AI uses only up to 20 history rows',()=>{
  const many=Array.from({length:30},(_,i)=>({top3:i<20?'111':'999',bottom2:i<20?'22':'88'}));
  const out=calculateDoubleDigit(many,{win6:'123456',rudTop:'1',rudBottom:'2'});
  assert.ok(out.top.watch.includes('1'));
  assert.ok(out.bottom.watch.includes('2'));
});
