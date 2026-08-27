import crypto from 'node:crypto';
import { cookies } from 'next/headers';
import { serverClient } from './supabase-server';
import { randomToken, SESSION_COOKIE, sha256 } from './security';
import type { StaffRole } from './types';

export function hashPin(pin:string,salt:string) { return crypto.scryptSync(pin,salt,32).toString('hex'); }
export function newPinHash(pin:string) { const salt=crypto.randomBytes(16).toString('hex'); return {salt,hash:hashPin(pin,salt)}; }
export function validPin(pin:string,salt:string,expected:string) {
  if (!/^\d{4}$/.test(pin)) return false;
  const actual=Buffer.from(hashPin(pin,salt),'hex'), wanted=Buffer.from(expected,'hex');
  return actual.length===wanted.length && crypto.timingSafeEqual(actual,wanted);
}
export async function createSession(values:{role:StaffRole;eventId:string;credentialVersion:number;userId?:string}) {
  const token=randomToken(), db=serverClient();
  const {error}=await db.from('staff_sessions').insert({token_hash:sha256(token),role:values.role,event_id:values.eventId,user_id:values.userId||null,credential_version:values.credentialVersion,expires_at:new Date(Date.now()+8*3600_000).toISOString()});
  if(error) throw error;
  return token;
}
export async function setSessionCookie(token:string) { const jar=await cookies(); jar.set(SESSION_COOKIE,token,{httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'strict',path:'/',maxAge:8*3600}); }
export async function requireSession(eventId:string,roles:StaffRole[]) {
  const token=(await cookies()).get(SESSION_COOKIE)?.value;
  if(!token) return null;
  const db=serverClient();
  const {data:s}=await db.from('staff_sessions').select('id,role,user_id,event_id,credential_version,expires_at,revoked_at').eq('token_hash',sha256(token)).maybeSingle();
  if(!s || s.revoked_at || new Date(s.expires_at)<=new Date() || !roles.includes(s.role) || s.event_id!==eventId) return null;
  const {data:event}=await db.from('events').select('company_id,credential_version').eq('id',eventId).single();
  if(!event || (s.role==='photo_moderator' && s.credential_version!==event.credential_version)) return null;
  if(s.role==='company_admin') {
    const {data:m}=await db.from('company_members').select('user_id').eq('company_id',event.company_id).eq('user_id',s.user_id).eq('role','company_admin').maybeSingle();
    if(!m) return null;
  }
  return s;
}
