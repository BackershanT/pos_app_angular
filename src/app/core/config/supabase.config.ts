import { environment } from '../../../environments/environment';

export const supabaseConfig = {
  url: environment.supabase.url,
  anonKey: environment.supabase.anonKey,
};
