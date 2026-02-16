import express from 'express';
import { 
  getUserAddresses, 
  getAddress, 
  createAddress, 
  updateAddress, 
  deleteAddress, 
  setDefaultAddress 
} from '../controllers/addressController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// All address routes require authentication
router.use(authenticateToken);

router.get('/', getUserAddresses);
router.get('/:addressId', getAddress);
router.post('/', createAddress);
router.put('/:addressId', updateAddress);
router.delete('/:addressId', deleteAddress);
router.put('/:addressId/default', setDefaultAddress);

export default router;
