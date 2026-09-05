import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata={title:'むぎの部屋 | 3Dペット猫',description:'なでて、遊んで、ごはんをあげる。むぎと過ごす小さな3Dの部屋。'};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="ja"><body>{children}</body></html>;}
