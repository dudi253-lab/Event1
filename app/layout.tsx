import type {Metadata} from 'next';import {Frank_Ruhl_Libre,Heebo} from 'next/font/google';import './globals.css';
const frank=Frank_Ruhl_Libre({subsets:['hebrew'],variable:'--font-display'});const heebo=Heebo({subsets:['hebrew'],variable:'--font-body'});
export const metadata:Metadata={title:'Digi',description:'הרגעים של האירוע שלכם'};
export default function Layout({children}:{children:React.ReactNode}){return <html lang="he" dir="rtl" className={`${frank.variable} ${heebo.variable}`}><body>{children}</body></html>}
