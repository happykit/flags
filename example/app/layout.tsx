import "tailwindcss/tailwind.css";

export const metadata = {
  title: "HappyKit Flags Documentation",
  description: "Feature Flags for Next.js",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/favicon.png" />
        {process.env.NODE_ENV === "production" && (
          <script
            async
            defer
            src="https://plausible.io/js/plausible.js"
            data-domain="flags.happykit.dev"
          />
        )}
      </head>
      <body>{children}</body>
    </html>
  );
}
