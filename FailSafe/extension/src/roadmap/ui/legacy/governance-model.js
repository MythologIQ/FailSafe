const GOVERNANCE_MODES = {
  baseline: {
    label: 'Baseline',
    description: 'Default enforcement posture with full policy checks.',
  },
  strict: {
    label: 'Strict',
    description: 'Elevated verification with tighter risk thresholds.',
  },
  incident: {
    label: 'Incident',
    description: 'Containment-first controls for elevated risk handling.',
  },
  maintenance: {
    label: 'Maintenance',
    description: 'Controlled maintenance posture with bounded relaxations.',
  },
};

const POLICY_PROFILES = {
  production: {
    label: 'Production',
    description: 'Safety-first policy profile for active systems.',
  },
  staging: {
    label: 'Staging',
    description: 'Production-like profile for pre-release validation.',
  },
  development: {
    label: 'Development',
    description: 'Local iteration profile constrained by minimums.',
  },
  regulated: {
    label: 'Regulated',
    description: 'Compliance-heavy profile for regulated workloads.',
  },
};

const GOVERNANCE_PROTOCOLS = {
  'gp-01': {
    label: 'GP-01',
    title: 'Baseline Governance',
    allowedModes: ['baseline', 'maintenance'],
  },
  'gp-02': {
    label: 'GP-02',
    title: 'Strict Verification',
    allowedModes: ['strict'],
  },
  'gp-03': {
    label: 'GP-03',
    title: 'Incident Containment',
    allowedModes: ['incident'],
  },
  'gp-04': {
    label: 'GP-04',
    title: 'Recovery Enablement',
    allowedModes: ['incident', 'strict', 'baseline'],
  },
  'gp-05': {
    label: 'GP-05',
    title: 'Maintenance Window',
    allowedModes: ['maintenance'],
  },
};

const PROTOCOL_BY_MODE = {
  baseline: 'gp-01',
  strict: 'gp-02',
  incident: 'gp-03',
  maintenance: 'gp-05',
};

const GOVERNANCE_MINIMUMS = {
  mode: 'baseline',
  policyProfile: 'production',
  protocol: 'gp-01',
  enforcement: 'enforce',
  audit: 'required',
};

const normalizeKey = (value) => String(value || '').trim().toLowerCase();

export function resolveGovernanceState(hub) {
  const source = (hub && typeof hub === 'object' ? hub : {});
  const activePlan = source.activePlan && typeof source.activePlan === 'object' ? source.activePlan : {};
  const governance = activePlan.governance && typeof activePlan.governance === 'object' ? activePlan.governance : {};

  const requestedMode = normalizeKey(governance.mode || source.governanceMode);
  const requestedProfile = normalizeKey(governance.policyProfile || source.policyProfile);
  const requestedProtocol = normalizeKey(governance.protocol || source.protocolId);

  const modeKey = GOVERNANCE_MODES[requestedMode] ? requestedMode : GOVERNANCE_MINIMUMS.mode;
  const profileKey = POLICY_PROFILES[requestedProfile] ? requestedProfile : GOVERNANCE_MINIMUMS.policyProfile;

  let protocolKey = GOVERNANCE_PROTOCOLS[requestedProtocol] ? requestedProtocol : PROTOCOL_BY_MODE[modeKey];
  const protocol = GOVERNANCE_PROTOCOLS[protocolKey] || GOVERNANCE_PROTOCOLS[GOVERNANCE_MINIMUMS.protocol];
  if (!protocol.allowedModes.includes(modeKey)) {
    protocolKey = PROTOCOL_BY_MODE[modeKey] || GOVERNANCE_MINIMUMS.protocol;
  }

  const mode = GOVERNANCE_MODES[modeKey];
  const profile = POLICY_PROFILES[profileKey];
  const resolvedProtocol = GOVERNANCE_PROTOCOLS[protocolKey] || GOVERNANCE_PROTOCOLS[GOVERNANCE_MINIMUMS.protocol];

  const usedFallbacks = {
    mode: !GOVERNANCE_MODES[requestedMode],
    profile: !POLICY_PROFILES[requestedProfile],
    protocol: !GOVERNANCE_PROTOCOLS[requestedProtocol] || !resolvedProtocol.allowedModes.includes(modeKey),
  };

  return {
    modeKey,
    modeLabel: mode.label,
    modeDescription: mode.description,
    profileKey,
    profileLabel: profile.label,
    profileDescription: profile.description,
    protocolKey,
    protocolLabel: resolvedProtocol.label,
    protocolTitle: resolvedProtocol.title,
    minimums: GOVERNANCE_MINIMUMS,
    minimumApplied: usedFallbacks.mode || usedFallbacks.profile || usedFallbacks.protocol,
    fallbackReasons: Object.keys(usedFallbacks).filter((key) => usedFallbacks[key]),
    engageableProtocols: Object.keys(GOVERNANCE_PROTOCOLS).map((key) => ({
      key,
      ...GOVERNANCE_PROTOCOLS[key],
    })),
  };
}
