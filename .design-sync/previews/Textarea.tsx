import Textarea from "../../src/components/kash/ui/Textarea";

/** Content-sized: grows to fit, then scrolls internally at 40vh. */
export const Default = () => (
  <Textarea
    className="w-96"
    defaultValue="Kick-off call went well. They want the dashboard before the board meeting."
  />
);

export const Placeholder = () => (
  <Textarea className="w-96" placeholder="What happened? (notes stay on the project)" />
);

export const Grown = () => (
  <Textarea
    className="w-96"
    defaultValue={
      "Scope for the next fortnight:\n" +
      "· Finish the sourcing filter\n" +
      "· Wire the draw panel to Xero bills\n" +
      "· Ship the weekly report generator\n" +
      "· Review the fee table before invoicing"
    }
  />
);

export const Disabled = () => (
  <Textarea className="w-96" defaultValue="Locked while the invoice is sent." disabled />
);
