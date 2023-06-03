import { Content } from "components/Content";
import { PageContent } from "./page-content";

const title = "Client Components";
export const metadata = {
  title: `${title} · HappyKit Flags Documentation`,
  description: "Feature Flags for Next.js",
};

export default async function ClientComponentPage() {
  return (
    <Content
      title={title}
      source={`https://github.com/happykit/flags/blob/${process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_REF}/example/app/demo/client-components/page.tsx`}
    >
      {/* Page Content is extracted so we can make this a client-component demo  */}
      <PageContent />
    </Content>
  );
}
