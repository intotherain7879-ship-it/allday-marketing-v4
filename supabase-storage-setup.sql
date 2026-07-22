-- Supabase SQL Editor에서 한 번만 실행하세요.
-- 원본 사진 전용 공개 버킷을 만들고, 익명 사용자에게 업로드/조회/삭제 권한을 허용합니다.
-- 이 프로젝트를 대표님만 사용하는 동안의 간편 설정입니다.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'marketing-originals',
  'marketing-originals',
  true,
  20971520,
  array['image/jpeg','image/png','image/webp','image/heic','image/heif']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "marketing originals public read" on storage.objects;
create policy "marketing originals public read"
on storage.objects for select
to public
using (bucket_id = 'marketing-originals');

drop policy if exists "marketing originals anon upload" on storage.objects;
create policy "marketing originals anon upload"
on storage.objects for insert
to anon
with check (bucket_id = 'marketing-originals');

drop policy if exists "marketing originals anon delete" on storage.objects;
create policy "marketing originals anon delete"
on storage.objects for delete
to anon
using (bucket_id = 'marketing-originals');
