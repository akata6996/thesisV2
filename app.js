const nodes = [
  { node_id: 'node-001', status: 'ENROLLED', session_status: 'ACTIVE', last_seq: 4412, last_seen: '2026-02-22T11:16:03Z', expected_interval_ms: 1000, admitted_count: 4200, rejected_count: 33, disconnect_ts: '-' },
  { node_id: 'node-007', status: 'ENROLLED', session_status: 'INTERRUPTED', last_seq: 98, last_seen: '2026-02-22T10:01:20Z', expected_interval_ms: 500, admitted_count: 92, rejected_count: 6, disconnect_ts: '2026-02-22T10:03:11Z' },
  { node_id: 'node-013', status: 'SUSPENDED', session_status: 'INTERRUPTED', last_seq: 0, last_seen: '2026-02-20T08:00:00Z', expected_interval_ms: 1000, admitted_count: 0, rejected_count: 0, disconnect_ts: '2026-02-20T08:05:10Z' }
];
const logs = Array.from({ length: 18 }).map((_, i) => ({
  record_id: `rec-${1000 + i}`,
  node_id: i % 2 ? 'node-001' : 'node-007',
  session_id: i % 2 ? 'sess-a1' : 'sess-b2',
  timestamp_device: `2026-02-22T11:${(i + 10).toString().padStart(2, '0')}:00Z`,
  timestamp_gateway_arrival: `2026-02-22T11:${(i + 10).toString().padStart(2, '0')}:02Z`,
  seq_num: i + 1,
  sensor_value: (40 + i * 0.3).toFixed(2),
  admission: i % 5 === 0 ? 'REJECT' : 'ACCEPT',
  rejection_reason: i % 5 === 0 ? 'RATE_OF_CHANGE_EXCEEDED' : '-',
  enforcement_layer_failed: i % 5 === 0 ? 'ANOMALY_GUARD' : '-',
  anomaly_flags: i % 5 === 0 ? 'spike' : 'none',
  prev_hash: `prev_${i.toString(16).padStart(8, '0')}`,
  curr_hash: `curr_${(i + 1).toString(16).padStart(8, '0')}`,
  payload: { sensor_id: 'temp-1', unit: 'C' },
  enforcement_metadata: { expected_interval_ms: 1000, within_window: i % 5 !== 0 }
}));

const batches = [
  { batch_id: 'B-3140', interval_start: '09:00', interval_end: '10:00', merkle_root: 'mrkl_aaa111', leaf_count: 1024, anchor_status: 'CONFIRMED', solana_tx_id: '4Gf...Qk2', anchored_at: '10:04', retries: 0 },
  { batch_id: 'B-3141', interval_start: '10:00', interval_end: '11:00', merkle_root: 'mrkl_bbb222', leaf_count: 998, anchor_status: 'SUBMITTED', solana_tx_id: '8At...P10', anchored_at: '-', retries: 1 },
  { batch_id: 'B-3142', interval_start: '11:00', interval_end: '12:00', merkle_root: 'mrkl_ccc333', leaf_count: 645, anchor_status: 'QUEUED', solana_tx_id: '-', anchored_at: '-', retries: 0 }
];

let currentPage = 1;
const pageSize = 6;
let confirmHandler = null;

const q = (s) => document.querySelector(s);
const qa = (s) => Array.from(document.querySelectorAll(s));

function badge(value) {
  const cls = value.toLowerCase();
  return `<span class="badge ${cls}">${value}</span>`;
}

function renderOverview() {
  const body = q('#overview-table-body');
  const text = q('#node-filter').value.toLowerCase();
  const filter = q('.quick-filter.active').dataset.filter;
  body.innerHTML = nodes
    .filter((n) => (filter === 'all' ? true : n.session_status === filter))
    .filter((n) => n.node_id.toLowerCase().includes(text))
    .map((n) => `<tr><td>${n.node_id}</td><td>${badge(n.status)}</td><td>${badge(n.session_status)}</td><td>${n.last_seq}</td><td>${n.last_seen}</td><td>${n.expected_interval_ms}</td><td>${n.admitted_count}</td><td>${n.rejected_count}</td><td>${n.disconnect_ts}</td></tr>`)
    .join('');
}

