CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text NOT NULL DEFAULT 'Moon-Bird',
  auth_method text NOT NULL DEFAULT 'otp',
  preferred_method text NOT NULL DEFAULT 'otp',
  notifications_enabled boolean NOT NULL DEFAULT TRUE,
  streak integer NOT NULL DEFAULT 0,
  longest_streak integer NOT NULL DEFAULT 0,
  is_advertiser boolean NOT NULL DEFAULT FALSE,
  role text NOT NULL DEFAULT 'user' CHECK (role IN ('user','moderator','admin')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
begin
  insert into public.profiles (id, display_name, auth_method, preferred_method)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'auth_method', 'otp'),
    coalesce(new.raw_user_meta_data->>'preferred_method', 'otp')
  );
  return new;
end $$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
