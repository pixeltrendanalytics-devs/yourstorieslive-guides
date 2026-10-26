const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const inline = value => escape(value).replace(/`([^`]+)`/g, '<code>$1</code>');
const idFor = operation => `api-${operation.method.toLowerCase()}-${operation.path.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}`;

function simpleType(field) {
  if (field.fields.length) return field.type.endsWith('[]') ? 'array of objects' : 'object';
  if (field.type.startsWith('(typeof ') || field.constraints.some(item => item.startsWith('Allowed:'))) return field.type.endsWith('[]') ? 'string[]' : 'string';
  return field.type;
}
function brief(field) {
  const text = field.description || '';
  // Keep the reference focused on callers, not internal implementation notes.
  if (/rules\.md|decorator|§|@ValidateNested|mapper then crashes/.test(text)) return '';
  return inline(text);
}
function fieldRows(fields, prefix = '', parentOptional = false) {
  return fields.map(field => {
    const name = `${prefix}${field.name}`;
    const presence = field.constraints.some(item => item.startsWith('Conditional')) ? 'Conditional' : !field.required ? 'Optional' : parentOptional ? 'Required if parent supplied' : 'Required';
    const notes = [brief(field), ...field.constraints.map(inline)].filter(Boolean).join('<br>');
    const row = `<tr><td><code>${escape(name)}</code></td><td>${escape(simpleType(field))}</td><td>${presence}</td><td>${notes || '—'}</td></tr>`;
    const nestedPrefix = `${name}${field.type.endsWith('[]') ? '[]' : ''}.`;
    return row + fieldRows(field.fields, nestedPrefix, parentOptional || !field.required);
  }).join('');
}
function parameters(operation) {
  const binary = operation.binary ? '<p><strong>Body:</strong> raw file/chunk bytes with <code>Content-Type: application/octet-stream</code>. The two fields below belong in the query string, not a multipart or JSON body.</p>' : '';
  return binary + operation.parameters.map(input => `<h4>${escape(input.location)} inputs</h4><div class="table-scroll"><table><thead><tr><th>Field</th><th>Type</th><th>Presence</th><th>Notes</th></tr></thead><tbody>${fieldRows(input.fields)}</tbody></table></div>`).join('') + (!operation.parameters.length && !operation.binary ? '<p>No additional path, query or JSON-body fields are declared for this route. The session header still applies to member endpoints.</p>' : '');
}
function responseLabel(operation) {
  if (operation.responseKind !== 'JSON envelope') return operation.responseKind;
  if (operation.responseType === 'AuthResultModel') return 'Session tokens or a two-factor challenge';
  const label = operation.responseType.replace(/Model\b/g, '').replace(/Dto\b/g, '').replace(/([a-z])([A-Z])/g, '$1 $2');
  return operation.paginated ? `Paginated ${label.replace(/\[\]$/, '')} records` : operation.responseType.endsWith('[]') ? `List of ${label.replace(/\[\]$/, '')} records` : label;
}
function result(operation) {
  if (operation.responseKind === 'Browser redirect') return '<p>The browser receives a redirect rather than the standard JSON envelope. Continue the configured OAuth flow; provider configuration or authentication failures may redirect to an error page.</p>';
  if (operation.responseKind === 'Popup HTML') return '<p>Returns an HTML page that reports the import outcome to the opener and closes the popup. This is a provider callback, not a normal JSON client request.</p>';
  if (operation.status === 204) return '<p>Successful requests return HTTP 204 with no response body.</p>';
  const fields = operation.responseFields;
  return `<p><strong>Result:</strong> ${escape(responseLabel(operation))}. Payload is under <code>data</code>${operation.paginated ? '; paging information is under <code>meta.pagination</code>' : ''}.</p>${fields.length ? `<details class="api-response-fields"><summary>Declared response fields${operation.responseType.endsWith('[]') || operation.paginated ? ' per item' : ''}</summary><div class="table-scroll"><table><thead><tr><th>Field</th><th>Type</th><th>Presence</th></tr></thead><tbody>${fields.map(field => `<tr><td><code>${escape(field.name)}</code></td><td>${escape(simpleType(field))}</td><td>${field.required ? 'Declared' : 'Optional'}</td></tr>`).join('')}</tbody></table></div></details>` : ''}`;
}
function endpoint(operation) {
  const route = escape(operation.path).replaceAll('/', '/<wbr>');
  const effect = operation.responseKind.includes('redirect') || operation.responseKind === 'Browser redirect' || operation.responseKind === 'Popup HTML' ? 'Browser handoff; use the intended sign-in or import flow.' : operation.method === 'GET' ? 'Retrieves data within the caller’s permitted scope.' : operation.method === 'DELETE' ? 'Removes or hides records. Check linked content and operation notes before repeating.' : 'Action request: may create or update data, send invitations or change access. Read the operation notes before repeating.';
  return `<details class="api-endpoint" id="${idFor(operation)}" data-api-method="${operation.method}"><summary><span class="api-method api-method-${operation.method.toLowerCase()}">${operation.method}</span><span class="api-endpoint-heading"><code class="api-route">${route}</code><strong>${escape(operation.title)}</strong></span></summary><div class="api-endpoint-body"><p class="api-meta"><span>${escape(operation.auth)}</span><span>Success: HTTP ${operation.status}</span><span>${escape(operation.responseKind)}</span><a href="#${idFor(operation)}">Link to this endpoint</a></p>${operation.description ? `<p>${inline(operation.description)}</p>` : ''}<p class="api-effect">${effect}</p>${operation.auth === 'Public entry point' ? '<p>“Public entry point” means an existing member bearer token is not required. Passwords, OTP/link credentials or provider state can still be required by this workflow.</p>' : ''}${operation.aliases.length ? `<p><strong>Compatibility aliases:</strong> ${operation.aliases.map(alias => `<code>${escape(alias)}</code>`).join(', ')}.</p>` : ''}${parameters(operation)}<h4>Expected response</h4>${result(operation)}</div></details>`;
}

export function renderApiReference(snapshot) {
  const operations = snapshot.groups.flatMap(group => group.operations);
  if (!/^[a-f0-9]{40}$/.test(snapshot.sourceRevision)) throw new Error('API snapshot has no source revision');
  if (new Set(operations.map(idFor)).size !== operations.length) throw new Error('Duplicate API deep links');
  for (const operation of operations) {
    if (!['GET', 'POST', 'PATCH', 'PUT', 'DELETE'].includes(operation.method) || !operation.path.startsWith('/api/v1/')) throw new Error('Unexpected operation in documentation snapshot');
  }
  const jumpLinks = snapshot.groups.map(group => `<a href="#api-group-${escape(group.id)}">${escape(group.title)} <span>${group.operations.length}</span></a>`).join('');
  const options = snapshot.groups.map(group => `<option value="${escape(group.id)}">${escape(group.title)}</option>`).join('');
  const controls = `<div class="api-browser" data-api-browser><p class="api-catalogue-intro"><strong>${operations.length} endpoints · ${snapshot.groups.length} feature areas.</strong> Expand an entry for its inputs, success response and behavior. Search runs locally on this page.</p><div class="api-search-controls"><label>Search endpoints<input type="search" id="api-search" placeholder="Try sign-in, media, contactId or /timeline" autocomplete="off"></label><label>Feature area<select id="api-area"><option value="all">All areas</option>${options}</select></label><label>Method<select id="api-method"><option value="all">All methods</option>${['GET', 'POST', 'PATCH', 'PUT', 'DELETE'].map(method => `<option>${method}</option>`).join('')}</select></label><button type="button" id="api-clear">Clear</button></div><p class="api-result-count" id="api-result-count" role="status" aria-live="polite">${operations.length} endpoints shown</p><nav class="api-jump-links" aria-label="API feature areas">${jumpLinks}</nav><p id="api-empty" hidden>No endpoints match. Clear the filters or try a different search.</p>`;
  const sections = snapshot.groups.map(group => `<section class="api-domain" id="api-group-${escape(group.id)}" data-api-group="${escape(group.id)}"><h3>${escape(group.title)} <span class="api-group-count">${group.operations.length}</span></h3><p>${escape(group.description)}</p>${group.operations.map(endpoint).join('')}</section>`).join('');
  const evidence = `<p>Reviewed ${escape(snapshot.reviewed)} against BFF commit <code>${escape(snapshot.sourceRevision.slice(0, 7))}</code>. ${escape(snapshot.sourceScope)} The ${operations.length} canonical operations are counted once; OAuth compatibility aliases are listed on their corresponding entries. This is source-based documentation, not a live verification of a deployed environment.</p>`;
  return { html: `${controls}${sections}</div>`, evidence, count: operations.length };
}