function renderLogs() {
  const nodeF = q('#log-node-filter').value.toLowerCase();
  const sessF = q('#log-session-filter').value.toLowerCase();
  const adm = q('#log-admission-filter').value;
  const filtered = logs.filter((r) => r.node_id.toLowerCase().includes(nodeF) && r.session_id.toLowerCase().includes(sessF) && (adm === 'all' || r.admission === adm));
  const pageRows = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  q('#log-table-body').innerHTML = pageRows.map((r, idx) => `<tr>
    <td>${r.record_id}</td><td>${r.node_id}</td><td>${r.session_id}</td><td>${r.timestamp_device}</td><td>${r.timestamp_gateway_arrival}</td><td>${r.seq_num}</td><td>${r.sensor_value}</td>
    <td>${badge(r.admission)}</td><td>${r.rejection_reason}</td><td>${r.enforcement_layer_failed}</td><td>${r.anomaly_flags}</td>
    <td>${r.prev_hash} <button class="btn small copy" data-copy="${r.prev_hash}">Copy</button></td>
    <td>${r.curr_hash} <button class="btn small copy" data-copy="${r.curr_hash}">Copy</button></td>
    <td><button class="btn small view-json" data-idx="${logs.indexOf(r)}">View JSON</button></td></tr>`).join('');
  q('#page-info').textContent = `Page ${currentPage} / ${Math.max(1, Math.ceil(filtered.length / pageSize))}`;
}

function renderBatches() {
  q('#batch-table-body').innerHTML = batches.map((b, i) => `<tr><td>${b.batch_id}</td><td>${b.interval_start}</td><td>${b.interval_end}</td><td>${b.merkle_root}</td><td>${b.leaf_count}</td><td>${badge(b.anchor_status)}</td><td>${b.solana_tx_id}</td><td>${b.anchored_at}</td><td>${b.retries}</td><td><button class="btn small batch-detail" data-i="${i}">View</button></td></tr>`).join('');
  q('#batch-timeline').innerHTML = batches.map((b) => `<li>${b.batch_id} — ${b.anchor_status} — root ${b.merkle_root}</li>`).join('');
}

function renderRegistry() {
  q('#registry-body').innerHTML = nodes.map((n) => `<tr><td>${n.node_id}</td><td>2026-01-14</td><td>${n.expected_interval_ms}</td><td>${badge(n.status)}</td><td>${n.last_seen}</td><td>Site A sector 3</td><td><button class="btn small action" data-action="suspend" data-node="${n.node_id}">Suspend</button> <button class="btn small secondary action" data-action="reactivate" data-node="${n.node_id}">Reactivate</button></td></tr>`).join('');
}

function renderSessionPanel() {
  q('#session-panel-body').innerHTML = nodes.map((n) => `<tr><td>${n.node_id}</td><td>sess-${n.node_id.slice(-3)}-X</td><td>${n.last_seq}</td><td>${n.last_seen}</td><td>${badge(n.session_status)}</td></tr>`).join('');
  q('#reset-node').innerHTML = nodes.map((n) => `<option>${n.node_id}</option>`).join('');
}

function renderDownloads() {
  const rows = [
    ['Download Audit Log (hash-linked log export)', 'audit_log_2026-02-22.csv'],
    ['Download Merkle Batch Files', 'merkle_batches_2026-02.zip'],
    ['Download Inclusion Proofs', 'inclusion_proofs_B3140-3142.zip'],
    ['Download Anchoring References (tx IDs)', 'anchoring_refs.json'],
    ['Download Deployment Summary Report', 'deployment_summary.pdf'],
    ['Download Merkle Verification Script', 'verify_merkle.py']
  ];
  q('#downloads-body').innerHTML = rows.map((r) => `<tr><td>${r[0]}</td><td>${r[1]}</td><td>2026-02-22T11:12:00Z</td><td>1.8 MB</td><td>b38f...9da1</td><td><button class="btn small secondary">Download</button></td></tr>`).join('');
}

function showReceipt(actionType, nodeId) {
  const ts = new Date().toISOString();
  q('#receipt-area').classList.remove('hidden');
  q('#receipt-area').innerHTML = `<h3>Action Receipt</h3><p>timestamp: <strong>${ts}</strong></p><p>node_id: <strong>${nodeId}</strong></p><p>action type: <strong>${actionType}</strong></p><p>receipt_id: <strong>rcpt-${Math.random().toString(36).slice(2, 8)}</strong></p>`;
}

function confirmAction(text, onConfirm) {
  q('#confirm-text').textContent = text;
  q('#confirm-modal').classList.remove('hidden');
  confirmHandler = onConfirm;
}

qa('.nav-item').forEach((btn) => btn.addEventListener('click', () => {
  qa('.nav-item').forEach((b) => b.classList.remove('active'));
  btn.classList.add('active');
  qa('.tab-panel').forEach((p) => p.classList.remove('active'));
  q(`#${btn.dataset.tab}`).classList.add('active');
}));

