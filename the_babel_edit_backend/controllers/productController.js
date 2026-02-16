import prisma from '../prismaClient.js';
import { appendAuditLog } from './adminController.js';

// Helper functions for string matching (used across multiple controller functions)
const strContains = (val) => ({ contains: val });
const strEquals = (val) => ({ equals: val });

// SQLite stores JSON arrays as text strings, so hasSome doesn't work.
// Use string_contains on the serialized JSON to search within JSON array fields.
const jsonArrayContains = (val) => ({ string_contains: val });

// Get all products with advanced filtering and search
export const getProducts = async (req, res) => {
  try {
    // SQLite doesn't support case-insensitive mode, only PostgreSQL does
    const isPostgreSQL = process.env.DATABASE_URL?.startsWith('postgresql://') || process.env.DATABASE_URL?.startsWith('postgres://');

    const {
      page = 1,
      limit = 22,
      search,
      category,
      collection,
      minPrice,
      maxPrice,
      sizes,
      colors,
      tags,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      featured,
      inStock,
      onSale
    } = req.query;

    // Build where clause
    const where = {};
    if (req.query.includeInactive !== 'true') {
      where.isActive = true;
    }

    // Size filter - loose matching
    if (sizes) {
      const sizeArray = Array.isArray(sizes) ? sizes : sizes.split(',').map(s => s.trim());
      if (sizeArray.length > 0) {
        where.OR = where.OR || [];
        where.OR.push(
          // SQLite: search for each size as substring in the JSON text
          ...sizeArray.map(size => ({ sizes: jsonArrayContains(size) })),
          // Also search in name/description for size
          ...sizeArray.map(size => ({
            OR: [
              { name: strContains(size) },
              { description: strContains(size) }
            ]
          }))
        );
      }
    }

    // Color filter - loose matching
    if (colors) {
      const colorArray = Array.isArray(colors) ? colors : colors.split(',').map(c => c.trim());
      if (colorArray.length > 0) {
        where.OR = where.OR || [];
        where.OR.push(
          // SQLite: search for each color as substring in the JSON text
          ...colorArray.map(color => ({ colors: jsonArrayContains(color) })),
          // Also search in name/description for color
          ...colorArray.map(color => ({
            OR: [
              { name: strContains(color) },
              { description: strContains(color) }
            ]
          }))
        );
      }
    }

    // Tags filter - LOOSE MATCHING (this is the key change!)
    if (tags) {
      const tagArray = Array.isArray(tags) ? tags : tags.split(',').map(t => t.trim());
      if (tagArray.length > 0) {
        // Create OR conditions for loose matching
        const tagConditions = tagArray.flatMap(tag => [
          { tags: jsonArrayContains(tag) }, // Tag match via substring in JSON text
          { name: strContains(tag) }, // Name contains tag
          { description: strContains(tag) }, // Description contains tag
        ]);

        if (where.OR) {
          // If OR already exists (from sizes/colors), combine them
          where.OR.push(...tagConditions);
        } else {
          where.OR = tagConditions;
        }
      }
    }

    // Search functionality
    if (search) {
      const searchConditions = [
        { name: strContains(search) },
        { description: strContains(search) },
        { tags: jsonArrayContains(search) }
      ];

      if (where.OR) {
        // Combine with existing OR conditions using AND
        where.AND = where.AND || [];
        where.AND.push({ OR: searchConditions });
      } else {
        where.OR = searchConditions;
      }
    }

    // Category filter - for user-facing page categories (clothes, bags, shoes, accessories, sales)
    if (category) {
      // Look up category by slug or name
      const normalizedCategory = category.toLowerCase().replace(/\s+/g, '-');
      let categoryObj = await prisma.productCategory.findUnique({
        where: { slug: normalizedCategory }
      });

      if (!categoryObj) {
        // Fall back to exact name match if slug lookup fails
        categoryObj = await prisma.productCategory.findFirst({
          where: { name: category }
        });
      }
      
      if (categoryObj) {
        where.categoryId = categoryObj.id;
      } else {
        // Category not found, return empty results
        return res.json({
          products: [],
          pagination: { page: parseInt(page), limit: parseInt(limit), total: 0, pages: 0 }
        });
      }
    }

    // Type filter - filter by ProductType name
    if (req.query.type) {
      const typeName = String(req.query.type);
      const typeObj = await prisma.productType.findFirst({
        where: {
          name: typeName,
          ...(where.categoryId ? { categoryId: where.categoryId } : {})
        }
      });
      if (typeObj) {
        where.typeId = typeObj.id;
      }
    }

    // Collection filter - for product organization/classification
    if (collection) {
      where.collection = {
        name: strEquals(collection)
      };
    }

    // Price range filter
    if (minPrice || maxPrice) {
      where.price = {};
      if (minPrice) where.price.gte = parseFloat(minPrice);
      if (maxPrice) where.price.lte = parseFloat(maxPrice);
    }

    // Featured filter
    if (featured === 'true') {
      where.isFeatured = true;
    }

    // In stock filter
    if (inStock === 'true') {
      where.stock = { gt: 0 };
    }

    // On sale filter (has comparePrice)
    if (onSale === 'true') {
      where.comparePrice = { not: null };
    }

    // Build orderBy clause
    const validSortFields = ['name', 'price', 'createdAt', 'updatedAt', 'stock'];
    const orderBy = {};

    if (validSortFields.includes(sortBy)) {
      orderBy[sortBy] = sortOrder === 'asc' ? 'asc' : 'desc';
    } else {
      orderBy.createdAt = 'desc';
    }

    // Execute query
    const total = await prisma.product.count({ where });
    const products = await prisma.product.findMany({
      where,
      include: {
        collection: {
          select: {
            id: true,
            name: true
          }
        },
        type: {
          select: {
            id: true,
            name: true,
            description: true
          }
        },
        category: {
          select: {
            id: true,
            name: true,
            slug: true
          }
        },
        reviews: {
          select: {
            rating: true
          }
        },
        _count: {
          select: {
            reviews: true
          }
        }
      },
      orderBy,
      skip: (parseInt(page) - 1) * parseInt(limit),
      take: parseInt(limit)
    });

    // Calculate average ratings and add computed fields
    const productsWithRatings = products.map(product => {
      const discountPercentage = product.comparePrice
        ? Math.round(((product.comparePrice - product.price) / product.comparePrice) * 100)
        : 0;

      const { reviews, _count, ...productData } = product;
      const avgRating = reviews.length > 0
        ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length
        : 0;

      // Ensure images is always an array
      let imagesArray = productData.images;
      if (typeof imagesArray === 'string') {
        try {
          imagesArray = JSON.parse(imagesArray);
        } catch (e) {
          console.warn(`Failed to parse images for product ${productData.id}:`, imagesArray);
          imagesArray = [];
        }
      }
      if (!Array.isArray(imagesArray)) {
        imagesArray = [];
      }

      return {
        ...productData,
        images: imagesArray, // Ensure images is an array
        avgRating: Math.round(avgRating * 10) / 10,
        reviewCount: _count.reviews,
        discountPercentage,
        isInStock: product.stock > 0,
        isOnSale: !!product.comparePrice
      };
    });

    res.json({
      products: productsWithRatings,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      },
      filters: {
        search,
        collection,
        priceRange: { min: minPrice, max: maxPrice },
        sizes: sizes?.split(','),
        colors: colors?.split(','),
        tags: tags?.split(','),
        featured: featured === 'true',
        inStock: inStock === 'true',
        onSale: onSale === 'true'
      },
      sorting: {
        sortBy,
        sortOrder
      }
    });

  } catch (error) {
    // Log full stack for debugging query failures (helps trace Prisma errors)
    console.error('Get products error:', error && error.stack ? error.stack : error);
    res.status(500).json({ message: 'Failed to fetch products' });
  }
};

