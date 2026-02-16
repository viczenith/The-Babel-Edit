#!/usr/bin/env node
/**
 * Simple Collection Management Tool
 * Usage:
 *   node setup-collections.js list            - List all collections
 *   node setup-collections.js create          - Create new collections
 *   node setup-collections.js demo            - Demo: Create sample collections
 */

import prisma from "./prismaClient.js";

const args = process.argv.slice(2);
const command = args[0] || "help";

async function listCollections() {
  console.log("\n📦 Current Collections:\n");
  const collections = await prisma.collection.findMany({
    include: { _count: { select: { products: true } } },
  });

  collections.forEach((c) => {
    console.log(
      `  • ${c.name.padEnd(20)} | ${c._count.products} products | Active: ${c.isActive}`
    );
    if (c.description) console.log(`    ↳ ${c.description}`);
  });
  console.log(`\nTotal: ${collections.length} collection(s)\n`);
}

async function createNewCollections() {
  console.log(
    "\n📝 Creating recommended collections (Clothing, Shoes, Bags, Accessories)...\n"
  );

  const newCollections = [
    {
      name: "Clothing",
      description: "Stylish and comfortable clothing for men and women",
      imageUrl:
        "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=500&h=300&fit=crop&crop=center",
    },
    {
      name: "Shoes",
      description: "Comfortable and stylish footwear for every occasion",
      imageUrl:
        "https://images.unsplash.com/photo-1549298916-b41d501d3772?w=500&h=300&fit=crop&crop=center",
    },
    {
      name: "Bags",
      description: "Premium bags for work, travel, and everyday use",
      imageUrl:
        "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=500&h=300&fit=crop&crop=center",
    },
    {
      name: "Accessories",
      description: "Fashion accessories to complete your perfect look",
      imageUrl:
        "https://images.unsplash.com/photo-1434493789847-2f02dc6ca35d?w=500&h=300&fit=crop&crop=center",
    },
  ];

  for (const collData of newCollections) {
    // Check if already exists
    const existing = await prisma.collection.findUnique({
      where: { name: collData.name },
    });

    if (existing) {
      console.log(`✓ ${collData.name} already exists`);
    } else {
      await prisma.collection.create({ data: collData });
      console.log(`✓ Created ${collData.name}`);
    }
  }

  console.log(
    "\n✅ Collection setup complete! Run 'node setup-collections.js list' to see all collections.\n"
  );
}

async function demoMode() {
  console.log("\n🎬 Demo Mode: Setting up documentation collections...\n");

  const demoCollections = [
    {
      name: "Demo - Electronics",
      description: "Demo collection for electronics",
    },
    {
      name: "Demo - Fashion",
      description: "Demo collection for fashion items",
    },
  ];

  for (const collData of demoCollections) {
    try {
      const existing = await prisma.collection.findUnique({
        where: { name: collData.name },
      });
      if (!existing) {
        await prisma.collection.create({ data: { ...collData, isActive: true } });
        console.log(`✓ Created ${collData.name}`);
      } else {
        console.log(`✓ ${collData.name} already exists`);
      }
    } catch (err) {
      console.log(`✗ Error with ${collData.name}: ${err.message}`);
    }
  }

  console.log("\n✅ Demo collections ready!\n");
}

async function showHelp() {
  console.log(`
╔════════════════════════════════════════════════════════════════╗
║                 Collection Management Tool                    ║
╚════════════════════════════════════════════════════════════════╝

USAGE:
  node setup-collections.js [command]

COMMANDS:
  list          - Show all collections with product counts
  create        - Create recommended marketing categories
  demo          - Create demo collections
  help          - Show this help message

EXAMPLES:
  node setup-collections.js list
  node setup-collections.js create
  node setup-collections.js demo

NOTES:
  - All commands require DATABASE_URL to be set
  - Requires authentication to create/update collections via API
  - Collections are stored in PostgreSQL database

`);
}

async function main() {
  try {
    switch (command) {
      case "list":
        await listCollections();
        break;
      case "create":
        await createNewCollections();
        break;
      case "demo":
        await demoMode();
        break;
      case "help":
      case "-h":
      case "--help":
        await showHelp();
        break;
      default:
        console.log(`Unknown command: ${command}`);
        await showHelp();
    }
  } catch (error) {
    console.error("❌ Error:", error.message);
    if (error.message.includes("DATABASE_URL")) {
      console.log(
        "\n📌 Tip: Make sure DATABASE_URL is set in your .env file"
      );
      console.log(
        "   Example: DATABASE_URL='postgresql://user:password@localhost:5432/babel'\n"
      );
    }
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