qa('#global-time-filter .chip').forEach((chip) => chip.addEventListener('click', () => {
  qa('#global-time-filter .chip').forEach((c) => c.classList.remove('active'));
  chip.classList.add('active');
  q('.custom-range').classList.toggle('hidden', chip.dataset.range !== 'custom');
}));

qa('.quick-filter').forEach((b) => b.addEventListener('click', () => {
  qa('.quick-filter').forEach((i) => i.classList.remove('active'));
  b.classList.add('active');
  renderOverview();
}));
q('#node-filter').addEventListener('input', renderOverview);

['#log-node-filter', '#log-session-filter', '#log-admission-filter'].forEach((id) => q(id).addEventListener('input', () => { currentPage = 1; renderLogs(); }));
q('#prev-page').addEventListener('click', () => { currentPage = Math.max(1, currentPage - 1); renderLogs(); });
q('#next-page').addEventListener('click', () => { currentPage++; renderLogs(); });
q('#export-log-csv').addEventListener('click', () => alert('Mock CSV export generated for current table view.'));

document.body.addEventListener('click', (e) => {
  if (e.target.matches('.copy')) navigator.clipboard.writeText(e.target.dataset.copy);
  if (e.target.matches('.view-json')) {
    const row = logs[Number(e.target.dataset.idx)];
    q('#log-json').textContent = JSON.stringify(row, null, 2);
  }
  if (e.target.matches('.batch-detail')) {
    const b = batches[Number(e.target.dataset.i)];
    q('#batch-json').textContent = JSON.stringify({ ...b, leaf_hashes_file: `${b.batch_id}_leaves.txt`, proof_bundle: `${b.batch_id}_proofs.zip` }, null, 2);
  }
  if (e.target.matches('.action')) {
    const action = e.target.dataset.action;
    const node = e.target.dataset.node;
    confirmAction(`Confirm ${action.toUpperCase()} for ${node}?`, () => showReceipt(action.toUpperCase(), node));
  }
});

q('#enroll-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const fd = new FormData(e.target);
  const node = fd.get('node_id');
  confirmAction(`Confirm ENROLL_NODE for ${node}?`, () => showReceipt('ENROLL_NODE', node));
});

q('#reset-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const fd = new FormData(e.target);
  const node = fd.get('node_id');
  confirmAction(`Confirm SESSION_RESET for ${node}? Reason: ${fd.get('reason')}`, () => {
    showReceipt('SESSION_RESET', node);
    q('#recent-resets').insertAdjacentHTML('afterbegin', `<tr><td>${new Date().toISOString()}</td><td>${node}</td><td>${fd.get('reason')}</td><td>op-demo</td><td>rcpt-${Math.random().toString(36).slice(2, 8)}</td></tr>`);
  });
});

q('#export-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const node = new FormData(e.target).get('node_ids');
  confirmAction(`Confirm GENERATE_EXPORT for ${node}?`, () => showReceipt('GENERATE_EXPORT', node));
});

q('#verify-form').addEventListener('submit', (e) => {
  e.preventDefault();
  q('#computed-root').textContent = 'mrkl_ccc333';
  q('#recorded-root').textContent = 'mrkl_ccc333';
  q('#verify-result').textContent = 'MATCH';
  q('#verify-result').className = 'badge confirmed';
});

q('#accept-confirm').addEventListener('click', () => {
  q('#confirm-modal').classList.add('hidden');
  if (confirmHandler) confirmHandler();
});
q('#cancel-confirm').addEventListener('click', () => q('#confirm-modal').classList.add('hidden'));

q('#global-search').addEventListener('input', (e) => {
  const v = e.target.value.toLowerCase();
  if (!v) return;
  const matchedTab = logs.some((r) => r.node_id.toLowerCase().includes(v) || r.session_id.toLowerCase().includes(v)) ? 'log-viewer' : 'overview';
  qa('.nav-item').forEach((b) => b.classList.toggle('active', b.dataset.tab === matchedTab));
  qa('.tab-panel').forEach((p) => p.classList.remove('active'));
  q(`#${matchedTab}`).classList.add('active');
});

renderOverview();
renderLogs();
renderBatches();
renderRegistry();
renderSessionPanel();
renderDownloads();
q('#recent-resets').innerHTML = '<tr><td>2026-02-22T09:42:11Z</td><td>node-007</td><td>Manual gateway maintenance</td><td>op-admin</td><td>rcpt-a12ce4</td></tr>';
