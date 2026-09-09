import Copilot from '@/components/copilot/app';
const origin = 'https://compliance-mitra.vedshridikkar.chatgpt.site';
export const metadata = {
  title: 'SME Helpline AI Copilot',
  description:
    'Your expertise. Amplified. A private, multilingual consultation workspace for SME advisors.',
  openGraph: {
    title: 'SME Helpline AI Copilot',
    description: 'Real-time support for meaningful conversations.',
    url: origin + '/copilot',
    images: [origin + '/copilot-og.png'],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'SME Helpline AI Copilot',
    description: 'Your expertise. Amplified.',
    images: [origin + '/copilot-og.png'],
  },
};
export default function Page() {
  return <Copilot />;
}
