
import type {Metadata} from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Order Fulfillment Process Dashboard',
  description: 'AI-Powered process management dashboard.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;500;700;900&display=swap" rel="stylesheet" />
      </head>
      <body className="font-body antialiased bg-background-light dark:bg-background-dark text-gray-800 dark:text-gray-200">
        {children}
      </body>
    </html>
  );
}
