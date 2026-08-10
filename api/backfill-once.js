import backfillLearning from './backfill-learning.js';

// Temporary preview-only bridge so the authenticated Vercel connector can
// run a dry-run/one-time idempotent backfill through GET. Delete after use.
export default async function handler(req,res){
  if(req.method!=='GET'){
    res.statusCode=405;
    res.setHeader('Allow','GET');
    res.end(JSON.stringify({error:'Method not allowed'}));
    return;
  }
  const execute=String(req.query?.execute||'')==='1';
  req.method='POST';
  req.body={
    confirm:'VELTRIX_BACKFILL_V14',
    dry_run:!execute,
    market_key:String(req.query?.market_key||'').trim()
  };
  return backfillLearning(req,res);
}
