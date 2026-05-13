import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '../client';
import { endpoints } from '../endpoints';

export type CustomerOrder = {
  id: string;
  orderNumber: string;
  customerName: string;
  customerPhone?: string | null;
  status: 'NEW' | 'CONFIRMED' | 'IN_PRODUCTION' | 'READY' | 'DELIVERED' | 'CANCELLED';
  dueAt?: string | null;
  totalKobo: number;
  createdAt: string;
};

export type CreateOrderInput = {
  customerId?: string;
  customerName: string;
  customerPhone?: string;
  dueAt?: string;
  notes?: string;
  items: Array<{
    productId?: string;
    description: string;
    quantity: number;
    unitPriceKobo: number;
  }>;
};

const KEYS = {
  list: (status?: string) => ['orders', { status }] as const,
  detail: (id: string) => ['orders', id] as const,
};

export function useOrders(filter?: { status?: string }) {
  return useQuery({
    queryKey: KEYS.list(filter?.status),
    queryFn: () =>
      apiFetch<{ rows: CustomerOrder[]; total: number }>(
        filter?.status
          ? `${endpoints.customerOrders()}?status=${filter.status}`
          : endpoints.customerOrders(),
      ),
  });
}

export function useOrder(id: string) {
  return useQuery({
    queryKey: KEYS.detail(id),
    queryFn: () =>
      apiFetch<CustomerOrder & { items: unknown[] }>(endpoints.customerOrder(id)),
    enabled: !!id,
  });
}

export function useCreateOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateOrderInput) =>
      apiFetch<CustomerOrder>(endpoints.customerOrders(), {
        method: 'POST',
        body: input,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['orders'] });
    },
  });
}

export function useUpdateOrderStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status, reason }: { id: string; status: string; reason?: string }) =>
      apiFetch<CustomerOrder>(endpoints.customerOrderStatus(id), {
        method: 'PATCH',
        body: { status, reason },
      }),
    onSuccess: (data, vars) => {
      qc.invalidateQueries({ queryKey: ['orders'] });
      qc.invalidateQueries({ queryKey: KEYS.detail(vars.id) });
    },
  });
}
