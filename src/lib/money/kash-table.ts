/**
 * The Kash money table (Spec v5 KashB2): one row per client carrying the sums,
 * its projects nested below. Pure — the router gathers rows, this does the maths.
 *
 * Columns:
 * - Billable now — hourly: unbilled billable seconds × the client's default rate
 *   (the rate an invoice draft bills at); fixed fee: ready, unbilled installments.
 * - AR — accepted, unpaid invoices. Paid to date — paid invoices, all time.
 * - Contract — fixed fee: the fee; hourly: the proposal amount when one was recorded.
 *
 * Invoices are per client, so a project's AR / paid share is DERIVED: an hourly
 * invoice splits across projects by the seconds each billed on it; a fee invoice
 * goes to the projects its installments belong to. Client sums are taken from the
 * invoices directly (never re-added from the split), so rounding can't drift them.
 */

const SECONDS_PER_HOUR = 3600;

export type KashClientIn = {
  id: string;
  name: string;
  /** The client's default rate, cents/hour. Null when none is set. */
  rateCents: number | null;
  archived: boolean;
};

export type KashProjectIn = {
  id: string;
  name: string;
  clientId: string;
  hue: number | null;
  billingType: "hourly" | "fixed_fee";
  archived: boolean;
};

export type KashFeeIn = {
  projectId: string;
  feeAmountCents: number | null;
  proposalAmountCents: number | null;
};

export type KashEntryIn = {
  projectId: string;
  seconds: number;
  billable: boolean;
  /** Null = not yet invoiced. */
  invoiceId: string | null;
};

export type KashInvoiceIn = {
  id: string;
  clientId: string;
  kind: "time" | "fee";
  amountCents: number;
  status: "accepted" | "void";
  paidAt: Date | null;
};

export type KashInstallmentIn = {
  projectId: string;
  label: string;
  amountCents: number;
  invoiceId: string | null;
  /** Ready by milestone or by hand (see lib/money/fee-installments). */
  ready: boolean;
};

export type KashProjectRow = {
  id: string;
  name: string;
  hue: number | null;
  billingType: "hourly" | "fixed_fee";
  /** What follows the name, muted: "hourly", "lump sum · Milestone 3", "not started". */
  note: string;
  billableSeconds: number;
  billableCents: number;
  arCents: number;
  paidCents: number;
  contractCents: number | null;
};

export type KashClientRow = {
  id: string;
  name: string;
  /** Clients have no colour of their own — the dot is their first project's hue. */
  hue: number | null;
  rateCents: number | null;
  billableCents: number;
  arCents: number;
  paidCents: number;
  contractCents: number | null;
  projects: KashProjectRow[];
};

export type KashTable = {
  totals: {
    billableCents: number;
    billableSeconds: number;
    /** Ready lump-sum installments counted in billableCents. */
    billableInstallments: number;
    arCents: number;
    unpaidInvoices: number;
    paidThisYearCents: number;
  };
  clients: KashClientRow[];
};

/**
 * Split `total` across weights so the parts sum exactly to `total` (largest
 * remainder). Zero total weight → nothing allocated.
 */
export function allocateCents(total: number, weights: ReadonlyMap<string, number>) {
  const out = new Map<string, number>();
  const sum = Array.from(weights.values()).reduce((a, b) => a + b, 0);
  if (sum <= 0) return out;
  const parts = Array.from(weights.entries()).map(([key, w]) => {
    const exact = (total * w) / sum;
    return { key, floor: Math.floor(exact), rem: exact - Math.floor(exact) };
  });
  let left = total - parts.reduce((a, p) => a + p.floor, 0);
  parts.sort((a, b) => b.rem - a.rem || a.key.localeCompare(b.key));
  for (const p of parts) {
    out.set(p.key, p.floor + (left > 0 ? 1 : 0));
    if (left > 0) left -= 1;
  }
  return out;
}

function add(map: Map<string, number>, key: string, n: number) {
  map.set(key, (map.get(key) ?? 0) + n);
}

