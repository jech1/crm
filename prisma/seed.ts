import {
  PrismaClient,
  Role,
  PipelineStage,
  VisitType,
  TaskType,
  Priority,
  ContactRole,
  MeetingType,
  ActivityType,
} from "@prisma/client"

const db = new PrismaClient()

async function main() {
  console.log("Seeding database...")

  // ── Users ────────────────────────────────────────────────────
  const admin = await db.user.upsert({
    where: { email: "sarah@produceco.com" },
    update: {},
    create: {
      clerkId: "seed_admin_001",
      name: "Sarah Chen",
      email: "sarah@produceco.com",
      role: Role.ADMIN,
      phone: "(480) 555-0100",
    },
  })

  const rep1 = await db.user.upsert({
    where: { email: "jake@produceco.com" },
    update: {},
    create: {
      clerkId: "seed_rep_001",
      name: "Jake Echeverry",
      email: "jake@produceco.com",
      role: Role.SALES_REP,
      phone: "(480) 555-0101",
    },
  })

  const rep2 = await db.user.upsert({
    where: { email: "maria@produceco.com" },
    update: {},
    create: {
      clerkId: "seed_rep_002",
      name: "Maria Ortega",
      email: "maria@produceco.com",
      role: Role.SALES_REP,
      phone: "(480) 555-0102",
    },
  })

  const connector = await db.user.upsert({
    where: { email: "robert@produceco.com" },
    update: {},
    create: {
      clerkId: "seed_connector_001",
      name: "Robert Echeverry",
      email: "robert@produceco.com",
      role: Role.CONNECTOR,
    },
  })

  // ── Restaurants ───────────────────────────────────────────────
  const r1 = await db.restaurant.upsert({
    where: { id: "rest_bella_luna" },
    update: {},
    create: {
      id: "rest_bella_luna",
      name: "Bella Luna Trattoria",
      address: "412 N Main St",
      city: "Scottsdale",
      state: "AZ",
      zip: "85251",
      phone: "(480) 555-0123",
      cuisineType: "Italian",
      restaurantType: "CASUAL",
      pipelineStage: PipelineStage.VISITED,
      estimatedVolume: "HIGH",
      opportunityScore: 72,
      repId: rep1.id,
    },
  })

  const r2 = await db.restaurant.upsert({
    where: { id: "rest_saffron" },
    update: {},
    create: {
      id: "rest_saffron",
      name: "Saffron Bistro",
      address: "890 E Camelback Rd",
      city: "Phoenix",
      state: "AZ",
      zip: "85014",
      phone: "(602) 555-0188",
      cuisineType: "Mediterranean",
      restaurantType: "FINE_DINING",
      pipelineStage: PipelineStage.INTERESTED,
      estimatedVolume: "HIGH",
      opportunityScore: 91,
      repId: rep2.id,
    },
  })

  const r3 = await db.restaurant.upsert({
    where: { id: "rest_marcos" },
    update: {},
    create: {
      id: "rest_marcos",
      name: "Marco's Kitchen",
      address: "234 W Oak Ave",
      city: "Scottsdale",
      state: "AZ",
      zip: "85257",
      phone: "(480) 555-0177",
      cuisineType: "American",
      restaurantType: "CASUAL",
      pipelineStage: PipelineStage.NOT_CONTACTED,
      estimatedVolume: "MEDIUM",
      opportunityScore: 20,
      repId: rep1.id,
    },
  })

  const r4 = await db.restaurant.upsert({
    where: { id: "rest_copper_pot" },
    update: {},
    create: {
      id: "rest_copper_pot",
      name: "The Copper Pot",
      address: "55 S Central Ave",
      city: "Phoenix",
      state: "AZ",
      zip: "85004",
      phone: "(602) 555-0201",
      cuisineType: "New American",
      restaurantType: "FINE_DINING",
      pipelineStage: PipelineStage.SPOKE_TO_BUYER,
      estimatedVolume: "HIGH",
      opportunityScore: 81,
      repId: rep2.id,
    },
  })

  const r5 = await db.restaurant.upsert({
    where: { id: "rest_maki_house" },
    update: {},
    create: {
      id: "rest_maki_house",
      name: "Maki House",
      address: "1100 N Scottsdale Rd",
      city: "Scottsdale",
      state: "AZ",
      zip: "85257",
      phone: "(480) 555-0233",
      cuisineType: "Japanese",
      restaurantType: "CASUAL",
      pipelineStage: PipelineStage.FOLLOW_UP_NEEDED,
      estimatedVolume: "HIGH",
      opportunityScore: 87,
      repId: rep1.id,
    },
  })

  // ── Contacts ──────────────────────────────────────────────────
  await db.contact.upsert({
    where: { id: "contact_marco_russo" },
    update: {},
    create: {
      id: "contact_marco_russo",
      restaurantId: r1.id,
      name: "Marco Russo",
      role: ContactRole.CHEF,
      phone: "(480) 555-0124",
      isPrimary: true,
      relationshipScore: 3,
      notes: "Best reached Tuesday mornings before 11am.",
    },
  })

  await db.contact.upsert({
    where: { id: "contact_layla_nasser" },
    update: {},
    create: {
      id: "contact_layla_nasser",
      restaurantId: r2.id,
      name: "Layla Nasser",
      role: ContactRole.OWNER,
      phone: "(602) 555-0189",
      email: "layla@saffronbistro.com",
      isPrimary: true,
      relationshipScore: 4,
    },
  })

  await db.contact.upsert({
    where: { id: "contact_james_wu" },
    update: {},
    create: {
      id: "contact_james_wu",
      restaurantId: r5.id,
      name: "James Wu",
      role: ContactRole.PURCHASING_MANAGER,
      phone: "(480) 555-0234",
      isPrimary: true,
      relationshipScore: 2,
      notes: "Only available Mon–Wed mornings.",
    },
  })

  // ── Visits ────────────────────────────────────────────────────
  await db.visit.upsert({
    where: { id: "visit_bella_001" },
    update: {},
    create: {
      id: "visit_bella_001",
      restaurantId: r1.id,
      repId: rep1.id,
      visitDate: new Date("2026-03-08T14:30:00Z"),
      visitType: VisitType.WALK_IN,
      contactedPerson: "Marco Russo",
      outcome: "Spoke to chef. Interested in heirloom tomatoes. Wants pricing sent.",
      notes: "Best time to visit is Tuesday morning before 11am. Chef is approachable.",
      objections: "Happy with current supplier but open to better pricing and quality.",
      productsDiscussed: ["tomatoes", "herbs", "specialty greens"],
      nextAction: "Send pricing sheet for heirloom tomatoes and fresh herbs",
      followUpDate: new Date("2026-03-14T00:00:00Z"),
    },
  })

  await db.visit.upsert({
    where: { id: "visit_maki_001" },
    update: {},
    create: {
      id: "visit_maki_001",
      restaurantId: r5.id,
      repId: rep1.id,
      visitDate: new Date("2026-03-05T11:00:00Z"),
      visitType: VisitType.SCHEDULED,
      contactedPerson: "James Wu",
      outcome: "Met with purchasing manager. Left samples of avocados and micro greens.",
      notes: "James said they go through a lot of avocados. Mentioned current supplier is unreliable.",
      objections: "Price was a concern. Wants to see bulk pricing.",
      productsDiscussed: ["avocados", "micro greens", "herbs"],
      nextAction: "Follow up on sample feedback",
      followUpDate: new Date("2026-03-12T00:00:00Z"),
    },
  })

  // ── Warm Intros ───────────────────────────────────────────────
  await db.warmIntro.upsert({
    where: { id: "warm_saffron_001" },
    update: {},
    create: {
      id: "warm_saffron_001",
      restaurantId: r2.id,
      addedById: connector.id,
      introducedBy: "Robert Echeverry",
      relationship: "Golf friend of owner for 10+ years",
      contactName: "Layla Nasser",
      contactRole: "Owner",
      contactPhone: "(602) 555-0189",
      notes:
        "Robert plays golf with Layla every Sunday. She has mentioned wanting a more reliable local produce supplier.",
      whatToPitch:
        "Fresh herbs, specialty greens, and heirloom tomatoes. Emphasize local sourcing and consistent delivery.",
      productInterests: ["herbs", "specialty produce", "tomatoes", "lettuce"],
      bestTimeToVisit: "Monday or Wednesday afternoon after 2pm",
      priority: Priority.HIGH,
    },
  })

  await db.warmIntro.upsert({
    where: { id: "warm_copper_001" },
    update: {},
    create: {
      id: "warm_copper_001",
      restaurantId: r4.id,
      addedById: connector.id,
      introducedBy: "Chef Marcus Webb",
      relationship: "Previous colleague of the head chef",
      contactName: "Daniel Torres",
      contactRole: "Head Chef",
      contactPhone: "(602) 555-0202",
      notes: "Marcus worked with Daniel 5 years ago. Daniel is the decision maker for produce orders.",
      whatToPitch: "Premium heirloom variety seasonal produce. This is a fine-dining kitchen that values quality.",
      productInterests: ["heirloom tomatoes", "specialty greens", "herbs", "seasonal produce"],
      bestTimeToVisit: "Tuesday or Thursday morning 9–11am",
      priority: Priority.URGENT,
    },
  })

  // ── Tasks ─────────────────────────────────────────────────────
  await db.task.upsert({
    where: { id: "task_bella_pricing" },
    update: {},
    create: {
      id: "task_bella_pricing",
      restaurantId: r1.id,
      assignedToId: rep1.id,
      title: "Send pricing sheet to Marco at Bella Luna",
      taskType: TaskType.SEND_PRICING,
      dueDate: new Date("2026-03-14T00:00:00Z"),
      priority: Priority.HIGH,
      notes: "Focus on heirloom tomatoes and fresh herb pricing. Mention bulk discounts.",
    },
  })

  await db.task.upsert({
    where: { id: "task_marcos_visit" },
    update: {},
    create: {
      id: "task_marcos_visit",
      restaurantId: r3.id,
      assignedToId: rep1.id,
      title: "Initial walk-in visit to Marco's Kitchen",
      taskType: TaskType.REVISIT,
      dueDate: new Date("2026-03-13T00:00:00Z"),
      priority: Priority.MEDIUM,
    },
  })

  await db.task.upsert({
    where: { id: "task_maki_followup" },
    update: {},
    create: {
      id: "task_maki_followup",
      restaurantId: r5.id,
      assignedToId: rep1.id,
      title: "Follow up on avocado + micro green samples",
      taskType: TaskType.CALL,
      dueDate: new Date("2026-03-12T00:00:00Z"),
      priority: Priority.HIGH,
      notes: "Check if James had a chance to test the samples. Push for bulk avocado order.",
    },
  })

  await db.task.upsert({
    where: { id: "task_saffron_visit" },
    update: {},
    create: {
      id: "task_saffron_visit",
      restaurantId: r2.id,
      assignedToId: rep2.id,
      title: "First visit — mention Robert Echeverry intro",
      taskType: TaskType.REVISIT,
      dueDate: new Date("2026-03-17T00:00:00Z"),
      priority: Priority.URGENT,
      notes: "Use Robert's name. Ask for Layla. Best time: Mon or Wed after 2pm.",
    },
  })

  // ── Notes ─────────────────────────────────────────────────────
  await db.note.upsert({
    where: { id: "note_bella_001" },
    update: {},
    create: {
      id: "note_bella_001",
      restaurantId: r1.id,
      authorId: rep1.id,
      body: "Chef Marco seems genuinely interested in heirloom varieties. Mention the dry-farmed tomatoes specifically on next visit — he got excited when I described them.",
    },
  })

  await db.note.upsert({
    where: { id: "note_maki_001" },
    update: {},
    create: {
      id: "note_maki_001",
      restaurantId: r5.id,
      authorId: rep1.id,
      body: "James mentioned their current avocado supplier delivered bruised product last week. This is our opening. Come back with a case-price quote.",
    },
  })

  await db.note.upsert({
    where: { id: "note_saffron_001" },
    update: {},
    create: {
      id: "note_saffron_001",
      restaurantId: r2.id,
      authorId: connector.id,
      body: "Robert confirmed that Layla is currently unhappy with her herb supplier. She has mentioned it multiple times at the golf club. Perfect timing to come in with fresh local herbs.",
    },
  })

  // ── Meetings ──────────────────────────────────────────────────
  await db.meeting.upsert({
    where: { id: "meeting_copper_intro" },
    update: {},
    create: {
      id: "meeting_copper_intro",
      restaurantId: r4.id,
      ownerId: rep2.id,
      title: "Intro meeting — The Copper Pot",
      meetingType: MeetingType.INTRO,
      scheduledAt: new Date("2026-03-14T14:00:00Z"),
      durationMins: 30,
      location: "55 S Central Ave, Phoenix",
      attendees: ["Daniel Torres", "Maria Ortega"],
      notes: "Come prepared with seasonal variety list and pricing for premium heirloom tomatoes.",
    },
  })

  await db.meeting.upsert({
    where: { id: "meeting_bella_pricing" },
    update: {},
    create: {
      id: "meeting_bella_pricing",
      restaurantId: r1.id,
      ownerId: rep1.id,
      title: "Pricing discussion — Bella Luna",
      meetingType: MeetingType.PRICING_DISCUSSION,
      scheduledAt: new Date("2026-03-18T10:00:00Z"),
      durationMins: 45,
      location: "412 N Main St, Scottsdale",
      attendees: ["Marco Russo", "Jake Echeverry"],
      notes: "Bring printed pricing sheet. Focus on tomatoes, herbs, specialty greens.",
    },
  })

  // ── Product Interests ─────────────────────────────────────────
  await db.productInterest.createMany({
    data: [
      { restaurantId: r1.id, product: "tomatoes" },
      { restaurantId: r1.id, product: "herbs" },
      { restaurantId: r1.id, product: "specialty greens" },
      { restaurantId: r2.id, product: "herbs" },
      { restaurantId: r2.id, product: "specialty produce" },
      { restaurantId: r2.id, product: "tomatoes" },
      { restaurantId: r2.id, product: "lettuce" },
      { restaurantId: r4.id, product: "heirloom tomatoes" },
      { restaurantId: r4.id, product: "seasonal produce" },
      { restaurantId: r4.id, product: "specialty greens" },
      { restaurantId: r5.id, product: "avocados" },
      { restaurantId: r5.id, product: "micro greens" },
      { restaurantId: r5.id, product: "herbs" },
    ],
    skipDuplicates: true,
  })

  // ── Competitor Notes ──────────────────────────────────────────
  await db.competitorNote.upsert({
    where: { restaurantId: r1.id },
    update: {},
    create: {
      restaurantId: r1.id,
      currentSupplier: "Valley Fresh Distributors",
      complaints: "Inconsistent delivery times, bruised product on last two orders.",
      whyMightSwitch: "Wants more reliable delivery and consistently fresh product.",
      priceSensitive: true,
    },
  })

  await db.competitorNote.upsert({
    where: { restaurantId: r5.id },
    update: {},
    create: {
      restaurantId: r5.id,
      currentSupplier: "SunState Produce",
      complaints: "Avocados arrived bruised last week. Inconsistent quality.",
      whyMightSwitch: "Open to switching if we can guarantee quality and competitive bulk pricing.",
      priceSensitive: true,
    },
  })

  // ── Stage History ─────────────────────────────────────────────
  await db.stageHistory.createMany({
    data: [
      {
        restaurantId: r1.id,
        changedById: rep1.id,
        fromStage: null,
        toStage: PipelineStage.NOT_CONTACTED,
      },
      {
        restaurantId: r1.id,
        changedById: rep1.id,
        fromStage: PipelineStage.NOT_CONTACTED,
        toStage: PipelineStage.VISITED,
      },
      {
        restaurantId: r5.id,
        changedById: rep1.id,
        fromStage: null,
        toStage: PipelineStage.NOT_CONTACTED,
      },
      {
        restaurantId: r5.id,
        changedById: rep1.id,
        fromStage: PipelineStage.NOT_CONTACTED,
        toStage: PipelineStage.VISITED,
      },
      {
        restaurantId: r5.id,
        changedById: rep1.id,
        fromStage: PipelineStage.VISITED,
        toStage: PipelineStage.FOLLOW_UP_NEEDED,
      },
    ],
  })

  // ── Activity Log ──────────────────────────────────────────────
  await db.activityLog.createMany({
    data: [
      {
        restaurantId: r1.id,
        userId: rep1.id,
        action: ActivityType.RESTAURANT_CREATED,
        description: "Jake Echeverry added Bella Luna Trattoria",
      },
      {
        restaurantId: r1.id,
        userId: rep1.id,
        action: ActivityType.VISIT_LOGGED,
        description: "Jake Echeverry logged a walk-in visit",
      },
      {
        restaurantId: r2.id,
        userId: connector.id,
        action: ActivityType.WARM_INTRO_ADDED,
        description: "Robert Echeverry added a warm intro for Saffron Bistro",
      },
      {
        restaurantId: r5.id,
        userId: rep1.id,
        action: ActivityType.VISIT_LOGGED,
        description: "Jake Echeverry logged a scheduled visit",
      },
      {
        restaurantId: r5.id,
        userId: rep1.id,
        action: ActivityType.STAGE_CHANGED,
        description: "Stage changed to Follow-Up Needed",
        metadata: { fromStage: "VISITED", toStage: "FOLLOW_UP_NEEDED" },
      },
      {
        restaurantId: r4.id,
        userId: connector.id,
        action: ActivityType.WARM_INTRO_ADDED,
        description: "Robert Echeverry added a warm intro for The Copper Pot",
      },
    ],
  })

  console.log("Seed complete.")
  console.log(`  Users: admin, rep1, rep2, connector`)
  console.log(`  Restaurants: 5 (territories managed via admin UI)`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => db.$disconnect())
