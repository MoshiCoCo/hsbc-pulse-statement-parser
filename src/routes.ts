const routes = [
  {
    path: '/',
    name: 'menu.dashboard',
    children: [
      {
        path: '/',
        name: 'menu.dashboard.statement',
      },
    ],
  },
];

export default routes;
