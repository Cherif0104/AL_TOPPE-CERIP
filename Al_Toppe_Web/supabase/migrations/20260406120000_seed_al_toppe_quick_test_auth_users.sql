-- Comptes de connexion rapide AL-TOPPE (voir src/config/supabaseQuickTest.ts)
-- Mot de passe partagé : TestSupabase2026!
-- GoTrue exige confirmation_token, email_change, email_change_token_new, recovery_token
-- en chaînes vides '' (pas NULL) — sinon erreur « Database error querying schema » au login.

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

DO $$
DECLARE
  pw text := extensions.crypt('TestSupabase2026!', extensions.gen_salt('bf'));
  uid uuid;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'test-entrepreneur@example.com') THEN
    uid := gen_random_uuid();
    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
      confirmation_token, email_change, email_change_token_new, recovery_token,
      created_at, updated_at
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      uid,
      'authenticated',
      'authenticated',
      'test-entrepreneur@example.com',
      pw,
      now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"role":"entrepreneur","full_name":"Test Entrepreneur"}'::jsonb,
      '', '', '', '',
      now(),
      now()
    );
    INSERT INTO auth.identities (provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    VALUES (
      uid::text,
      uid,
      jsonb_build_object('sub', uid::text, 'email', 'test-entrepreneur@example.com', 'email_verified', true),
      'email',
      now(),
      now(),
      now()
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'test-coach@example.com') THEN
    uid := gen_random_uuid();
    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
      confirmation_token, email_change, email_change_token_new, recovery_token,
      created_at, updated_at
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      uid,
      'authenticated',
      'authenticated',
      'test-coach@example.com',
      pw,
      now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"role":"coach","full_name":"Test Coach"}'::jsonb,
      '', '', '', '',
      now(),
      now()
    );
    INSERT INTO auth.identities (provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    VALUES (
      uid::text,
      uid,
      jsonb_build_object('sub', uid::text, 'email', 'test-coach@example.com', 'email_verified', true),
      'email',
      now(),
      now(),
      now()
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'test-bailleur@example.com') THEN
    uid := gen_random_uuid();
    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
      confirmation_token, email_change, email_change_token_new, recovery_token,
      created_at, updated_at
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      uid,
      'authenticated',
      'authenticated',
      'test-bailleur@example.com',
      pw,
      now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"role":"bailleur","full_name":"Test Bailleur"}'::jsonb,
      '', '', '', '',
      now(),
      now()
    );
    INSERT INTO auth.identities (provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    VALUES (
      uid::text,
      uid,
      jsonb_build_object('sub', uid::text, 'email', 'test-bailleur@example.com', 'email_verified', true),
      'email',
      now(),
      now(),
      now()
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'test-admin@example.com') THEN
    uid := gen_random_uuid();
    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
      confirmation_token, email_change, email_change_token_new, recovery_token,
      created_at, updated_at
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      uid,
      'authenticated',
      'authenticated',
      'test-admin@example.com',
      pw,
      now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"role":"admin","full_name":"Test Admin"}'::jsonb,
      '', '', '', '',
      now(),
      now()
    );
    INSERT INTO auth.identities (provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    VALUES (
      uid::text,
      uid,
      jsonb_build_object('sub', uid::text, 'email', 'test-admin@example.com', 'email_verified', true),
      'email',
      now(),
      now(),
      now()
    );
  END IF;
END $$;
