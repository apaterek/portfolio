/* ============================================================
   sample.js — the attached commercial actual, as data.

   Source: ACTUAL_LMCD_Comcast_HBO_1518N_001HMR.xls
   (1stAveMachine for Digitas / Comcast, HBO Jan15, bid 001H, 2015).
   Sheet 1 "BID" seeds the estimate, sheet 2 "Actual (2)" seeds the
   cost entries. Loading this reproduces the workbook's numbers:

     hard cost estimate  14,101      grand estimate  28,476
     working (spendable) 47,200      actual to date  44,262.41
     variance             2,937.59

   Two faithfulness notes, both preserved rather than smoothed over:
   - The original's INSURANCE row was typed over with a flat 2,000
     weekend premium, so it is seeded flat, not as the printed 5%.
   - The original's shipping line had no value in its total column, so
     it dropped out of the E subtotal. Here it is seeded held (not
     counted), which is the same result by an honest route.
   ============================================================ */

const SAMPLE = {
  name: 'Comcast HBO Jan15',
  template: 'film',
  info: {
    productionCompany: '1stAveMachine',
    address: '231 Front Street, 4fl',
    city: 'New York, NY 11201',
    phone: '718-218-8587',
    client: 'Digitas',
    agency: 'Digitas',
    contact: 'Gretchen Hargrove',
    email: 'gretchen.hargrove@digitas.com',
    jobNumber: '1518N',
    product: 'Comcast HBO Jan15',
    title: 'TBD',
    bidVersion: '001H',
    date: '2015-03-19',
    startDate: '2015-03-21',
    deliveryDate: '2015-03-25',
    deliverables: '1x :30',
    versions: '2 versions, end card graphic only',
    aspect: '16:9',
    frameRate: '23.98 working / 29.97 delivery',
    format: 'ProRes QT via upload',
    schedule: 'Ship Wed 3/25 EOD',
    notes: 'Bid includes 1stAve in-house editorial, conform, comp, formatting.'
  },
  settings: { currency: 'USD', pwRate: 0.1597, pwLabel: 'P&W' },

  /* Estimate lines that carried a value in the BID sheet. Sections keep
     the full film chart of accounts; only these are priced. */
  priced: {
    A: [{ code: '101', qty: 1, units: 7, rate: 700 }],
    B: [{ code: '207', qty: 1, units: 5, rate: 700 }],
    D: [
      { code: '400', qty: 1, units: 5, rate: 700 },
      { code: '407', qty: 1, units: 1, rate: 100 }
    ],
    E: [{ code: '501', qty: 1, units: 1, rate: 200 }]
  },

  adjusters: [
    { label: 'POOL', mode: 'percent', rate: 0.20, base: 'hard' },
    { label: 'INSURANCE (WEEKEND PREMIUM)', mode: 'flat', amount: 2000, base: 'hard' },
    { label: "DIRECTOR'S FEE", mode: 'flat', amount: 2271, base: 'running' },
    { label: 'REP FEE', mode: 'flat', amount: 1608, base: 'running' },
    { label: 'MARKUP', mode: 'flat', amount: 5676, base: 'running' }
  ],

  changeOrders: [
    { label: 'Budget #1 (001H)', gross: 28476, retain: 0.20, spendable: 22800 },
    { label: 'Budget #2 revision, 2x :30', gross: 30500, retain: 0.20, spendable: null }
  ],

  /* section = which section the cost was filed under in the actual sheet */
  actuals: [
    { section: 'A', code: '101', date: '3/23 - 3/29', vendor: 'Abby Okin', desc: 'Producer',
      qty: 7, unit: 'days', rate: 700, inc: false, fringe: 0.1597, override: 5502.63, status: 'paid' },
    { section: 'A', code: '101', date: '3/30 - 4/13', vendor: 'Abby Okin', desc: 'Producer',
      qty: 10, unit: 'days', rate: 700, inc: false, fringe: 0.1597, override: null, status: 'paid' },

    { section: 'B', code: '207', date: '3/21 - 3/25', vendor: 'Michael Glen LLC', desc: 'AE Graphics & Comp',
      qty: 5, unit: 'days', rate: 650, inc: true, fringe: 0, override: null, status: 'paid' },
    { section: 'B', code: '207', date: '3/30 - 4/3', vendor: 'Michael Glen LLC', desc: 'AE Graphics & Comp',
      qty: 5, unit: 'days', rate: 650, inc: true, fringe: 0, override: null, status: 'paid' },
    { section: 'B', code: '207', date: '4/7 - 4/8', vendor: 'Adam Glucksman', desc: 'AE Graphics & Comp',
      qty: 2, unit: 'days', rate: 500, inc: false, fringe: 0.1597, override: null, status: 'paid' },
    { section: 'B', code: '207', date: '', vendor: 'Christopher Reinman', desc: 'Comp',
      qty: 2, unit: 'days', rate: 600, inc: false, fringe: 0.1597, override: null, status: 'paid' },
    { section: 'B', code: '207', date: '', vendor: 'Octopus: Matt Monson', desc: 'Smoke',
      qty: 5, unit: 'days', rate: 990, inc: true, fringe: 0, override: null, status: 'paid' },
    { section: 'B', code: '207', date: '', vendor: 'Chris Russo', desc: 'Comp', invoice: '14',
      qty: 3, unit: 'days', rate: 500, inc: true, fringe: 0, override: null, status: 'invoiced' },
    { section: 'B', code: '207', date: '', vendor: 'Chris Russo', desc: 'Comp', invoice: '15',
      qty: 1, unit: 'flat', rate: 2650, inc: true, fringe: 0, override: null, status: 'invoiced' },

    { section: 'D', code: '400', date: '3/21 - 4/8', vendor: 'Jonathan Pulley', desc: 'Editor', invoice: 'INV 1503',
      qty: 11.5, unit: 'days', rate: 650, inc: false, fringe: 0.1597, override: null, status: 'paid' },
    { section: 'D', code: '400', date: '', vendor: 'Jonathan Vitagliano', desc: 'Editor', invoice: 'INV 15-10',
      qty: 2, unit: 'days', rate: 550, inc: false, fringe: 0.1597, override: 546.89, status: 'paid',
      note: 'Partial payment against a 2-day booking.' },
    { section: 'D', code: '400', date: '', vendor: 'Jonathan Vitagliano', desc: 'Editor', invoice: 'INV 15-11',
      qty: 4, unit: 'days', rate: 550, inc: false, fringe: 0.1597, override: null, status: 'paid' },

    { section: 'E', code: '500', date: '4/13', vendor: 'Shipping', desc: 'Elements drive to agency storage',
      qty: 1, unit: 'per', rate: 20, inc: true, fringe: 0, override: null, status: 'pending', include: false,
      note: 'Estimate only. Held out of the actual, as in the source workbook.' },
    { section: 'E', code: '407', date: '', vendor: '', desc: 'Drives purchase',
      qty: 1, unit: 'per', rate: 339.98, inc: true, fringe: 0, override: null, status: 'paid' },
    { section: 'E', code: '501', date: '3/21 - 4/8', vendor: 'Seamless', desc: 'Working meals',
      qty: 1, unit: 'per', rate: 438.21, inc: true, fringe: 0, override: 333.49, status: 'paid',
      note: 'Booked at estimate, settled lower.' },
    { section: 'E', code: '501', date: '4/2', vendor: 'Cash working meals', desc: 'Meenasmahabir',
      qty: 1, unit: 'per', rate: 50.08, inc: true, fringe: 0, override: null, status: 'paid' }
  ]
};
