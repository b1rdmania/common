export const demoAccounts = {
  volunteer: { name: 'Alex Morgan', email: 'alex@common.example' },
  host: { name: 'Charlie Taylor', email: 'charlie@common.example' },
};
export const demoPassword = 'Common-local-demo-only-38!';
export async function seedDemo(store, auth) {
  const accounts = {
    ...demoAccounts,
    guest: { name: 'Sam Patel', email: 'sam@common.example' },
  };
  for (const account of Object.values(accounts)) {
    if (
      !store.db.prepare('SELECT id FROM user WHERE email=?').get(account.email)
    )
      await auth.api.signUpEmail({
        body: { ...account, password: demoPassword },
      });
    // Demo identities only; real email verification is provided by Google.
    store.db
      .prepare('UPDATE user SET emailVerified=1 WHERE email=?')
      .run(account.email);
  }
  if (store.db.prepare('SELECT COUNT(*) AS n FROM organisations').get().n)
    return;
  const host = store.db
    .prepare('SELECT id FROM user WHERE email=?')
    .get(demoAccounts.host.email).id;
  const guest = store.db
    .prepare('SELECT id FROM user WHERE email=?')
    .get(accounts.guest.email).id;
  const organisations = [
    [
      'Neighbourhood Table',
      'A fictional demo organisation bringing neighbours together over fresh food.',
    ],
    [
      'Grow Together',
      'A fictional demo group caring for shared green spaces in East London.',
    ],
    [
      'The Local Exchange',
      'A fictional demo community group giving everyday things a second life.',
    ],
  ].map(([name, description]) =>
    store.createOrganisation(host, { name, description, website: '' }),
  );
  const saturday = new Date();
  saturday.setUTCHours(9, 0, 0, 0);
  saturday.setUTCDate(
    saturday.getUTCDate() + ((6 - saturday.getUTCDay() + 7) % 7 || 7),
  );
  const entries = [
    {
      title: 'A little chopping. A lot of good.',
      category: 'Food & community',
      area: 'Hackney',
      address: 'Demo venue · Mare Street, Hackney',
      org: 0,
      offset: 0,
      hour: 9,
      duration: 3,
      capacity: 8,
      description:
        'Help turn surplus ingredients into a shared neighbourhood lunch. You’ll wash and chop vegetables, set the tables and help clear up afterwards.\n\nYou’ll work alongside our kitchen lead and a small, friendly team. No kitchen experience needed. We’ll make time to sit down and eat together at the end.',
      requirements:
        'Wear closed-toe shoes and clothes you can cook in. A food-safety briefing is included on arrival.',
      accessibility:
        'Step-free entrance and accessible toilet. Seated food preparation available.',
    },
    {
      title: 'Give the garden a Saturday.',
      category: 'Outdoors',
      area: 'Bethnal Green',
      address: 'Demo venue · Cambridge Heath Road, Bethnal Green',
      org: 1,
      offset: 0,
      hour: 10,
      duration: 2,
      capacity: 6,
      description:
        'Spend a morning outdoors preparing beds, planting seasonal bulbs and making our shared garden ready for autumn.\n\nChoose a task that suits you, from light planting to moving compost. We supply the tools, gloves and tea. First-timers are very welcome.',
      requirements:
        'Bring sturdy shoes and a waterproof layer. Tools and a short safety introduction are provided.',
      accessibility:
        'Level paved entrance. Some beds are reached across uneven ground; seated tasks are available.',
    },
    {
      title: 'Good food, going to good homes.',
      category: 'Food & community',
      area: 'Bow',
      address: 'Demo venue · Roman Road, Bow',
      org: 0,
      offset: 1,
      hour: 11,
      duration: 2,
      capacity: 10,
      description:
        'Sort donated groceries and pack balanced food bags ready for collection by local households.\n\nOur shift leader will show you the sorting stations and pair you with an experienced volunteer. It’s practical, sociable work with a clear finish.',
      requirements:
        'Closed-toe shoes. Please tell us about any lifting limitations in your request.',
      accessibility:
        'Step-free warehouse with accessible toilet. Some tasks involve lifting; lighter alternatives are available.',
    },
    {
      title: 'Help the next chapter find a reader.',
      category: 'Practical help',
      area: 'Dalston',
      address: 'Demo venue · Kingsland Road, Dalston',
      org: 2,
      offset: 3,
      hour: 17,
      duration: 2,
      capacity: 5,
      description:
        'Join our evening book-sorting session. Check donations, organise shelves and help prepare a welcoming community book swap.\n\nIf you love a good browse, you’ll fit right in. We’ll finish with a cup of tea and a recommendation or two.',
      requirements:
        'No preparation needed. An introduction is included when you arrive.',
      accessibility:
        'Step-free space. Sorting can be done sitting or standing.',
    },
    {
      title: 'A cleaner canal. A better morning.',
      category: 'Outdoors',
      area: 'Hackney Wick',
      address: 'Demo meeting point · White Post Lane, Hackney Wick',
      org: 1,
      offset: 7,
      hour: 9,
      duration: 2,
      capacity: 12,
      description:
        'Take a gentle walk along the canal and help collect litter from the towpath. You’ll be in a small group with an experienced session leader.\n\nWe provide litter pickers, gloves and bags. Stay on the towpath throughout; there is no work in the water.',
      requirements:
        'Wear sturdy shoes and weather-appropriate clothing. Safety briefing before we set off.',
      accessibility:
        'Towpath includes uneven surfaces and narrow sections. Contact the host through your request about access needs.',
    },
    {
      title: 'Make a useful thing useful again.',
      category: 'Practical help',
      area: 'Shoreditch',
      address: 'Demo venue · Hoxton Street, Shoreditch',
      org: 2,
      offset: 7,
      hour: 13,
      duration: 3,
      capacity: 4,
      description:
        'Help our reuse team clean, photograph and organise donated household items so they can be passed on locally.\n\nYou don’t need repair skills. This session focuses on preparation and sorting; electrical work is left to qualified people.',
      requirements:
        'Wear clothes you don’t mind getting dusty. All equipment is provided.',
      accessibility:
        'Step-free entrance. A quiet work area and seated tasks are available.',
    },
  ];
  for (const e of entries) {
    const start = new Date(saturday);
    start.setUTCDate(start.getUTCDate() + e.offset);
    start.setUTCHours(e.hour, 0, 0, 0);
    const sessionId = store.createSession(host, {
      ...e,
      organisation_id: organisations[e.org],
      starts_at: start.toISOString(),
      ends_at: new Date(+start + e.duration * 3600000).toISOString(),
    });
    if (e.offset === 0)
      store.apply(
        guest,
        sessionId,
        'Looking forward to helping. This would be my first session!',
      );
  }
}
