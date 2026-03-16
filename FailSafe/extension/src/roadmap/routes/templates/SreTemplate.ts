import { escapeHtml } from "../../../shared/utils/htmlSanitizer";

export type AsiControl = { label: string; covered: boolean; feature: string };
export type AgtSreSnapshot = {
  policies: Array<{ name: string; type: string; enforced: boolean }>;
  trustScores: Array<{ agentId: string; stage: string; meshScore: number }>;
  sli: {
    name: string;
    target: number;
    currentValue: number | null;
    meetingTarget: boolean | null;
    totalDecisions: number;
  };
  asiCoverage: Record<string, AsiControl>;
};
export type SreViewModel = { connected: boolean; snapshot: AgtSreSnapshot | null };

export async function fetchAgtSnapshot(baseUrl: string): Promise<SreViewModel> {
  try {
    const resp = await fetch(`${baseUrl}/sre/snapshot`);
    if (!resp.ok) { throw new Error(`adapter ${resp.status}`); }
    return { connected: true, snapshot: await resp.json() as AgtSreSnapshot };
  } catch {
    return { connected: false, snapshot: null };
  }
}

function buildSreDisconnectedHtml(): string {
  return `<!DOCTYPE html><html lang="en"><head><title>SRE — AGT</title>
<style>body{font-family:"Segoe UI Variable Text",sans-serif;padding:20px;background:#f9fcff;color:#16233a;}
.box{padding:16px;border:1px solid #c7d7f1;border-radius:8px;background:#fff;}
code{background:#edf4ff;padding:2px 6px;border-radius:4px;font-size:12px;}
a{color:#2c74f2;}</style></head><body>
<h1>SRE — AGT Governance View</h1><a href="/console/home">&#8592; Command Center</a>
<div class="box"><p><strong>AGT Adapter not connected.</strong></p>
<p>Start: <code>pip install "agent-failsafe[server]" &amp;&amp; python -m agent_failsafe.rest_server</code></p>
<p>Then reload this panel.</p></div></body></html>`;
}

function buildSreConnectedHtml(s: AgtSreSnapshot): string {
  const policyRows = s.policies.map(p =>
    `<tr><td>${escapeHtml(p.name)}</td><td>${escapeHtml(p.type)}</td>` +
    `<td class="${p.enforced ? "on" : "off"}">${p.enforced ? "Enforced" : "Inactive"}</td></tr>`,
  ).join("") || "<tr><td colspan='3'>No policies loaded</td></tr>";
  const asiRows = Object.entries(s.asiCoverage).map(([id, c]) =>
    `<tr><td>${id}</td><td>${escapeHtml(c.label)}</td>` +
    `<td class="${c.covered ? "on" : "off"}">${c.covered ? "&#10003;" : "&#8211;"}</td>` +
    `<td>${escapeHtml(c.feature)}</td></tr>`,
  ).join("");
  const sliValue = s.sli.currentValue !== null
    ? `${(s.sli.currentValue * 100).toFixed(1)}%`
    : "&#8212;";
  let sliStatus: string;
  if (s.sli.meetingTarget === true) { sliStatus = "&#10003; Meeting target"; }
  else if (s.sli.meetingTarget === false) { sliStatus = "&#9888; Below target"; }
  else { sliStatus = "No data"; }
  return `<!DOCTYPE html><html lang="en"><head><title>SRE &#8212; AGT</title>
<style>body{font-family:"Segoe UI Variable Text",sans-serif;padding:20px;background:#f9fcff;color:#16233a;}
h2{font-size:13px;font-weight:700;margin:18px 0 8px;}
table{border-collapse:collapse;width:100%;font-size:12px;margin-bottom:16px;}
th,td{padding:6px 10px;border:1px solid #c7d7f1;text-align:left;}th{background:#edf4ff;}
.on{color:#2c9e67;font-weight:700;}.off{color:#cb4c5b;}a{color:#2c74f2;}</style></head><body>
<h1>SRE &#8212; AGT Governance View</h1><a href="/console/home">&#8592; Command Center</a>
<h2>Active Policies</h2>
<table><thead><tr><th>Name</th><th>Type</th><th>Status</th></tr></thead><tbody>${policyRows}</tbody></table>
<h2>Compliance SLI</h2>
<p>Rate: <strong>${sliValue}</strong> &#8212; ${sliStatus} (target: ${(s.sli.target * 100).toFixed(0)}%, decisions: ${s.sli.totalDecisions})</p>
<h2>OWASP ASI Coverage</h2>
<table><thead><tr><th>Control</th><th>Label</th><th>Status</th><th>Feature</th></tr></thead><tbody>${asiRows}</tbody></table>
</body></html>`;
}

export function buildSreHtml(model: SreViewModel): string {
  if (!model.connected) { return buildSreDisconnectedHtml(); }
  return buildSreConnectedHtml(model.snapshot!);
}
