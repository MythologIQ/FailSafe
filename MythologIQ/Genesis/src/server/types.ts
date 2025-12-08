export interface Task {
    id: string;
    name: string;
    description: string;
    status: TaskStatus;
    startTime?: Date;
    endTime?: Date;
    estimatedDuration: number; // in minutes
    estimatedHours?: number; // in hours (for convenience)
    actualDuration?: number; // in minutes - actual time taken
    dueDate?: Date; // when the task is due
    completionTime?: Date; // when the task was completed
    dependencies: string[];
    blockers: string[];
    priority: TaskPriority;
    parentTaskId?: string; // For subtask relationships
    completedAt?: string;
}

export enum TaskStatus {
    notStarted = 'not_started',
    pending = 'pending',
    inProgress = 'in_progress',
    completed = 'completed',
    blocked = 'blocked',
    delayed = 'delayed'
}

export enum TaskPriority {
    low = 'low',
    medium = 'medium',
    high = 'high',
    critical = 'critical'
}

export interface TaskNudge {
    taskId: string;
    type: 'overdue' | 'blocked' | 'stalled' | 'dependency_ready';
    message: string;
    action?: 'retry' | 'skip' | 'mark_complete' | 'explain';
    priority: 'low' | 'medium' | 'high';
}

export interface TaskDependency {
    id: string;
    taskId: string;
    dependentTaskId: string;
    type: 'blocks' | 'requires' | 'related';
    description?: string;
    createdAt: Date;
}
