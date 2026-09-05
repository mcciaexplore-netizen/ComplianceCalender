import './globals.css';
export const metadata = {
  metadataBase: new URL('https://compliance-mitra.lucky-gem-4040.chatgpt.site'),
  title: 'Compliance Mitra | MCCIA',
  description:
    'MSME Compliance & Audit Management — tasks, audits, evidence and continuous improvement.',
  openGraph: {
    title: 'Compliance Mitra',
    description: 'MSME Compliance & Audit Management',
    images: ['/og.png'],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Compliance Mitra',
    description: 'MSME Compliance & Audit Management',
    images: ['/og.png'],
  },
  icons: { icon: '/assets/mccia-logo.png' },
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
