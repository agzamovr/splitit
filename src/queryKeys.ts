export const billKeys = {
  all: ['bills'] as const,
  list: () => [...billKeys.all, 'list'] as const,
  detail: (id: string) => [...billKeys.all, 'detail', id] as const,
};
