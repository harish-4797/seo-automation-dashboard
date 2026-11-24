// Step 4: Schema.org validator — parses JSON-LD blocks and checks local-business entities
// against Google's required/recommended properties for rich results.

const LOCAL_TYPES = new Set([
  'LocalBusiness', 'Dentist', 'MedicalBusiness', 'MedicalClinic', 'Physician', 'Hospital',
  'MedicalOrganization', 'HealthAndBeautyBusiness', 'RealEstateAgent', 'ProfessionalService',
  'Store', 'Restaurant', 'LegalService', 'AutomotiveBusiness', 'HomeAndConstructionBusiness',
]);
const ORG_TYPES = new Set(['Organization', 'Corporation', ...LOCAL_TYPES]);

const REQUIRED = ['name', 'address'];
const RECOMMENDED = ['telephone', 'url', 'image', 'openingHoursSpecification|openingHours', 'geo', 'priceRange', 'aggregateRating', 'areaServed', 'sameAs'];

function recommendedTypeFor(businessType = '') {
  const t = businessType.toLowerCase();
  if (t.includes('dent')) return 'Dentist';
  if (t.includes('real')) return 'RealEstateAgent';
  if (t.includes('hospital')) return 'Hospital';
  if (t.includes('clinic') || t.includes('health') || t.includes('doctor')) return 'MedicalClinic';
  return 'LocalBusiness';
}

function flatten(node, out = []) {
  if (Array.isArray(node)) node.forEach((n) => flatten(n, out));
  else if (node && typeof node === 'object') {
    if (node['@graph']) flatten(node['@graph'], out);
    if (node['@type']) out.push(node);
  }
  return out;
}

const typesOf = (e) => [].concat(e['@type'] || []).map(String);
const has = (e, key) => key.split('|').some((k) => e[k] !== undefined && e[k] !== null && e[k] !== '');

function validateSchema(jsonLdRaw = [], microdataTypes = [], businessType = '') {
  const parseErrors = [];
  const entities = [];
  jsonLdRaw.forEach((raw, i) => {
    try {
      flatten(JSON.parse(raw.trim()), entities);
    } catch (err) {
      parseErrors.push({ block: i, error: err.message.slice(0, 120) });
    }
  });

  const allTypes = [...new Set(entities.flatMap(typesOf))];
  const localEntities = entities.filter((e) => typesOf(e).some((t) => LOCAL_TYPES.has(t)));
  const orgEntities = entities.filter((e) => typesOf(e).some((t) => ORG_TYPES.has(t)));

  const checked = (localEntities.length ? localEntities : orgEntities).slice(0, 3).map((e) => ({
    type: typesOf(e).join(','),
    name: e.name || null,
    missingRequired: REQUIRED.filter((k) => !has(e, k)),
    missingRecommended: RECOMMENDED.filter((k) => !has(e, k)).map((k) => k.split('|')[0]),
    hasPostalAddress: typeof e.address === 'object' && !!e.address?.addressLocality,
  }));

  return {
    jsonLdBlocks: jsonLdRaw.length,
    parseErrors,
    typesFound: allTypes,
    microdataTypes: [...new Set(microdataTypes)].slice(0, 10),
    hasLocalBusiness: localEntities.length > 0,
    hasOrganization: orgEntities.length > 0,
    hasBreadcrumb: allTypes.includes('BreadcrumbList'),
    hasFAQ: allTypes.includes('FAQPage'),
    hasWebSite: allTypes.includes('WebSite'),
    recommendedType: recommendedTypeFor(businessType),
    entities: checked,
  };
}

module.exports = { validateSchema, recommendedTypeFor };