// Get product by ID with related data
export const getProductById = async (req, res) => {
  try {
    const { id } = req.params;

    const product = await prisma.product.findUnique({
      where: { id, isActive: true },
      include: {
        collection: {
          select: {
            id: true,
            name: true,
            description: true
          }
        },
        reviews: {
          include: {
            user: {
              select: {
                firstName: true,
                lastName: true,
                avatar: true
              }
            }
          },
          orderBy: { createdAt: 'desc' },
          take: 10 // Latest 10 reviews
        }
      }
    });

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    // Parse JSON fields (images, sizes, colors, tags) — Prisma + SQLite may return strings
    const parseJsonField = (value) => {
      if (Array.isArray(value)) return value;
      if (typeof value === 'string') {
        try { return JSON.parse(value); } catch { return []; }
      }
      return [];
    };

    const parsedImages = parseJsonField(product.images);
    const parsedSizes = parseJsonField(product.sizes);
    const parsedColors = parseJsonField(product.colors);
    const parsedTags = parseJsonField(product.tags);

    // Calculate average rating
    const avgRating = product.reviews.length > 0
      ? product.reviews.reduce((sum, review) => sum + review.rating, 0) / product.reviews.length
      : 0;

    // Get related products from same collection
    const relatedProducts = await prisma.product.findMany({
      where: {
        collectionId: product.collectionId,
        id: { not: product.id },
        isActive: true
      },
      select: {
        id: true,
        name: true,
        price: true,
        comparePrice: true,
        imageUrl: true,
        stock: true
      },
      take: 4
    });

    const discountPercentage = product.comparePrice
      ? Math.round(((product.comparePrice - product.price) / product.comparePrice) * 100)
      : 0;

    res.json({
      ...product,
      images: parsedImages,
      sizes: parsedSizes,
      colors: parsedColors,
      tags: parsedTags,
      avgRating: Math.round(avgRating * 10) / 10,
      reviewCount: product.reviews.length,
      discountPercentage,
      isInStock: product.stock > 0,
      isOnSale: !!product.comparePrice,
      relatedProducts: relatedProducts.map(p => ({
        ...p,
        discountPercentage: p.comparePrice
          ? Math.round(((p.comparePrice - p.price) / p.comparePrice) * 100)
          : 0,
        isInStock: p.stock > 0
      }))
    });

  } catch (error) {
    console.error('Get product by ID error:', error);
    res.status(500).json({ message: 'Failed to fetch product' });
  }
};

