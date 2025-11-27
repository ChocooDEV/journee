# Setting Up Supabase Storage Bucket

## ⚠️ IMPORTANT: Use Private Bucket with Signed URLs

**This app now uses secure private storage with signed URLs.** See `docs/SECURE_STORAGE_SETUP.md` for complete setup instructions.

## Quick Setup

1. **Create Private Bucket**
   - Go to Supabase Dashboard → Storage → New bucket
   - Name: `user-media`
   - **Check "Private bucket"** (do NOT make it public)
   - Click Create

2. **Run Storage Policies**
   - Go to SQL Editor → New query
   - Copy contents of `supabase/storage-policies.sql`
   - Run the query

3. **Done!** The app will automatically use signed URLs for secure access.

## Why Private?

- ✅ Only authenticated users can access files
- ✅ Users can only access their own media
- ✅ URLs expire after 1 hour
- ✅ No public access to storage

See `docs/SECURE_STORAGE_SETUP.md` for detailed setup and troubleshooting.

## Troubleshooting

### Still seeing "Bucket not found"?
- Double-check the bucket name is exactly `user-media` (case-sensitive)
- Make sure you're in the correct Supabase project
- Try refreshing the page after creating the bucket
- Check browser console for any other errors

### Can't create bucket?
- Make sure you have the correct permissions in your Supabase project
- Check if you've reached any storage limits
- Verify your Supabase project is active

### Files not uploading?
- Verify the bucket is **public** (not private)
- Check browser console for specific error messages
- Ensure your Supabase credentials are correct in `.env.local`

