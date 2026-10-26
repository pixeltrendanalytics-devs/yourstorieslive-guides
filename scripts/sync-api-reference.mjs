import { readFile, writeFile, readdir, mkdir } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Read TypeScript contracts without importing the app, reading .env, starting
// NestJS, or making any API calls. The website builds from the saved snapshot.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const repository = path.resolve(process.argv[2] || path.join(root, '..', 'yourstorieslive-api'));
if (execFileSync('git', ['status', '--porcelain', '--', 'src'], { cwd: repository, encoding: 'utf8' }).trim()) throw new Error('The BFF source has local changes. Use a clean, committed source snapshot so its recorded revision is accurate.');
const require = createRequire(path.join(repository, 'package.json'));
const ts = require('typescript');
const configFile = ts.readConfigFile(path.join(repository, 'tsconfig.json'), ts.sys.readFile);
if (configFile.error) throw new Error(ts.flattenDiagnosticMessageText(configFile.error.messageText, '\n'));
const config = ts.parseJsonConfigFileContent(configFile.config, ts.sys, repository);
const program = ts.createProgram({ rootNames: config.fileNames.filter(file => !file.endsWith('.spec.ts')), options: { ...config.options, noEmit: true } });
const checker = program.getTypeChecker();
const unresolved = [];
const groups = {
  identity: ['Accounts & sign-in', 'Registration, sign-in, password recovery, OTP, session details and account settings.'],
  oauth: ['Social sign-in callbacks', 'Browser redirects for Google, Facebook, Kakao and Naver sign-in; these are not JSON fetch calls.'],
  profile: ['Profile & addresses', 'Member profile details, profile photos, addresses and race/ethnicity reference data.'],
  contacts: ['Contacts & sharing permissions', 'Contact records, visibility, access decisions and related photos, stories and invitations.'],
  directory: ['Member discovery', 'Find a member, resolve a member-page path or add a member to contacts.'],
  ancestry: ['Family tree', 'Read the tree, manage relatives, place existing contacts and create sharing links.'],
  entities: ['Stories & timeline', 'Timeline filters, story content, audiences, copies and timeline-access requests.'],
  contributions: ['Story contributions', 'Invite people to contribute, submit or decline, then manage moderation and revision requests.'],
  dashboard: ['Contribution dashboard', 'Received and sent contribution requests used on the member dashboard.'],
  media: ['Photos, uploads & media details', 'Browse media, upload/import files, manage captions, preview content and attach items to stories or contacts.'],
  'media-shares': ['Photo sharing & approvals', 'Share photos with contacts and handle the receiver’s approval or denial.'],
  'social-import': ['Social photo imports', 'Provider consent and popup callbacks for importing Facebook, Instagram and Pinterest media.'],
  'life-story': ['Your Life, moments & education', 'Life stages, guided prompts, answers, suggestions, skips and education reference data.'],
  reflections: ['Reflections', 'Read and write reflections, manage visibility and retrieve dashboard highlights.'],
  notifications: ['Notifications', 'List, read, mark or hide notifications individually or in a batch.'],
  'legacy-planning': ['Executors & responsibilities', 'Legacy-planning appointments and responsibility workflows; sensitive actions require their own checks.'],
  'access-links': ['Invitation & access links', 'Resolve a story, collaboration or timeline-request link before opening its related screen.'],
  support: ['Contact support', 'Submit a message from the public contact-us form.'],
  reference: ['FAQ reference', 'Read the FAQ catalogue used by the public application.'],
};

