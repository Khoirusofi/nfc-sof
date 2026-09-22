import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ActivationForm from './ActivationForm'
export default async function Activate({params}:{params:{card_code:string}}){ const supabase=await createClient(); const {data:card}=await supabase.from('cards').select('card_code,status').eq('card_code',params.card_code).maybeSingle(); if(!card) return <main className="mx-auto max-w-md p-6"><h1 className="text-2xl font-bold">Card not found</h1><p className="mt-2 text-slate-600">Check the code and try again.</p></main>; if(card.status==='active') redirect(`/c/${card.card_code}`); return <ActivationForm cardCode={card.card_code}/> }
