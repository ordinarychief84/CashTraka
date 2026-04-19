import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const email = 'demo@cashtraka.app';
  const password = 'password123';
  const passwordHash = await bcrypt.hash(password, 10);

  // Wipe prior demo records (idempotent).
  await prisma.user.deleteMany({ where: { email } });

  const user = await prisma.user.create({
    data: {
      name: 'Ada Eze',
      email,
      passwordHash,
      businessName: "Ada's Fashion Hub",
      whatsappNumber: '2348012345678',
      onboardingCompleted: true,
    },
  });

  const customerSpecs = [
    { name: 'Amaka Nwosu', phone: '2348011112222' },
    { name: 'Chidi Okafor',  phone: '2348033334444' },
    { name: 'Tolu Bello',    phone: '2348055556666' },
    { name: 'Kemi Adewale',  phone: '2348077778888' },
  ];

  const customers = await Promise.all(
    customerSpecs.map((c) =>
      prisma.customer.create({
        data: {
          userId: user.id,
          name: c.name,
          phone: c.phone,
        },
      }),
    ),
  );

  const now = Date.now();
  const daysAgo = (n: number) => new Date(now - n * 24 * 60 * 60 * 1000);

  // Payments
  const payments = [
    { c: customers[0], amount: 8500,  status: 'PAID' as const, createdAt: daysAgo(0) },
    { c: customers[0], amount: 5000,  status: 'PAID' as const, createdAt: daysAgo(3) },
    { c: customers[1], amount: 12000, status: 'PAID' as const, createdAt: daysAgo(1) },
    { c: customers[2], amount: 3000,  status: 'PENDING' as const, createdAt: daysAgo(2) },
    { c: customers[3], amount: 15000, status: 'PAID' as const, createdAt: daysAgo(5) },
  ];
  for (const p of payments) {
    await prisma.payment.create({
      data: {
        userId: user.id,
        customerId: p.c.id,
        customerNameSnapshot: p.c.name,
        phoneSnapshot: p.c.phone,
        amount: p.amount,
        status: p.status,
        createdAt: p.createdAt,
      },
    });
  }

  // Debts
  const debts = [
    { c: customers[1], amount: 7500,  status: 'OPEN' as const, dueDate: daysAgo(-3), createdAt: daysAgo(4) },
    { c: customers[2], amount: 20000, status: 'OPEN' as const, dueDate: null,         createdAt: daysAgo(6) },
    { c: customers[3], amount: 5000,  status: 'PAID' as const, dueDate: null,         createdAt: daysAgo(10) },
  ];
  for (const d of debts) {
    await prisma.debt.create({
      data: {
        userId: user.id,
        customerId: d.c.id,
        customerNameSnapshot: d.c.name,
        phoneSnapshot: d.c.phone,
        amountOwed: d.amount,
        status: d.status,
        dueDate: d.dueDate,
        createdAt: d.createdAt,
      },
    });
  }

  // Recompute customer totals from the data we inserted.
  for (const c of customers) {
    const [paidAgg, owedAgg, paymentCount, debtCount, latestPayment, latestDebt] =
      await Promise.all([
        prisma.payment.aggregate({
          where: { customerId: c.id, status: 'PAID' },
          _sum: { amount: true },
        }),
        prisma.debt.aggregate({
          where: { customerId: c.id, status: 'OPEN' },
          _sum: { amountOwed: true },
        }),
        prisma.payment.count({ where: { customerId: c.id } }),
        prisma.debt.count({ where: { customerId: c.id } }),
        prisma.payment.findFirst({ where: { customerId: c.id }, orderBy: { createdAt: 'desc' } }),
        prisma.debt.findFirst({ where: { customerId: c.id }, orderBy: { createdAt: 'desc' } }),
      ]);
    const last =
      [latestPayment?.createdAt, latestDebt?.createdAt]
        .filter(Boolean)
        .sort((a, b) => (b as Date).getTime() - (a as Date).getTime())[0] || new Date();
    await prisma.customer.update({
      where: { id: c.id },
      data: {
        totalPaid: paidAgg._sum.amount ?? 0,
        totalOwed: owedAgg._sum.amountOwed ?? 0,
        transactionCount: paymentCount + debtCount,
        lastActivityAt: last as Date,
      },
    });
  }

  // ─── Admin user ────────────────────────────────────────────────────────
  // Idempotent: delete and recreate to guarantee password + role are correct.
  const adminEmail = 'admin@cashtraka.app';
  const adminPassword = 'admin123';
  const adminHash = await bcrypt.hash(adminPassword, 10);
  await prisma.adminNote.deleteMany({ where: { author: { email: adminEmail } } });
  await prisma.user.deleteMany({ where: { email: adminEmail } });
  const admin = await prisma.user.create({
    data: {
      name: 'CashTraka Admin',
      email: adminEmail,
      passwordHash: adminHash,
      role: 'ADMIN',
      businessType: 'seller',
      onboardingCompleted: true,
    },
  });

  // Seed a couple of admin notes against the demo seller for the UI to look alive.
  await prisma.adminNote.createMany({
    data: [
      {
        adminUserId: admin.id,
        targetUserId: user.id,
        note: 'Onboarded during soft launch. Very active seller.',
      },
      {
        adminUserId: admin.id,
        targetUserId: user.id,
        note: 'Requested early access to invoicing features.',
      },
    ],
  });

  console.log(`\nSeeded demo accounts:`);
  console.log(`  Seller:  email: ${email}   password: ${password}`);
  console.log(`  Admin:   email: ${adminEmail}   password: ${adminPassword}\n`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
