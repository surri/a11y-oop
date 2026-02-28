import type { Metadata } from 'next'
import SessionProvider from '@/components/SessionProvider'
import './globals.css'

export const metadata: Metadata = {
  title: 'A11y Oop - Accessibility DevTool',
  description: 'Automatically detect and fix WCAG accessibility violations',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="bg-gray-950 text-gray-100 min-h-screen antialiased">
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  )
}
