# Secure Storage Setup Guide

## Overview

This app uses **private Supabase Storage buckets** with **signed URLs** for secure media access. This ensures:

- ✅ Only authenticated users can access media
- ✅ Users can only access their own media files
- ✅ URLs expire after 1 hour (prevents sharing/leaking)
- ✅ No public access to storage bucket

## Setup Steps

### 1. Create Private Storage Bucket

1. Go to your **Supabase Dashboard**
2. Navigate to **Storage** → **Buckets**
3. Click **New bucket**
4. Enter bucket name: `user-media`
5. **IMPORTANT**: Check **"Private bucket"** (do NOT make it public)
6. Click **Create bucket**

### 2. Enable Row Level Security (RLS)

RLS is already enabled on the `pins` and `pin_media` tables via `schema.sql`.

### 3. Create Storage Policies

Run the SQL in `supabase/storage-policies.sql` in your Supabase SQL Editor:

```sql
-- This creates policies that:
-- 1. Allow users to upload files only for their own pins
-- 2. Allow users to read files only for their own pins
-- 3. Allow users to delete files only for their own pins
-- 4. Allow users to update metadata only for their own files
```

**How to run:**
1. Go to **SQL Editor** in Supabase Dashboard
2. Click **New query**
3. Copy and paste the contents of `supabase/storage-policies.sql`
4. Click **Run**

### 4. Verify Setup

After setup, test that:
- ✅ You can upload media (should work)
- ✅ You can view your own media (should work)
- ✅ You cannot access other users' media (should fail with 403)
- ✅ URLs expire after 1 hour (test by waiting or changing expiry time)

## How It Works

### File Storage
- Files are stored with paths like: `{pin_id}/{timestamp}-{index}.{ext}`
- Example: `abc123/1704067200000-0.jpg`
- The pin ID in the path allows us to verify ownership

### Signed URLs
- Instead of storing public URLs, we store file paths in the database
- When displaying media, we generate **signed URLs** that:
  - Expire after 1 hour
  - Only work for authenticated users
  - Are validated against storage policies

### Security Layers

1. **Authentication**: User must be logged in
2. **Storage Policies**: Verify file belongs to user's pin
3. **Signed URLs**: Time-limited access tokens
4. **RLS**: Database-level access control

## Code Implementation

### Storing Files
```typescript
// In queries.ts - stores file path, not URL
const mediaUrl = fileName; // e.g., "pin-id/123-0.jpg"
```

### Displaying Files
```typescript
// In components - uses hook to get signed URL
const signedUrl = useSignedUrl(mediaUrl);
<img src={signedUrl} />
```

### Generating Signed URLs
```typescript
// In storage-urls.ts
const { data } = await supabase.storage
  .from('user-media')
  .createSignedUrl(filePath, 3600); // 1 hour expiry
```

## Migration from Public Bucket

If you previously used a public bucket:

1. **Update bucket to private** in Supabase Dashboard
2. **Run storage policies SQL** (from step 3 above)
3. **No code changes needed** - the app automatically handles both:
   - Old public URLs (starts with `http://` or `https://`)
   - New file paths (converted to signed URLs)

## Troubleshooting

### "Bucket not found" Error
- Verify bucket name is exactly `user-media`
- Check you're in the correct Supabase project

### "403 Forbidden" Error
- Verify storage policies are created
- Check user is authenticated
- Verify file path matches a pin owned by the user

### Images Not Loading
- Check browser console for errors
- Verify signed URL generation is working
- Check network tab for failed requests

### URLs Expiring Too Quickly
- Adjust `SIGNED_URL_EXPIRY` in `lib/supabase/storage-urls.ts`
- Default is 3600 seconds (1 hour)

## Security Best Practices

✅ **DO:**
- Keep bucket private
- Use signed URLs for all media access
- Verify ownership through storage policies
- Set appropriate URL expiry times
- Validate file types and sizes

❌ **DON'T:**
- Make the bucket public
- Store full URLs in database (store paths instead)
- Share signed URLs (they expire anyway)
- Skip file validation
- Allow direct public access

## Cost Considerations

- **Storage**: Same cost as public bucket
- **Bandwidth**: Same cost (signed URLs still use bandwidth)
- **API Calls**: Slightly more (generating signed URLs)
- **Security**: Much better! 🔒

The slight increase in API calls is worth the security improvement.

