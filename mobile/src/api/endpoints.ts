/**
 * Typed catalogue of API endpoints. Importing from here instead of
 * hardcoding strings means a rename on the web side surfaces at
 * `tsc` time on mobile.
 *
 * Each entry is a function from its parameters to the path string.
 * That keeps `/orders/{id}` from getting accidentally interpolated
 * with `undefined`.
 */

export const endpoints = {
  // Auth
  login: () => '/api/auth/login',
  signup: () => '/api/auth/signup',
  logout: () => '/api/auth/logout',
  me: () => '/api/auth/me',
  forgotPassword: () => '/api/auth/forgot-password',
  resetPassword: () => '/api/auth/reset-password',
  verifyEmail: () => '/api/auth/verify-email',

  // Notifications
  notifications: () => '/api/notifications',
  unreadCount: () => '/api/notifications/unread-count',
  notificationRead: (id: string) => `/api/notifications/${id}/read`,
  notificationsReadAll: () => '/api/notifications/read-all',

  // Operational planning
  customerOrders: () => '/api/customer-orders',
  customerOrder: (id: string) => `/api/customer-orders/${id}`,
  customerOrderStatus: (id: string) => `/api/customer-orders/${id}/status`,
  customerOrderProduce: (id: string) => `/api/customer-orders/${id}/produce`,
  customerOrderInvoice: (id: string) => `/api/customer-orders/${id}/invoice`,

  productionOrders: () => '/api/production-orders',
  productionOrder: (id: string) => `/api/production-orders/${id}`,
  productionStart: (id: string) => `/api/production-orders/${id}/start`,
  productionComplete: (id: string) => `/api/production-orders/${id}/complete`,
  productionShortages: (id: string) => `/api/production-orders/${id}/shortages`,

  rawMaterials: () => '/api/raw-materials',
  rawMaterial: (id: string) => `/api/raw-materials/${id}`,
  rawMaterialAdjust: (id: string) => `/api/raw-materials/${id}/adjust`,

  recipes: () => '/api/recipes',
  recipeForProduct: (productId: string) => `/api/recipes/${productId}`,

  suppliers: () => '/api/suppliers',
  supplier: (id: string) => `/api/suppliers/${id}`,

  purchaseOrders: () => '/api/purchase-orders',
  purchaseOrder: (id: string) => `/api/purchase-orders/${id}`,
  purchaseOrderSend: (id: string) => `/api/purchase-orders/${id}/send`,
  purchaseOrderReceive: (id: string) => `/api/purchase-orders/${id}/receive`,

  inventoryShortages: () => '/api/inventory/shortages',
  inventoryLowStock: () => '/api/inventory/low-stock',
  inventoryMovements: () => '/api/inventory/movements',

  // Customers / payments / invoices / receipts (existing web routes)
  customers: () => '/api/customers',
  invoices: () => '/api/invoices',
  payments: () => '/api/payments',
  receipts: () => '/api/receipts',

  // Health
  health: () => '/api/health',
} as const;
