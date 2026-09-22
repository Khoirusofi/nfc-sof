import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
export const runtime='edge'
export async function GET(_: Request,{params}:{params:{card_code:string}}){ const supabase=await createClient(); const {data,error}=await supabase.rpc('get_card_redirect',{p_card_code:params.card_code}); const target=data?.[0]?.target_url; if(!error&&target) return NextResponse.redirect(target,307); return NextResponse.redirect(new URL(`/activate/${encodeURIComponent(params.card_code)}`,process.env.NEXT_PUBLIC_SITE_URL||'http://localhost:3000')) }
