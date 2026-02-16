import prisma from '../prismaClient.js';

// ─── Server-side paginated, filtered, searchable audit logs ───
export const getAuditLogs = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 50,
      action,
      resource,
      userId,
      severity,
      search,
      startDate,
      endDate,
      sortBy = 'createdAt',
      sortDir = 'desc',
    } = req.query;

    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(200, Math.max(1, parseInt(limit)));
    const skip = (pageNum - 1) * limitNum;

    // Build where clause
    const where = {};

    if (action && action !== 'all') where.action = action;
    if (resource && resource !== 'all') where.resource = resource;
    if (userId) where.userId = userId;
    if (severity && severity !== 'all') where.severity = severity;

    // Date range
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        where.createdAt.lte = end;
      }
    }

    // Full-text search across multiple fields
    if (search) {
      where.OR = [
        { action: { contains: search } },
        { resource: { contains: search } },
        { userEmail: { contains: search } },
        { details: { contains: search } },
        { ipAddress: { contains: search } },
        { resourceId: { contains: search } },
      ];
    }

    // Valid sort fields
    const validSortFields = ['createdAt', 'action', 'resource', 'severity', 'userEmail'];
    const orderField = validSortFields.includes(sortBy) ? sortBy : 'createdAt';
    const orderDir = sortDir === 'asc' ? 'asc' : 'desc';

    const [logs, total, actionCounts, resourceCounts, severityCounts] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        orderBy: { [orderField]: orderDir },
        skip,
        take: limitNum,
      }),
      prisma.auditLog.count({ where }),
      // Aggregations for filter options
      prisma.auditLog.groupBy({ by: ['action'], _count: true, orderBy: { _count: { action: 'desc' } } }),
      prisma.auditLog.groupBy({ by: ['resource'], where: { resource: { not: null } }, _count: true, orderBy: { _count: { resource: 'desc' } } }),
      prisma.auditLog.groupBy({ by: ['severity'], _count: true }),
    ]);

    // Parse JSON fields for response
    const parsed = logs.map(log => ({
      ...log,
      details: log.details ? JSON.parse(log.details) : null,
      previousValues: log.previousValues ? JSON.parse(log.previousValues) : null,
    }));

    res.json({
      logs: parsed,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
      },
      filters: {
        actions: actionCounts.map(a => ({ value: a.action, count: a._count })),
        resources: resourceCounts.map(r => ({ value: r.resource, count: r._count })),
        severities: severityCounts.map(s => ({ value: s.severity, count: s._count })),
      },
    });
  } catch (error) {
    console.error('Get audit logs error:', error);
    res.status(500).json({ message: 'Failed to read audit logs' });
  }
};

// ─── Get audit log statistics ───
export const getAuditStats = async (req, res) => {
  try {
    const now = new Date();
    const todayStart = new Date(now); todayStart.setHours(0, 0, 0, 0);
    const weekStart = new Date(todayStart); weekStart.setDate(weekStart.getDate() - 7);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const yearStart = new Date(now.getFullYear(), 0, 1);

    const [total, today, thisWeek, thisMonth, thisYear, bySeverity, topUsers, topActions] = await Promise.all([
      prisma.auditLog.count(),
      prisma.auditLog.count({ where: { createdAt: { gte: todayStart } } }),
      prisma.auditLog.count({ where: { createdAt: { gte: weekStart } } }),
      prisma.auditLog.count({ where: { createdAt: { gte: monthStart } } }),
      prisma.auditLog.count({ where: { createdAt: { gte: yearStart } } }),
      prisma.auditLog.groupBy({ by: ['severity'], _count: true }),
      prisma.auditLog.groupBy({
        by: ['userEmail'],
        where: { userEmail: { not: null } },
        _count: true,
        orderBy: { _count: { userEmail: 'desc' } },
        take: 5,
      }),
      prisma.auditLog.groupBy({
        by: ['action'],
        _count: true,
        orderBy: { _count: { action: 'desc' } },
        take: 10,
      }),
    ]);

    res.json({
      total,
      today,
      thisWeek,
      thisMonth,
      thisYear,
      bySeverity: Object.fromEntries(bySeverity.map(s => [s.severity, s._count])),
      topUsers: topUsers.map(u => ({ email: u.userEmail, count: u._count })),
      topActions: topActions.map(a => ({ action: a.action, count: a._count })),
    });
  } catch (error) {
    console.error('Get audit stats error:', error);
    res.status(500).json({ message: 'Failed to fetch audit statistics' });
  }
};

