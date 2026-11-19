const organizations = ['p04-upload-a', 'p04-upload-b', 'p04-upload-disabled'];
const uiPermissions = ['dashboard.read','inventory.items.read','inventory.items.update','inventory.brands.read','inventory.categories.read','inventory.units.read','taxes.read','locations.read'];
const actors = {
  ui: { organizationId: organizations[0], permissions: uiPermissions },
  foreign: { organizationId: organizations[1], permissions: ['dashboard.read','inventory.items.read'] },
  revocation: { organizationId: organizations[0], permissions: uiPermissions.filter(permission => permission !== 'inventory.items.update') },
  expiry: { organizationId: organizations[0], permissions: ['dashboard.read'] },
  permissionChange: { organizationId: organizations[0], permissions: ['dashboard.read','inventory.items.read'] },
  moduleChange: { organizationId: organizations[0], permissions: ['dashboard.read'] },
  permissionDenied: { organizationId: organizations[0], permissions: ['inventory.items.read'] },
  moduleDenied: { organizationId: organizations[2], permissions: ['dashboard.read','inventory.items.read'] },
};
for (const [alias, actor] of Object.entries(actors)) {
  actor.id = 'p04r02-user-' + alias.toLowerCase();
  actor.roleId = 'p04r02-role-' + alias.toLowerCase();
  actor.roleCode = 'p04r02_' + alias.toLowerCase();
  actor.email = 'p04r02-' + alias.toLowerCase() + '@example.invalid';
}
const items = organizations.map((organizationId, index) => ({
  id: 'p04r02-item-' + ['a','b','disabled'][index], organizationId,
  nameEn: 'Qualification image item ' + ['A','B','disabled'][index],
  nameFr: 'Article image de qualification ' + ['A','B','désactivé'][index],
  imageUrl: `/uploads/${organizationId}/sentinel.png`,
  thumbnail: `/uploads/${organizationId}/sentinel.png`,
}));
module.exports = { organizations, actors, items, modules: ['dashboard','inventory','settings'] };
