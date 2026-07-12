-- Originais Lumine
-- Migração pontual para habilitar o perfil LEITOR PROJETOS.
-- Execute no SQL Editor do projeto Supabase em uso pelo dashboard.

begin;

alter table public.app_users drop constraint if exists app_users_role_check;

-- Corrige registros antigos que possam ter usado as variações do nome do perfil.
update public.app_users
set role = 'LEITOR PROJETOS',
    updated_at = timezone('utc', now())
where upper(trim(role)) in ('LEITOR PROJETO', 'LEITOR DE PROJETOS');

alter table public.app_users
add constraint app_users_role_check
check (role in ('ADMIN', 'EDITOR', 'EDITOR ROTA', 'LEITOR PROJETOS', 'LEITOR'));

commit;