// Search suggestions (for autocomplete)
export const getSearchSuggestions = async (req, res) => {
  try {
    const { q } = req.query;

    if (!q || q.length < 2) {
      return res.json({ suggestions: [] });
    }

    // Get product name suggestions
    const productSuggestions = await prisma.product.findMany({
      where: {
        isActive: true,
        name: strContains(q)
      },
      select: {
        name: true,
        imageUrl: true,
        price: true
      },
      take: 5
    });

    // Get collection suggestions
    const collectionSuggestions = await prisma.collection.findMany({
      where: {
        isActive: true,
        name: strContains(q)
      },
      select: {
        name: true
      },
      take: 3
    });

    // Get tag suggestions
    const tagResults = await prisma.product.findMany({
      where: {
        isActive: true,
        tags: jsonArrayContains(q)
      },
      select: {
        tags: true
      },
      take: 10
    });

    // Extract unique matching tags
    const allTags = tagResults.flatMap(p => p.tags);
    const matchingTags = [...new Set(allTags.filter(tag =>
      tag.toLowerCase().includes(q.toLowerCase())
    ))].slice(0, 3);

    res.json({
      suggestions: {
        products: productSuggestions.map(p => ({
          type: 'product',
          name: p.name,
          imageUrl: p.imageUrl,
          price: p.price
        })),
        collections: collectionSuggestions.map(c => ({
          type: 'collection',
          name: c.name
        })),
        tags: matchingTags.map(tag => ({
          type: 'tag',
          name: tag
        }))
      }
    });

  } catch (error) {
    console.error('Get search suggestions error:', error);
    res.status(500).json({ message: 'Failed to fetch suggestions' });
  }
};

