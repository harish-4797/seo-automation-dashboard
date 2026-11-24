import './globals.css';

export const metadata = {
  title: 'SEO Automation Dashboard · Edgelink',
  description: 'Automated SEO audits with AI recommendations, PDF reports and client delivery.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="min-h-screen font-sans">{children}</body>
    </html>
  );
}
