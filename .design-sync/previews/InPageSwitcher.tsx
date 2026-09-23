import { useState } from "react";

import IconButton from "../../src/components/kash/ui/IconButton";
import { InPageSwitcher } from "../../src/components/kash/InPageSwitcher";
import { kashIconProps } from "../../src/components/kash/ui/icon";
import { Plus } from "lucide-react";

/** Fully controlled — the caller owns the value and its persistence. */
export const DayWeek = () => {
  const [value, setValue] = useState("day");
  return (
    <InPageSwitcher
      ariaLabel="Today scope"
      options={[
        { value: "day", label: "Day" },
        { value: "week", label: "Week" },
      ]}
      value={value}
      onChange={setValue}
    />
  );
};

/** Four segments — the Plan sub-view switcher. */
export const PlanViews = () => {
  const [value, setValue] = useState("bets");
  return (
    <InPageSwitcher
      ariaLabel="Plan view"
      options={[
        { value: "directions", label: "Directions" },
        { value: "bets", label: "Bets" },
        { value: "learning", label: "Learning" },
        { value: "review", label: "Review" },
      ]}
      value={value}
      onChange={setValue}
    />
  );
};

/** `trailing` clusters a control after the segments (Today's add-task +). */
export const WithTrailing = () => {
  const [value, setValue] = useState("list");
  return (
    <InPageSwitcher
      ariaLabel="Projects view"
      options={[
        { value: "list", label: "List" },
        { value: "board", label: "Board" },
        { value: "gantt", label: "Gantt" },
      ]}
      value={value}
      onChange={setValue}
      trailing={
        <IconButton aria-label="Add project">
          <Plus {...kashIconProps({ tokenSize: "md" })} aria-hidden />
        </IconButton>
      }
    />
  );
};

/** A sentinel value no option matches leaves every segment unpressed. */
export const NoneSelected = () => (
  <InPageSwitcher
    ariaLabel="Gantt zoom"
    options={[
      { value: "week", label: "Week" },
      { value: "month", label: "Month" },
      { value: "quarter", label: "Quarter" },
    ]}
    value="auto"
    onChange={() => {}}
  />
);
