-- Settle all splits between two users in a group, then recalculate balances
create or replace function public.settle_balance(
  p_group_id uuid,
  p_from_user uuid,
  p_to_user uuid
) returns void language plpgsql security definer set search_path = public as $$
begin
  update expense_splits es
  set settled = true
  from expenses e
  where es.expense_id = e.id
    and es.user_id = p_from_user
    and e.paid_by = p_to_user
    and e.group_id = p_group_id
    and es.settled = false;

  perform recalculate_balances(p_group_id);

  insert into activity (group_id, actor_id, type, payload)
  values (p_group_id, p_from_user, 'expense_settled',
          jsonb_build_object('to_user', p_to_user));
end;
$$;

grant execute on function public.settle_balance(uuid, uuid, uuid) to authenticated;
