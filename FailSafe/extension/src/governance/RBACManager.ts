type Role = 'admin' | 'developer' | 'viewer';
type Permission = 'read' | 'write' | 'approve' | 'configure' | 'export';

const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  admin: ['read', 'write', 'approve', 'configure', 'export'],
  developer: ['read', 'write'],
  viewer: ['read'],
};

interface AgentRole {
  agentDid: string;
  role: Role;
  assignedAt: string;
}

export class RBACManager {
  private assignments: Map<string, AgentRole> = new Map();

  assign(agentDid: string, role: Role): void {
    this.assignments.set(agentDid, {
      agentDid,
      role,
      assignedAt: new Date().toISOString(),
    });
  }

  getRole(agentDid: string): Role | undefined {
    return this.assignments.get(agentDid)?.role;
  }

  hasPermission(agentDid: string, permission: Permission): boolean {
    const assignment = this.assignments.get(agentDid);
    if (!assignment) return false;
    return ROLE_PERMISSIONS[assignment.role].includes(permission);
  }

  getAllAssignments(): AgentRole[] {
    return Array.from(this.assignments.values());
  }
}
