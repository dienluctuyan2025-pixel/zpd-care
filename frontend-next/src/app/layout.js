import "./base.css";
import "./zpd-ui.css";

export const metadata = {
  title: "ZPD Care | Sàng lọc hành vi · Mầm non",
  description: "Hệ thống hỗ trợ sàng lọc hành vi và can thiệp ZPD cho giáo viên mầm non. Không thay thế chẩn đoán y khoa.",
  manifest: "/manifest.json",
  icons: {
    icon: "/logo-zpd.svg",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "ZPD Care",
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport = {
  themeColor: "#1d2d50",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({ children }) {
  return (
    <html lang="vi" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&subset=vietnamese&display=swap"
          rel="stylesheet"
        />
        <link rel="manifest" href="/manifest.json" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="ZPD Care" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="theme-color" content="#1d2d50" />
      </head>
      <body suppressHydrationWarning>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var d=localStorage.getItem('zpd_dark')==='1';document.documentElement.setAttribute('data-theme',d?'dark':'light');document.documentElement.style.colorScheme=d?'dark':'light';}catch(e){}})();`,
          }}
        />
        {children}
      </body>
    </html>
  );
}
