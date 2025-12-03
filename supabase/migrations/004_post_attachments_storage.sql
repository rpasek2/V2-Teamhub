-- Migration: Create storage bucket for post attachments
-- Run this in Supabase SQL Editor

-- 1. Create the storage bucket (if it doesn't exist)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'post-attachments',
    'post-attachments',
    true,
    52428800, -- 50MB limit
    ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'text/plain', 'text/csv']
)
ON CONFLICT (id) DO UPDATE SET
    public = true,
    file_size_limit = 52428800;

-- 2. Policy: Allow authenticated users to upload files
CREATE POLICY "Authenticated users can upload post attachments"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'post-attachments');

-- 3. Policy: Allow public read access to all files
CREATE POLICY "Public read access to post attachments"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'post-attachments');

-- 4. Policy: Allow users to update their own uploads
CREATE POLICY "Users can update their own post attachments"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'post-attachments' AND auth.uid()::text = (storage.foldername(name))[2])
WITH CHECK (bucket_id = 'post-attachments');

-- 5. Policy: Allow users to delete their own uploads
CREATE POLICY "Users can delete their own post attachments"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'post-attachments' AND auth.uid()::text = (storage.foldername(name))[2]);
