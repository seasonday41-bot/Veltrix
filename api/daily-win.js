import {requireAdmin} from '../lib/admin-auth.js';
import core from './daily-win-core.js';

export default async function handler(req,res){
  if(req.method==='POST'&&!requireAdmin(req,res))return;
  return core(req,res);
}
