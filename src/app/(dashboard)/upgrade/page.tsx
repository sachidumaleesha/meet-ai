import { getQueryClient, trpc } from "@/trpc/server";
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { Suspense } from "react";
import { ErrorBoundary } from "react-error-boundary";

import {
  UpgradeView,
  UpgradeViewError,
  UpgradeViewLoading,
} from "@/modules/premium/ui/view/upgrade-view";

const Page = async () => {
  const queryClient = getQueryClient();
  await queryClient.prefetchQuery(
    trpc.premium.getCurrentSubscription.queryOptions()
  );
  await queryClient.prefetchQuery(trpc.premium.getProducts.queryOptions());

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <Suspense fallback={<UpgradeViewLoading />}>
        <ErrorBoundary fallback={<UpgradeViewError />}>
          <UpgradeView />
        </ErrorBoundary>
      </Suspense>
    </HydrationBoundary>
  );
};

export default Page;
