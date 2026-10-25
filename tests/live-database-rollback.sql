-- Operator-only verification on an existing installation.
-- Uses an existing account ID only inside this transaction. No user rows are read
-- into the fixture, no auth records are changed, and all test writes roll back.
begin;
set local statement_timeout = '30s';
do $$ begin
  if not exists(select 1 from auth.users) then
    raise exception 'This check needs an existing account';
  end if;
  perform set_config('request.jwt.claim.sub',
    (select id::text from auth.users order by created_at limit 1), true);
end $$;
set local role authenticated;
do $$
declare
  payload jsonb := '{"id":"qa-live-training-20261025","at":1792914000000,"mode":"drill","label":"QA rollback","elapsedMs":60000,"wpm":50,"rawWpm":52,"accuracy":96,"consistency":80,"correctChars":250,"incorrectChars":10,"keystrokes":260,"correctKeystrokes":250,"words":50,"samples":[],"keyStats":{"A":{"h":10,"m":2}},"performance":{"elapsedMs":[1000],"wpm":[50],"rawWpm":[52],"burst":[50],"errors":[1]},"training":{"source":"daily","benchmark":{"seconds":60,"punctuation":false,"numbers":false,"stopOnError":false},"daily":{"day":"2026-10-25","step":2},"pairStats":{"th":{"h":4,"m":2}},"missedWords":[{"word":"This:","misses":2}]}}';
begin
  perform public.save_test_results(jsonb_build_array(payload));
  perform public.save_test_results(jsonb_build_array(payload));
  assert (select count(*) from public.test_results where client_id = 'qa-live-training-20261025') = 1, 'duplicate result';
  assert (select training_details -> 'daily' ->> 'step' from public.test_results where client_id = 'qa-live-training-20261025') = '2', 'daily metadata missing';
  assert (select training_details -> 'pairStats' -> 'th' ->> 'm' from public.test_results where client_id = 'qa-live-training-20261025') = '2', 'pair stats missing';
  assert (select training_details -> 'missedWords' -> 0 ->> 'word' from public.test_results where client_id = 'qa-live-training-20261025') = 'This:', 'missed word missing';
  assert (select performance_samples -> 'wpm' ->> 0 from public.test_results where client_id = 'qa-live-training-20261025') = '50', 'performance missing';
  perform public.save_test_results(jsonb_build_array(payload - 'training' - 'performance'));
  assert (select training_details ->> 'source' from public.test_results where client_id = 'qa-live-training-20261025') = 'daily', 'old client erased training';
  assert (select performance_samples -> 'wpm' ->> 0 from public.test_results where client_id = 'qa-live-training-20261025') = '50', 'old client erased performance';
  begin
    perform public.save_test_results(jsonb_build_array(payload || jsonb_build_object('training', jsonb_build_object('large', repeat('x', 100001)))));
    raise exception 'oversized training accepted';
  exception when check_violation then null;
  end;
  assert (select training_details ->> 'source' from public.test_results where client_id = 'qa-live-training-20261025') = 'daily', 'failed write was not atomic';
  perform set_config('request.jwt.claim.sub', '90000000-0000-0000-0000-000000000099', true);
  assert (select count(*) from public.test_results where client_id = 'qa-live-training-20261025') = 0, 'result isolation failed';
  assert (select count(*) from public.result_key_stats) = 0, 'key isolation failed';
  assert (select count(*) from public.user_key_stats) = 0, 'view isolation failed';
end $$;
reset role;
set local role anon;
do $$ begin
  begin
    perform public.save_test_results('[]');
    raise exception 'anonymous write accepted';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;
rollback;
select 'PASS: RPC metadata, idempotency, legacy preservation, atomic rejection, RLS, anonymous denial; test writes rolled back' as verification,
  (select count(*) from public.test_results) as result_rows,
  (select count(*) from public.result_key_stats) as key_rows,
  (select count(*) from public.test_results where client_id = 'qa-live-training-20261025') as remaining_test_rows;