// Get filter options (for filter UI)
export const getFilterOptions = async (req, res) => {
  try {
    const category = req.query.category ? String(req.query.category) : null;
    const minPrice = req.query.minPrice ? parseFloat(req.query.minPrice) : null;
    const maxPrice = req.query.maxPrice ? parseFloat(req.query.maxPrice) : null;
    const type = req.query.type ? String(req.query.type) : null;
    const color = req.query.color ? String(req.query.color) : null;

    // Build where clause - defaults to active products
    const where = { isActive: true };

    // Find category by slug or name
    let categoryId = null;
    let categoryObj = null;
    if (category) {
      const normalizedCategory = category.toLowerCase().replace(/\s+/g, '-');
      categoryObj = await prisma.productCategory.findUnique({
        where: { slug: normalizedCategory }
      });
      
      if (!categoryObj) {
        // Try finding by name (exact match)
        categoryObj = await prisma.productCategory.findFirst({ where: { name: category } });
      }

      if (categoryObj) {
        categoryId = categoryObj.id;
        where.categoryId = categoryId;
      }
    }

    // Filter by price range
    if (minPrice !== null || maxPrice !== null) {
      where.price = {};
      if (minPrice !== null) where.price.gte = minPrice;
      if (maxPrice !== null) where.price.lte = maxPrice;
    }

    // Filter by type - now using typeId
    if (type) {
      // Prefer exact name lookup; avoid 'mode' to prevent unsupported argument errors
      const typeObj = await prisma.productType.findFirst({
        where: { name: type, categoryId }
      });
      if (typeObj) {
        where.typeId = typeObj.id;
      }
    }

    // Filter by color
    if (color) {
      where.colors = jsonArrayContains(color);
    }

    // Fetch all products matching the criteria
    const productsForFilters = await prisma.product.findMany({
      where,
      select: {
        id: true,
        price: true,
        sizes: true,
        colors: true,
        type: { select: { name: true } }
      }
    });

    // Helper to extract unique values from array fields
    const collectUnique = (arrs) => {
      const s = new Set();
      for (const a of arrs) {
        if (!Array.isArray(a)) continue;
        for (const v of a) if (v) s.add(v);
      }
      return Array.from(s).sort();
    };

    // Helper to count products for each filter value
    const countByValue = (arrayField) => {
      const counts = {};
      productsForFilters.forEach(p => {
        const arr = arrayField(p);
        if (Array.isArray(arr)) {
          arr.forEach(val => {
            counts[val] = (counts[val] || 0) + 1;
          });
        }
      });
      return counts;
    };

    // Get price range
    const priceAggregation = await prisma.product.aggregate({
      where: { isActive: true, categoryId: categoryId || undefined },
      _min: { price: true },
      _max: { price: true }
    });

    // Collect filter data
    const sizes = collectUnique(productsForFilters.map(p => p.sizes));
    const colors = collectUnique(productsForFilters.map(p => p.colors));
    const typeNames = collectUnique(productsForFilters.map(p => p.type?.name).filter(Boolean));

    const colorCounts = countByValue(p => p.colors);
    const typeCounts = {};
    productsForFilters.forEach(p => {
      if (p.type?.name) {
        typeCounts[p.type.name] = (typeCounts[p.type.name] || 0) + 1;
      }
    });
    const sizeCounts = countByValue(p => p.sizes);

    // Fetch all types for this category from database
    let allTypesForCategory = [];
    if (categoryId) {
      allTypesForCategory = await prisma.productType.findMany({
        where: { categoryId, isActive: true },
        orderBy: { name: 'asc' }
      });
    }

    // Build filter groups in the expected format with counts and availability
    const filterGroups = [];

    // 1. PRICE FILTER (always first)
    filterGroups.push({
      title: 'Price',
      key: 'price',
      type: 'range',
      min: priceAggregation._min.price || 0,
      max: priceAggregation._max.price || 0,
      selected: minPrice !== null || maxPrice !== null ? { min: minPrice, max: maxPrice } : null
    });

    // 2. TYPE FILTER - Use ProductType model
    if (allTypesForCategory && allTypesForCategory.length > 0) {
      filterGroups.push({
        title: 'Type',
        key: 'type',
        isSelected: !!type,
        options: allTypesForCategory.map(t => ({
          label: t.name,
          value: t.name,
          count: typeCounts[t.name] || 0,
          available: (typeCounts[t.name] || 0) > 0
        }))
      });
    }

    // 3. COLOR FILTER
    if (colors && colors.length > 0) {
      filterGroups.push({
        title: 'Color',
        key: 'color',
        isSelected: !!color,
        options: colors.map(c => ({
          label: c.charAt(0).toUpperCase() + c.slice(1),
          value: c,
          count: colorCounts[c] || 0,
          available: (colorCounts[c] || 0) > 0
        }))
      });
    }

    // 4. SIZE FILTER
    if (sizes && sizes.length > 0) {
      filterGroups.push({
        title: 'Size',
        key: 'size',
        isSelected: false,
        options: sizes.map(s => ({
          label: s,
          value: s,
          count: sizeCounts[s] || 0,
          available: (sizeCounts[s] || 0) > 0
        }))
      });
    }

    res.json({
      priceRange: {
        min: priceAggregation._min.price || 0,
        max: priceAggregation._max.price || 0
      },
      filterGroups
    });

  } catch (error) {
    console.error('Get filter options error:', error && error.stack ? error.stack : error);
    const msg = process.env.NODE_ENV === 'production' ? 'Failed to fetch filter options' : (error && error.message ? error.message : 'Failed to fetch filter options');
    res.status(500).json({ message: msg });
  }
};

