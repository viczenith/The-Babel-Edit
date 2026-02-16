import prisma from '../prismaClient.js';
import { appendAuditLog } from './adminController.js';

// Get all collections with optional filtering
export const getCollections = async (req, res) => {
  try {
    // SQLite doesn't support case-insensitive mode, only PostgreSQL does
    const isPostgreSQL = process.env.DATABASE_URL?.startsWith('postgresql://') || process.env.DATABASE_URL?.startsWith('postgres://');
    const strContains = (val) => isPostgreSQL ? { contains: val, mode: 'insensitive' } : { contains: val };

    const { 
      page = 1, 
      limit = 20, 
      search, 
      active,
      sortBy = 'name',
      sortOrder = 'asc'
    } = req.query;

    const where = {};
    
    // Search filter
    if (search) {
      where.OR = [
        { name: strContains(search) },
        { description: strContains(search) }
      ];
    }

    // Active filter
    if (active !== undefined) {
      where.isActive = active === 'true';
    } else {
      // Default to only active collections for public API
      where.isActive = true;
    }

    // Build orderBy
    const validSortFields = ['name', 'createdAt', 'updatedAt'];
    const orderBy = {};
    
    if (validSortFields.includes(sortBy)) {
      orderBy[sortBy] = sortOrder === 'desc' ? 'desc' : 'asc';
    } else {
      orderBy.name = 'asc';
    }

    const [collections, total] = await Promise.all([
      prisma.collection.findMany({
        where,
        include: {
          _count: {
            select: {
              products: {
                where: { isActive: true }
              }
            }
          }
        },
        orderBy,
        skip: (parseInt(page) - 1) * parseInt(limit),
        take: parseInt(limit)
      }),
      prisma.collection.count({ where })
    ]);

    const collectionsWithProductCount = collections.map(collection => ({
      ...collection,
      productCount: collection._count.products
    }));

    res.json({
      collections: collectionsWithProductCount.map(({ _count, ...collection }) => collection),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });

  } catch (error) {
    console.error('Get collections error:', error);
    res.status(500).json({ message: 'Failed to fetch collections' });
  }
};

// Get single collection by ID or name
export const getCollection = async (req, res) => {
  try {
    const { identifier } = req.params; // Can be ID or name
    
    // Try to find by ID first, then by name
    let collection = await prisma.collection.findUnique({
      where: { id: identifier },
      include: {
        _count: {
          select: {
            products: {
              where: { isActive: true }
            }
          }
        }
      }
    });

    if (!collection) {
      collection = await prisma.collection.findUnique({
        where: { name: identifier },
        include: {
          _count: {
            select: {
              products: {
                where: { isActive: true }
              }
            }
          }
        }
      });
    }

    if (!collection || !collection.isActive) {
      return res.status(404).json({ message: 'Collection not found' });
    }

    res.json({
      ...collection,
      productCount: collection._count.products
    });

  } catch (error) {
    console.error('Get collection error:', error);
    res.status(500).json({ message: 'Failed to fetch collection' });
  }
};

