const fs = require('node:fs');
const file = 'services/daily-habit/daily-habit-digest.service.ts';
let text = fs.readFileSync(file, 'utf8').replaceAll('\r\n', '\n');
function replace(before, after) {
  if (!text.includes(before)) throw new Error('Expected source not found: ' + before);
  text = text.replace(before, after);
}
replace('  BIDailyDigest,', '  BIDailyDigest,\n  BIDrillThrough,');
replace('  route: string\n}', '  route: string\n  routePermission?: string\n}');
replace('    route: "/dashboard/inventory",', '    route: "/dashboard/inventory/items",\n    routePermission: "inventory.items.read",');
replace('  const metric = input.config.primaryMetric(input.input)', '  const metric = input.config.primaryMetric(input.input)\n  const sourceDrill = digestSourceDrill(input.config, input.input)');
replace('  const changes = roleSignals.map(changeFromSignal)', '  card.drillThrough = sourceDrill\n  const changes = roleSignals.map(changeFromSignal)');
replace(`      requiredPermission: input.config.requiredPermission,
      moduleSlug: input.config.moduleSlug,
      disabled: false,
      disabledReason: null,`, `      requiredPermission: sourceDrill.requiredPermission,
      moduleSlug: input.config.moduleSlug,
      disabled: !sourceDrill.available,
      disabledReason: sourceDrill.available ? null : sourceDrill.unavailableReason,`);
replace(`    drillThrough: {
      available: true,
      type: "route",
      label: "Open source surface",
      href: input.config.route,
      requiredPermission: input.config.requiredPermission,
    },`, '    drillThrough: digestSourceDrill(input.config, input.input),');
replace('function commandZoneForDigest(input: {', `function digestSourceDrill(config: DigestConfig, input: ComposeDailyHabitDigestInput): BIDrillThrough {
  const requiredPermission = config.routePermission ?? config.requiredPermission
  const common = { type: "route" as const, label: "Open source surface", requiredPermission }
  return hasRbacPermission(input.actorPermissions, requiredPermission)
    ? { ...common, available: true, href: config.route }
    : { ...common, available: false, unavailableReason: input.locale === "fr"
        ? "Votre rôle peut consulter cette synthèse, mais l’accès aux détails des articles nécessite une autorisation supplémentaire."
        : "Your role can view this summary, but opening item details requires additional permission." }
}

function commandZoneForDigest(input: {`);
const fd = fs.openSync(file, 'r+');
try {
  fs.writeFileSync(fd, text);
  fs.ftruncateSync(fd, Buffer.byteLength(text));
} finally { fs.closeSync(fd); }
console.log('Updated Digest source route permission independently of summary visibility.');
