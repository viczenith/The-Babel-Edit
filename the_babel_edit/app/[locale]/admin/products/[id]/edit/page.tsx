'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft, Save } from 'lucide-react';
import { toast } from 'react-hot-toast';

import AdminProtectedRoute from '@/app/components/AdminProtectedRoute';
import Button from '@/app/components/ui/Button/Button';
import FormField from '@/app/components/ui/FormField/FormField';
import { apiRequest, API_ENDPOINTS } from '@/app/lib/api';
import { Product } from '@/app/store/types';
import { useProductCategories } from '@/app/hooks/useProductCategories';
import { useProductStore } from '@/app/store/useProductStore';
import { commonClasses } from '@/app/utils/designSystem';

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

const EditProductPage = () => {
  const router = useRouter();
  const params = useParams();
  const productId = params.id as string;
  const locale = params.locale as string || 'en';

  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const [product, setProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    comparePrice: '',
    imageUrl: '',
    images: [] as string[],
    stock: '',
    sku: '',
    category: '',
    sizes: '',
    colors: '',
    tags: '',
    weight: '',
    dimensions: '',
    isFeatured: false,
    isActive: true,
  });
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [apiError, setApiError] = useState<string>('');

  const { categories: dynamicCategories, loading: categoriesLoading } = useProductCategories();

  // Fetch product data
  useEffect(() => {
    if (productId) {
      fetchProduct();
    }
  }, [productId]);

  const fetchProduct = async () => {
    setIsFetching(true);
    try {
      const response = await apiRequest<Product>(
        API_ENDPOINTS.PRODUCTS.BY_ID(productId),
        { requireAuth: true }
      );

      setProduct(response);

      // Populate form with existing data
      setFormData({
        name: response.name || '',
        description: response.description || '',
        price: response.price?.toString() || '',
        comparePrice: response.comparePrice?.toString() || '',
        imageUrl: response.imageUrl || '',
        images: Array.isArray(response.images) ? response.images : [],
        stock: response.stock?.toString() || '',
        sku: response.sku || '',
        category: ensureString(response.category),
        sizes: ensureArray(response.sizes).join(', '),
        colors: ensureArray(response.colors).join(', '),
        tags: ensureArray(response.tags).join(', '),
        weight: response.weight?.toString() || '',
        dimensions: response.dimensions || '',
        isFeatured: response.isFeatured || false,
        isActive: response.isActive ?? true,
      }); 
    } catch (error) {
      toast.error('Failed to fetch product');
      console.error('Error fetching product:', error);
      router.push(`/${locale}/admin`);
    } finally {
      setIsFetching(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    try {
      const formData = new FormData();
      for (const file of Array.from(files)) {
        formData.append('images', file);
      }

      const response = await apiRequest<{ images: { url: string }[] }>(
        API_ENDPOINTS.PRODUCTS.ADMIN.UPLOAD_IMAGES, 
        {
          method: 'POST',
          body: formData,
          isFormData: true,
          requireAuth: true,
        }
      );

      if (response?.images) {
        const uploadedUrls = response.images.map(image => image.url);
        setFormData((prev) => ({
          ...prev,
          images: [...prev.images, ...uploadedUrls],
        }));
      }
    } catch (error) {
      console.error('Image upload failed:', error);
      toast.error('Image upload failed. Please try again.');
    }
  };


  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;

    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));

    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
    // Clear API error when user makes changes
    if (apiError) {
      setApiError('');
    }
  };

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {};

    if (!formData.name.trim()) newErrors.name = 'Product name is required';
    if (!formData.description.trim()) newErrors.description = 'Description is required';
    if (!formData.price || parseFloat(formData.price) <= 0) newErrors.price = 'Valid price is required';
    if (!formData.imageUrl.trim()) newErrors.imageUrl = 'Main image URL is required';
    if (formData.comparePrice && parseFloat(formData.comparePrice) <= parseFloat(formData.price)) {
      newErrors.comparePrice = 'Compare price must be higher than the regular price';
    }
    if (formData.stock && parseInt(formData.stock) < 0) {
      newErrors.stock = 'Stock quantity cannot be negative';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsLoading(true);
    try {
      // Resolve category slug to categoryId
      const selectedCat = dynamicCategories.find(cat => cat.slug === (formData as any).category);

      // Process form data
      const productData: Partial<Product> = {
        name: formData.name,
        description: formData.description,
        price: parseFloat(formData.price),
        comparePrice: formData.comparePrice ? parseFloat(formData.comparePrice) : undefined,
        imageUrl: formData.imageUrl,
        images: formData.images.length > 0 ? formData.images : [formData.imageUrl],
        stock: parseInt(formData.stock) || 0,
        sku: formData.sku || undefined,
        categoryId: selectedCat?.id,
        category: (formData as any).category,
        sizes: formData.sizes ? formData.sizes.split(',').map(s => s.trim()).filter(s => s) : [],
        colors: formData.colors ? formData.colors.split(',').map(c => c.trim()).filter(c => c) : [],
        tags: formData.tags ? formData.tags.split(',').map(t => t.trim()).filter(t => t) : [],
        weight: formData.weight ? parseFloat(formData.weight) : undefined,
        dimensions: formData.dimensions || undefined,
        isFeatured: formData.isFeatured,
        isActive: formData.isActive,
      };

      await apiRequest(API_ENDPOINTS.PRODUCTS.ADMIN.UPDATE(productId), {
        method: 'PUT',
        body: productData,
        requireAuth: true,
      });

      toast.success('Product updated successfully!');
      
      // Invalidate featured products cache so dashboard reflects changes
      try { localStorage.removeItem('babel_edit_products_featured'); } catch (_) {}
      
      router.push(`/${locale}/admin`);
    } catch (error: any) {
      console.error('Error updating product:', error);

      // Handle specific API errors
      if (error.status === 400) {
        setApiError(error.message || 'Invalid product data. Please check your inputs.');
        toast.error('Please fix the validation errors and try again.');
      } else if (error.status === 401) {
        setApiError('You are not authorized to update products.');
        toast.error('Authorization error');
      } else if (error.status === 409) {
        setApiError('A product with this SKU already exists.');
        toast.error('Duplicate SKU');
      } else {
        setApiError(error.message || 'Failed to update product. Please try again.');
        toast.error('Failed to update product');
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (isFetching) {
    return (
      <AdminProtectedRoute>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading product...</p>
          </div>
        </div>
      </AdminProtectedRoute>
    );
  }

  if (!product) {
    return (
      <AdminProtectedRoute>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <p className="text-gray-600">Product not found</p>
            <Button onClick={() => router.push(`/${locale}/admin`)} className="mt-4">
              Back to Admin
            </Button>
          </div>
        </div>
      </AdminProtectedRoute>
    );
  }

  return (
    <AdminProtectedRoute>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white shadow">
          <div className={commonClasses.container}>
            <div className="py-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <Button
                    onClick={() => router.back()}
                    variant="ghost"
                    leftIcon={<ArrowLeft className="h-4 w-4" />}
                  >
                    Back
                  </Button>
                  <div>
                    <h1 className="text-2xl font-semibold text-gray-900">Edit Product</h1>
                    <p className="text-sm text-gray-600">Update product information</p>
                  </div>
                </div>
                <Button
                  type="submit"
                  form="edit-product-form"
                  isLoading={isLoading}
                  leftIcon={<Save className="h-4 w-4" />}
                >
                  Save Changes
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className={commonClasses.container}>
          <div className="py-8">
            {/* Display API Error */}
            {apiError && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
                <div className="flex">
                  <div className="text-sm text-red-700">
                    <p className="font-medium">Error updating product:</p>
                    <p>{apiError}</p>
                  </div>
                </div>
              </div>
            )}

            <form id="edit-product-form" onSubmit={handleSubmit} className="space-y-8">
              {/* Basic Information */}
              <div className={commonClasses.card}>
                <h2 className="text-lg font-medium text-gray-900 mb-6">Basic Information</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    label="Product Name"
                    id="name"
                    required
                    error={errors.name}
                    className="md:col-span-2"
                  >
                    <input
                      type="text"
                      id="name"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      className={commonClasses.input}
                      placeholder="Enter product name"
                    />
                  </FormField>

                  <FormField
                    label="Description"
                    id="description"
                    required
                    error={errors.description}
                    className="md:col-span-2"
                  >
                    <textarea
                      id="description"
                      name="description"
                      rows={4}
                      value={formData.description}
                      onChange={handleChange}
                      className={commonClasses.input}
                      placeholder="Enter product description"
                    />
                  </FormField>

                  <FormField
                    label="SKU"
                    id="sku"
                    helperText="Stock Keeping Unit for inventory"
                  >
                    <input
                      type="text"
                      id="sku"
                      name="sku"
                      value={formData.sku}
                      onChange={handleChange}
                      className={commonClasses.input}
                      placeholder="e.g., SHIRT-001"
                    />
                  </FormField>

                  <FormField
                    label="Product Page/Category"
                    id="category"
                    required
                    helperText="Select which page this product should appear on"
                  >
                    <select
                      id="category"
                      name="category"
                      value={(formData as any).category}
                      onChange={handleChange}
                      className={commonClasses.input}
                      disabled={categoriesLoading || dynamicCategories.length === 0}
                    >
                      {categoriesLoading && <option>Loading categories...</option>}
                      {!categoriesLoading && dynamicCategories.length === 0 && (
                        <>
                          <option value="clothes">Clothes Page</option>
                          <option value="bags">Bags Page</option>
                          <option value="shoes">Shoes Page</option>
                          <option value="accessories">Accessories Page</option>
                        </>
                      )}
                      {!categoriesLoading && dynamicCategories.map(cat => (
                        <option key={cat.id} value={cat.slug}>{cat.name} Page</option>
                      ))}
                    </select>
                  </FormField>
                </div>
              </div>

              {/* Pricing */}
              <div className={commonClasses.card}>
                <h2 className="text-lg font-medium text-gray-900 mb-6">Pricing</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    label="Price"
                    id="price"
                    required
                    error={errors.price}
                  >
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">$</span>
                      <input
                        type="number"
                        id="price"
                        name="price"
                        step="0.01"
                        min="0"
                        value={formData.price}
                        onChange={handleChange}
                        className={`${commonClasses.input} pl-8`}
                        placeholder="0.00"
                      />
                    </div>
                  </FormField>

                  <FormField
                    label="Compare Price"
                    id="comparePrice"
                    helperText="Original price for discount display"
                    error={errors.comparePrice}
                  >
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">$</span>
                      <input
                        type="number"
                        id="comparePrice"
                        name="comparePrice"
                        step="0.01"
                        min="0"
                        value={formData.comparePrice}
                        onChange={handleChange}
                        className={`${commonClasses.input} pl-8`}
                        placeholder="0.00"
                      />
                    </div>
                  </FormField>
                </div>
              </div>

              {/* Images */}
              {/* Images */}
              <div className={commonClasses.card}>
                <h2 className="text-lg font-medium text-gray-900 mb-6">Images</h2>
                <div className="space-y-6">
                  <FormField
                    label="Main Image URL"
                    id="imageUrl"
                    required
                    error={errors.imageUrl}
                  >
                    <input
                      type="url"
                      id="imageUrl"
                      name="imageUrl"
                      value={formData.imageUrl}
                      onChange={handleChange}
                      className={commonClasses.input}
                      placeholder="https://example.com/image.jpg"
                    />
                  </FormField>

                  <FormField label="Additional Images" id="images">
                    <input
                      type="file"
                      id="images"
                      name="images"
                      multiple
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="block w-full text-sm text-gray-500 border border-gray-300 rounded-md cursor-pointer focus:outline-none"
                    />

                    {/* Preview */}
                    {formData.images.length > 0 && (
                      <div className="mt-4 flex flex-wrap gap-3">
                        {formData.images.map((img, index) => (
                          <div key={index} className="relative">
                            <img
                              src={img}
                              alt={`Uploaded ${index + 1}`}
                              className="w-20 h-20 object-cover rounded-lg border"
                            />
                            <button
                              type="button"
                              onClick={() =>
                                setFormData((prev) => ({
                                  ...prev,
                                  images: prev.images.filter((_, i) => i !== index),
                                }))
                              }
                              className="absolute top-1 right-1 bg-white rounded-full p-1 shadow hover:bg-gray-100"
                            >
                              ✕
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </FormField>
                </div>
              </div>

              {/* Inventory */}
              <div className={commonClasses.card}>
                <h2 className="text-lg font-medium text-gray-900 mb-6">Inventory & Shipping</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <FormField
                    label="Stock Quantity"
                    id="stock"
                    error={errors.stock}
                  >
                    <input
                      type="number"
                      id="stock"
                      name="stock"
                      min="0"
                      value={formData.stock}
                      onChange={handleChange}
                      className={commonClasses.input}
                      placeholder="0"
                    />
                  </FormField>

                  <FormField
                    label="Weight (kg)"
                    id="weight"
                  >
                    <input
                      type="number"
                      id="weight"
                      name="weight"
                      step="0.1"
                      min="0"
                      value={formData.weight}
                      onChange={handleChange}
                      className={commonClasses.input}
                      placeholder="0.5"
                    />
                  </FormField>

                  <FormField
                    label="Dimensions"
                    id="dimensions"
                    helperText="L x W x H in cm"
                  >
                    <input
                      type="text"
                      id="dimensions"
                      name="dimensions"
                      value={formData.dimensions}
                      onChange={handleChange}
                      className={commonClasses.input}
                      placeholder="20 x 15 x 5"
                    />
                  </FormField>
                </div>
              </div>

              {/* Variants */}
              <div className={commonClasses.card}>
                <h2 className="text-lg font-medium text-gray-900 mb-6">Product Variants</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    label="Sizes"
                    id="sizes"
                    helperText="Comma-separated sizes (e.g., S, M, L, XL)"
                  >
                    <input
                      type="text"
                      id="sizes"
                      name="sizes"
                      value={formData.sizes}
                      onChange={handleChange}
                      className={commonClasses.input}
                      placeholder="S, M, L, XL"
                    />
                  </FormField>

                  <FormField
                    label="Colors"
                    id="colors"
                    helperText="Comma-separated colors"
                  >
                    <input
                      type="text"
                      id="colors"
                      name="colors"
                      value={formData.colors}
                      onChange={handleChange}
                      className={commonClasses.input}
                      placeholder="Red, Blue, Green"
                    />
                  </FormField>

                  <FormField
                    label="Tags"
                    id="tags"
                    helperText="Comma-separated tags for search"
                    className="md:col-span-2"
                  >
                    <input
                      type="text"
                      id="tags"
                      name="tags"
                      value={formData.tags}
                      onChange={handleChange}
                      className={commonClasses.input}
                      placeholder="summer, casual, cotton"
                    />
                  </FormField>
                </div>
              </div>

              {/* Settings */}
              <div className={commonClasses.card}>
                <h2 className="text-lg font-medium text-gray-900 mb-6">Product Settings</h2>
                <div className="space-y-4">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="isFeatured"
                      name="isFeatured"
                      checked={formData.isFeatured}
                      onChange={handleChange}
                      className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <label htmlFor="isFeatured" className="ml-2 text-sm text-gray-700">
                      Featured Product
                    </label>
                  </div>

                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="isActive"
                      name="isActive"
                      checked={formData.isActive}
                      onChange={handleChange}
                      className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <label htmlFor="isActive" className="ml-2 text-sm text-gray-700">
                      Active (visible to customers)
                    </label>
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <div className="flex justify-end space-x-4">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => router.back()}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  isLoading={isLoading}
                  leftIcon={<Save className="h-4 w-4" />}
                >
                  Save Changes
                </Button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </AdminProtectedRoute>
  );
};

export default EditProductPage;
