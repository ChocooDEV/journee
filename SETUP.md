# Quick Setup Checklist

Follow these steps to get the app running:

## 1. Install Dependencies
```bash
npm install
```

## 2. Supabase Setup

### Create Database Tables
1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Copy and paste the contents of `supabase/schema.sql`
4. Click **Run** to execute the SQL

### Create Storage Bucket
1. Go to **Storage** in your Supabase dashboard
2. Click **New bucket**
3. Name it: `user-media`
4. Make it **Public** (uncheck "Private bucket")
5. Click **Create bucket**

### Get Your Credentials
1. Go to **Settings** > **API**
2. Copy:
   - **Project URL** (this is your `NEXT_PUBLIC_SUPABASE_URL`)
   - **anon public** key (this is your `NEXT_PUBLIC_SUPABASE_ANON_KEY`)

## 3. Mapbox Setup

1. Go to [mapbox.com](https://mapbox.com) and sign up/login
2. Go to your **Account** page
3. Copy your **Default public token** (this is your `MAPBOX_TOKEN`)

**Security:** The Mapbox token is stored server-side only and never exposed to the client. All Mapbox API requests are proxied through a secure Next.js API route.

## 4. Environment Variables

Create a `.env.local` file in the root directory:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
MAPBOX_TOKEN=your-mapbox-token-here
```

**Important:** Use `MAPBOX_TOKEN` (without `NEXT_PUBLIC_`) - this keeps your token secure on the server side.

## 5. Run the App

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000)

## Testing

1. Click the **+** button to add your first pin
2. Select a location (or use current location)
3. Add a title and description
4. Upload a photo or video
5. Click **Create Pin**
6. Click on the pin marker to view details
7. Try the **Year Recap** feature!

## Troubleshooting

### Map not showing?
- Check that `MAPBOX_TOKEN` is set correctly in `.env.local` (without `NEXT_PUBLIC_`)
- Verify the API route `/api/mapbox/[...path]` is working (check Network tab)
- Check browser console for errors

### Can't upload media?
- Verify the `user-media` bucket exists in Supabase Storage
- Make sure the bucket is **public**
- Check browser console for upload errors

### Pins not loading?
- Verify database tables were created (check Supabase SQL Editor)
- Check that `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are correct
- Check browser console for errors