// ─── HTTP endpoint to add audit log ───
export const addAuditLog = async (req, res) => {
  try {
    const { action, resource, resourceId, details, severity } = req.body;
    const user = req.user || {};

    if (!action) return res.status(400).json({ message: 'action is required' });

    const entry = await prisma.auditLog.create({
      data: {
        action,
        resource: resource || null,
        resourceId: resourceId || null,
        details: details ? JSON.stringify(details) : null,
        severity: severity || 'info',
        userId: user.userId || user.id || null,
        userEmail: user.email || null,
        userRole: user.role || null,
        ipAddress: req.ip || req.headers['x-forwarded-for'] || null,
        userAgent: req.headers['user-agent'] || null,
      },
    });

    res.status(201).json({ message: 'Audit log added', entry: { ...entry, details: details || null } });
  } catch (error) {
    console.error('Add audit log error:', error);
    res.status(500).json({ message: 'Failed to add audit log' });
  }
};

// ─── Export CSV of audit logs ───
export const exportAuditLogs = async (req, res) => {
  try {
    const { format = 'csv', startDate, endDate, action, resource, severity } = req.query;
    const where = {};
    if (action && action !== 'all') where.action = action;
    if (resource && resource !== 'all') where.resource = resource;
    if (severity && severity !== 'all') where.severity = severity;
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        where.createdAt.lte = end;
      }
    }

    const logs = await prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 10000, // safety cap
    });

    if (format === 'csv') {
      const headers = ['ID', 'Timestamp', 'Action', 'Resource', 'Resource ID', 'User Email', 'User Role', 'IP Address', 'Severity', 'Details'];
      const rows = logs.map(l => [
        l.id,
        l.createdAt.toISOString(),
        l.action,
        l.resource || '',
        l.resourceId || '',
        l.userEmail || '',
        l.userRole || '',
        l.ipAddress || '',
        l.severity,
        l.details ? l.details.replace(/"/g, '""') : '',
      ].map(v => `"${v}"`).join(','));

      const csv = [headers.join(','), ...rows].join('\n');
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=audit-logs-${new Date().toISOString().split('T')[0]}.csv`);
      return res.send(csv);
    }

    // JSON format
    const parsed = logs.map(l => ({ ...l, details: l.details ? JSON.parse(l.details) : null, previousValues: l.previousValues ? JSON.parse(l.previousValues) : null }));
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename=audit-logs-${new Date().toISOString().split('T')[0]}.json`);
    res.json(parsed);
  } catch (error) {
    console.error('Export audit logs error:', error);
    res.status(500).json({ message: 'Failed to export audit logs' });
  }
};

// ─── Helper for other server code to append audit entries programmatically ───
// This is the main function all controllers call
export const appendAuditLog = async ({
  action,
  resource = null,
  resourceId = null,
  details = null,
  previousValues = null,
  user = { id: null, email: null, role: null },
  req = null, // Pass req to capture IP/user-agent
  severity = 'info',
}) => {
  try {
    await prisma.auditLog.create({
      data: {
        action,
        resource,
        resourceId: resourceId || null,
        details: details ? JSON.stringify(details) : null,
        previousValues: previousValues ? JSON.stringify(previousValues) : null,
        severity,
        userId: user.id || null,
        userEmail: user.email || null,
        userRole: user.role || null,
        ipAddress: req?.ip || req?.headers?.['x-forwarded-for'] || null,
        userAgent: req?.headers?.['user-agent'] || null,
      },
    });
  } catch (err) {
    console.error(`Audit log failed [${action}]:`, err.message);
  }
};

// ─── Migrate old flat-file logs to database (run once) ───
export const migrateAuditLogs = async (req, res) => {
  try {
    const fs = await import('fs/promises');
    const path = await import('path');
    const { fileURLToPath } = await import('url');
    const __dirname = path.dirname(fileURLToPath(import.meta.url));
    const dataFile = path.join(__dirname, '../data/audit-logs.json');

    let oldLogs = [];
    try {
      const raw = await fs.readFile(dataFile, 'utf8');
      oldLogs = JSON.parse(raw || '[]');
    } catch (e) {
      return res.json({ message: 'No old audit log file found. Nothing to migrate.', migrated: 0 });
    }

    if (oldLogs.length === 0) return res.json({ message: 'No logs to migrate', migrated: 0 });

    // Check if already migrated
    const existing = await prisma.auditLog.count();
    if (existing > 0) {
      return res.json({ message: `Database already has ${existing} log entries. Skipping migration to avoid duplicates.`, migrated: 0 });
    }

    const data = oldLogs.map(log => ({
      action: log.action || 'unknown',
      resource: log.resource || null,
      resourceId: log.details?.productId || log.details?.orderId || log.details?.userId || log.details?.collectionId || log.details?.id || null,
      details: log.details ? JSON.stringify(log.details) : null,
      severity: log.action?.includes('delete') ? 'warning' : 'info',
      userId: log.user?.id || null,
      userEmail: log.user?.email || null,
      userRole: log.user?.role || null,
      createdAt: log.timestamp ? new Date(log.timestamp) : new Date(),
    }));

    await prisma.auditLog.createMany({ data });

    res.json({ message: `Successfully migrated ${data.length} audit log entries to database`, migrated: data.length });
  } catch (error) {
    console.error('Migration error:', error);
    res.status(500).json({ message: 'Failed to migrate audit logs', error: error.message });
  }
};
