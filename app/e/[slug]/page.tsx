import EventClient from './EventClient';export default async function Page({params}:{params:Promise<{slug:string}>}){return <EventClient slug={(await params).slug}/>}
