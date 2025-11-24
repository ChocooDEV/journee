import { NextRequest, NextResponse } from 'next/server';

const MAPBOX_BASE_URL = 'https://api.mapbox.com';

// Shared handler for all HTTP methods
async function handleRequest(
  request: NextRequest,
  params: Promise<{ path: string[] }>
) {
  const mapboxToken = process.env.MAPBOX_TOKEN;

  if (!mapboxToken) {
    console.error('MAPBOX_TOKEN is not set in environment variables');
    return NextResponse.json(
      { error: 'Mapbox token not configured' },
      { status: 500 }
    );
  }

  // Await params (Next.js 16+ requires this)
  const { path: pathArray } = await params;
  
  // Reconstruct the path
  const path = pathArray.join('/');
  
  // Determine the base URL based on the path
  // Path format: "api/..." or "events/..."
  let baseUrl = MAPBOX_BASE_URL;
  let finalPath: string;
  
  if (path.startsWith('events/')) {
    baseUrl = 'https://events.mapbox.com';
    // For events domain, the path is already "events/v2", keep it as-is
    // events.mapbox.com expects the full path including "events/"
    finalPath = path;
  } else if (path.startsWith('api/')) {
    // Remove 'api/' prefix from path (since MAPBOX_BASE_URL already includes it)
    finalPath = path.replace(/^api\//, '');
  } else {
    // Legacy support: if path doesn't start with api/ or events/, assume it's an api path
    finalPath = path;
  }
  
  // Get query parameters from the request
  const searchParams = request.nextUrl.searchParams;
  const queryString = searchParams.toString();
  
  // Build the Mapbox URL with proper query string handling
  const mapboxUrl = `${baseUrl}/${finalPath}${queryString ? `?${queryString}&` : '?'}access_token=${mapboxToken}`;

  try {
    // Events endpoint requires POST, but Mapbox sometimes sends GET
    // If it's a GET request to events endpoint, return empty response
    if (request.method === 'GET' && path.startsWith('events/')) {
      return new NextResponse(null, {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
        },
      });
    }
    
    // Get request body if present (for POST, PUT, etc.)
    let body: BodyInit | undefined;
    const requestContentType = request.headers.get('content-type');
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      try {
        body = await request.text();
      } catch {
        // No body or already consumed
      }
    }
    
    // Proxy the request to Mapbox
    const response = await fetch(mapboxUrl, {
      method: request.method,
      headers: {
        'User-Agent': 'MyYearInPlaces/1.0',
        ...(requestContentType && { 'Content-Type': requestContentType }),
      },
      body: body,
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: 'Mapbox API error' },
        { status: response.status }
      );
    }

    // Get the content type from Mapbox response
    const contentType = response.headers.get('content-type') || 'application/json';
    
    // Handle different response types
    if (contentType.includes('application/json')) {
      try {
        const text = await response.text();
        // Handle empty responses (like map-sessions endpoint)
        if (!text || text.trim() === '') {
          return new NextResponse(null, {
            status: response.status,
            headers: {
              'Content-Type': contentType,
            },
          });
        }
        const data = JSON.parse(text);
        return NextResponse.json(data);
      } catch (e) {
        // If JSON parsing fails, return empty response or error
        console.error('Error parsing JSON response:', e);
        return new NextResponse(null, {
          status: response.status,
          headers: {
            'Content-Type': contentType,
          },
        });
      }
    } else if (contentType.includes('image') || contentType.includes('application/octet-stream') || contentType.includes('application/x-protobuf') || contentType.includes('application/vnd.mapbox-vector-tile')) {
      // For tiles and other binary data (including vector tiles)
      const buffer = await response.arrayBuffer();
      return new NextResponse(buffer, {
        headers: {
          'Content-Type': contentType,
          'Cache-Control': 'public, max-age=86400', // Cache tiles for 24 hours
        },
      });
    } else if (contentType.includes('text/')) {
      // For text content types
      const text = await response.text();
      return new NextResponse(text, {
        headers: {
          'Content-Type': contentType,
        },
      });
    } else {
      // For other content types, try to get as array buffer
      const buffer = await response.arrayBuffer();
      return new NextResponse(buffer, {
        headers: {
          'Content-Type': contentType,
        },
      });
    }
  } catch (error) {
    console.error('Error proxying Mapbox request:', error);
    return NextResponse.json(
      { error: 'Failed to proxy request' },
      { status: 500 }
    );
  }
}

// Handle all HTTP methods
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  return handleRequest(request, params);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  return handleRequest(request, params);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  return handleRequest(request, params);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  return handleRequest(request, params);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  return handleRequest(request, params);
}

