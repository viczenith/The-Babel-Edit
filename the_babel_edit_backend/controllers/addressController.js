import prisma from '../prismaClient.js';
import { appendAuditLog } from './adminController.js';

// Get user's addresses
export const getUserAddresses = async (req, res) => {
  try {
    const userId = req.user.userId;

    const addresses = await prisma.address.findMany({
      where: { userId },
      orderBy: [
        { isDefault: 'desc' },
        { createdAt: 'desc' }
      ]
    });

    res.json({ addresses });

  } catch (error) {
    console.error('Get addresses error:', error);
    res.status(500).json({ message: 'Failed to fetch addresses' });
  }
};

// Get specific address
export const getAddress = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { addressId } = req.params;

    const address = await prisma.address.findFirst({
      where: { 
        id: addressId,
        userId 
      }
    });

    if (!address) {
      return res.status(404).json({ message: 'Address not found' });
    }

    res.json({ address });

  } catch (error) {
    console.error('Get address error:', error);
    res.status(500).json({ message: 'Failed to fetch address' });
  }
};

// Create new address
export const createAddress = async (req, res) => {
  try {
    const userId = req.user.userId;
    const {
      firstName,
      lastName,
      company,
      address1,
      address2,
      city,
      state,
      postalCode,
      country,
      phone,
      isDefault = false
    } = req.body;

    // Validate required fields
    if (!firstName || !lastName || !address1 || !city || !state || !postalCode || !country) {
      return res.status(400).json({ 
        message: 'Required fields: firstName, lastName, address1, city, state, postalCode, country' 
      });
    }

    // If this is set as default, unset all other default addresses
    if (isDefault) {
      await prisma.address.updateMany({
        where: { userId },
        data: { isDefault: false }
      });
    }

    // If this is the user's first address, make it default
    const addressCount = await prisma.address.count({
      where: { userId }
    });
    
    const shouldBeDefault = isDefault || addressCount === 0;

    const address = await prisma.address.create({
      data: {
        userId,
        firstName,
        lastName,
        company,
        address1,
        address2,
        city,
        state,
        postalCode,
        country,
        phone,
        isDefault: shouldBeDefault
      }
    });

    await appendAuditLog({
      action: 'create_address', resource: 'Address', resourceId: address.id,
      details: { addressId: address.id, city, country, userId },
      user: { id: userId || null, email: req.user?.email || null, role: req.user?.role || null }, req,
    });

    res.status(201).json({
      message: 'Address created successfully',
      address
    });

  } catch (error) {
    console.error('Create address error:', error);
    res.status(500).json({ message: 'Failed to create address' });
  }
};

// Update address
export const updateAddress = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { addressId } = req.params;
    const {
      firstName,
      lastName,
      company,
      address1,
      address2,
      city,
      state,
      postalCode,
      country,
      phone,
      isDefault
    } = req.body;

    // Check if address exists and belongs to user
    const existingAddress = await prisma.address.findFirst({
      where: { 
        id: addressId,
        userId 
      }
    });

    if (!existingAddress) {
      return res.status(404).json({ message: 'Address not found' });
    }

    // If setting as default, unset all other default addresses
    if (isDefault && !existingAddress.isDefault) {
      await prisma.address.updateMany({
        where: { userId },
        data: { isDefault: false }
      });
    }

    const updateData = {};
    if (firstName !== undefined) updateData.firstName = firstName;
    if (lastName !== undefined) updateData.lastName = lastName;
    if (company !== undefined) updateData.company = company;
    if (address1 !== undefined) updateData.address1 = address1;
    if (address2 !== undefined) updateData.address2 = address2;
    if (city !== undefined) updateData.city = city;
    if (state !== undefined) updateData.state = state;
    if (postalCode !== undefined) updateData.postalCode = postalCode;
    if (country !== undefined) updateData.country = country;
    if (phone !== undefined) updateData.phone = phone;
    if (isDefault !== undefined) updateData.isDefault = isDefault;

    const address = await prisma.address.update({
      where: { id: addressId },
      data: updateData
    });

    await appendAuditLog({
      action: 'update_address', resource: 'Address', resourceId: addressId,
      details: { addressId, userId },
      user: { id: userId || null, email: req.user?.email || null, role: req.user?.role || null }, req,
    });

    res.json({
      message: 'Address updated successfully',
      address
    });

  } catch (error) {
    console.error('Update address error:', error);
    res.status(500).json({ message: 'Failed to update address' });
  }
};

// Delete address
export const deleteAddress = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { addressId } = req.params;

    const address = await prisma.address.findFirst({
      where: { 
        id: addressId,
        userId 
      }
    });

    if (!address) {
      return res.status(404).json({ message: 'Address not found' });
    }

    await prisma.address.delete({
      where: { id: addressId }
    });

    // If deleted address was default, make another address default
    if (address.isDefault) {
      const nextAddress = await prisma.address.findFirst({
        where: { userId },
        orderBy: { createdAt: 'asc' }
      });

      if (nextAddress) {
        await prisma.address.update({
          where: { id: nextAddress.id },
          data: { isDefault: true }
        });
      }
    }

    await appendAuditLog({
      action: 'delete_address', resource: 'Address', resourceId: addressId,
      details: { addressId, userId },
      severity: 'warning',
      user: { id: userId || null, email: req.user?.email || null, role: req.user?.role || null }, req,
    });

    res.json({ message: 'Address deleted successfully' });

  } catch (error) {
    console.error('Delete address error:', error);
    res.status(500).json({ message: 'Failed to delete address' });
  }
};

// Set default address
export const setDefaultAddress = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { addressId } = req.params;

    // Check if address exists and belongs to user
    const address = await prisma.address.findFirst({
      where: { 
        id: addressId,
        userId 
      }
    });

    if (!address) {
      return res.status(404).json({ message: 'Address not found' });
    }

    // Unset all default addresses for user
    await prisma.address.updateMany({
      where: { userId },
      data: { isDefault: false }
    });

    // Set this address as default
    await prisma.address.update({
      where: { id: addressId },
      data: { isDefault: true }
    });

    res.json({ message: 'Default address updated successfully' });

  } catch (error) {
    console.error('Set default address error:', error);
    res.status(500).json({ message: 'Failed to set default address' });
  }
};
