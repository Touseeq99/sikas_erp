import type { Metadata } from 'next'
import { Outfit } from 'next/font/google'
import './globals.css'
import Sidebar from './components/Sidebar'
import Header from './components/Header'

const outfit = Outfit({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'SIKAS ERP - Logistics Management System',
  description: 'ERP system for SIKAS Logistics - Ceramic Tile Distribution',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={outfit.className}>
        <div className="flex h-screen bg-gray-50 overflow-hidden">
          <Sidebar />
          <div className="flex-1 flex flex-col h-screen overflow-hidden">
            <Header />
            <main className="flex-1 overflow-y-auto p-6 scrollbar-thin">
              {children}
            </main>
          </div>
        </div>
      </body>
    </html>
  )
}
