/**
 * AdapterTypes - Type definitions for the agent-failsafe adapter
 *
 * The adapter bridges FailSafe governance into Microsoft's Agent Governance Toolkit.
 * It requires Python 3.10+ and the Microsoft toolkit packages to be installed locally.
 */

export type AdapterStatus = "not-installed" | "installed" | "outdated" | "error";

export type ToolkitPackage =
  | "agent-os"
  | "agent-mesh"
  | "agent-hypervisor"
  | "agent-sre";

export interface ToolkitPackageStatus {
  name: ToolkitPackage;
  installed: boolean;
  version?: string;
  required: boolean;
}

export interface AdapterState {
  adapterInstalled: boolean;
  adapterVersion?: string;
  latestVersion?: string;
  pythonVersion?: string;
  pythonAvailable: boolean;
  pipAvailable: boolean;
  toolkitPackages: ToolkitPackageStatus[];
  mcpServerAvailable: boolean;
  lastCheckedAt: string;
  error?: string;
}

export interface AdapterInstallOptions {
  installToolkit: boolean; // Also install Microsoft Agent Governance Toolkit packages
  upgradeIfExists: boolean;
}

export interface AdapterInstallProgress {
  phase: "checking" | "installing-adapter" | "installing-toolkit" | "verifying" | "complete" | "failed";
  progress: number; // 0-100
  message: string;
  error?: string;
}

export interface AdapterConfig {
  adapterBaseUrl?: string; // default: "http://127.0.0.1:9377"
  mcpServerCommand: string[];
  failOpen: boolean;
  hmacKey?: string; // Base64 encoded
  trustThresholds: {
    cbt: number; // Below this = CBT
    kbt: number; // Below this = KBT, above = IBT
  };
}

export interface AdapterHealthCheck {
  healthy: boolean;
  mcpConnected: boolean;
  ledgerAccessible: boolean;
  policyFilesFound: boolean;
  details: string[];
}

// Command runner for subprocess execution
export type AdapterCommandRunner = (
  command: string,
  args: string[],
  cwd?: string,
  timeout?: number,
) => Promise<AdapterCommandResult>;

export interface AdapterCommandResult {
  code: number;
  stdout: string;
  stderr: string;
}
