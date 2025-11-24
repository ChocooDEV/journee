# My Year in Places – Map Memory App

A mobile-first web application for mapping memories with photos and videos. Built with Next.js, TypeScript, Tailwind CSS, Supabase, and Mapbox.

## Features

- 📍 **Interactive Map**: View all your memory pins on a beautiful map
- 📸 **Media Support**: Attach multiple photos and videos to each pin
- 🎬 **Year Recap**: Animated journey through your memories for any year
- 📱 **Mobile-First**: Optimized for mobile devices with responsive design
- 🎨 **Modern UI**: Clean, intuitive interface with smooth animations

## Tech Stack

- **Next.js 16** (App Router) with TypeScript
- **React 19** with TypeScript
- **Tailwind CSS 4** for styling
- **Supabase** for database and storage
- **Mapbox GL** for interactive maps

## Setup Instructions

### 1. Clone and Install Dependencies

```bash
npm install
```

### 2. Set Up Supabase

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to SQL Editor and run the schema from `supabase/schema.sql`
3. Go to Storage and create a new bucket named `user-media` (make it public)
4. Copy your Supabase URL and anon key from Settings > API
5. **Enable Email Auth**: Go to Authentication > Providers and ensure Email is enabled (it's enabled by default)

### 3. Set Up Mapbox

1. Create an account at [mapbox.com](https://mapbox.com)
2. Get your access token from your account page
3. Copy your Mapbox access token

**Note:** The Mapbox token is stored server-side only and proxied through a secure API route to prevent exposure in the client.

### 4. Configure Environment Variables

Create a `.env.local` file in the root directory:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
MAPBOX_TOKEN=your_mapbox_access_token
```

**Security Note:** `MAPBOX_TOKEN` (without `NEXT_PUBLIC_`) is server-side only and will never be exposed to the client. All Mapbox requests are proxied through `/api/mapbox/*` to keep your token secure.

### 5. Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Database Schema

The app uses Supabase's built-in authentication (`auth.users`) and two main tables:

- **pins**: Location pins with coordinates, title, description, and date (linked to `auth.users.id`)
- **pin_media**: Media files (photos/videos) associated with each pin

**Row Level Security (RLS)** is enabled - users can only see and manage their own pins. See `supabase/schema.sql` for the complete schema with RLS policies.

## Usage

### Adding a Pin

1. Click the "+" button in the bottom-right corner
2. **Step 1**: Choose location (use current location or enter coordinates)
3. **Step 2**: Add details (title, description, date)
4. **Step 3**: Upload photos/videos
5. Click "Create Pin"

### Viewing Pin Details

- Click any pin marker on the map
- View all media in a swipeable carousel
- See pin details and description

### Year Recap

1. Select a year from the dropdown in the top bar
2. Click "Year Recap"
3. Watch an animated journey through your memories
4. Use controls to pause, skip, or navigate manually

## Project Structure

```
├── app/
│   ├── layout.tsx          # Root layout
│   ├── page.tsx             # Main map page
│   └── globals.css          # Global styles
├── components/
│   ├── MapView.tsx          # Mapbox map component
│   ├── AddPinButton.tsx     # Floating action button
│   ├── AddPinModal.tsx      # Multi-step pin creation form
│   ├── PinDetailsModal.tsx  # Pin detail view
│   ├── MediaCarousel.tsx    # Swipeable media carousel
│   ├── YearRecapControls.tsx # Year selector
│   └── YearRecapOverlay.tsx  # Recap playback controls
├── lib/
│   └── supabase/
│       ├── client.ts        # Supabase client (browser)
│       ├── server.ts        # Supabase client (server)
│       └── queries.ts       # Data access functions
├── types/
│   └── index.ts            # TypeScript type definitions
└── supabase/
    └── schema.sql           # Database schema
```

## Development Notes

- **Authentication**: Uses Supabase Auth - users must sign in/sign up to use the app
- **Row Level Security**: All data is protected by RLS policies - users can only access their own pins
- The app is optimized for mobile but works on desktop too
- All media is stored in Supabase Storage bucket `user-media`
- **Security**: Mapbox API token is stored server-side only and proxied through `/api/mapbox/*` to prevent client-side exposure

## Future Enhancements

- User authentication
- Pin editing and deletion
- Search and filter pins
- Export recap as video
- Share pins with others
- Multiple map styles
- Offline support

## License

MIT
