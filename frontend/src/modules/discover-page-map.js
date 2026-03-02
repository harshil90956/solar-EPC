/* eslint-disable global-require */
/* eslint-disable import/no-dynamic-require */

export const discoverModulePageMap = () => {
  const map = {};

  // CRA supports require.context (webpack)
  const ctx = require.context('./', true, /routes\/index\.js$/);

  ctx.keys().forEach((key) => {
    const mod = ctx(key);
    const routes = Array.isArray(mod.routes) ? mod.routes : [];

    routes.forEach((r) => {
      if (!r || typeof r !== 'object') return;
      const routeKey = r.key;
      const component = r.component;
      const title = r.title;

      if (!routeKey || typeof routeKey !== 'string') return;
      if (!component) return;
      if (!title || typeof title !== 'string') return;

      map[routeKey] = { component, title };
    });
  });

  return map;
};
