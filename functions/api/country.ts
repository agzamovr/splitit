export const onRequest: PagesFunction = (context) => {
  const country = context.request.cf?.country ?? null;
  return new Response(JSON.stringify({ country }), {
    headers: { 'Content-Type': 'application/json' },
  });
};
