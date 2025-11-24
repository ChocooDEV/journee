/**
 * Mapbox Proxy Interceptor
 * 
 * This module sets up global interceptors to route all Mapbox API requests
 * through our secure proxy endpoint. This must run before mapbox-gl is imported.
 */

if (typeof window !== 'undefined') {
  // Helper function to convert Mapbox URL to proxy URL
  const convertToProxyUrl = (url: string): string | null => {
    // Handle both api.mapbox.com and events.mapbox.com
    const isMapboxRequest = url.includes('api.mapbox.com') || url.includes('events.mapbox.com');
    if (!isMapboxRequest) return null;
    
    try {
      const urlObj = new URL(url);
      const hostname = urlObj.hostname;
      const pathname = urlObj.pathname;
      
      // Determine the base path based on domain
      let basePath = '';
      if (hostname.includes('events.mapbox.com')) {
        basePath = 'events';
      } else if (hostname.includes('api.mapbox.com')) {
        basePath = 'api';
      }
      
      // Extract the path after the domain
      let path = pathname.startsWith('/') ? pathname.slice(1) : pathname;
      
      // For events.mapbox.com, the pathname is already "/events/v2", so path is "events/v2"
      // We don't need to add "events/" prefix again - just use the path as-is
      // For api.mapbox.com, we can optionally add "api/" prefix for clarity, but it's not required
      let fullPath: string;
      if (hostname.includes('events.mapbox.com')) {
        // Events domain: path is already "events/v2", use as-is
        fullPath = path;
      } else if (hostname.includes('api.mapbox.com')) {
        // API domain: optionally add "api/" prefix for consistency
        // But if path already starts with "api/", don't duplicate
        if (path.startsWith('api/')) {
          fullPath = path;
        } else {
          fullPath = `api/${path}`;
        }
      } else {
        fullPath = path;
      }
      
      // Remove access_token from query params
      urlObj.searchParams.delete('access_token');
      const queryString = urlObj.search;
      
      return `/api/mapbox/${fullPath}${queryString ? `?${queryString}` : ''}`;
    } catch (e) {
      console.error('Error parsing Mapbox URL:', e, url);
      return null;
    }
  };

  // Store original functions
  const originalFetch = window.fetch;
  const originalXHROpen = XMLHttpRequest.prototype.open;

  // Override fetch - set up immediately
  window.fetch = async function(input: RequestInfo | URL, init?: RequestInit) {
    let url: string;
    let originalRequest: Request | null = null;
    
    if (typeof input === 'string') {
      url = input;
    } else if (input instanceof URL) {
      url = input.toString();
    } else if (input instanceof Request) {
      url = input.url;
      originalRequest = input;
    } else {
      url = String(input);
    }
    
    const proxyUrl = convertToProxyUrl(url);
    if (proxyUrl) {
      // Remove any authorization headers that might contain the token
      const headers = new Headers(originalRequest?.headers || init?.headers);
      headers.delete('Authorization');
      
      // For Request objects, we need to clone to preserve the body
      // For string/URL inputs, use init?.body
      let body: BodyInit | null | undefined;
      if (originalRequest) {
        // Clone the request to preserve body and other properties
        // We'll create a new Request with the proxy URL
        body = originalRequest.body;
      } else {
        body = init?.body;
      }
      
      // Create new request with proxy URL and all original properties
      const proxyRequestInit: RequestInit = {
        method: originalRequest?.method || init?.method || 'GET',
        headers: headers,
        body: body,
        cache: originalRequest?.cache || init?.cache,
        credentials: originalRequest?.credentials || init?.credentials,
        mode: originalRequest?.mode || init?.mode,
        redirect: originalRequest?.redirect || init?.redirect,
        referrer: originalRequest?.referrer || init?.referrer,
        referrerPolicy: originalRequest?.referrerPolicy || init?.referrerPolicy,
        signal: originalRequest?.signal || init?.signal,
      };
      
      return originalFetch(proxyUrl, proxyRequestInit);
    }
    
    return originalFetch(input, init);
  };

  // Override XMLHttpRequest.open - set up immediately
  XMLHttpRequest.prototype.open = function(
    method: string,
    url: string | URL,
    async?: boolean,
    username?: string | null,
    password?: string | null
  ): void {
    const urlString = typeof url === 'string' ? url : url.toString();
    const proxyUrl = convertToProxyUrl(urlString);
    
    // Events endpoint requires POST - force it if it's a GET request
    let finalMethod = method;
    if (proxyUrl && proxyUrl.includes('/api/mapbox/events/') && method === 'GET') {
      finalMethod = 'POST';
    }
    
    const finalUrl = proxyUrl || urlString;
    
    // Store the proxy URL on the XHR instance for debugging
    if (proxyUrl) {
      (this as any)._mapboxProxied = true;
      (this as any)._mapboxOriginalUrl = urlString;
      (this as any)._mapboxProxyUrl = proxyUrl;
    }
    
    // Call original with all arguments (with potentially modified method)
    (originalXHROpen as any).apply(this, arguments.length === 5 
      ? [finalMethod, finalUrl, async, username, password]
      : arguments.length === 3
      ? [finalMethod, finalUrl, async]
      : [finalMethod, finalUrl]
    );
  };
}

