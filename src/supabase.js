import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://zhbeatsroybpxrwnclmb.supabase.co'
const supabaseKey = 'sb_publishable_qu5syGiykJeCWb9Y-sCIlA_vuzriCZH'

export const supabase = createClient(supabaseUrl, supabaseKey)