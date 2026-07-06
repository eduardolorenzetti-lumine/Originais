-- Allow authenticated editors to replace task assignee/team/tag relations.
-- RLS policies already restrict these deletes to workspace owner/admin/editor members.

grant delete on
  public.task_assignees,
  public.task_teams,
  public.task_tags
to authenticated;
