import pkg from '@prisma/client';
import dotenv from 'dotenv';

dotenv.config();
const { PrismaClient } = pkg;
const prisma = new PrismaClient();

async function seedTypes() {
  try {
    console.log('🌱 Seeding categories and types...');

    // Create Product Categories
    const categoryData = [
      { name: 'Clothes', slug: 'clothes', description: 'Clothing items for men, women, and unisex' },
      { name: 'Shoes', slug: 'shoes', description: 'Footwear including sneakers, boots, sandals' },
      { name: 'Bags', slug: 'bags', description: 'Handbags, backpacks, and luggage' },
      { name: 'Accessories', slug: 'accessories', description: 'Fashion accessories like belts, scarves, hats' }
    ];

    const categories = {};
    for (const cat of categoryData) {
      const category = await prisma.productCategory.upsert({
        where: { slug: cat.slug },
        update: {},
        create: cat
      });
      categories[cat.slug] = category;
      console.log(`✅ Created category: ${category.name}`);
    }

    // Create Product Types
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

    for (const [categorySlug, types] of Object.entries(typesByCategory)) {
      const category = categories[categorySlug];
      
      for (const typeData of types) {
        const type = await prisma.productType.upsert({
          where: { name_categoryId: { name: typeData.name, categoryId: category.id } },
          update: {},
          create: {
            name: typeData.name,
            categoryId: category.id,
            description: typeData.description
          }
        });
        console.log(`  ✅ Created type: ${type.name} for ${category.name}`);
      }
    }

    console.log('\n🎉 Seeding completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding:', error);
    process.exit(1);
  }
}

seedTypes();
