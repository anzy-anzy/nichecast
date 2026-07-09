import './globals.css';

export const metadata = {
  title: 'NicheCast — AI content for your niche, posted everywhere',
  description:
    'Generate niche-perfect social media content with AI or upload your videos, then auto-post to Instagram, TikTok, Facebook, LinkedIn, X and YouTube from one dashboard.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
