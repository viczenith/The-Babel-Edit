import express from 'express';
import { 
  getWishlist, 
  addToWishlist, 
  removeFromWishlist, 
  checkWishlistStatus, 
  clearWishlist, 
  moveToCart 
} from '../controllers/wishlistController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// All wishlist routes require authentication
router.use(authenticateToken);

router.get('/', getWishlist);
router.post('/add', addToWishlist);
router.delete('/remove/:productId', removeFromWishlist);
router.get('/check/:productId', checkWishlistStatus);
router.delete('/clear', clearWishlist);
router.post('/move-to-cart/:productId', moveToCart);

export default router;
