import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { supabaseConfig } from '../config/supabase.config';
import { getSupabaseClient } from '../../data-access/supabase/supabase.client';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const supabase = getSupabaseClient();
  let headers = req.headers;

  // If request is going to Supabase REST / Functions, inject apikey & auth
  if (req.url.includes(supabaseConfig.url)) {
    headers = headers.set('apikey', supabaseConfig.anonKey);
  }

  return next(req.clone({ headers }));
};