function decorators(node) {
  return (ts.canHaveDecorators(node) ? ts.getDecorators(node) || [] : []).map(decorator => {
    const call = decorator.expression;
    return ts.isCallExpression(call) ? { name: call.expression.getText(), args: [...call.arguments] } : { name: call.getText(), args: [] };
  });
}
function declaration(node) {
  let symbol = checker.getSymbolAtLocation(node);
  if (symbol && symbol.flags & ts.SymbolFlags.Alias) symbol = checker.getAliasedSymbol(symbol);
  return symbol?.valueDeclaration || symbol?.declarations?.[0];
}
function literal(node, seen = new Set()) {
  if (!node) return undefined;
  if (ts.isStringLiteralLike(node)) return node.text;
  if (ts.isNumericLiteral(node)) return Number(node.text);
  if (node.kind === ts.SyntaxKind.TrueKeyword) return true;
  if (node.kind === ts.SyntaxKind.FalseKeyword) return false;
  if (node.kind === ts.SyntaxKind.NullKeyword) return null;
  if (ts.isAsExpression(node) || ts.isParenthesizedExpression(node) || ts.isTypeAssertionExpression(node)) return literal(node.expression, seen);
  if (ts.isPrefixUnaryExpression(node) && node.operator === ts.SyntaxKind.MinusToken) return -literal(node.operand, seen);
  if (ts.isArrayLiteralExpression(node)) return node.elements.map(item => literal(item, new Set(seen)));
  if (ts.isObjectLiteralExpression(node)) return Object.fromEntries(node.properties.filter(ts.isPropertyAssignment).map(property => [property.name.getText().replace(/^['"]|['"]$/g, ''), literal(property.initializer, new Set(seen))]));
  if (ts.isPropertyAccessExpression(node)) {
    const constant = checker.getConstantValue(node);
    if (constant !== undefined) return constant;
    const object = literal(node.expression, new Set(seen));
    if (object && typeof object === 'object') return object[node.name.text];
  }
  if (ts.isBinaryExpression(node) && [ts.SyntaxKind.AsteriskToken, ts.SyntaxKind.PlusToken].includes(node.operatorToken.kind)) {
    const left = literal(node.left, new Set(seen));
    const right = literal(node.right, new Set(seen));
    if (typeof left === 'number' && typeof right === 'number') return node.operatorToken.kind === ts.SyntaxKind.AsteriskToken ? left * right : left + right;
  }
  const found = declaration(node);
  if (found && !seen.has(found) && found.initializer) { seen.add(found); return literal(found.initializer, seen); }
  return undefined;
}
function comment(node) {
  return (node.jsDoc || []).map(doc => typeof doc.comment === 'string' ? doc.comment : '').filter(Boolean).join(' ').replace(/\s+/g, ' ').trim();
}
function fields(type, depth = 0, seen = new Set()) {
  if (!type || depth > 2 || seen.has(type)) return [];
  seen = new Set([...seen, type]);
  if (checker.isArrayType(type)) return fields(checker.getTypeArguments(type)[0], depth, seen);
  if (type.isUnion()) {
    const variants = type.types.filter(item => !(item.flags & (ts.TypeFlags.Undefined | ts.TypeFlags.Null)));
    if (variants.length === 1) return fields(variants[0], depth, seen);
    return [];
  }
  return type.getProperties().flatMap(symbol => {
    const node = symbol.valueDeclaration || symbol.declarations?.[0];
    if (!node || !node.type || !path.resolve(node.getSourceFile().fileName).startsWith(path.join(repository, 'src', 'modules') + path.sep)) return [];
    const annotations = decorators(node);
    const property = annotations.find(item => /ApiProperty(?:Optional)?$/.test(item.name));
    const metadata = literal(property?.args[0]) || {};
    const optional = Boolean(symbol.flags & ts.SymbolFlags.Optional) || annotations.some(item => item.name === 'IsOptional' || item.name === 'ApiPropertyOptional') || metadata.required === false;
    const constraints = [];
    for (const item of annotations) {
      const value = literal(item.args[0]);
      const each = literal(item.args[1])?.each === true;
      if (['MaxLength', 'MinLength', 'Min', 'Max', 'ArrayMaxSize', 'ArrayMinSize'].includes(item.name) && value !== undefined) constraints.push(`${item.name}${each ? ' per item' : ''}: ${value}`);
      if (item.name === 'IsIn' && Array.isArray(value)) constraints.push(`Allowed: ${value.join(', ')}${each ? ' (each item)' : ''}`);
      if (item.name === 'IsEnum' && value && typeof value === 'object') constraints.push(`Allowed: ${Object.values(value).join(', ')}`);
      if (['IsEmail', 'IsISO8601', 'IsInt', 'IsBoolean', 'ArrayNotEmpty', 'IsNotEmpty'].includes(item.name)) constraints.push(item.name);
      if (item.name === 'ValidateIf') constraints.push('Conditional validation; see operation notes');
    }
    if (metadata.default !== undefined) constraints.push(`Default: ${JSON.stringify(metadata.default)}`);
    return [{ name: symbol.name, type: node.type.getText(), required: !optional, description: metadata.description || comment(node), constraints, fields: fields(checker.getTypeOfSymbolAtLocation(symbol, node), depth + 1, seen) }];
  });
}
function unwrap(node) {
  while (node && ts.isTypeReferenceNode(node) && ['Promise', 'PaginatedPayload'].includes(node.typeName.getText())) node = node.typeArguments?.[0];
  return node;
}
const operations = [];
for (const source of program.getSourceFiles()) {
  if (!source.fileName.startsWith(path.join(repository, 'src', 'modules') + path.sep) || !source.fileName.endsWith('.controller.ts')) continue;
  for (const controller of source.statements.filter(ts.isClassDeclaration)) {
    const classDecorators = decorators(controller);
    const route = classDecorators.find(item => item.name === 'Controller');
    if (!route) continue;
    const prefix = literal(route.args[0]) || '';
    if (typeof prefix !== 'string') throw new Error(`Unsupported controller prefix: ${source.fileName}`);
    const group = literal(classDecorators.find(item => item.name === 'ApiTags')?.args[0]);
    if (!groups[group]) throw new Error(`Describe API group ${group} before syncing`);
    for (const method of controller.members.filter(ts.isMethodDeclaration)) {
      const annotations = decorators(method);
      const verb = annotations.find(item => ['Get', 'Post', 'Patch', 'Put', 'Delete'].includes(item.name));
      if (!verb) continue;
      const paths = literal(verb.args[0]) ?? '';
      const expanded = (Array.isArray(paths) ? paths : [paths]).map(item => `/${prefix}/${item}`.replace(/\/+/g, '/').replace(/\/$/, ''));
      const canonical = expanded.find(item => item.startsWith('/api/v1/')) || expanded[0];
      const info = literal(annotations.find(item => item.name === 'ApiOperation')?.args[0]) || {};
      const parameters = [];
      for (const parameter of method.parameters) {
        const input = decorators(parameter).find(item => ['Query', 'Param', 'Body', 'Headers'].includes(item.name));
        if (!input || !parameter.type) continue;
        const named = literal(input.args[0]);
        const type = checker.getTypeAtLocation(parameter);
        const shape = named ? [{ name: named, type: parameter.type.getText(), required: !parameter.questionToken && !parameter.type.getText().includes('undefined'), description: '', constraints: [], fields: [] }] : fields(type);
        if (!shape.length && !named) unresolved.push(`${method.name.getText()}: ${parameter.type.getText()}`);
        parameters.push({ location: { Query: 'Query', Param: 'Path', Body: 'JSON body', Headers: 'Header' }[input.name], fields: shape });
      }
      const output = unwrap(method.type);
      const responseType = output?.getText() || 'void';
      let status = literal(annotations.find(item => item.name === 'HttpCode')?.args[0]) ?? (verb.name === 'Post' ? 201 : 200);
      const binary = canonical === '/api/v1/media-assets/uploads';
      let responseKind = status === 204 ? 'No content' : 'JSON envelope';
      if (group === 'oauth' || (group === 'social-import' && canonical.endsWith('/authorize'))) { status = 302; responseKind = 'Browser redirect'; }
      if (group === 'social-import' && canonical.endsWith('/callback')) { status = 200; responseKind = 'Popup HTML'; }
      const operation = {
        group, method: verb.name.toUpperCase(), path: canonical, aliases: expanded.filter(item => item !== canonical),
        title: info.summary || (group === 'social-import' ? 'Complete social photo import in the popup' : method.name.getText()),
        description: info.description || '', auth: annotations.some(item => item.name === 'Public') || classDecorators.some(item => item.name === 'Public') ? 'Public entry point' : 'Member session',
        status, responseKind, responseType, paginated: method.type?.getText().includes('PaginatedPayload') || false,
        responseFields: output ? fields(checker.getTypeFromTypeNode(output), 2) : [], parameters,
        binary, callback: canonical.endsWith('/callback'),
      };
      const documentedPathParams = parameters.filter(input => input.location === 'Path').flatMap(input => input.fields.map(field => field.name));
      for (const match of canonical.matchAll(/:([A-Za-z0-9]+)/g)) if (!documentedPathParams.includes(match[1])) throw new Error(`Missing path parameter ${match[1]}: ${canonical}`);
      if (typeof status !== 'number') throw new Error(`Could not resolve status: ${canonical}`);
      operations.push(operation);
    }
  }
}
if (unresolved.length) throw new Error(`Unresolved DTOs:\n${unresolved.join('\n')}`);
const identities = operations.map(item => `${item.method} ${item.path}`);
if (new Set(identities).size !== identities.length) throw new Error('Duplicate canonical endpoint');
const snapshot = {
  reviewed: process.argv[3] || new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Singapore', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date()),
  sourceRepository: 'pixeltrendanalytics-devs/yourstorieslive-api',
  sourceRevision: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: repository, encoding: 'utf8' }).trim(),
  sourceScope: 'Application controllers under src/modules, with their imported DTOs and response models. Development diagnostics and the separate AWS POC are excluded.',
  groups: Object.entries(groups).map(([id, [title, description]]) => ({ id, title, description, operations: operations.filter(item => item.group === id) })).filter(group => group.operations.length),
};
await mkdir(path.join(root, 'data'), { recursive: true });
await writeFile(path.join(root, 'data', 'api-catalogue.json'), `${JSON.stringify(snapshot, null, 2)}\n`);
console.log(`Saved ${operations.length} canonical operations in ${snapshot.groups.length} feature areas from ${snapshot.sourceRevision.slice(0, 7)}. No API was started or called.`);
