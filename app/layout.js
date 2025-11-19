import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { LoadingProvider } from "./context/LoadingContext";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "Sistema de Horarios",
  description: "Aplicación para registro y gestión de horarios de empleados",
};

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              // Prevenir errores de extensiones de navegador (MetaMask, etc.)
              if (typeof window !== 'undefined') {
                window.addEventListener('error', function(e) {
                  if (e.message && e.message.includes('ethereum')) {
                    e.preventDefault();
                    return true;
                  }
                });
              }
            `,
          }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <LoadingProvider>
          {children}
        </LoadingProvider>
      </body>
    </html>
  );
}