export function buildKashTable(input: {
  clients: readonly KashClientIn[];
  projects: readonly KashProjectIn[];
  fees: readonly KashFeeIn[];
  entries: readonly KashEntryIn[];
  invoices: readonly KashInvoiceIn[];
  installments: readonly KashInstallmentIn[];
  now: Date;
}): KashTable {
  const { now } = input;
  const clientById = new Map(input.clients.map((c) => [c.id, c]));
  const feeByProject = new Map(input.fees.map((f) => [f.projectId, f]));
  const live = input.invoices.filter((i) => i.status !== "void");
  const liveById = new Map(live.map((i) => [i.id, i]));

  // --- per-project unbilled + logged ------------------------------------------
  const unbilledSeconds = new Map<string, number>();
  const loggedSeconds = new Map<string, number>();
  const billedSecondsByInvoice = new Map<string, Map<string, number>>();
  for (const e of input.entries) {
    add(loggedSeconds, e.projectId, e.seconds);
    if (!e.billable) continue;
    if (e.invoiceId == null) {
      add(unbilledSeconds, e.projectId, e.seconds);
    } else if (liveById.has(e.invoiceId)) {
      const byProject = billedSecondsByInvoice.get(e.invoiceId) ?? new Map<string, number>();
      add(byProject, e.projectId, e.seconds);
      billedSecondsByInvoice.set(e.invoiceId, byProject);
    }
  }

  // --- installments -----------------------------------------------------------
  const readyCents = new Map<string, number>();
  const readyLabels = new Map<string, string[]>();
  const feeInvoiceShare = new Map<string, Map<string, number>>();
  let billableInstallments = 0;
  for (const i of input.installments) {
    if (i.invoiceId == null) {
      if (!i.ready) continue;
      add(readyCents, i.projectId, i.amountCents);
      readyLabels.set(i.projectId, [...(readyLabels.get(i.projectId) ?? []), i.label]);
      billableInstallments += 1;
    } else if (liveById.has(i.invoiceId)) {
      const byProject = feeInvoiceShare.get(i.invoiceId) ?? new Map<string, number>();
      add(byProject, i.projectId, i.amountCents);
      feeInvoiceShare.set(i.invoiceId, byProject);
    }
  }

  // --- invoices → per-project AR / paid ---------------------------------------
  const projectAr = new Map<string, number>();
  const projectPaid = new Map<string, number>();
  const clientAr = new Map<string, number>();
  const clientPaid = new Map<string, number>();
  let unpaidInvoices = 0;
  let paidThisYearCents = 0;
  for (const inv of live) {
    const shares =
      inv.kind === "fee"
        ? (feeInvoiceShare.get(inv.id) ?? new Map<string, number>())
        : allocateCents(inv.amountCents, billedSecondsByInvoice.get(inv.id) ?? new Map());
    const target = inv.paidAt ? projectPaid : projectAr;
    shares.forEach((cents, projectId) => add(target, projectId, cents));
    if (inv.paidAt) {
      add(clientPaid, inv.clientId, inv.amountCents);
      if (inv.paidAt.getFullYear() === now.getFullYear()) paidThisYearCents += inv.amountCents;
    } else {
      add(clientAr, inv.clientId, inv.amountCents);
      unpaidInvoices += 1;
    }
  }

  // --- rows -------------------------------------------------------------------
  const projectsByClient = new Map<string, KashProjectIn[]>();
  for (const p of input.projects) {
    if (!clientById.has(p.clientId)) continue;
    projectsByClient.set(p.clientId, [...(projectsByClient.get(p.clientId) ?? []), p]);
  }

  let totalBillableCents = 0;
  let totalBillableSeconds = 0;
  const clients: KashClientRow[] = [];

  for (const client of input.clients) {
    const projects = (projectsByClient.get(client.id) ?? []).slice().sort((a, b) => {
      const ah = a.hue ?? 99;
      const bh = b.hue ?? 99;
      return ah !== bh ? ah - bh : a.name.localeCompare(b.name);
    });

    const rows: KashProjectRow[] = [];
    for (const p of projects) {
      const fee = feeByProject.get(p.id);
      const ar = projectAr.get(p.id) ?? 0;
      const paid = projectPaid.get(p.id) ?? 0;
      let billableSeconds = 0;
      let billableCents = 0;
      let note: string;
      if (p.billingType === "fixed_fee") {
        billableCents = readyCents.get(p.id) ?? 0;
        const labels = readyLabels.get(p.id) ?? [];
        note =
          labels.length === 1
            ? `lump sum · ${labels[0]}`
            : labels.length > 1
              ? `lump sum · ${labels.length} ready`
              : "lump sum";
      } else {
        billableSeconds = unbilledSeconds.get(p.id) ?? 0;
        billableCents =
          client.rateCents != null
            ? Math.round((billableSeconds * client.rateCents) / SECONDS_PER_HOUR)
            : 0;
        note = "hourly";
      }
      const touched = (loggedSeconds.get(p.id) ?? 0) > 0 || ar > 0 || paid > 0 || billableCents > 0;
      if (!touched) note = "not started";
      // An archived project stays only while it still carries money.
      if (p.archived && ar === 0 && paid === 0 && billableCents === 0) continue;

      const contractCents =
        p.billingType === "fixed_fee"
          ? (fee?.feeAmountCents ?? null)
          : (fee?.proposalAmountCents ?? null);
      rows.push({
        id: p.id,
        name: p.name,
        hue: p.hue,
        billingType: p.billingType,
        note,
        billableSeconds,
        billableCents,
        arCents: ar,
        paidCents: paid,
        contractCents,
      });
    }

    const billableCents = rows.reduce((s, r) => s + r.billableCents, 0);
    const arCents = clientAr.get(client.id) ?? 0;
    const paidCents = clientPaid.get(client.id) ?? 0;
    if (client.archived && rows.length === 0 && arCents === 0 && paidCents === 0) continue;
    const contracts = rows.map((r) => r.contractCents).filter((c): c is number => c != null);

    totalBillableCents += billableCents;
    totalBillableSeconds += rows.reduce((s, r) => s + r.billableSeconds, 0);
    clients.push({
      id: client.id,
      name: client.name,
      hue: rows.find((r) => r.hue != null)?.hue ?? null,
      rateCents: client.rateCents,
      billableCents,
      arCents,
      paidCents,
      contractCents: contracts.length > 0 ? contracts.reduce((a, b) => a + b, 0) : null,
      projects: rows,
    });
  }

  clients.sort((a, b) => (a.hue ?? 99) - (b.hue ?? 99) || a.name.localeCompare(b.name));

  return {
    totals: {
      billableCents: totalBillableCents,
      billableSeconds: totalBillableSeconds,
      billableInstallments,
      arCents: Array.from(clientAr.values()).reduce((a, b) => a + b, 0),
      unpaidInvoices,
      paidThisYearCents,
    },
    clients,
  };
}