// Get products by collection with filtering
export const getProductsByCollection = async (req, res) => {
  try {
    const { name } = req.params;
    const {
      page = 1,
      limit = 20,
      search,
      minPrice,
      maxPrice,
      sizes,
      colors,
      tags,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      inStock,
      onSale
    } = req.query;

    // Find collection
    const collection = await prisma.collection.findUnique({
      where: { name, isActive: true }
    });

    if (!collection) {
      return res.status(404).json({ message: 'Collection not found' });
    }

    // SQLite doesn't support case-insensitive mode, only PostgreSQL does
    const isPostgreSQL = process.env.DATABASE_URL?.startsWith('postgresql://') || process.env.DATABASE_URL?.startsWith('postgres://');
    const strContains = (val) => isPostgreSQL ? { contains: val, mode: 'insensitive' } : { contains: val };
    // SQLite stores JSON arrays as text, so hasSome doesn't work — use string_contains instead
    const jsonArrayContains = (val) => isPostgreSQL ? { hasSome: [val] } : { string_contains: val };
    const jsonArrayHasSome = (arr) => isPostgreSQL ? { hasSome: arr } : { string_contains: arr[0] };

    // Build where clause for products
    const where = {
      collectionId: collection.id,
      isActive: true
    };

    // Apply filters (reusing logic from product controller)
    if (search) {
      where.OR = [
        { name: strContains(search) },
        { description: strContains(search) },
        { tags: jsonArrayContains(search) }
      ];
    }

    if (minPrice || maxPrice) {
      where.price = {};
      if (minPrice) where.price.gte = parseFloat(minPrice);
      if (maxPrice) where.price.lte = parseFloat(maxPrice);
    }

    if (sizes) {
      const sizeArray = sizes.split(',').map(s => s.trim());
      where.sizes = jsonArrayHasSome(sizeArray);
    }

    if (colors) {
      const colorArray = colors.split(',').map(c => c.trim());
      where.colors = jsonArrayHasSome(colorArray);
    }

    if (tags) {
      const tagArray = tags.split(',').map(t => t.trim());
      where.tags = jsonArrayHasSome(tagArray);
    }

    if (inStock === 'true') {
      where.stock = { gt: 0 };
    }

    if (onSale === 'true') {
      where.comparePrice = { not: null };
    }

    // Build orderBy
    const validSortFields = ['name', 'price', 'createdAt', 'updatedAt', 'stock'];
    const orderBy = {};
    
    if (validSortFields.includes(sortBy)) {
      orderBy[sortBy] = sortOrder === 'asc' ? 'asc' : 'desc';
    } else {
      orderBy.createdAt = 'desc';
    }

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        include: {
          reviews: {
            select: {
              rating: true
            }
          }
        },
        orderBy,
        skip: (parseInt(page) - 1) * parseInt(limit),
        take: parseInt(limit)
      }),
      prisma.product.count({ where })
    ]);

    // Add computed fields
    const productsWithRatings = products.map(product => {
      const avgRating = product.reviews.length > 0
        ? product.reviews.reduce((sum, review) => sum + review.rating, 0) / product.reviews.length
        : 0;
      
      const discountPercentage = product.comparePrice
        ? Math.round(((product.comparePrice - product.price) / product.comparePrice) * 100)
        : 0;

      const { reviews, ...productData } = product;
      
      return {
        ...productData,
        avgRating: Math.round(avgRating * 10) / 10,
        reviewCount: reviews.length,
        discountPercentage,
        isInStock: product.stock > 0,
        isOnSale: !!product.comparePrice
      };
    });

    res.json({
      collection: {
        id: collection.id,
        name: collection.name,
        description: collection.description,
        imageUrl: collection.imageUrl
      },
      products: productsWithRatings,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });

  } catch (error) {
    console.error('Get products by collection error:', error);
    res.status(500).json({ message: 'Failed to fetch collection products' });
  }
};

// Create new collection (Admin only)
export const createCollection = async (req, res) => {
  try {
    const { name, description, imageUrl } = req.body;

    if (!name) {
      return res.status(400).json({ message: 'Collection name is required' });
    }

    const collection = await prisma.collection.create({
      data: {
        name: name.trim(),
        description: description?.trim(),
        imageUrl,
        isActive: true
      }
    });

    // Audit log: collection created
    await appendAuditLog({
      action: 'create_collection',
      resource: 'Collection',
      resourceId: collection.id,
      details: { collectionId: collection.id, name: collection.name },
      user: { id: req.user?.userId || null, email: req.user?.email || null, role: req.user?.role || null },
      req,
    });

    res.status(201).json({
      message: 'Collection created successfully',
      collection
    });

  } catch (error) {
    console.error('Create collection error:', error);
    if (error.code === 'P2002') {
      return res.status(400).json({ message: 'Collection with this name already exists' });
    }
    res.status(500).json({ message: 'Failed to create collection' });
  }
};

