import Input from "../../src/components/kash/ui/Input";
import InlineValidation, {
  inlineValidationFieldClass,
} from "../../src/components/kash/ui/InlineValidation";

/** §7.6 — crimson field edge plus the message below the control. */
export const OnAField = () => (
  <div className="flex w-80 flex-col">
    <Input className={inlineValidationFieldClass} defaultValue="" placeholder="Rate (per hour)" />
    <InlineValidation message="Enter a rate before the project can be billed." />
  </div>
);

export const MessageOnly = () => (
  <div className="w-80">
    <InlineValidation message="That date is in a sealed fortnight." />
  </div>
);

export const LongMessage = () => (
  <div className="w-80">
    <InlineValidation message="Money can't live on a project row — add a fee in the project's fee table instead." />
  </div>
);
