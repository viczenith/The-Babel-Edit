import pkg from '@prisma/client';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const { PrismaClient } = pkg;
const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...');

  // Clear existing data (optional - uncomment if you want to reset)
  console.log('🧹 Clearing existing data...');
  await prisma.cartItem.deleteMany();
  await prisma.cart.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.review.deleteMany();
  await prisma.wishlistItem.deleteMany();
  await prisma.address.deleteMany();
  await prisma.product.deleteMany();
  await prisma.collection.deleteMany();
  await prisma.user.deleteMany();
  await prisma.testimonial.deleteMany();

  // Create Users
  console.log('👥 Seeding users...');
  const hashedPassword = await bcrypt.hash('password123', 12);

  const users = [
    {
      email: 'admin@babeledit.com',
      password: hashedPassword,
      firstName: 'Admin',
      lastName: 'User',
      role: 'SUPER_ADMIN',
      isVerified: true,
      isAgree: true
    },
    {
      email: 'isiquedan@gmail.com',
      password: hashedPassword,
      firstName: 'Isaac',
      lastName: 'Dalyop',
      phone: '+2347060737799',
      role: 'ADMIN',
      isVerified: true,
      isAgree: true
    }
  ];

  const createdUsers = {};
  for (const userData of users) {
    const user = await prisma.user.upsert({
      where: { email: userData.email },
      update: {},
      create: userData
    });
    createdUsers[userData.email] = user;
  }

  // Create Collections - Updated for your specific needs
  console.log('📦 Seeding collections...');
  const collections = [
    {
      name: 'Clothes',
      description: 'Stylish and comfortable clothing for men and women',
      imageUrl: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=500&h=300&fit=crop&crop=center',
      isActive: true
    },
    {
      name: 'Shoes',
      description: 'Comfortable and stylish footwear for every occasion',
      imageUrl: 'https://images.unsplash.com/photo-1549298916-b41d501d3772?w=500&h=300&fit=crop&crop=center',
      isActive: true
    },
    {
      name: 'Bags',
      description: 'Premium bags for work, travel, and everyday use',
      imageUrl: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=500&h=300&fit=crop&crop=center',
      isActive: true
    },
    {
      name: 'Accessories',
      description: 'Fashion accessories to complete your perfect look',
      imageUrl: 'https://images.unsplash.com/photo-1434493789847-2f02dc6ca35d?w=500&h=300&fit=crop&crop=center',
      isActive: true
    },
    {
      name: 'New Arrivals',
      description: 'Latest fashion trends and newest products',
      imageUrl: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=500&h=300&fit=crop&crop=center',
      isActive: true
    }
  ];

  const createdCollections = {};
  for (const collectionData of collections) {
    const collection = await prisma.collection.upsert({
      where: { name: collectionData.name },
      update: collectionData,
      create: collectionData
    });
    createdCollections[collection.name] = collection.id;
  }

  // Create Product Categories
  console.log('📂 Seeding product categories...');
  const categories = [
    { name: 'Clothes', slug: 'clothes', description: 'Clothing items for men, women, and unisex' },
    { name: 'Shoes', slug: 'shoes', description: 'Footwear including sneakers, boots, sandals' },
    { name: 'Bags', slug: 'bags', description: 'Handbags, backpacks, and luggage' },
    { name: 'Accessories', slug: 'accessories', description: 'Fashion accessories like belts, scarves, hats' }
  ];

  const createdCategories = {};
  for (const catData of categories) {
    const category = await prisma.productCategory.upsert({
      where: { slug: catData.slug },
      update: { name: catData.name, description: catData.description },
      create: catData
    });
    createdCategories[catData.slug] = category;
  }

  // Create Product Types per Category
  console.log('🏷️ Seeding product types...');
  const typesByCategory = {
    clothes: [
      { name: 'T-Shirt', description: 'Casual t-shirts for everyday wear' },
      { name: 'Dress', description: 'Dresses for various occasions' },
      { name: 'Blouse', description: 'Formal and casual blouses' },
      { name: 'Jacket', description: 'Jackets and blazers' },
      { name: 'Pants', description: 'Jeans, trousers, and casual pants' },
      { name: 'Shirt', description: 'Formal and casual shirts' }
    ],
    shoes: [
      { name: 'Sneaker', description: 'Athletic and casual sneakers' },
      { name: 'Boot', description: 'Boots for various seasons' },
      { name: 'Sandal', description: 'Sandals and flip-flops' },
      { name: 'Heel', description: 'High heels and pumps' },
      { name: 'Loafer', description: 'Loafers and slip-ons' }
    ],
    bags: [
      { name: 'Backpack', description: 'Backpacks for work and travel' },
      { name: 'Crossbody', description: 'Crossbody and shoulder bags' },
      { name: 'Tote', description: 'Tote bags for shopping and work' },
      { name: 'Clutch', description: 'Evening clutches and wallets' },
      { name: 'Suitcase', description: 'Luggage and travel suitcases' }
    ],
    accessories: [
      { name: 'Belt', description: 'Belts for various styles' },
      { name: 'Scarf', description: 'Scarves and wraps' },
      { name: 'Hat', description: 'Hats and caps' },
      { name: 'Watch', description: 'Watches and timepieces' },
      { name: 'Jewelry', description: 'Necklaces, bracelets, and rings' }
    ]
  };

  const createdTypes = {};
  for (const [categorySlug, types] of Object.entries(typesByCategory)) {
    createdTypes[categorySlug] = {};
    const category = createdCategories[categorySlug];
    
    for (const typeData of types) {
      const type = await prisma.productType.upsert({
        where: { name_categoryId: { name: typeData.name, categoryId: category.id } },
        update: { description: typeData.description },
        create: {
          name: typeData.name,
          categoryId: category.id,
          description: typeData.description
        }
      });
      createdTypes[categorySlug][typeData.name] = type;
    }
  }

  console.log('✅ Categories and types seeded successfully');

  // NO DUMMY PRODUCTS - All products created via Admin Dashboard only
  console.log('🛍️ Products will be created via Admin Dashboard only');

  // Create some sample testimonials
  console.log('💬 Seeding testimonials...');
  const testimonials = [
    {
      author: 'Sarah J.',
      text: 'Absolutely in love with the vintage dress I bought! The quality is amazing and it arrived so quickly. Will definitely be shopping here again.',
      avatar: 'https://i.pravatar.cc/150?u=sarah'
    },
    {
      author: 'Michael B.',
      text: "Found a rare pair of sneakers I've been looking for everywhere. The condition was exactly as described. Great service and communication.",
      avatar: 'https://i.pravatar.cc/150?u=michael'
    },
    {
      author: 'Emily K.',
      text: "The Babel Edit is my go-to for unique finds. The curation is top-notch and I always get compliments on the pieces I buy.",
      avatar: 'https://i.pravatar.cc/150?u=emily'
    },
    {
      author: 'David L.',
      text: "A fantastic shopping experience from start to finish. The website is easy to use and my order was handled with care. Highly recommend!",
      avatar: 'https://i.pravatar.cc/150?u=david'
    }
  ];

  await prisma.testimonial.createMany({
    data: testimonials
  });

  console.log('✅ Database seeding completed!');
  console.log(`📊 Seeded:`);
  console.log(`   - ${users.length} users`);
  console.log(`   - ${collections.length} collections`);
  console.log(`   - ${categories.length} product categories`);
  console.log(`   - ${Object.values(typesByCategory).flat().length} product types`);
  console.log(`   - ${testimonials.length} testimonials`);
  console.log(`   - 0 products (all products to be created via Admin Dashboard)`);
  console.log('');
  console.log('🔐 Test Credentials:');
  console.log('   Admin (Super Admin): admin@babeledit.com / password123');
  console.log('   Admin (Admin): isiquedan@gmail.com / password123');
  console.log('');
  console.log('📦 Collections Created:');
  console.log('   - Clothes (General clothing items)');
  console.log('   - Shoes (All types of footwear)');
  console.log('   - Bags (Handbags, backpacks, totes)');
  console.log('   - Accessories (Watches, sunglasses, belts, etc.)');
  console.log('   - New Arrivals (Latest products)');
  console.log('');
  console.log('📂 Product Categories:');
  categories.forEach(cat => console.log(`   - ${cat.name} (${cat.slug})`));
  console.log('');
  console.log('✨ Ready for Admin Dashboard product creation!');
}

main()
  .catch(e => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
