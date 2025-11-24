import { createBrowserClient } from '@supabase/ssr';

export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Missing Supabase environment variables. Please check your .env.local file.');
    throw new Error('Supabase configuration is missing');
  }

  // Warn if using service_role key (which should never be in browser)
  if (supabaseAnonKey.includes('service_role') || supabaseAnonKey.length > 200) {
    console.error(
      'ERROR: You are using the service_role key in the browser! ' +
      'This is a security risk. Please use the anon/public key from your Supabase dashboard.'
    );
    throw new Error('Invalid Supabase key: service_role key cannot be used in browser');
  }

  return createBrowserClient(supabaseUrl, supabaseAnonKey);
}