// Update collection (Admin only)
export const updateCollection = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, imageUrl, isActive } = req.body;

    const updateData = {};
    if (name !== undefined) updateData.name = name.trim();
    if (description !== undefined) updateData.description = description?.trim();
    if (imageUrl !== undefined) updateData.imageUrl = imageUrl;
    if (isActive !== undefined) updateData.isActive = Boolean(isActive);

    const collection = await prisma.collection.update({
      where: { id },
      data: updateData,
      include: {
        _count: {
          select: {
            products: {
              where: { isActive: true }
            }
          }
        }
      }
    });

    // Audit log: collection updated
    await appendAuditLog({
      action: 'update_collection',
      resource: 'Collection',
      resourceId: collection.id,
      details: { collectionId: collection.id, name: collection.name },
      user: { id: req.user?.userId || null, email: req.user?.email || null, role: req.user?.role || null },
      req,
    });

    res.json({
      message: 'Collection updated successfully',
      collection: {
        ...collection,
        productCount: collection._count.products
      }
    });

  } catch (error) {
    console.error('Update collection error:', error);
    if (error.code === 'P2002') {
      return res.status(400).json({ message: 'Collection with this name already exists' });
    }
    if (error.code === 'P2025') {
      return res.status(404).json({ message: 'Collection not found' });
    }
    res.status(500).json({ message: 'Failed to update collection' });
  }
};

// Delete collection (Admin only)
export const deleteCollection = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if collection has products
    const productCount = await prisma.product.count({
      where: { collectionId: id, isActive: true }
    });

    if (productCount > 0) {
      return res.status(400).json({ 
        message: `Cannot delete collection. It contains ${productCount} active products. Please move or delete products first.` 
      });
    }

    // Soft delete - mark as inactive
    await prisma.collection.update({
      where: { id },
      data: { isActive: false }
    });

    // Audit log: collection deleted (soft)
    await appendAuditLog({
      action: 'delete_collection',
      resource: 'Collection',
      resourceId: id,
      details: { collectionId: id },
      severity: 'warning',
      user: { id: req.user?.userId || null, email: req.user?.email || null, role: req.user?.role || null },
      req,
    });

    res.json({ message: 'Collection deleted successfully' });

  } catch (error) {
    console.error('Delete collection error:', error);
    if (error.code === 'P2025') {
      return res.status(404).json({ message: 'Collection not found' });
    }
    res.status(500).json({ message: 'Failed to delete collection' });
  }
};

// Get collection statistics (Admin only)
export const getCollectionStats = async (req, res) => {
  try {
    const { id } = req.params;

    const collection = await prisma.collection.findUnique({
      where: { id },
      include: {
        products: {
          where: { isActive: true },
          select: {
            price: true,
            stock: true,
            reviews: {
              select: {
                rating: true
              }
            },
            orderItems: {
              select: {
                quantity: true,
                price: true
              }
            }
          }
        }
      }
    });

    if (!collection) {
      return res.status(404).json({ message: 'Collection not found' });
    }

    const products = collection.products;
    
    // Calculate statistics
    const totalProducts = products.length;
    const totalStock = products.reduce((sum, p) => sum + p.stock, 0);
    const avgPrice = products.length > 0 
      ? products.reduce((sum, p) => sum + p.price, 0) / products.length
      : 0;
    
    const allReviews = products.flatMap(p => p.reviews);
    const avgRating = allReviews.length > 0
      ? allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length
      : 0;
    
    const allOrderItems = products.flatMap(p => p.orderItems);
    const totalSold = allOrderItems.reduce((sum, item) => sum + item.quantity, 0);
    const totalRevenue = allOrderItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    res.json({
      collection: {
        id: collection.id,
        name: collection.name,
        description: collection.description
      },
      stats: {
        totalProducts,
        totalStock,
        averagePrice: Math.round(avgPrice * 100) / 100,
        averageRating: Math.round(avgRating * 10) / 10,
        totalReviews: allReviews.length,
        totalSold,
        totalRevenue: Math.round(totalRevenue * 100) / 100
      }
    });

  } catch (error) {
    console.error('Get collection stats error:', error);
    res.status(500).json({ message: 'Failed to fetch collection statistics' });
  }
};
