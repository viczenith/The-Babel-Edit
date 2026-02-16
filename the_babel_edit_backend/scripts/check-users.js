#!/usr/bin/env node

import prisma from '../prismaClient.js';

console.log('\n📋 CHECKING USERS IN DATABASE...\n');

(async () => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        role: true,
        firstName: true,
        lastName: true,
        isVerified: true,
        password: false, // Don't select password for display
        createdAt: true
      },
      orderBy: { createdAt: 'desc' }
    });

    console.log(`✅ Found ${users.length} users in database:\n`);

    users.forEach((user, idx) => {
      console.log(`${idx + 1}. ${user.email}`);
      console.log(`   Name: ${user.firstName} ${user.lastName}`);
      console.log(`   Role: ${user.role}`);
      console.log(`   Verified: ${user.isVerified}`);
      console.log(`   Created: ${new Date(user.createdAt).toLocaleString()}\n`);
    });

    // Check for specific users
    console.log('🔍 SPECIFIC LOGIN CHECKS:\n');

    const superAdmin = await prisma.user.findUnique({
      where: { email: 'admin@babeledit.com' },
      select: { email: true, role: true, password: false }
    });

    const admin = await prisma.user.findUnique({
      where: { email: 'isiquedan@gmail.com' },
      select: { email: true, role: true, password: false }
    });

    console.log('SUPER_ADMIN (admin@babeledit.com):', superAdmin ? '✅ EXISTS' : '❌ MISSING');
    console.log('ADMIN (isiquedan@gmail.com):', admin ? '✅ EXISTS' : '❌ MISSING');

    if (superAdmin) {
      console.log(`  └─ Role: ${superAdmin.role}`);
    }

    if (admin) {
      console.log(`  └─ Role: ${admin.role}`);
    }

    console.log('');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
})();
