import { NextResponse } from 'next/server';
export function problem(status:number, error:string) { return NextResponse.json({error},{status}); }
export async function jsonBody(request:Request):Promise<Record<string,unknown>|null> { try { const v=await request.json(); return v && typeof v==='object' ? v : null; } catch { return null; } }