// Check if a SKU exists (public endpoint)
export const checkSkuExists = async (req, res) => {
  try {
    const sku = req.query.sku ? String(req.query.sku).trim() : '';
    if (!sku) return res.json({ exists: false });

    const existing = await prisma.product.findUnique({ where: { sku } });
    return res.json({ exists: !!existing });
  } catch (error) {
    console.error('checkSkuExists error:', error);
    return res.status(500).json({ message: 'Failed to check SKU' });
  }
};

// Create a product (Admin only)
export const createProduct = async (req, res) => {
  try {
    const {
      name,
      description,
      price,
      comparePrice,
      imageUrl,
      images,
      stock,
      sku,
      collectionId,
      categoryId,
      typeId,
      category = '', // Category slug for categoryName backup field
      sizes,
      colors,
      tags,
      weight,
      dimensions,
      isFeatured
    } = req.body;

    // Validate required fields
    if (!name || !price || !imageUrl) {
      return res.status(400).json({
        message: 'Required fields: name, price, imageUrl'
      });
    }

    // Validate collection exists (if collectionId is provided)
    if (collectionId) {
      const collection = await prisma.collection.findUnique({
        where: { id: collectionId }
      });

      if (!collection) {
        return res.status(400).json({ message: 'Collection not found' });
      }
    }

    // Validate category exists (if categoryId is provided)
    if (categoryId) {
      const categoryObj = await prisma.productCategory.findUnique({
        where: { id: categoryId }
      });

      if (!categoryObj) {
        return res.status(400).json({ message: 'Category not found' });
      }
    }

    // Validate type exists (if typeId is provided)
    if (typeId) {
      const type = await prisma.productType.findUnique({
        where: { id: typeId }
      });

      if (!type) {
        return res.status(400).json({ message: 'Type not found' });
      }
    }

    // If SKU provided, ensure it's unique before attempting create
    if (sku) {
      const existing = await prisma.product.findUnique({ where: { sku } });
      if (existing) {
        return res.status(409).json({ message: 'Product with this SKU already exists', field: 'sku' });
      }
    }

    // Calculate discount percentage if comparePrice is provided
    const discountPercentage = comparePrice
      ? Math.round(((parseFloat(comparePrice) - parseFloat(price)) / parseFloat(comparePrice)) * 100)
      : null;

    const product = await prisma.product.create({
      data: {
        name,
        description,
        price: parseFloat(price),
        comparePrice: comparePrice ? parseFloat(comparePrice) : null,
        imageUrl,
        images: images || [],
        stock: parseInt(stock) || 0,
        sku,
        collectionId,
        categoryId,
        typeId,
        categoryName: category.toLowerCase(),
        sizes: sizes || [],
        colors: colors || [],
        tags: tags || [],
        weight: weight ? parseFloat(weight) : null,
        dimensions,
        discountPercentage,
        isFeatured: !!isFeatured,
        isActive: true
      },
      include: {
        collection: {
          select: {
            name: true
          }
        },
        category: {
          select: {
            name: true
          }
        },
        type: {
          select: {
            name: true
          }
        }
      }
    });

    // Audit log: product created
    await appendAuditLog({
      action: 'create_product',
      resource: 'Product',
      resourceId: product.id,
      details: { productId: product.id, name: product.name, categoryName: product.categoryName, typeName: product.type?.name, price: product.price, stock: product.stock },
      user: { id: req.user?.userId || null, email: req.user?.email || null, role: req.user?.role || null },
      req,
    });

    res.status(201).json({
      message: 'Product created successfully',
      product
    });

  } catch (error) {
    console.error('Create product error:', error);
    if (error && error.code === 'P2002') {
      return res.status(409).json({ message: 'Product with this SKU already exists', field: 'sku' });
    }
    res.status(500).json({ message: 'Failed to create product' });
  }
};

