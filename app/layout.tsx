import { AuthProvider } from "@/components/providers/AuthProvider"
import "./globals.css" 

export const metadata = {
  title: 'DocHub',
  description: 'Document Management System',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  )
}