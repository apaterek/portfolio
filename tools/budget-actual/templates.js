/* ============================================================
   templates.js — charts of accounts.

   Each template seeds a project's section/account structure. Every
   value is editable afterwards: templates are a starting point, not
   a schema. Account codes follow the AICP-style hundreds blocks that
   the commercial sample uses (A=100, B=200 ... G=700) so that a bid
   built here reconciles line-for-line against a production company's
   estimate.

   Line shape:
     [code, description, unitType, pw]
       code        account number (string)
       description what it is
       unitType    days | hours | weeks | months | each | allow | flat | per
       pw          true  -> this line carries the section's P&W / fringe
                   false -> hard cost, no fringe (rentals, purchases, allows)
   ============================================================ */

const UNIT_TYPES = ['days', 'hours', 'weeks', 'months', 'each', 'per', 'allow', 'flat'];

const TEMPLATES = {

  /* ---------------------------------------------------------- */
  film: {
    label: 'Commercial / Film',
    note: 'AICP-style creative, animation, editorial and finishing structure. Matches the attached 1stAveMachine actual.',
    pwRate: 0.1597,
    adjusters: [
      { label: 'POOL',            mode: 'percent', rate: 0.20, base: 'hard' },
      { label: 'INSURANCE',       mode: 'percent', rate: 0.05, base: 'hard' },
      { label: "DIRECTOR'S FEE",  mode: 'percent', rate: 0.08, base: 'running' },
      { label: 'REP FEE',         mode: 'percent', rate: 0.08, base: 'running' },
      { label: 'MARKUP',          mode: 'percent', rate: 0.20, base: 'running' }
    ],
    sections: [
      { code: 'A', name: 'CREATIVE & PRODUCTION SUPERVISION', pw: true, lines: [
        ['101', 'PRODUCER', 'days', true],
        ['102', 'PRODUCTION MANAGER', 'days', true],
        ['103', 'PRODUCTION COORDINATOR', 'days', true],
        ['104', 'PRODUCTION ASSISTANT', 'days', true],
        ['105', 'CREATIVE DIRECTOR', 'allow', true],
        ['106', 'ART DIRECTOR', 'days', true],
        ['107', 'ANIMATION DIRECTOR', 'days', true],
        ['108', 'VFX SUPERVISOR', 'days', true],
        ['109', 'VFX SUPERVISOR - ON SET', 'days', true]
      ]},
      { code: 'B', name: 'DESIGN / ANIMATION / COMPOSITING', pw: true, lines: [
        ['200', 'DESIGNER', 'days', true],
        ['201', 'ILLUSTRATOR / MATTE PAINTER', 'days', true],
        ['202', '2D ANIMATOR', 'days', true],
        ['203', '3D ANIMATOR', 'days', true],
        ['204', '3D MODELING', 'days', true],
        ['205', 'LIGHTING / TEXTURE', 'days', true],
        ['206', '3D ANIMATOR - PRE VIZ', 'days', true],
        ['207', 'COMPOSITOR', 'days', true],
        ['208', 'COMPOSITOR - SENIOR', 'days', true],
        ['209', 'ROTOSCOPING / MATTE CLEANUP / PREP', 'days', true],
        ['210', 'CG CAMERA TRACKING', 'days', true],
        ['211', 'MAC DESIGN WORKSTATION', 'days', false],
        ['212', '2D WORKSTATION', 'days', false],
        ['213', '3D WORKSTATION', 'days', false],
        ['214', '2D RENDERING', 'hours', false],
        ['215', '3D RENDERING', 'hours', false],
        ['216', 'OVERTIME', 'allow', true]
      ]},
      { code: 'C', name: 'PREVIZ / R&D', pw: true, lines: [
        ['300', 'STORYBOARDS', 'days', true],
        ['301', 'BOARDAMATIC', 'weeks', true],
        ['302', '3D PREVIZ', 'days', true],
        ['303', 'PROPS / RENTALS', 'allow', false],
        ['304', 'IMAGE RESEARCH', 'allow', false],
        ['305', 'STOCK FOOTAGE', 'flat', false]
      ]},
      { code: 'D', name: 'EDITORIAL / COLOR / FINISH', pw: true, lines: [
        ['400', 'EDITOR', 'days', true],
        ['401', 'ASSISTANT EDITOR', 'days', true],
        ['403', 'LOG / DIGITIZE DAILIES', 'hours', true],
        ['404', 'LOAD IN / ARCHIVE', 'hours', true],
        ['405', 'EDL PREP', 'per', false],
        ['407', 'DRIVE PURCHASE', 'per', false],
        ['409', 'COLOR CORRECT PREP', 'hours', false],
        ['410', 'COLOR CORRECT DATA I/O', 'hours', false],
        ['411', 'DI HD VFX PLATES COLOR CORRECT', 'hours', false],
        ['412', 'DI HD COLOR CORRECT', 'hours', false],
        ['413', 'DI HD COLOR CORRECT RENDER', 'hours', false],
        ['415', 'STANDARDS CONVERSIONS', 'per', false],
        ['416', 'DUBBING', 'per', false],
        ['418', 'FINAL CONFORM - SMOKE', 'days', false]
      ]},
      { code: 'E', name: 'MISCELLANEOUS', pw: false, lines: [
        ['500', 'SHIPPING / MESSENGER', 'per', false],
        ['501', 'WORKING MEALS', 'per', false],
        ['502', 'TAXI / CAR SERVICE', 'per', false],
        ['504', 'AIRFARE', 'allow', false],
        ['505', 'HOTEL', 'allow', false],
        ['506', 'PER DIEM', 'per', false]
      ]},
      { code: 'F', name: 'FILM PRODUCTION (AICP SUMMARY)', pw: false, lines: [
        ['600', 'PRE PRO & WRAP', 'allow', false],
        ['601', 'SHOOTING CREW LABOR', 'allow', false],
        ['602', 'LOCATION & TRAVEL EXPENSES', 'allow', false],
        ['603', 'PROPS, WARDROBE, ANIMALS', 'allow', false],
        ['604', 'STUDIO & CONSTRUCTION COSTS', 'allow', false],
        ['605', 'EQUIPMENT COSTS', 'allow', false],
        ['606', 'FILM STOCK (DEVELOP & PRINT)', 'allow', false],
        ['607', 'MISCELLANEOUS', 'allow', false],
        ['608', "DIRECTOR'S FEE", 'allow', false],
        ['609', 'INSURANCE', 'allow', false],
        ['610', 'TELECINE', 'allow', false],
        ['611', 'TALENT & TALENT EXPENSES', 'allow', false],
        ['612', 'OTHER', 'allow', false]
      ]},
      { code: 'G', name: 'SOUND', pw: false, lines: [
        ['700', 'COMPOSER FEE - ORIGINAL', 'allow', false],
        ['701', "SOUND DESIGNER'S FEE - ORIGINAL", 'allow', false],
        ['702', 'RECORD: STUDIO', 'allow', false],
        ['703', 'ENGINEER', 'allow', false],
        ['704', 'MEDIA & SUPPLIES', 'allow', false],
        ['705', "ADD'L EQUIPMENT RENTAL", 'allow', false],
        ['706', 'DUBBING', 'allow', false],
        ['707', 'MUSIC LICENSE', 'allow', false],
        ['708', 'MUSICIAN EXPENSES', 'allow', false],
        ['709', 'VOICEOVER TALENT: SCALE + FRINGE', 'allow', true],
        ['710', 'FINAL MIX', 'allow', false],
        ['711', 'LAYBACK', 'allow', false],
        ['712', 'STOCK & SHIPPING', 'allow', false]
      ]}
    ]
  },

  /* ---------------------------------------------------------- */
  experiential: {
    label: 'Experiential / Live',
    note: 'Activation and live-event structure: fabrication, venue, show technology, staffing, logistics, plus capture and post.',
    pwRate: 0.1597,
    adjusters: [
      { label: 'AGENCY MARKUP', mode: 'percent', rate: 0.15, base: 'hard' },
      { label: 'INSURANCE',     mode: 'percent', rate: 0.03, base: 'hard' },
      { label: 'CONTINGENCY',   mode: 'percent', rate: 0.10, base: 'running' }
    ],
    sections: [
      { code: 'A', name: 'PRODUCTION SUPERVISION & MANAGEMENT', pw: true, lines: [
        ['101', 'EXECUTIVE PRODUCER', 'days', true],
        ['102', 'PRODUCER', 'days', true],
        ['103', 'PRODUCTION MANAGER', 'days', true],
        ['104', 'PRODUCTION COORDINATOR', 'days', true],
        ['105', 'PRODUCTION ASSISTANT', 'days', true],
        ['106', 'CREATIVE DIRECTOR', 'days', true],
        ['107', 'EXPERIENCE DESIGNER', 'days', true],
        ['108', 'TECHNICAL DIRECTOR', 'days', true],
        ['109', 'SITE / SHOW SUPERVISOR', 'days', true]
      ]},
      { code: 'B', name: 'DESIGN & FABRICATION', pw: true, lines: [
        ['200', 'ENVIRONMENT / SET DESIGN', 'days', true],
        ['201', '3D / CAD DRAWINGS', 'days', true],
        ['202', 'SCENIC FABRICATION', 'allow', false],
        ['203', 'MILLWORK & CARPENTRY', 'allow', false],
        ['204', 'PRINT & LARGE FORMAT GRAPHICS', 'allow', false],
        ['205', 'SIGNAGE & WAYFINDING', 'allow', false],
        ['206', 'FURNITURE & PROPS', 'allow', false],
        ['207', 'FLOORING & SOFT GOODS', 'allow', false],
        ['208', 'PAINT & FINISHING', 'allow', false],
        ['209', 'CUSTOM ENGINEERING / METALWORK', 'allow', false],
        ['210', 'SHOP LABOR', 'hours', true],
        ['211', 'MOCK-UP / PROTOTYPE', 'allow', false]
      ]},
      { code: 'C', name: 'VENUE, PERMITS & SITE', pw: false, lines: [
        ['300', 'VENUE RENTAL', 'days', false],
        ['301', 'SITE SURVEY & RECCE', 'allow', false],
        ['302', 'PERMITS & FILING FEES', 'allow', false],
        ['303', 'FIRE MARSHAL / INSPECTION', 'allow', false],
        ['304', 'POWER, GENERATORS & DISTRO', 'days', false],
        ['305', 'HVAC / CLIMATE', 'days', false],
        ['306', 'TENTING & TEMPORARY STRUCTURES', 'allow', false],
        ['307', 'RESTROOMS & SANITATION', 'allow', false],
        ['308', 'SITE SECURITY (OVERNIGHT)', 'days', false],
        ['309', 'WASTE, RECYCLING & CLEANING', 'allow', false],
        ['310', 'VENUE INSURANCE / COI', 'allow', false]
      ]},
      { code: 'D', name: 'TECHNOLOGY, AV & SHOW CONTROL', pw: true, lines: [
        ['400', 'LED / VIDEO WALL', 'days', false],
        ['401', 'PROJECTION & MAPPING', 'days', false],
        ['402', 'AUDIO SYSTEM', 'days', false],
        ['403', 'LIGHTING PACKAGE', 'days', false],
        ['404', 'RIGGING & TRUSS', 'allow', false],
        ['405', 'SHOW CONTROL & MEDIA SERVERS', 'days', false],
        ['406', 'INTERACTIVE SOFTWARE BUILD', 'days', true],
        ['407', 'SENSORS & CUSTOM HARDWARE', 'allow', false],
        ['408', 'NETWORK & CONNECTIVITY', 'allow', false],
        ['409', 'AV LABOR & TECHNICIANS', 'days', true],
        ['410', 'SCREEN CONTENT PRODUCTION', 'days', true],
        ['411', 'DATA CAPTURE / CRM INTEGRATION', 'allow', false]
      ]},
      { code: 'E', name: 'STAFFING, TALENT & HOSPITALITY', pw: true, lines: [
        ['500', 'BRAND AMBASSADORS', 'days', true],
        ['501', 'EVENT STAFF', 'days', true],
        ['502', 'TALENT / PERFORMERS', 'days', true],
        ['503', 'SECURITY PERSONNEL', 'days', true],
        ['504', 'MEDICAL / EMT', 'days', true],
        ['505', 'STAFF TRAINING & BRIEFING', 'days', true],
        ['506', 'UNIFORMS & WARDROBE', 'allow', false],
        ['507', 'CATERING & CRAFT SERVICES', 'per', false],
        ['508', 'GUEST F&B / BAR', 'per', false],
        ['509', 'GIVEAWAYS & PREMIUMS', 'each', false]
      ]},
      { code: 'F', name: 'LOGISTICS, INSTALL & STRIKE', pw: true, lines: [
        ['600', 'FREIGHT & SHIPPING', 'allow', false],
        ['601', 'TRUCKING & DRAYAGE', 'allow', false],
        ['602', 'STORAGE & WAREHOUSING', 'months', false],
        ['603', 'INSTALL LABOR', 'days', true],
        ['604', 'STRIKE LABOR', 'days', true],
        ['605', 'AIRFARE', 'each', false],
        ['606', 'HOTEL & LODGING', 'per', false],
        ['607', 'PER DIEM', 'per', false],
        ['608', 'LOCAL GROUND TRANSPORT', 'allow', false],
        ['609', 'EQUIPMENT RENTAL (LIFTS, TOOLS)', 'days', false],
        ['610', 'PRODUCTION INSURANCE & CERTIFICATES', 'allow', false]
      ]},
      { code: 'G', name: 'CONTENT CAPTURE & POST', pw: true, lines: [
        ['700', 'DOCUMENTATION CREW', 'days', true],
        ['701', 'PHOTOGRAPHER', 'days', true],
        ['702', 'EDITOR', 'days', true],
        ['703', 'ASSISTANT EDITOR', 'days', true],
        ['704', 'COLOR', 'hours', false],
        ['705', 'MOTION GRAPHICS', 'days', true],
        ['706', 'SOUND DESIGN & MIX', 'allow', false],
        ['707', 'MUSIC LICENSE', 'allow', false],
        ['708', 'VOICEOVER', 'allow', true],
        ['709', 'CAPTIONS & VERSIONING', 'each', false],
        ['710', 'DELIVERY & ARCHIVE', 'allow', false]
      ]}
    ]
  },

  /* ---------------------------------------------------------- */
  blank: {
    label: 'Blank',
    note: 'Empty A-G shells. Name the sections and build the accounts yourself.',
    pwRate: 0,
    adjusters: [
      { label: 'MARKUP', mode: 'percent', rate: 0.20, base: 'hard' }
    ],
    sections: [
      { code: 'A', name: 'SECTION A', pw: false, lines: [] },
      { code: 'B', name: 'SECTION B', pw: false, lines: [] },
      { code: 'C', name: 'SECTION C', pw: false, lines: [] },
      { code: 'D', name: 'SECTION D', pw: false, lines: [] }
    ]
  }
};