// Update product (Admin only)
export const updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      description,
      price,
      comparePrice,
      imageUrl,
      images,
      stock,
      sku,
      threshold,
      collectionId,
      categoryId,
      typeId,
      category,
      sizes,
      colors,
      tags,
      weight,
      dimensions,
      isFeatured,
      isActive,
    } = req.body;

    const updateData = {};
    
    // Only update fields that are provided
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (price !== undefined) updateData.price = parseFloat(price);
    if (comparePrice !== undefined) updateData.comparePrice = comparePrice ? parseFloat(comparePrice) : null;
    if (imageUrl !== undefined) updateData.imageUrl = imageUrl;
    if (images !== undefined) updateData.images = images;
    if (stock !== undefined) updateData.stock = parseInt(stock);
    if (sku !== undefined) updateData.sku = sku;
    if (threshold !== undefined) updateData.threshold = parseInt(threshold);
    if (collectionId !== undefined) updateData.collectionId = collectionId;
    if (categoryId !== undefined) updateData.categoryId = categoryId;
    if (typeId !== undefined) updateData.typeId = typeId;
    if (category !== undefined) updateData.categoryName = category.toLowerCase();
    if (sizes !== undefined) updateData.sizes = sizes;
    if (colors !== undefined) updateData.colors = colors;
    if (tags !== undefined) updateData.tags = tags;
    if (weight !== undefined) updateData.weight = weight ? parseFloat(weight) : null;
    if (dimensions !== undefined) updateData.dimensions = dimensions;
    if (isFeatured !== undefined) updateData.isFeatured = isFeatured;
    if (isActive !== undefined) updateData.isActive = isActive;
    
    // Validate categoryId if provided
    if (categoryId) {
      const categoryObj = await prisma.productCategory.findUnique({
        where: { id: categoryId }
      });
      if (!categoryObj) {
        return res.status(400).json({ message: 'Category not found' });
      }
    }

    // Validate typeId if provided
    if (typeId) {
      const type = await prisma.productType.findUnique({
        where: { id: typeId }
      });
      if (!type) {
        return res.status(400).json({ message: 'Type not found' });
      }
    }
    
    // Recalculate discount percentage if comparing prices
    if (price !== undefined && comparePrice !== undefined) {
      updateData.discountPercentage = comparePrice
        ? Math.round(((parseFloat(comparePrice) - parseFloat(price)) / parseFloat(comparePrice)) * 100)
        : null;
    }

    // Capture old values for audit diff
    const oldProduct = await prisma.product.findUnique({ where: { id }, select: Object.keys(updateData).reduce((acc, k) => ({ ...acc, [k]: true }), { id: true, name: true }) });

    const product = await prisma.product.update({
      where: { id },
      data: updateData,
      include: {
        collection: {
          select: {
            name: true,
          },
        },
        category: {
          select: {
            name: true
          }
        },
        type: {
          select: {
            name: true
          }
        }
      },
    });

    // Audit log: product updated
    await appendAuditLog({
      action: 'update_product',
      resource: 'Product',
      resourceId: product.id,
      details: { productId: product.id, name: product.name, categoryName: product.categoryName, typeName: product.type?.name },
      previousValues: oldProduct || null,
      user: { id: req.user?.userId || null, email: req.user?.email || null, role: req.user?.role || null },
      req,
    });

    res.json({
      message: 'Product updated successfully',
      product,
    });
  } catch (error) {
    console.error('Update product error:', error);
    if (error.code === 'P2025') {
      return res.status(404).json({ message: 'Product not found' });
    }
    res.status(500).json({ message: 'Failed to update product' });
  }
};

