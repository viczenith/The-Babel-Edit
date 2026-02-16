export interface Order {
  id: string;
  orderNumber: string;
  createdAt: string;
  status: 'PENDING' | 'CONFIRMED' | 'PROCESSING' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED' | 'REFUNDED';
  paymentStatus?: string;
  total: number;
  shippedAt?: string | null;
  deliveredAt?: string | null;
  cancelledAt?: string | null;
  items: {
    id: string;
    quantity: number;
    price: number;
    size?: string;
    color?: string;
    product: {
      id: string;
      name: string;
      imageUrl: string;
    };
  }[];
}

export interface ReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: { id: string; name: string; imageUrl: string };
  onSubmit: (reviewData: { rating: number; title: string; comment: string }) => Promise<void>;
}
