#!/usr/bin/env node
import dotenv from 'dotenv';
import pkg from '@prisma/client';

// Load enviroment variables BEFORE anything else
dotenv.config();

const { PrismaClient } = pkg;

// Force the DATABASE_URL if not already set (use the environment variable)
if (!process.env.DATABASE_URL && !process.argv.includes('--help')) {
  console.error('DATABASE_URL environment variable is required. Set it in .env file.');
  process.exit(1);
}

const prisma = new PrismaClient();

async function updateCollections() {
  try {
    console.log('📦 Updating collections...');
    
    // Define the new collections
    const newCollections = [
      {
        name: 'Clothing',
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

    // Get all existing collections
    const existingCollections = await prisma.collection.findMany();
    console.log(`Found ${existingCollections.length} existing collections:`, existingCollections.map(c => c.name));

    // Delete old collections (this will cascade delete products if needed)
    const oldCollectionNames = ['Blouse', 'Gean', 'T-Shirt', 'Trousers'];
    for (const name of oldCollectionNames) {
      const existing = await prisma.collection.findUnique({
        where: { name }
      });
      if (existing) {
        // Delete products in this collection first
        await prisma.product.deleteMany({
          where: { collectionId: existing.id }
        });
        // Then delete the collection
        await prisma.collection.delete({
          where: { name }
        });
        console.log(`✓ Deleted collection: ${name}`);
      }
    }

    // Create or update new collections
    const createdCollections = {};
    for (const collectionData of newCollections) {
      const collection = await prisma.collection.upsert({
        where: { name: collectionData.name },
        update: collectionData,
        create: collectionData
      });
      createdCollections[collection.name] = collection.id;
      console.log(`✓ Created/Updated collection: ${collection.name}`);
    }

    // Add some sample products to Clothing collection
    const clothingId = createdCollections['Clothing'];
    if (clothingId) {
      const sampleProducts = [
        {
          name: 'Elegant Summer Dress',
          description: 'A beautiful flowing summer dress perfect for any occasion. Made with lightweight, breathable fabric.',
          price: 89.99,
          comparePrice: 119.99,
          imageUrl: 'https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=500&h=600&fit=crop&crop=center',
          images: [
            'https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=500&h=600&fit=crop&crop=center',
            'https://images.unsplash.com/photo-1594633312681-425c7b97ccd1?w=500&h=600&fit=crop&crop=center'
          ],
          stock: 25,
          sku: 'CL001',
          collectionId: clothingId,
          sizes: ['XS', 'S', 'M', 'L', 'XL'],
          colors: ['Blue', 'Red', 'White', 'Black'],
          tags: ['summer', 'elegant', 'dress', 'casual', 'women'],
          weight: 0.3,
          dimensions: 'One Size',
          isActive: true,
          isFeatured: true
        },
        {
          name: 'Casual Denim Jacket',
          description: 'Classic denim jacket that never goes out of style. Perfect for layering.',
          price: 79.99,
          imageUrl: 'https://images.unsplash.com/photo-1551028719-00167b16eac5?w=500&h=600&fit=crop&crop=center',
          images: [
            'https://images.unsplash.com/photo-1551028719-00167b16eac5?w=500&h=600&fit=crop&crop=center'
          ],
          stock: 30,
          sku: 'CL002',
          collectionId: clothingId,
          sizes: ['XS', 'S', 'M', 'L', 'XL'],
          colors: ['Light Blue', 'Dark Blue', 'Black'],
          tags: ['denim', 'jacket', 'casual', 'classic', 'unisex'],
          weight: 0.8,
          isActive: true,
          isFeatured: false
        }
      ];

      // Delete any existing products in Clothing collection first
      const existingInClothing = await prisma.product.findMany({
        where: { collectionId: clothingId }
      });

      if (existingInClothing.length === 0) {
        // Only add samples if collection is empty
        for (const productData of sampleProducts) {
          await prisma.product.create({
            data: productData
          });
          console.log(`✓ Added product to Clothing: ${productData.name}`);
        }
      } else {
        console.log(`✓ Clothing collection already has ${existingInClothing.length} products, skipping sample data`);
      }
    }

    console.log('\n✅ Collection update completed successfully!');
    console.log('📦 Collections available:', Object.keys(createdCollections));

  } catch (error) {
    console.error('❌ Error updating collections:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

updateCollections();