// Get featured products
export const getFeaturedProducts = async (req, res) => {
  try {
    const {
      limit = 10,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      collection,
      inStock
    } = req.query;

    // Build where clause
    const where = {
      isActive: true,
      isFeatured: true
    };

    // Optional collection filter
    if (collection) {
      where.collection = {
        name: strEquals(collection)
      };
    }

    // Optional stock filter
    if (inStock === 'true') {
      where.stock = { gt: 0 };
    }

    // Build orderBy clause
    const validSortFields = ['name', 'price', 'createdAt', 'updatedAt', 'stock'];
    const orderBy = {};

    if (validSortFields.includes(sortBy)) {
      orderBy[sortBy] = sortOrder === 'asc' ? 'asc' : 'desc';
    } else {
      orderBy.createdAt = 'desc';
    }

    // Fetch featured products
    const featuredProducts = await prisma.product.findMany({
      where,
      include: {
        collection: {
          select: {
            id: true,
            name: true
          }
        },
        reviews: {
          select: {
            rating: true
          }
        }
      },
      orderBy,
      take: parseInt(limit)
    });

    // If no featured products found, return popular products as fallback
    if (featuredProducts.length === 0) {
      const fallbackProducts = await prisma.product.findMany({
        where: {
          isActive: true,
          ...(collection && {
            collection: {
              name: strEquals(collection)
            }
          }),
          ...(inStock === 'true' && { stock: { gt: 0 } })
        },
        include: {
          collection: {
            select: {
              id: true,
              name: true
            }
          },
          reviews: {
            select: {
              rating: true
            }
          }
        },
        orderBy: [
          { reviews: { _count: 'desc' } }, // Most reviewed first
          { createdAt: 'desc' }
        ],
        take: parseInt(limit)
      });

      const fallbackProductsWithRatings = fallbackProducts.map(product => {
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

      return res.json({
        products: fallbackProductsWithRatings,
        meta: {
          total: fallbackProductsWithRatings.length,
          limit: parseInt(limit),
          isFallback: true,
          message: 'No featured products found, showing popular products instead'
        },
        filters: {
          collection,
          inStock: inStock === 'true'
        }
      });
    }

    // Calculate average ratings and add computed fields
    const productsWithRatings = featuredProducts.map(product => {
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
      products: productsWithRatings,
      meta: {
        total: productsWithRatings.length,
        limit: parseInt(limit),
        isFeatured: true
      },
      filters: {
        collection,
        inStock: inStock === 'true'
      },
      sorting: {
        sortBy,
        sortOrder
      }
    });

  } catch (error) {
    console.error('Get featured products error:', error);
    res.status(500).json({ message: 'Failed to fetch featured products' });
  }
};

// Soft delete product (Admin only)
export const deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;

    // Soft delete - mark as inactive
    await prisma.product.update({
      where: { id },
      data: { isActive: false },
    });

    // Audit log: product soft-deleted
    await appendAuditLog({
      action: 'delete_product',
      resource: 'Product',
      resourceId: id,
      details: { productId: id },
      severity: 'warning',
      user: { id: req.user?.userId || null, email: req.user?.email || null, role: req.user?.role || null },
      req,
    });

    res.json({ message: 'Product soft-deleted successfully' });
  } catch (error) {
    console.error('Delete product error:', error);
    if (error.code === 'P2025') {
      return res.status(404).json({ message: 'Product not found' });
    }
    res.status(500).json({ message: 'Failed to delete product' });
  }
};

// Hard delete product (Admin only)
export const hardDeleteProduct = async (req, res) => {
  try {
    const { id } = req.params;

    await prisma.product.delete({
      where: { id },
    });

    // Audit log: product permanently deleted
    await appendAuditLog({
      action: 'hard_delete_product',
      resource: 'Product',
      resourceId: id,
      details: { productId: id },
      severity: 'critical',
      user: { id: req.user?.userId || null, email: req.user?.email || null, role: req.user?.role || null },
      req,
    });

    res.json({ message: 'Product permanently deleted successfully' });
  } catch (error) {
    console.error('Delete product error:', error);
    if (error.code === 'P2025') {
      return res.status(404).json({ message: 'Product not found' });
    }
    res.status(500).json({ message: 'Failed to delete product' });
  }
};
