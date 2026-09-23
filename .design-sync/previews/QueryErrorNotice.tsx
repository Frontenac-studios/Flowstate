import { QueryErrorNotice } from "../../src/components/kash/ui/QueryErrorNotice";

const noop = () => {};

/** Inline error for a failed useQuery, so a broken fetch never reads as empty. */
export const WithRetry = () => (
  <div className="w-96">
    <QueryErrorNotice message="This month didn't load." onRetry={noop} />
  </div>
);

export const NoRetry = () => (
  <div className="w-96">
    <QueryErrorNotice message="The ledger is temporarily unavailable." />
  </div>
);

/** Default copy when the caller has nothing more specific to say. */
export const DefaultMessage = () => (
  <div className="w-96">
    <QueryErrorNotice onRetry={noop} />
  </div>
);
