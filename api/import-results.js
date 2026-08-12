import {requireAdmin} from '../lib/admin-auth.js';
import core from './import-results-core.js';

export default async function handler(req,res){
  if(!requireAdmin(req,res))return;
  return core(req,res);
}
