import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import GenerateBatchForm from './GenerateBatchForm'
export default async function Admin(){const s=await createClient();const {data:{user}}=await s.auth.getUser();if(!user)redirect('/login');const {data:profile}=await s.from('profiles').select('role').eq('id',user.id).single();if(profile?.role!=='admin')redirect('/dashboard');return <main className="mx-auto max-w-6xl p-6"><h1 className="text-3xl font-bold">Card operations</h1><p className="mt-2 text-slate-600">Generate batches and print QR grids. No customer data exports.</p><GenerateBatchForm/></main>}
