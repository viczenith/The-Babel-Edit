'use client';

import React, { useState, useEffect } from 'react';
import { Product } from '@/app/store/types';
import Button from '@/app/components/ui/Button/Button';
import { apiRequest, API_ENDPOINTS } from '@/app/lib/api';
import { toast } from 'react-hot-toast';
import { Upload, X, ChevronDown, Link2 } from 'lucide-react';
import { useProductCategories } from '@/app/hooks/useProductCategories';

interface ProductFormProps {
  product: Partial<Product>;
  onSubmit: (productData: Partial<Product>) => void;
  preselectedCategory?: string;
  onCancel?: () => void;
}

// Collections removed from Product form to keep product creation focused on Category (page)
interface FormState {
  name: string;
  description: string;
  price: number | string;
  comparePrice: number | string;
  imageUrl?: string;
  images: string[];
  stock: number | string;
  sku?: string;
  category: string;
  type?: string;
  sizes: string[];
  colors: string[];
  tags: string[];
  weight: number | string;
  dimensions: string;
  isFeatured: boolean;
  isActive: boolean;
}

interface FormErrors {
  [key: string]: string;
}

// Helper functions to normalize data types
const ensureArray = (value: any): string[] => {
  if (Array.isArray(value)) return value;
  if (typeof value === 'string' && value.trim()) {
    return value.split(',').map(s => s.trim()).filter(s => s);
  }
  return [];
};

const ensureString = (value: any): string => {
  if (typeof value === 'string') return value;
  if (value && typeof value === 'object') {
    if ('slug' in value) return value.slug;
    if ('id' in value) return value.id;
  }
  return '';
};

