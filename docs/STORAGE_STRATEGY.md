# Storage Strategy for Images and Videos

## Current Implementation ✅

### Architecture
- **Storage**: Supabase Storage (object storage, not database)
- **Database**: Only stores URLs and metadata (not binary data)
- **Organization**: Files organized by pin ID: `${pin.id}/${timestamp}-${index}.${ext}`
- **Security**: Row Level Security (RLS) policies protect data access

### Why This Approach?

1. **Efficiency**: 
   - Database stores only small text URLs (~100 bytes) vs. large binary files (MBs)
   - Faster queries and lower database costs
   - Better scalability

2. **Performance**:
   - Supabase Storage is optimized for media files
   - CDN delivery for fast global access
   - Automatic caching headers

3. **Cost**:
   - Database storage is expensive for large files
   - Object storage (Supabase Storage) is much cheaper
   - Pay only for what you store

## Security Measures 🔒

### 1. Row Level Security (RLS)
- Users can only access their own pins and media
- Enforced at the database level
- Prevents unauthorized access even if URLs are known

### 2. File Validation
- **Type validation**: Only allows specific image/video formats
- **Size limits**: 
  - Images: 10MB max
  - Videos: 100MB max
- **Frontend + Backend validation**: Validates before upload

### 3. File Organization
- Files organized by pin ID
- Unique filenames prevent conflicts
- Easy to clean up when pins are deleted (cascade delete)

## Improvements Made 🚀

### 1. File Validation (`storage-utils.ts`)
```typescript
- Validates file types (JPEG, PNG, WebP, GIF, MP4, WebM, MOV, AVI)
- Validates file sizes (10MB images, 100MB videos)
- Provides clear error messages
```

### 2. Error Handling & Cleanup
```typescript
- Tracks uploaded files during batch upload
- Cleans up files if upload fails
- Deletes pin if no media successfully uploaded
- Prevents orphaned files in storage
```

### 3. Better File Naming
```typescript
- Sanitized filenames (removes special characters)
- Consistent naming pattern
- Prevents path traversal attacks
```

### 4. Frontend Validation
- Validates files before upload attempt
- Better user experience (immediate feedback)
- Reduces unnecessary API calls

## File Size Limits

| Type | Max Size | Reason |
|------|----------|--------|
| Images | 10MB | Large enough for high-quality photos, prevents abuse |
| Videos | 100MB | Reasonable for short clips, prevents storage bloat |

**Note**: These limits can be adjusted in `lib/supabase/storage-utils.ts`

## Allowed File Types

### Images
- JPEG/JPG
- PNG
- WebP
- GIF

### Videos
- MP4
- WebM
- QuickTime (.mov)
- AVI

## Future Enhancements 🔮

### 1. Image Optimization
- **Compress images** before upload (reduce file size)
- **Generate thumbnails** for faster loading
- **Convert to WebP** for better compression

### 2. Video Processing
- **Generate thumbnails** for videos
- **Transcode** to multiple resolutions
- **Extract metadata** (duration, resolution)

### 3. Signed URLs (Better Security)
- Instead of public URLs, use signed URLs
- URLs expire after a set time
- More secure for private content

### 4. CDN Integration
- Supabase Storage already uses CDN
- Could add custom CDN for better performance
- Edge caching for faster global delivery

### 5. Storage Quotas
- Track user storage usage
- Set per-user limits
- Warn users approaching limits

## Storage Bucket Setup

The `user-media` bucket should be configured as:

1. **Public bucket** (for now) - allows direct URL access
2. **RLS policies** protect access at database level
3. **CORS enabled** for web uploads
4. **File size limits** enforced in application code

### Bucket Policies (Future)
For better security, consider:
- **Private bucket** with signed URLs
- **Bucket-level policies** restricting uploads
- **Automatic cleanup** of orphaned files

## Cost Considerations 💰

### Supabase Storage Pricing (as of 2024)
- **Free tier**: 1GB storage
- **Pro tier**: $0.021/GB/month
- **Bandwidth**: Included in most plans

### Optimization Tips
1. **Compress images** before upload (can reduce size by 50-80%)
2. **Use appropriate formats** (WebP for images, MP4 for videos)
3. **Clean up unused files** regularly
4. **Monitor storage usage** per user

## Best Practices ✅

1. ✅ **Never store files in database** - Use object storage
2. ✅ **Validate before upload** - Saves bandwidth and storage
3. ✅ **Handle errors gracefully** - Clean up on failure
4. ✅ **Use RLS policies** - Protect data access
5. ✅ **Organize files logically** - Easy to manage and clean up
6. ✅ **Set size limits** - Prevent abuse and control costs
7. ✅ **Validate file types** - Security and compatibility

## Troubleshooting

### Upload Fails?
1. Check file size (must be under limits)
2. Check file type (must be allowed format)
3. Verify bucket exists and is public
4. Check browser console for errors

### Files Not Loading?
1. Verify bucket is public (or use signed URLs)
2. Check CORS settings on bucket
3. Verify URLs are correct in database
4. Check network tab for 404 errors

### Storage Growing Too Fast?
1. Implement image compression
2. Add storage quotas per user
3. Clean up orphaned files
4. Consider video transcoding to reduce sizes

