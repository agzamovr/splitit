export const billKeys = {
  all: ['bills'] as const,
  list: () => [...billKeys.all, 'list'] as const,
  detail: (id: string) => [...billKeys.all, 'detail', id] as const,
};

export const memberKeys = {
  chat: () => ['members', 'chat'] as const,
};

export const peopleKeys = {
  known: () => ['people', 'known'] as const,
};
