import prisma from '../prismaClient.js';
import { appendAuditLog } from './adminController.js';

// Get all product categories
export const getCategories = async (req, res) => {
  try {
    const categories = await prisma.productCategory.findMany({
      where: { isActive: true },
      include: { types: { where: { isActive: true } } },
      orderBy: { name: 'asc' }
    });
    
    res.json(categories);
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
};

// Get single category with its types
export const getCategoryWithTypes = async (req, res) => {
  try {
    const { categoryId } = req.params;
    
    const category = await prisma.productCategory.findUnique({
      where: { id: categoryId },
      include: { types: { where: { isActive: true }, orderBy: { name: 'asc' } } }
    });
    
    if (!category) {
      return res.status(404).json({ error: 'Category not found' });
    }
    
    res.json(category);
  } catch (error) {
    console.error('Error fetching category:', error);
    res.status(500).json({ error: 'Failed to fetch category' });
  }
};

// Create new category
export const createCategory = async (req, res) => {
  try {
    const { name, slug, description } = req.body;
    
    if (!name || !slug) {
      return res.status(400).json({ error: 'Name and slug are required' });
    }
    
    const existingCategory = await prisma.productCategory.findUnique({
      where: { slug }
    });
    
    if (existingCategory) {
      return res.status(409).json({ error: 'Category with this slug already exists' });
    }
    
    const category = await prisma.productCategory.create({
      data: {
        name,
        slug,
        description: description || null
      }
    });

    // Audit: category created
    await appendAuditLog({
      action: 'create_category',
      resource: 'Category',
      resourceId: category.id,
      details: { name, slug },
      user: { id: req.user?.userId || null, email: req.user?.email || null, role: req.user?.role || null },
      req,
    });
    
    res.status(201).json(category);
  } catch (error) {
    console.error('Error creating category:', error);
    res.status(500).json({ error: 'Failed to create category' });
  }
};

// Update category
export const updateCategory = async (req, res) => {
  try {
    const { categoryId } = req.params;
    const { name, slug, description, isActive } = req.body;

    const data = {};
    if (name !== undefined) data.name = name;
    if (slug !== undefined) data.slug = slug;
    if (description !== undefined) data.description = description || null;
    if (isActive !== undefined) data.isActive = isActive;

    // If slug is changing, check for conflicts
    if (slug) {
      const existing = await prisma.productCategory.findUnique({ where: { slug } });
      if (existing && existing.id !== categoryId) {
        return res.status(409).json({ error: 'A category with this slug already exists' });
      }
    }

    const category = await prisma.productCategory.update({
      where: { id: categoryId },
      data,
      include: { types: { where: { isActive: true }, orderBy: { name: 'asc' } } }
    });

    // Audit: category updated
    await appendAuditLog({
      action: 'update_category',
      resource: 'Category',
      resourceId: categoryId,
      details: { updatedFields: Object.keys(data) },
      user: { id: req.user?.userId || null, email: req.user?.email || null, role: req.user?.role || null },
      req,
    });
    
    res.json(category);
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Category not found' });
    }
    console.error('Error updating category:', error);
    res.status(500).json({ error: 'Failed to update category' });
  }
};

// Delete category
export const deleteCategory = async (req, res) => {
  try {
    const { categoryId } = req.params;
    
    // Check if category has products
    const productCount = await prisma.product.count({
      where: { categoryId }
    });
    
    if (productCount > 0) {
      return res.status(409).json({ 
        error: 'Cannot delete category with existing products. Please reassign or delete products first.' 
      });
    }
    
    await prisma.productCategory.delete({
      where: { id: categoryId }
    });

    // Audit: category deleted
    await appendAuditLog({
      action: 'delete_category',
      resource: 'Category',
      resourceId: categoryId,
      details: { categoryId },
      severity: 'warning',
      user: { id: req.user?.userId || null, email: req.user?.email || null, role: req.user?.role || null },
      req,
    });
    
    res.json({ message: 'Category deleted successfully' });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Category not found' });
    }
    console.error('Error deleting category:', error);
    res.status(500).json({ error: 'Failed to delete category' });
  }
};

