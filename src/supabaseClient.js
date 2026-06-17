import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    'Supabase URL or Anon Key is missing. Make sure to define VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env file or GitHub Secrets.'
  )
}

if (supabaseUrl === 'https://placeholder.supabase.co') {
  console.error(
    '⛔ VITE_SUPABASE_URL no fue inyectada correctamente en el build. Revisa los Secrets de GitHub.'
  )
}

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder'
)
