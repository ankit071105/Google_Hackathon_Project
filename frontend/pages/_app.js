// pages/_app.js
import '../styles/globals.css'
import Head from 'next/head'
import { CartProvider } from '../contexts/CartContext'

export default function MyApp({ Component, pageProps }) {
  return (
    <CartProvider>
      <Head>
        <title>ArtCrafts — Indian Handicrafts</title>
        <meta name="description" content="Discover authentic Indian handicrafts with personalized recommendations" />
        <link rel="icon" href="/favicon.ico" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="true" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </Head>
      <Component {...pageProps} />
    </CartProvider>
  )
}