// Get all types for a category
export const getTypesByCategory = async (req, res) => {
  try {
    const { categoryId } = req.params;
    
    const types = await prisma.productType.findMany({
      where: {
        categoryId,
        isActive: true
      },
      orderBy: { name: 'asc' }
    });
    
    res.json(types);
  } catch (error) {
    console.error('Error fetching types:', error);
    res.status(500).json({ error: 'Failed to fetch types' });
  }
};

// Get all types
export const getAllTypes = async (req, res) => {
  try {
    const types = await prisma.productType.findMany({
      where: { isActive: true },
      include: { category: true },
      orderBy: { name: 'asc' }
    });
    
    res.json(types);
  } catch (error) {
    console.error('Error fetching types:', error);
    res.status(500).json({ error: 'Failed to fetch types' });
  }
};

// Create new type
export const createType = async (req, res) => {
  try {
    const { name, categoryId, description } = req.body;
    
    if (!name || !categoryId) {
      return res.status(400).json({ error: 'Name and categoryId are required' });
    }
    
    // Verify category exists
    const category = await prisma.productCategory.findUnique({
      where: { id: categoryId }
    });
    
    if (!category) {
      return res.status(404).json({ error: 'Category not found' });
    }
    
    // Check for duplicate type in category
    const existingType = await prisma.productType.findUnique({
      where: { name_categoryId: { name, categoryId } }
    });
    
    if (existingType) {
      return res.status(409).json({ error: 'Type with this name already exists in this category' });
    }
    
    const type = await prisma.productType.create({
      data: {
        name,
        categoryId,
        description: description || null
      },
      include: { category: true }
    });

    // Audit: type created
    await appendAuditLog({
      action: 'create_type',
      resource: 'Type',
      resourceId: type.id,
      details: { name, categoryId, categoryName: type.category?.name },
      user: { id: req.user?.userId || null, email: req.user?.email || null, role: req.user?.role || null },
      req,
    });
    
    res.status(201).json(type);
  } catch (error) {
    console.error('Error creating type:', error);
    res.status(500).json({ error: 'Failed to create type' });
  }
};

// Update type
export const updateType = async (req, res) => {
  try {
    const { typeId } = req.params;
    const { name, description, isActive } = req.body;
    
    const data = {};
    if (name !== undefined) data.name = name;
    if (description !== undefined) data.description = description || null;
    if (isActive !== undefined) data.isActive = isActive;

    const type = await prisma.productType.update({
      where: { id: typeId },
      data,
      include: { category: true }
    });

    // Audit: type updated
    await appendAuditLog({
      action: 'update_type',
      resource: 'Type',
      resourceId: typeId,
      details: { updatedFields: Object.keys(data), typeName: type.name },
      user: { id: req.user?.userId || null, email: req.user?.email || null, role: req.user?.role || null },
      req,
    });
    
    res.json(type);
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Type not found' });
    }
    console.error('Error updating type:', error);
    res.status(500).json({ error: 'Failed to update type' });
  }
};

// Delete type
export const deleteType = async (req, res) => {
  try {
    const { typeId } = req.params;
    
    // Check if type has products
    const productCount = await prisma.product.count({
      where: { typeId }
    });
    
    if (productCount > 0) {
      return res.status(409).json({ 
        error: 'Cannot delete type with existing products. Please reassign or delete products first.' 
      });
    }
    
    await prisma.productType.delete({
      where: { id: typeId }
    });

    // Audit: type deleted
    await appendAuditLog({
      action: 'delete_type',
      resource: 'Type',
      resourceId: typeId,
      details: { typeId },
      severity: 'warning',
      user: { id: req.user?.userId || null, email: req.user?.email || null, role: req.user?.role || null },
      req,
    });
    
    res.json({ message: 'Type deleted successfully' });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Type not found' });
    }
    console.error('Error deleting type:', error);
    res.status(500).json({ error: 'Failed to delete type' });
  }
};
