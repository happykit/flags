import "tailwindcss/tailwind.css";
import { VercelToolbar } from "@vercel/toolbar/next";

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
      <body>
        {children}
        {
          // shows the toolbar when developing locally or in preview, but not in production
          process.env.NEXT_PUBLIC_FLAGS_ENV_KEY &&
          /^flags_pub_(development|preview)_/.test(
            process.env.NEXT_PUBLIC_FLAGS_ENV_KEY
          ) ? (
            <VercelToolbar />
          ) : null
        }
      </body>
    </html>
  );
}
