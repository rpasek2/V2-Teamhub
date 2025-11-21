-- Seed Data Script
-- Run this in your Supabase SQL Editor to create dummy users for testing.

DO $$
DECLARE
  -- REPLACE THIS WITH YOUR HUB ID IF DIFFERENT
  hub_id uuid := '87602a11-4a39-42fb-967d-9f3d0df5a548'; 
  
  coach_id uuid := gen_random_uuid();
  gymnast1_id uuid := gen_random_uuid();
  gymnast2_id uuid := gen_random_uuid();
BEGIN
  -- Create Coach (Dummy Auth User)
  INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_user_meta_data, created_at, updated_at)
  VALUES (
    coach_id, 
    '00000000-0000-0000-0000-000000000000', 
    'authenticated', 
    'authenticated', 
    'coach@example.com', 
    '$2a$10$dummyhashdummyhashdummyhashdummyhashdummyhashdummyhash', -- Dummy hash, cannot login
    now(), 
    '{"full_name": "Coach Mike"}'::jsonb,
    now(),
    now()
  );

  -- Create Gymnast 1
  INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_user_meta_data, created_at, updated_at)
  VALUES (
    gymnast1_id, 
    '00000000-0000-0000-0000-000000000000', 
    'authenticated', 
    'authenticated', 
    'gymnast1@example.com', 
    '$2a$10$dummyhashdummyhashdummyhashdummyhashdummyhashdummyhash', 
    now(), 
    '{"full_name": "Sarah Gymnast"}'::jsonb,
    now(),
    now()
  );

  -- Create Gymnast 2
  INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_user_meta_data, created_at, updated_at)
  VALUES (
    gymnast2_id, 
    '00000000-0000-0000-0000-000000000000', 
    'authenticated', 
    'authenticated', 
    'gymnast2@example.com', 
    '$2a$10$dummyhashdummyhashdummyhashdummyhashdummyhashdummyhash', 
    now(), 
    '{"full_name": "Emily Gymnast"}'::jsonb,
    now(),
    now()
  );

  -- Assign to Hub
  -- Note: Profiles are created automatically by the 'on_auth_user_created' trigger
  
  INSERT INTO public.hub_members (hub_id, user_id, role) VALUES (hub_id, coach_id, 'coach');
  INSERT INTO public.hub_members (hub_id, user_id, role) VALUES (hub_id, gymnast1_id, 'gymnast');
  INSERT INTO public.hub_members (hub_id, user_id, role) VALUES (hub_id, gymnast2_id, 'gymnast');
  
END $$;
