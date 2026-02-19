import prisma from '../prismaClient.js';

/**
 * GET /api/admin/analytics?period=month
 *
 * Returns pre-computed dashboard metrics in a single response so the
 * frontend doesn't need to download every record with limit=999999.
 *
 * Accepts query param `period`: today | week | month | year | lifetime (default: month)
 */
export const getAnalytics = async (req, res) => {
  try {
    const period = req.query.period || 'month';
    const now = new Date();

    // ── Compute period start ──
    let periodStart;
    switch (period) {
      case 'today': {
        periodStart = new Date(now);
        periodStart.setHours(0, 0, 0, 0);
        break;
      }
      case 'week': {
        periodStart = new Date(now);
        periodStart.setHours(0, 0, 0, 0);
        periodStart.setDate(periodStart.getDate() - periodStart.getDay());
        break;
      }
      case 'month': {
        periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      }
      case 'year': {
        periodStart = new Date(now.getFullYear(), 0, 1);
        break;
      }
      default: // lifetime
        periodStart = new Date(0);
    }

    const periodFilter = { createdAt: { gte: periodStart } };

    // ── Run all queries in parallel ──
    const [
      // Orders — period
      periodOrderCount,
      periodRevenueAgg,
      cancelledRevenueAgg,
      // Orders — all-time status breakdown
      ordersByStatus,
      // Users
      totalUsers,
      usersByRole,
      // Products
      totalProducts,
      activeProducts,
      lowStockProducts,
      // Collections
      totalCollections,
      // Reviews — period
      periodReviewCount,
      // Feedback — period + unresolved
      periodFeedbackCount,
      unresolvedFeedbackCount,
      // Top products by revenue in period (via orderItems)
      topProductItems,
      // Recent orders in period
      recentOrders,
      // Top customers in period
      topCustomerOrders,
      // Audit log stats
      auditTotal,
      auditToday,
      auditThisWeek,
      auditThisMonth,
      auditThisYear,
    ] = await Promise.all([
      // 1. Period order count
      prisma.order.count({ where: periodFilter }),

      // 2. Period revenue (all non-cancelled orders)
      prisma.order.aggregate({
        where: { ...periodFilter, status: { not: 'CANCELLED' } },
        _sum: { total: true },
        _count: true,
      }),

      // 3. Cancelled order revenue (for exclusion)
      prisma.order.aggregate({
        where: { ...periodFilter, status: 'CANCELLED' },
        _sum: { total: true },
        _count: true,
      }),

      // 4. Order status breakdown (period)
      prisma.order.groupBy({
        by: ['status'],
        where: periodFilter,
        _count: true,
      }),

      // 5. Total users
      prisma.user.count(),

      // 6. Users by role
      prisma.user.groupBy({ by: ['role'], _count: true }),

      // 7. Total products
      prisma.product.count(),

      // 8. Active products
      prisma.product.count({ where: { isActive: true } }),

      // 9. Low stock products (stock < 10, active)
      prisma.product.findMany({
        where: { isActive: true, stock: { lt: 10 } },
        select: { id: true, name: true, stock: true, collection: { select: { name: true } } },
        orderBy: { stock: 'asc' },
        take: 8,
      }),

      // 10. Total collections
      prisma.collection.count(),

      // 11. Period review count
      prisma.review.count({ where: periodFilter }),

      // 12. Period feedback count
      prisma.feedback.count({ where: periodFilter }),

      // 13. Unresolved feedback count
      prisma.feedback.count({ where: { isResolved: false } }),

      // 14. Top products by revenue in period (aggregate order items from period orders)
      prisma.orderItem.groupBy({
        by: ['productId'],
        where: {
          order: { ...periodFilter, status: { not: 'CANCELLED' } },
        },
        _sum: { price: true, quantity: true },
        orderBy: { _sum: { price: 'desc' } },
        take: 5,
      }),

      // 15. Recent orders in period
      prisma.order.findMany({
        where: periodFilter,
        select: {
          id: true,
          orderNumber: true,
          total: true,
          status: true,
          createdAt: true,
          user: { select: { email: true, firstName: true, lastName: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),

      // 16. Top customers by spend in period
      prisma.order.groupBy({
        by: ['userId'],
        where: { ...periodFilter, status: { not: 'CANCELLED' } },
        _sum: { total: true },
        _count: true,
        orderBy: { _sum: { total: 'desc' } },
        take: 5,
      }),

      // 17-21. Audit log stats
      prisma.auditLog.count(),
      prisma.auditLog.count({
        where: { createdAt: { gte: (() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; })() } },
      }),
      prisma.auditLog.count({
        where: { createdAt: { gte: (() => { const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - d.getDay()); return d; })() } },
      }),
      prisma.auditLog.count({
        where: { createdAt: { gte: new Date(now.getFullYear(), now.getMonth(), 1) } },
      }),
      prisma.auditLog.count({
        where: { createdAt: { gte: new Date(now.getFullYear(), 0, 1) } },
      }),
    ]);

    // ── Resolve top product names ──
    let topProducts = [];
    if (topProductItems.length > 0) {
      const productIds = topProductItems.map(i => i.productId);
      const products = await prisma.product.findMany({
        where: { id: { in: productIds } },
        select: { id: true, name: true, imageUrl: true },
      });
      const productMap = Object.fromEntries(products.map(p => [p.id, p]));
      topProducts = topProductItems.map(i => ({
        id: i.productId,
        name: productMap[i.productId]?.name || 'Unknown',
        imageUrl: productMap[i.productId]?.imageUrl || null,
        revenue: (i._sum.price || 0) * (i._sum.quantity || 1),
        quantity: i._sum.quantity || 0,
      }));
    }

    // ── Resolve top customer details ──
    let topCustomers = [];
    if (topCustomerOrders.length > 0) {
      const userIds = topCustomerOrders.map(o => o.userId);
      const users = await prisma.user.findMany({
        where: { id: { in: userIds } },
        select: { id: true, email: true, firstName: true, lastName: true },
      });
      const userMap = Object.fromEntries(users.map(u => [u.id, u]));
      topCustomers = topCustomerOrders.map(o => ({
        email: userMap[o.userId]?.email || 'Guest',
        name: userMap[o.userId]?.firstName
          ? `${userMap[o.userId].firstName} ${userMap[o.userId].lastName || ''}`.trim()
          : userMap[o.userId]?.email || 'Guest',
        spent: o._sum.total || 0,
        orders: o._count || 0,
      }));
    }

    // ── Build status breakdown object ──
    const breakdown = {};
    ordersByStatus.forEach(g => { breakdown[g.status] = g._count; });

    // ── Pending orders (all-time) ──
    const pendingOrders = (breakdown['PENDING'] || 0) + (breakdown['PROCESSING'] || 0);

    // ── Role counts ──
    const roleMap = {};
    usersByRole.forEach(g => { roleMap[g.role] = g._count; });

    // ── Revenue/AOV ──
    const periodRevenue = periodRevenueAgg._sum.total || 0;
    const completedCount = periodRevenueAgg._count || 0;
    const periodAOV = completedCount > 0 ? periodRevenue / completedCount : 0;

    // ── Unique customers in period ──
    const periodCustomers = topCustomerOrders.length; // This is capped at 5 by the query
    // For a more accurate count, use a separate count query
    const uniqueCustomerCount = await prisma.order.groupBy({
      by: ['userId'],
      where: periodFilter,
      _count: true,
    });
    const periodCustomerCount = uniqueCustomerCount.length;

    // ── Conversion rate ──
    const conversionRate = totalUsers > 0 ? (periodCustomerCount / totalUsers * 100) : 0;

    // ── Audit stats by period ──
    const periodAuditCount =
      period === 'today' ? auditToday
      : period === 'week' ? auditThisWeek
      : period === 'month' ? auditThisMonth
      : period === 'year' ? auditThisYear
      : auditTotal;

    res.json({
      period,
      periodRevenue,
      periodOrderCount,
      periodCustomers: periodCustomerCount,
      periodAOV,
      breakdown,
      pendingOrders,
      totalUsers,
      adminCount: (roleMap['ADMIN'] || 0) + (roleMap['SUPER_ADMIN'] || 0),
      superAdminCount: roleMap['SUPER_ADMIN'] || 0,
      customerUserCount: roleMap['USER'] || 0,
      totalProducts,
      activeProducts,
      lowStock: lowStockProducts,
      totalCollections,
      periodReviewCount,
      periodFeedbackCount,
      unresolvedFeedback: unresolvedFeedbackCount,
      topProducts,
      topCustomers,
      recentOrders,
      conversionRate,
      auditStats: {
        total: auditTotal,
        today: auditToday,
        thisWeek: auditThisWeek,
        thisMonth: auditThisMonth,
        thisYear: auditThisYear,
      },
      periodAuditCount,
    });
  } catch (error) {
    console.error('Analytics endpoint error:', error);
    res.status(500).json({ message: 'Failed to fetch analytics' });
  }
};
