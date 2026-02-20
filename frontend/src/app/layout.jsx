import { DM_Serif_Display, Libre_Franklin } from 'next/font/google'
import './globals.css'

const dmSerif = DM_Serif_Display({
  subsets: ['latin'],
  weight: ['400'],
  variable: '--font-display',
  display: 'swap',
})

const libreFranklin = Libre_Franklin({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-body',
  display: 'swap',
})

export const metadata = {
  title: 'SmartWakacje',
  description: 'Inteligentne wyszukiwanie ofert wakacyjnych',
}

export default function RootLayout({ children }) {
  return (
    <html lang="pl" className={`${dmSerif.variable} ${libreFranklin.variable}`}>
      <body className="font-body antialiased">
        {children}
      </body>
    </html>
  )
}
