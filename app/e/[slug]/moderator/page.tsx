import ModeratorClient from './ModeratorClient';export default async function Page({params}:{params:Promise<{slug:string}>}){return <ModeratorClient slug={(await params).slug}/>}
