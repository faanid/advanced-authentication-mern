const test = require("node:test");
const assert = require("node:assert/strict");
const { app } = require("../server");

test("Express application loads with its user routes registered", () => {
  assert.ok(app);
  assert.equal(typeof app.listen, "function");

  const routerLayer = app._router.stack.find((layer) => layer.name === "router");

  assert.ok(routerLayer);

  const routePaths = routerLayer.handle.stack
    .filter((layer) => layer.route)
    .map((layer) => layer.route.path);

  assert.ok(routePaths.includes("/register"));
  assert.ok(routePaths.includes("/login"));
  assert.ok(routePaths.includes("/logout"));
  assert.ok(routePaths.includes("/loginStatus"));
  assert.ok(routePaths.includes("/updateUser"));
  assert.ok(routePaths.includes("/getUsers"));
});
