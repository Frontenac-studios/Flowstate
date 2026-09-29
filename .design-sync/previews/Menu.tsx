import Menu, {
  MenuDivider,
  MenuItem,
  MenuLabel,
  MenuSearch,
} from "../../src/components/kash/ui/Menu";

/** Spec v3 Pa1 — the task row ··· menu: shortcuts on the right, destructive last. */
export const TaskMenu = () => (
  <div className="p-6">
    <Menu aria-label="Task actions" className="w-[232px]">
      <MenuItem shortcut="E">Edit</MenuItem>
      <MenuItem shortcut="D">Set due date</MenuItem>
      <MenuItem shortcut="H">Mark high priority</MenuItem>
      <MenuDivider />
      <MenuItem shortcut="M" submenu>
        Move to phase
      </MenuItem>
      <MenuItem>Duplicate</MenuItem>
      <MenuDivider />
      <MenuItem destructive shortcut="⌫">
        Delete
      </MenuItem>
    </Menu>
  </div>
);

/** A searchable pick-one popover: group label, a selected row, nested and unplanned items. */
export const MoveToPhase = () => (
  <div className="p-6">
    <Menu aria-label="Move to phase" className="w-[272px]">
      <MenuSearch placeholder="Search phases" aria-label="Search phases" />
      <MenuLabel>Great White</MenuLabel>
      <MenuItem selected={false}>Onboarding</MenuItem>
      <MenuItem selected>Reporting</MenuItem>
      <MenuItem indent selected={false}>
        Weekly reports
      </MenuItem>
      <MenuItem indent selected={false}>
        Monthly review
      </MenuItem>
      <MenuItem dimmed note="Not planned" selected={false}>
        Q4 retainer
      </MenuItem>
    </Menu>
  </div>
);
