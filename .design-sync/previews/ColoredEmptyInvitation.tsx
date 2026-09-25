import Button from "../../src/components/kash/ui/Button";
import { ColoredEmptyInvitation } from "../../src/components/kash/ui/ColoredEmptyInvitation";

/** D12 — an empty surface still invites; never a dead "nothing here". */
export const Invitation = () => (
  <div className="w-[34rem]">
    <ColoredEmptyInvitation
      title="No bets for this quarter yet"
      hint="A bet is one thing you're deliberately spending the quarter on. Two or three is plenty."
    />
  </div>
);

export const WithAction = () => (
  <div className="w-[34rem]">
    <ColoredEmptyInvitation
      title="Nothing waiting on you"
      hint="When a project goes quiet for a week it shows up here."
      action={<Button variant="ghost">Review the backlog</Button>}
    />
  </div>
);

export const TitleOnly = () => (
  <div className="w-[34rem]">
    <ColoredEmptyInvitation title="All swept" />
  </div>
);
