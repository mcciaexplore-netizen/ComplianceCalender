import './globals.css';
import './product-theme.css';
import { APPLICATION_ORIGIN } from '@/lib/deployment';
export const metadata = {
  metadataBase: new URL(APPLICATION_ORIGIN),
  title: 'MCCIA Compliance Calendar',
  description:
    'Stay Ahead of Every Compliance Deadline. Manage statutory deadlines, tasks, documents and approvals in one workspace.',
  openGraph: {
    title: 'MCCIA Compliance Calendar',
    description: 'Stay Ahead of Every Compliance Deadline.',
    images: ['/og.png'],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'MCCIA Compliance Calendar',
    description: 'Stay Ahead of Every Compliance Deadline.',
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
