-- Storage Policies for Secure Media Access
-- Run this in your Supabase SQL Editor after creating the bucket

-- First, ensure the bucket exists and is PRIVATE
-- You can create it via the Supabase Dashboard: Storage → New bucket → Name: "user-media" → Make it PRIVATE

-- Policy: Users can only upload files to their own folder structure
-- Files are organized as: {pin_id}/{timestamp}-{index}.{ext}
-- We verify ownership through the pins table by extracting the pin_id from the path
CREATE POLICY "Users can upload media for their own pins"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'user-media' AND
  -- Extract pin_id from path (format: "pin-id/timestamp-index.ext")
  -- Split by '/' and take first part
  EXISTS (
    SELECT 1 FROM pins
    WHERE pins.id::text = split_part(name, '/', 1)
    AND pins.user_id = auth.uid()
  )


-- Policy: Users can only read files for their own pins
CREATE POLICY "Users can read their own media"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'user-media' AND
  -- Extract pin_id from path and verify ownership
  EXISTS (
    SELECT 1 FROM pins
    WHERE pins.id::text = split_part(name, '/', 1)
    AND pins.user_id = auth.uid()
  )
);

-- Policy: Users can only delete files for their own pins
CREATE POLICY "Users can delete their own media"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'user-media' AND
  -- Extract pin_id from path and verify ownership
  EXISTS (
    SELECT 1 FROM pins
    WHERE pins.id::text = split_part(name, '/', 1)
    AND pins.user_id = auth.uid()
  )
);

-- Policy: Users can only update metadata for their own files
CREATE POLICY "Users can update their own media metadata"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'user-media' AND
  -- Extract pin_id from path and verify ownership
  EXISTS (
    SELECT 1 FROM pins
    WHERE pins.id::text = split_part(name, '/', 1)
    AND pins.user_id = auth.uid()
  )
);

-- Note: 
-- - Files are stored with paths like: "pin-id-123/1234567890-0.jpg"
-- - split_part(name, '/', 1) extracts "pin-id-123" (the pin ID)
-- - We verify this pin belongs to the authenticated user via the pins table
-- - This ensures users can only access files for their own pins

