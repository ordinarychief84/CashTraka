import { prisma } from '@/lib/prisma';

/**
 * Centralized notification + audit log service.
 * Call these from any API route to auto-create notifications and audit entries.
 */

export const notificationService = {
  /** Create an in-app notification for a user */
  async notify(args: {
    userId: string;
    type?: string;
    title: string;
    message: string;
    link?: string;
  }) {
    return prisma.notification.create({
      data: {
        userId: args.userId,
        type: args.type || 'info',
        title: args.title,
        message: args.message,
        link: args.link,
      },
    });
  },

  /** Log an admin action to the audit trail */
  async auditLog(args: {
    adminId: string;
    action: string;
    targetId?: string;
    details?: string;
    ipAddress?: string;
  }) {
    return prisma.auditLog.create({
      data: {
        adminId: args.adminId,
        action: args.action,
        targetId: args.targetId,
        details: args.details,
        ipAddress: args.ipAddress,
      },
    });
  },

  // ── Pre-built notification triggers ────────────────────────────

  /** When a new support ticket is created */
  async onNewTicket(args: { ticketId: string; userId: string; subject: string }) {
    // Notify all admins
    const admins = await prisma.user.findMany({
      where: { role: 'ADMIN' },
      select: { id: true },
    });
    await Promise.all(
      admins.map((admin) =>
        this.notify({
          userId: admin.id,
          type: 'info',
          title: 'New support ticket',
          message: `New ticket: ${args.subject}`,
          link: `/admin/support`,
        }),
      ),
    );
  },

  /** When a payment is verified/received */
  async onPaymentReceived(args: {
    userId: string;
    customerName: string;
    amount: number;
  }) {
    return this.notify({
      userId: args.userId,
      type: 'success',
      title: 'Payment received',
      message: `${args.customerName} paid ${args.amount}`,
      link: '/payments',
    });
  },

  /** When a subscription changes */
  async onSubscriptionChange(args: {
    userId: string;
    oldPlan: string;
    newPlan: string;
    status: string;
  }) {
    const action = args.status === 'active' ? 'upgraded to' : 'changed to';
    return this.notify({
      userId: args.userId,
      type: 'info',
      title: 'Subscription updated',
      message: `Your plan has been ${action} ${args.newPlan.replace('_', ' ')}`,
      link: '/settings',
    });
  },

  /** When a user is suspended */
  async onUserSuspended(args: {
    userId: string;
    adminId: string;
    reason?: string;
  }) {
    await this.notify({
      userId: args.userId,
      type: 'error',
      title: 'Account suspended',
      message: args.reason || 'Your account has been suspended. Contact support for details.',
    });
    await this.auditLog({
      adminId: args.adminId,
      action: 'SUSPEND_USER',
      targetId: args.userId,
      details: args.reason,
    });
  },

  /** When a user is reactivated */
  async onUserReactivated(args: {
    userId: string;
    adminId: string;
    reason?: string;
  }) {
    await this.notify({
      userId: args.userId,
      type: 'success',
      title: 'Account reactivated',
      message: 'Your account has been reactivated. You can now use all features.',
    });
    await this.auditLog({
      adminId: args.adminId,
      action: 'REACTIVATE_USER',
      targetId: args.userId,
      details: args.reason,
    });
  },
};
