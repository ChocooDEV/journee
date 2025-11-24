// This file is kept for backward compatibility
// Use createClient from client-browser.ts or client-server.ts instead
import { createClient as createBrowserClient } from './client-browser';

export const supabase = createBrowserClient();

