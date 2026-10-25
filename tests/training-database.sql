-- Run only on a disposable database after the auth stub, base schema and migration.
insert into auth.users (id, email) values
('10000000-0000-0000-0000-000000000001', 'qa-one@example.invalid'),
('10000000-0000-0000-0000-000000000002', 'qa-two@example.invalid');
set role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000001', false);
do $$
declare
  payload jsonb := '{"id":"qa-training","at":1792900000000,"mode":"drill","label":"QA","elapsedMs":60000,"wpm":50,"rawWpm":52,"accuracy":96,"consistency":80,"correctChars":250,"incorrectChars":10,"keystrokes":260,"correctKeystrokes":250,"words":50,"samples":[],"keyStats":{"A":{"h":10,"m":2}},"training":{"source":"daily","benchmark":{"seconds":60,"punctuation":false,"numbers":false,"stopOnError":false},"daily":{"day":"2026-10-25","step":2},"pairStats":{"th":{"h":4,"m":2}},"missedWords":[{"word":"This:","misses":2}]}}';
begin
  perform public.save_test_results(jsonb_build_array(payload));
  perform public.save_test_results(jsonb_build_array(payload));
  assert (select count(*) from public.test_results) = 1, 'result upsert duplicated a run';
  assert (select training_details -> 'daily' ->> 'step' from public.test_results) = '2', 'daily details missing';
  assert (select training_details -> 'missedWords' -> 0 ->> 'word' from public.test_results) = 'This:', 'missed word missing';
  assert (select misses from public.result_key_stats where char = 'A') = 2, 'key stats doubled';
  perform public.save_test_results(jsonb_build_array(payload - 'training'));
  assert (select training_details ->> 'source' from public.test_results) = 'daily', 'old client erased training';
  begin
    perform public.save_test_results(jsonb_build_array(payload || jsonb_build_object('training', jsonb_build_object('large', repeat('x', 100001)))));
    raise exception 'oversized training was accepted';
  exception when check_violation then null;
  end;
  assert (select training_details ->> 'source' from public.test_results) = 'daily', 'failed write was not atomic';
end $$;
select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000002', false);
do $$ begin
  assert (select count(*) from public.test_results) = 0, 'account isolation failed';
  assert (select count(*) from public.result_key_stats) = 0, 'key-stat isolation failed';
  assert (select count(*) from public.user_key_stats) = 0, 'view isolation failed';
  update public.test_results set training_details = null;
end $$;
select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000001', false);
do $$ begin
  assert (select training_details ->> 'source' from public.test_results) = 'daily', 'another account changed metadata';
end $$;
reset role;
set role anon;
do $$ begin
  begin
    perform public.save_test_results('[]');
    raise exception 'anonymous write was accepted';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;
select 'PASS: migration, idempotency, metadata round trip, legacy preservation, atomic rejection, RLS and anonymous denial' as result;
