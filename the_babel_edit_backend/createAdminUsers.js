import prisma from './prismaClient.js';
import bcrypt from 'bcrypt';

(async () => {
  try {
    const hashedPassword = await bcrypt.hash('password123', 12);

    // Create SUPER_ADMIN
    await prisma.user.upsert({
      where: { email: 'admin@babeledit.com' },
      update: {},
      create: {
        email: 'admin@babeledit.com',
        password: hashedPassword,
        firstName: 'Admin',
        lastName: 'User',
        role: 'SUPER_ADMIN',
        isVerified: true,
        isAgree: true
      }
    });

    // Create ADMIN
    await prisma.user.upsert({
      where: { email: 'isiquedan@gmail.com' },
      update: {},
      create: {
        email: 'isiquedan@gmail.com',
        password: hashedPassword,
        firstName: 'Isaac',
        lastName: 'Dalyop',
        phone: '+2347060737799',
        role: 'ADMIN',
        isVerified: true,
        isAgree: true
      }
    });

    console.log('✅ Admin users created successfully');
    
    // List all users
    const users = await prisma.user.findMany({
      select: { email: true, role: true }
    });
    console.log('\nUsers in database:');
    console.log(JSON.stringify(users, null, 2));
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
})();
