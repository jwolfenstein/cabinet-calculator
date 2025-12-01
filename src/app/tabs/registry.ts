register({
  id: 'som',
  title: 'Schedule of Materials',
  group: 'SOM',
  loader: () => import('../routes/SOM'), // loads src/app/routes/SOM/index.tsx
});
