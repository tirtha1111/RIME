import type {Metadata} from 'next';
import './globals.css'; // Global styles

export const metadata: Metadata = {
  title: 'PHI AI',
  description: 'PHI AI - Voice-native AI assistant designed for seamless, interruptible real-time conversations.',
  openGraph: {
    title: 'PHI AI',
    description: 'PHI AI - Voice-native AI assistant designed for seamless, interruptible real-time conversations.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'PHI AI',
    description: 'PHI AI - Voice-native AI assistant designed for seamless, interruptible real-time conversations.',
  },
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="en">
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