const ProductForm: React.FC<ProductFormProps> = ({ product, onSubmit, preselectedCategory, onCancel }) => {
  // Fetch categories dynamically from API instead of hardcoded array
  const { categories: dynamicCategories, loading: categoriesLoading } = useProductCategories();
  const [formData, setFormData] = useState<FormState>({
    name: product?.name || '',
    description: product?.description || '',
    price: product?.price ?? 0,
    comparePrice: product?.comparePrice ?? 0,
    imageUrl: product?.imageUrl,
    images: Array.isArray(product?.images) ? product.images : [],
    stock: product?.stock ?? 0,
    sku: product?.sku || '',
    category: ensureString(product?.category) || preselectedCategory || '',
    type: ensureString(product?.type),
    sizes: ensureArray(product?.sizes),
    colors: ensureArray(product?.colors),
    tags: ensureArray(product?.tags),
    weight: product?.weight ?? 0,
    dimensions: product?.dimensions || '',
    isFeatured: product?.isFeatured ?? false,
    isActive: product?.isActive ?? true,
  });

  // Sync preselectedCategory into formData when it changes (e.g. modal reopened with different category)
  useEffect(() => {
    if (preselectedCategory && formData.category !== preselectedCategory) {
      setFormData(prev => ({ ...prev, category: preselectedCategory }));
    }
  }, [preselectedCategory]);

  const [previewImages, setPreviewImages] = useState<string[]>(
    Array.isArray(product?.images) ? product.images : []
  );
  const [dragActive, setDragActive] = useState(false);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [imageUrlInput, setImageUrlInput] = useState('');
  const [errors, setErrors] = useState<FormErrors>({});
  const [availableTypes, setAvailableTypes] = useState<any[]>([]);

  // Raw text states for comma-separated fields so typing commas isn't eaten
  const [sizesInput, setSizesInput] = useState(
    Array.isArray(product?.sizes) ? product.sizes.join(', ') : ''
  );
  const [colorsInput, setColorsInput] = useState(
    Array.isArray(product?.colors) ? product.colors.join(', ') : ''
  );
  const [tagsInput, setTagsInput] = useState(
    Array.isArray(product?.tags) ? product.tags.join(', ') : ''
  );

  // Update available types when category changes or categories load
  useEffect(() => {
    const selectedCategory = dynamicCategories.find(cat => cat.slug === formData.category);
    
    if (selectedCategory) {
      // Ensure types array exists and set it
      const types = selectedCategory.types || [];
      setAvailableTypes(types);
      
      // If current type is not in the new category's types, reset it
      if (formData.type && !types.find(t => t.id === formData.type)) {
        setFormData(prev => ({ ...prev, type: '' }));
      }
    } else {
      setAvailableTypes([]);
      // Only reset formData type if we have categories loaded but category not found
      if (dynamicCategories.length > 0) {
        setFormData(prev => ({ ...prev, type: '' }));
      }
    }
  }, [formData.category, dynamicCategories]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    await processImageFiles(files);
  };

  const handleDrag = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    const files = e.dataTransfer.files;
    if (!files || files.length === 0) return;
    await processImageFiles(files);
  };

  const processImageFiles = async (files: FileList) => {

    // Validate file count
    if (files.length + previewImages.length > 5) {
      toast.error('Maximum 5 images allowed');
      return;
    }

    setUploadingImages(true);
    const uploadedUrls: string[] = [];

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];

        // Validate file size (5MB)
        if (file.size > 5 * 1024 * 1024) {
          toast.error(`${file.name} is too large. Maximum size is 5MB`);
          continue;
        }

        // Validate file type
        if (!['image/jpeg', 'image/jpg', 'image/png'].includes(file.type)) {
          toast.error(`${file.name} is not a valid image format`);
          continue;
        }

        const formData = new FormData();
        formData.append('image', file);

        try {
          const response = await apiRequest<{ imageUrl: string }>(
            API_ENDPOINTS.PRODUCTS.ADMIN.UPLOAD_IMAGE,
            {
              method: 'POST',
              body: formData,
              requireAuth: true,
              isFormData: true
            }
          );

          if (!response?.imageUrl) {
            throw new Error('No image URL in response');
          }
          uploadedUrls.push(response.imageUrl);
        } catch (error: any) {
          const errorMsg = error?.message || 'Upload failed';
          if (errorMsg.includes('fetch') || errorMsg.includes('network')) {
            toast.error('Backend server not running. Please start the backend.');
          } else {
            toast.error(`Failed to upload ${file.name}: ${errorMsg}`);
          }
          console.error('Upload error:', error);
        }
      }

      if (uploadedUrls.length > 0) {
        const newImages = [...previewImages, ...uploadedUrls];
        setPreviewImages(newImages);
        setFormData(prev => ({
          ...prev,
          images: newImages
        }));
        toast.success(`${uploadedUrls.length} image(s) uploaded successfully`);
      }
    } catch (error) {
      toast.error('Failed to upload images');
      console.error('Error uploading images:', error);
    } finally {
      setUploadingImages(false);
    }
  };

  const handleAddImageUrl = () => {
    const url = imageUrlInput.trim();
    if (!url) return;

    // Basic URL validation
    try {
      new URL(url);
    } catch {
      toast.error('Please enter a valid URL');
      return;
    }

    if (previewImages.length >= 5) {
      toast.error('Maximum 5 images allowed');
      return;
    }

    const newImages = [...previewImages, url];
    setPreviewImages(newImages);
    setFormData(prev => ({ ...prev, images: newImages }));
    setImageUrlInput('');
    toast.success('Image URL added');
  };

  const handleRemoveImage = (index: number) => {
    const newImages = previewImages.filter((_, i) => i !== index);
    setPreviewImages(newImages);
    setFormData(prev => ({
      ...prev,
      images: newImages
    }));
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: ['price', 'comparePrice', 'weight'].includes(name)
        ? parseFloat(value) || 0
        : ['stock'].includes(name)
          ? parseInt(value) || 0
          : value,
    }));
    setErrors((prev) => ({ ...prev, [name]: '' }));
  };

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: checked,
    }));
  };

  /** Parse a raw comma-separated string into a clean array (no empties) */
  const parseCommaSeparated = (raw: string): string[] =>
    raw.split(',').map(s => s.trim()).filter(Boolean);

  /** Sync a raw text field into formData on blur */
  const syncArrayField = (field: 'sizes' | 'colors' | 'tags', raw: string) => {
    const parsed = parseCommaSeparated(raw);
    setFormData(prev => ({ ...prev, [field]: parsed }));
    setErrors(prev => ({ ...prev, [field]: '' }));
  };

  const validateForm = (): boolean => {
    const newErrors: { [key: string]: string } = {};
    const price = typeof formData.price === 'string' ? parseFloat(formData.price) : formData.price;

    if (!formData.name?.trim()) newErrors.name = 'Product name is required';
    if (!formData.description?.trim()) newErrors.description = 'Description is required';
    if (!price || price <= 0) newErrors.price = 'Price must be greater than 0';
    // collectionId is optional for product pages; category determines page visibility
    if (!previewImages.length) newErrors.images = 'At least one image is required';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    // Resolve category slug to categoryId
    const selectedCategory = dynamicCategories.find(cat => cat.slug === formData.category);
    const categoryId = selectedCategory?.id;

    if (!categoryId) {
      toast.error('Invalid category selected');
      return;
    }

    const submitData: Partial<Product> = {
      name: formData.name?.trim(),
      description: formData.description?.trim(),
      price: typeof formData.price === 'string' ? parseFloat(formData.price) : formData.price,
      comparePrice: typeof formData.comparePrice === 'string' ? parseFloat(formData.comparePrice) : formData.comparePrice,
      images: previewImages,
      stock: typeof formData.stock === 'string' ? parseInt(String(formData.stock)) : formData.stock,
      sizes: parseCommaSeparated(sizesInput),
      colors: parseCommaSeparated(colorsInput),
      tags: parseCommaSeparated(tagsInput),
      weight: typeof formData.weight === 'string' ? parseFloat(formData.weight) : formData.weight,
      dimensions: formData.dimensions,
      isFeatured: formData.isFeatured,
      isActive: formData.isActive,
      categoryId: categoryId,
      typeId: formData.type || undefined,
      category: formData.category,
      type: formData.type || undefined,
      sku: formData.sku,
    };

    onSubmit(submitData);
  };

  const handleCancel = () => {
    setFormData({
      name: product.name || '',
      description: product.description || '',
      price: product.price || 0,
      comparePrice: product.comparePrice || 0,
      images: Array.isArray(product.images) ? product.images : [],
      stock: product.stock ?? 0,
      sizes: ensureArray(product.sizes),
      colors: ensureArray(product.colors),
      tags: ensureArray(product.tags),
      weight: product.weight || 0,
      dimensions: product.dimensions || '',
      isActive: product.isActive ?? true,
      isFeatured: product.isFeatured ?? false,
      category: ensureString(product.category) || preselectedCategory || '',
      type: ensureString(product.type),
    });
    setPreviewImages(Array.isArray(product.images) ? product.images : []);
    setSizesInput(ensureArray(product.sizes).join(', '));
    setColorsInput(ensureArray(product.colors).join(', '));
    setTagsInput(ensureArray(product.tags).join(', '));
    setErrors({});
    if (onCancel) {
      onCancel();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* ─── Basic Information ─────────────────────────────────────── */}
      <section className="space-y-4">
        <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider flex items-center gap-2">
          <span className="w-1.5 h-1.5 bg-blue-600 rounded-full" />
          Basic Information
        </h3>

        <div>
          <label htmlFor="product-name" className="block text-sm font-medium text-gray-700 mb-1.5">
            Product Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            name="name"
            id="product-name"
            value={formData.name || ''}
            onChange={handleChange}
            className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
            placeholder="Enter product name"
            required
          />
          {errors.name && <p className="text-xs text-red-500 mt-1.5">{errors.name}</p>}
        </div>

        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1.5">
            Description <span className="text-red-500">*</span>
          </label>
          <textarea
            id="description"
            name="description"
            rows={3}
            value={formData.description || ''}
            onChange={handleChange}
            className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition resize-none"
            placeholder="Enter product description"
            required
          />
          {errors.description && <p className="text-xs text-red-500 mt-1.5">{errors.description}</p>}
        </div>
      </section>

      <hr className="border-gray-100" />

      {/* ─── Classification ────────────────────────────────────────── */}
      <section className="space-y-4">
        <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider flex items-center gap-2">
          <span className="w-1.5 h-1.5 bg-blue-600 rounded-full" />
          Classification
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Category Dropdown */}
          <div>
            <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1.5">
              Product Page / Category
            </label>
            <div className="relative">
              <select
                name="category"
                id="category"
                value={formData.category || dynamicCategories[0]?.slug || ''}
                onChange={handleChange}
                className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition cursor-pointer bg-white bg-none disabled:opacity-50 disabled:cursor-not-allowed pr-9"
                required
                disabled={categoriesLoading || dynamicCategories.length === 0}
              >
                {categoriesLoading ? (
                  <option>Loading categories...</option>
                ) : dynamicCategories.length === 0 ? (
                  <option>No categories available</option>
                ) : (
                  dynamicCategories.map((cat) => (
                    <option key={cat.id} value={cat.slug}>
                      {cat.icon} {cat.name} Page
                    </option>
                  ))
                )}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
            </div>
            <p className="text-xs text-gray-400 mt-1.5">
              Appears on the <strong>{dynamicCategories.find(c => c.slug === formData.category)?.name || 'selected'}</strong> page
            </p>
          </div>

          {/* Type Dropdown */}
          <div>
            <label htmlFor="type" className="block text-sm font-medium text-gray-700 mb-1.5">
              Product Type
            </label>
            <div className="relative">
              <select
                name="type"
                id="type"
                value={formData.type || ''}
                onChange={handleChange}
                className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition cursor-pointer bg-white bg-none disabled:opacity-50 disabled:cursor-not-allowed pr-9"
              >
                <option value="">Select a type...</option>
                {availableTypes.map((type) => (
                  <option key={type.id} value={type.id}>
                    {type.name}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
            </div>
            <p className="text-xs text-gray-400 mt-1.5">
              {availableTypes.length === 0
                ? 'Select a category first'
                : `${availableTypes.length} type(s) available`}
            </p>
          </div>
        </div>
      </section>

      <hr className="border-gray-100" />

      {/* ─── Product Images ────────────────────────────────────────── */}
      <section className="space-y-4">
        <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider flex items-center gap-2">
          <span className="w-1.5 h-1.5 bg-blue-600 rounded-full" />
          Product Images <span className="text-red-500 text-xs font-normal normal-case">*</span>
        </h3>

        {/* Image Previews */}
        {previewImages.length > 0 && (
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
            {previewImages.map((url, index) => (
              <div key={index} className="relative group aspect-square">
                <img
                  src={url}
                  alt={`Product ${index + 1}`}
                  className="w-full h-full object-cover rounded-lg border border-gray-200"
                />
                <button
                  type="button"
                  onClick={() => handleRemoveImage(index)}
                  className="absolute top-1.5 right-1.5 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
                {index === 0 && (
                  <span className="absolute bottom-1.5 left-1.5 bg-blue-600 text-white text-[10px] font-medium px-1.5 py-0.5 rounded">
                    Main
                  </span>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Upload Drop Zone */}
        <div
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          className={`relative flex flex-col items-center justify-center w-full rounded-xl border-2 border-dashed transition-all cursor-pointer ${
            dragActive
              ? 'border-blue-500 bg-blue-50 scale-[1.01]'
              : uploadingImages
              ? 'border-gray-200 bg-gray-50 cursor-not-allowed'
              : 'border-gray-300 bg-gray-50 hover:border-blue-400 hover:bg-blue-50/50'
          }`}
        >
          <label htmlFor="image-upload" className="flex flex-col items-center justify-center w-full py-8 px-4 cursor-pointer">
            {uploadingImages ? (
              <>
                <div className="animate-spin rounded-full h-8 w-8 border-[3px] border-gray-200 border-t-blue-600 mb-3" />
                <p className="text-sm font-medium text-gray-700">Uploading...</p>
                <p className="text-xs text-gray-400 mt-1">Please wait</p>
              </>
            ) : (
              <>
                <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center mb-3">
                  <Upload className="w-5 h-5 text-blue-600" />
                </div>
                <p className="text-sm font-medium text-gray-700">
                  Drop images here or <span className="text-blue-600">browse</span>
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  PNG, JPG or JPEG &bull; Max 5MB &bull; Up to 5 images
                </p>
              </>
            )}
            <input
              id="image-upload"
              type="file"
              className="hidden"
              multiple
              accept="image/jpeg,image/jpg,image/png"
              onChange={handleImageUpload}
              disabled={uploadingImages || previewImages.length >= 5}
            />
          </label>
        </div>
        {/* Or paste image URL */}
        <div>
          <label className="text-xs text-gray-500 mb-1.5 flex items-center gap-1.5">
            <Link2 className="w-3.5 h-3.5" />
            Or paste image URL:
          </label>
          <div className="flex gap-2">
            <input
              type="url"
              placeholder="https://example.com/image.jpg"
              value={imageUrlInput}
              onChange={(e) => setImageUrlInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddImageUrl(); } }}
              disabled={uploadingImages || previewImages.length >= 5}
              className="flex-1 px-3.5 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition disabled:opacity-50 disabled:cursor-not-allowed"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleAddImageUrl}
              disabled={!imageUrlInput.trim() || uploadingImages || previewImages.length >= 5}
            >
              Add
            </Button>
          </div>
        </div>

        {errors.images && <p className="text-xs text-red-500">{errors.images}</p>}
        <p className="text-xs text-gray-400">{previewImages.length}/5 images uploaded</p>
      </section>

      <hr className="border-gray-100" />

      {/* ─── Pricing & Inventory ───────────────────────────────────── */}
      <section className="space-y-4">
        <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider flex items-center gap-2">
          <span className="w-1.5 h-1.5 bg-blue-600 rounded-full" />
          Pricing &amp; Inventory
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Price */}
          <div>
            <label htmlFor="price" className="block text-sm font-medium text-gray-700 mb-1.5">
              Price <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
              <input
                type="number"
                name="price"
                id="price"
                value={formData.price || ''}
                onChange={handleChange}
                step="0.01"
                min="0"
                className="w-full pl-8 pr-3.5 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                placeholder="0.00"
                required
              />
            </div>
            {errors.price && <p className="text-xs text-red-500 mt-1.5">{errors.price}</p>}
          </div>

          {/* Compare Price */}
          <div>
            <label htmlFor="comparePrice" className="block text-sm font-medium text-gray-700 mb-1.5">
              Compare Price
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
              <input
                type="number"
                name="comparePrice"
                id="comparePrice"
                value={formData.comparePrice || ''}
                onChange={handleChange}
                step="0.01"
                min="0"
                className="w-full pl-8 pr-3.5 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                placeholder="0.00"
              />
            </div>
            <p className="text-xs text-gray-400 mt-1.5">Original price for discount</p>
          </div>

          {/* Stock */}
          <div>
            <label htmlFor="stock" className="block text-sm font-medium text-gray-700 mb-1.5">
              Stock Quantity
            </label>
            <input
              type="number"
              name="stock"
              id="stock"
              value={formData.stock || ''}
              onChange={handleChange}
              min="0"
              className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
              placeholder="0"
            />
          </div>
        </div>
      </section>

      <hr className="border-gray-100" />

      {/* ─── Variants & Details ────────────────────────────────────── */}
      <section className="space-y-4">
        <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider flex items-center gap-2">
          <span className="w-1.5 h-1.5 bg-blue-600 rounded-full" />
          Variants &amp; Details
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Sizes */}
          <div>
            <label htmlFor="sizes" className="block text-sm font-medium text-gray-700 mb-1.5">
              Available Sizes
            </label>
            <input
              type="text"
              name="sizes"
              id="sizes"
              value={sizesInput}
              onChange={(e) => setSizesInput(e.target.value)}
              onBlur={() => syncArrayField('sizes', sizesInput)}
              className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
              placeholder="XS, S, M, L, XL"
            />
            <p className="text-xs text-gray-400 mt-1.5">Comma-separated values</p>
          </div>

          {/* Colors */}
          <div>
            <label htmlFor="colors" className="block text-sm font-medium text-gray-700 mb-1.5">
              Available Colors
            </label>
            <input
              type="text"
              name="colors"
              id="colors"
              value={colorsInput}
              onChange={(e) => setColorsInput(e.target.value)}
              onBlur={() => syncArrayField('colors', colorsInput)}
              className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
              placeholder="Red, Blue, Black, White"
            />
            <p className="text-xs text-gray-400 mt-1.5">Comma-separated values</p>
          </div>
        </div>

        {/* Tags */}
        <div>
          <label htmlFor="tags" className="block text-sm font-medium text-gray-700 mb-1.5">
            Product Tags
          </label>
          <input
            type="text"
            name="tags"
            id="tags"
            value={tagsInput}
            onChange={(e) => setTagsInput(e.target.value)}
            onBlur={() => syncArrayField('tags', tagsInput)}
            className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
            placeholder="summer, casual, trending"
          />
          <p className="text-xs text-gray-400 mt-1.5">Tags help customers discover your product</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Weight */}
          <div>
            <label htmlFor="weight" className="block text-sm font-medium text-gray-700 mb-1.5">
              Weight (lbs)
            </label>
            <input
              type="number"
              name="weight"
              id="weight"
              value={formData.weight || ''}
              onChange={handleChange}
              step="0.01"
              min="0"
              className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
              placeholder="0.0"
            />
          </div>

          {/* Dimensions */}
          <div>
            <label htmlFor="dimensions" className="block text-sm font-medium text-gray-700 mb-1.5">
              Dimensions
            </label>
            <input
              type="text"
              name="dimensions"
              id="dimensions"
              value={formData.dimensions || ''}
              onChange={handleChange}
              className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
              placeholder="L × W × H"
            />
          </div>
        </div>
      </section>

      <hr className="border-gray-100" />

      {/* ─── Visibility ────────────────────────────────────────────── */}
      <section className="space-y-3">
        <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider flex items-center gap-2">
          <span className="w-1.5 h-1.5 bg-blue-600 rounded-full" />
          Visibility
        </h3>

        {/* Active Toggle */}
        <label htmlFor="isActive" className="flex items-center justify-between p-3.5 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors">
          <div>
            <p className="text-sm font-medium text-gray-900">Active Product</p>
            <p className="text-xs text-gray-400 mt-0.5">Visible to customers and available for purchase</p>
          </div>
          <div className="relative inline-flex items-center">
            <input
              type="checkbox"
              id="isActive"
              name="isActive"
              checked={formData.isActive ?? true}
              onChange={handleCheckboxChange}
              className="sr-only peer"
            />
            <div className="w-10 h-6 bg-gray-300 rounded-full peer-checked:bg-blue-600 transition-colors" />
            <div className="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-sm peer-checked:translate-x-4 transition-transform" />
          </div>
        </label>

        {/* Featured Toggle */}
        <label htmlFor="isFeatured" className="flex items-center justify-between p-3.5 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors">
          <div>
            <p className="text-sm font-medium text-gray-900">Featured Product</p>
            <p className="text-xs text-gray-400 mt-0.5">Display in featured sections and homepage</p>
          </div>
          <div className="relative inline-flex items-center">
            <input
              type="checkbox"
              id="isFeatured"
              name="isFeatured"
              checked={formData.isFeatured ?? false}
              onChange={handleCheckboxChange}
              className="sr-only peer"
            />
            <div className="w-10 h-6 bg-gray-300 rounded-full peer-checked:bg-blue-600 transition-colors" />
            <div className="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-sm peer-checked:translate-x-4 transition-transform" />
          </div>
        </label>
      </section>

      {/* ─── Actions ───────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 justify-end pt-4 border-t border-gray-100">
        <Button type="button" onClick={handleCancel} variant="ghost">
          Cancel
        </Button>
        <Button type="submit" variant="primary" disabled={uploadingImages}>
          {product.id ? 'Update Product' : 'Create Product'}
        </Button>
      </div>
    </form>
  );
};

export default ProductForm;