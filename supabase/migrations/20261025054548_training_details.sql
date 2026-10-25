-- Additive practice metadata, including the performance column on older installs.
-- Existing rows remain NULL; old clients preserve richer metadata on upsert.

alter table public.test_results
  add column if not exists performance_samples jsonb not null default '{}'::jsonb
  constraint test_results_performance_samples_shape check (
    performance_samples = '{}'::jsonb
    or (
      jsonb_typeof(performance_samples) = 'object'
      and jsonb_typeof(performance_samples -> 'elapsedMs') = 'array'
      and jsonb_typeof(performance_samples -> 'wpm') = 'array'
      and jsonb_typeof(performance_samples -> 'rawWpm') = 'array'
      and jsonb_typeof(performance_samples -> 'burst') = 'array'
      and jsonb_typeof(performance_samples -> 'errors') = 'array'
      and jsonb_array_length(performance_samples -> 'elapsedMs') <= 600
      and jsonb_array_length(performance_samples -> 'elapsedMs')
        = jsonb_array_length(performance_samples -> 'wpm')
      and jsonb_array_length(performance_samples -> 'elapsedMs')
        = jsonb_array_length(performance_samples -> 'rawWpm')
      and jsonb_array_length(performance_samples -> 'elapsedMs')
        = jsonb_array_length(performance_samples -> 'burst')
      and jsonb_array_length(performance_samples -> 'elapsedMs')
        = jsonb_array_length(performance_samples -> 'errors')
    )
  );

alter table public.test_results
  add column if not exists training_details jsonb
  constraint test_results_training_details_shape check (
    training_details is null or (
      jsonb_typeof(training_details) = 'object'
      and octet_length(training_details::text) <= 100000
    )
  );

create or replace function public.save_test_results(p_results jsonb)
returns setof uuid
language plpgsql
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_item jsonb;
  v_id   uuid;
begin
  if v_user is null then
    raise exception 'save_test_results: not authenticated' using errcode = '42501';
  end if;

  if p_results is null or jsonb_typeof(p_results) <> 'array' then
    raise exception 'save_test_results: expected a JSON array' using errcode = '22023';
  end if;

  for v_item in select value from jsonb_array_elements(p_results)
  loop
    insert into public.test_results (
      user_id, client_id, taken_at, mode, label, elapsed_ms,
      wpm, raw_wpm, accuracy, consistency,
      correct_chars, incorrect_chars, keystrokes, correct_keystrokes, words, samples,
      performance_samples, training_details
    )
    values (
      v_user,
      v_item ->> 'id',
      to_timestamp((v_item ->> 'at')::bigint / 1000.0),
      v_item ->> 'mode',
      v_item ->> 'label',
      (v_item ->> 'elapsedMs')::numeric::integer,
      (v_item ->> 'wpm')::numeric,
      (v_item ->> 'rawWpm')::numeric,
      (v_item ->> 'accuracy')::numeric,
      (v_item ->> 'consistency')::numeric,
      (v_item ->> 'correctChars')::integer,
      (v_item ->> 'incorrectChars')::integer,
      (v_item ->> 'keystrokes')::integer,
      (v_item ->> 'correctKeystrokes')::integer,
      (v_item ->> 'words')::integer,
      coalesce(
        (
          select array_agg(s.value::text::real order by s.ord)
          from jsonb_array_elements(coalesce(v_item -> 'samples', '[]'::jsonb))
               with ordinality as s(value, ord)
        ),
        '{}'::real[]
      ),
      coalesce(v_item -> 'performance', '{}'::jsonb),
      v_item -> 'training'
    )
    on conflict (user_id, client_id) do update set
      taken_at           = excluded.taken_at,
      mode               = excluded.mode,
      label              = excluded.label,
      elapsed_ms         = excluded.elapsed_ms,
      wpm                = excluded.wpm,
      raw_wpm            = excluded.raw_wpm,
      accuracy           = excluded.accuracy,
      consistency        = excluded.consistency,
      correct_chars      = excluded.correct_chars,
      incorrect_chars    = excluded.incorrect_chars,
      keystrokes         = excluded.keystrokes,
      correct_keystrokes = excluded.correct_keystrokes,
      words              = excluded.words,
      samples            = excluded.samples,
      performance_samples = case
        when v_item ? 'performance' then excluded.performance_samples
        else test_results.performance_samples
      end,
      training_details = case
        when v_item ? 'training' then excluded.training_details
        else test_results.training_details
      end
    returning id into v_id;

    -- Replace rather than merge: the incoming tally is the whole truth for
    -- this test, so a re-sync must not double-count.
    delete from public.result_key_stats where result_id = v_id;

    insert into public.result_key_stats (result_id, user_id, char, hits, misses)
    select
      v_id,
      v_user,
      k.key,
      coalesce((k.value ->> 'h')::integer, 0),
      coalesce((k.value ->> 'm')::integer, 0)
    from jsonb_each(coalesce(v_item -> 'keyStats', '{}'::jsonb)) as k(key, value)
    where char_length(k.key) = 1;

    return next v_id;
  end loop;
end;
$$;
