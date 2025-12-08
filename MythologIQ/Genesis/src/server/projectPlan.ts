import * as vscode from 'vscode'; // Kept for extension integration only
import * as fs from 'fs';
import * as path from 'path';
import { Logger } from './logger';
import { Task, TaskStatus, TaskPriority } from './types';
import { IWorkspaceService, IInputService } from '../core/interfaces';

// Basic project integration for FailSafe
export interface BasicProjectPlan {
    id: string;
    name: string;
    description: string;
    currentTask: Task | null;
    tasks: Task[];
    lastUpdated: Date;
    createdBy: string;
    version: string;
}

export interface ProjectIntegration {
    getCurrentTask(): Task | null;
    getProjectStatus(): 'active' | 'blocked' | 'complete';
    validateTaskCompletion(): boolean;
    reportActivity(activity: string): void;
    getProjectConstraints(): string[];
    checkProjectRisks(): string[];
}

export interface BlockerAnalysis {
    isBlocked: boolean;
    blockers: string[];
    feasibility: 'feasible' | 'questionable' | 'infeasible';
    recommendations: string[];
    estimatedImpact: 'low' | 'medium' | 'high';
}

export interface LinearProgressState {
    currentTask: Task | null;
    nextTask: Task | null;
    blockedTasks: Task[];
    completedTasks: Task[];
    totalProgress: number;
    estimatedCompletion: Date | null;
    lastActivity: Date;
    isOnTrack: boolean;
    deviations: string[];
}

export class ProjectPlan {
    private readonly logger: Logger;
    private readonly workspaceService: IWorkspaceService;
    private readonly inputService: IInputService;
    private currentPlan: BasicProjectPlan | null = null;
    private readonly projectFile: string;
    private readonly linearMode = true;
    private lastActivity: Date = new Date();
    private readonly projectManagerExtension: ProjectIntegration | null = null;

    constructor(
        logger: Logger,
        workspaceService: IWorkspaceService,
        inputService: IInputService
    ) {
        this.logger = logger;
        this.workspaceService = workspaceService;
        this.inputService = inputService;
        // Primary Source: task.md in root
        const rootPath = this.workspaceService.getRootPath() || '';
        this.taskFile = this.workspaceService.pathJoin(rootPath, 'task.md');
        // Secondary Source: internal JSON
        this.projectFile = this.workspaceService.pathJoin(rootPath, '.failsafe', 'basic-project.json');
        this.initializeProjectManagerIntegration();
    }
    
    private readonly taskFile: string;

    private async initializeProjectManagerIntegration(): Promise<void> {
        try {
            // Check if Project Management Extension is available
            const extensions = vscode.extensions.all;
            const projectManagerExt = extensions.find(ext => 
                ext.id === 'mythologiq.project-manager' || 
                ext.id.includes('project-manager')
            );

            if (projectManagerExt) {
                // Initialize integration with Project Management Extension
                this.logger.info('Project Management Extension found, initializing integration');
                
                // Basic extension-to-extension communication
                try {
                    // Try to activate the extension and get its API
                    if (!projectManagerExt.isActive) {
                        await projectManagerExt.activate();
                    }
                    
                    // Attempt to communicate via commands
                    const commands = await vscode.commands.getCommands(true);
                    const hasProjectCommands = commands.some(cmd => 
                        cmd.includes('project') || cmd.includes('task') || cmd.includes('mythologiq')
                    );
                    
                    if (hasProjectCommands) {
                        this.logger.info('Project Management Extension commands detected, integration available');
                        // Set up basic integration
                        this.setupExtensionIntegration(projectManagerExt);
                    } else {
                        this.logger.info('Project Management Extension found but no integration commands available');
                    }
                } catch (error) {
                    this.logger.warn('Failed to initialize extension integration, using basic mode', error);
                }
            } else {
                this.logger.info('No Project Management Extension found, using basic project tracking');
            }
        } catch (error) {
            this.logger.error('Failed to initialize project manager integration', error);
        }
    }

    private setupExtensionIntegration(extension: vscode.Extension<any>): void {
        // Set up basic integration with the project management extension
        this.logger.info('Setting up extension integration');
        
        // Register commands that can be called by the other extension
        vscode.commands.registerCommand('failsafe.getProjectStatus', () => {
            return this.getProjectStatus();
        });
        
        vscode.commands.registerCommand('failsafe.getCurrentTask', () => {
            return this.getCurrentTask();
        });
        
        vscode.commands.registerCommand('failsafe.recordActivity', (activity: string) => {
            this.recordActivity(activity);
        });
        
        this.logger.info('Extension integration commands registered');
    }

    public async initialize(): Promise<void> {
        try {
            await this.loadProject();
            this.logger.info('Basic project plan initialized');
        } catch (error) {
            this.logger.error('Failed to initialize basic project plan', error);
        }
    }

    public async createBasicProject(): Promise<void> {
        try {
            const name = await this.inputService.showInputBox({
                prompt: 'Enter project name',
                placeHolder: 'My Project',
                validateInput: (value) => value.trim().length > 0 ? null : 'Project name is required'
            });
            if (!name) return;

            const description = await this.inputService.showInputBox({
                prompt: 'Enter project description (optional)',
                placeHolder: 'Brief description of the project'
            });

            const plan: BasicProjectPlan = {
                id: this.generateProjectId(),
                name: name.trim(),
                description: description || '',
                currentTask: null,
                tasks: this.generateBasicTasks(),
                lastUpdated: new Date(),
                createdBy: 'User',
                version: '1.0'
            };

            this.currentPlan = plan;
            await this.saveProject();
            this.logger.info('Basic project plan created', { planId: plan.id, name: plan.name });

        } catch (error) {
            this.logger.error('Failed to create basic project', error);
        }
    }

    private generateProjectId(): string {
        return `basic_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    private generateBasicTasks(): Task[] {
        return [
            {
                id: 'setup',
                name: 'Project Setup',
                description: 'Initialize development environment and project structure',
                status: TaskStatus.inProgress,
                startTime: new Date(),
                endTime: undefined,
                estimatedDuration: 60,
                dependencies: [],
                blockers: [],
                priority: TaskPriority.high
            },
            {
                id: 'development',
                name: 'Development',
                description: 'Main development work',
                status: TaskStatus.notStarted,
                startTime: new Date(),
                endTime: undefined,
                estimatedDuration: 240,
                dependencies: ['setup'],
                blockers: [],
                priority: TaskPriority.critical
            },
            {
                id: 'testing',
                name: 'Testing & QA',
                description: 'Testing and quality assurance',
                status: TaskStatus.notStarted,
                startTime: new Date(),
                endTime: undefined,
                estimatedDuration: 120,
                dependencies: ['development'],
                blockers: [],
                priority: TaskPriority.medium
            },
            {
                id: 'deployment',
                name: 'Deployment',
                description: 'Deploy and launch',
                status: TaskStatus.notStarted,
                startTime: new Date(),
                endTime: undefined,
                estimatedDuration: 60,
                dependencies: ['testing'],
                blockers: [],
                priority: TaskPriority.medium
            }
        ];
    }

    public async loadProject(): Promise<void> {
        try {
            // Priority 1: Check for task.md (The Enlightenment Path)
            if (fs.existsSync(this.taskFile)) {
                const content = fs.readFileSync(this.taskFile, 'utf8');
                this.currentPlan = this.parseMarkdownProject(content);
                this.logger.info('Project plan loaded from task.md', { planId: this.currentPlan?.id, name: this.currentPlan?.name });
                return;
            }

            // Priority 2: Check for JSON (The Legacy Path)
            if (fs.existsSync(this.projectFile)) {
                const content = fs.readFileSync(this.projectFile, 'utf8');
                const data = JSON.parse(content);
                
                // Convert dates back to Date objects (Simplified for brevity)
                if (data.lastUpdated) data.lastUpdated = new Date(data.lastUpdated);
                if (data.currentTask && data.currentTask.startTime) {
                    data.currentTask.startTime = new Date(data.currentTask.startTime);
                }
                
                if (data.tasks) {
                    data.tasks.forEach((task: Task) => {
                        if (task.startTime) task.startTime = new Date(task.startTime);
                        if (task.endTime) task.endTime = new Date(task.endTime);
                    });
                }

                this.currentPlan = data;
                this.logger.info('Basic project plan loaded from file', { planId: data.id, name: data.name });
            }
        } catch (error) {
            this.logger.error('Failed to load project file', error);
        }
    }

    private parseMarkdownProject(content: string): BasicProjectPlan {
        const lines = content.split('\n');
        const tasks: Task[] = [];
        let currentTask: Task | null = null;
        let projectId = 'task_md_project';

        // Very basic markdown parsing
        lines.forEach(line => {
            const taskMatch = line.match(/- \[(x| |\/)\] (.*)/);
            if (taskMatch) {
                const isComplete = taskMatch[1] === 'x';
                const isInProgress = taskMatch[1] === '/'; // Custom notation
                const text = taskMatch[2].trim();
                
                // Extract ID if present <!-- id: 1 -->
                const idMatch = text.match(/<!-- id: (.*) -->/);
                const id = idMatch ? idMatch[1] : `task_${tasks.length}`;
                const name = text.replace(/<!--.*-->/, '').trim();

                const task: Task = {
                    id,
                    name,
                    description: '',
                    status: isComplete ? TaskStatus.completed : (isInProgress ? TaskStatus.inProgress : TaskStatus.notStarted),
                    startTime: isInProgress ? new Date() : undefined,
                     estimatedDuration: 60,
                    dependencies: [],
                    blockers: [],
                    priority: TaskPriority.medium
                };

                tasks.push(task);
                
                if (isInProgress) {
                    currentTask = task;
                }
            }
        });

        // Use the first header as project name
        const headerMatch = content.match(/^# (.*)/m);
        const projectName = headerMatch ? headerMatch[1] : 'Workspace Project';

        return {
            id: projectId,
            name: projectName,
            description: 'Loaded from task.md',
            currentTask,
            tasks,
            lastUpdated: new Date(),
            createdBy: 'System',
            version: '1.0'
        };
    }

    public async saveProject(): Promise<void> {
        if (!this.currentPlan) return;

        try {
            // Task.md Write-Back (The Enlightenment Path)
            if (fs.existsSync(this.taskFile)) {
                let content = fs.readFileSync(this.taskFile, 'utf8');
                
                this.currentPlan.tasks.forEach(task => {
                    const statusChar = task.status === TaskStatus.completed ? 'x' : (task.status === TaskStatus.inProgress ? '/' : ' ');
                    // Regex find the task line: - [?] Task Name <!-- id: ... -->
                    const regex = new RegExp(`- \\[.\\] ${task.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')} <!-- id: ${task.id} -->`, 'g');
                    
                    if (content.match(regex)) {
                       content = content.replace(regex, `- [${statusChar}] ${task.name} <!-- id: ${task.id} -->`);
                    } else {
                        // Fallback: try to match just by name if ID fails (for manually added tasks)
                        const nameRegex = new RegExp(`- \\[.\\] ${task.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')} <!--`, 'g');
                         if (content.match(nameRegex)) {
                            content = content.replace(nameRegex, `- [${statusChar}] ${task.name} <!--`);
                         }
                    }
                });

                fs.writeFileSync(this.taskFile, content, 'utf8');
                this.logger.info('Project plan written back to task.md');
                return;
            }

            // Legacy JSON Fallback
            const projectDir = path.dirname(this.projectFile);
            if (!fs.existsSync(projectDir)) {
                fs.mkdirSync(projectDir, { recursive: true });
            }

            this.currentPlan.lastUpdated = new Date();
            fs.writeFileSync(this.projectFile, JSON.stringify(this.currentPlan, null, 2));
            this.logger.debug('Basic project plan saved to file');
        } catch (error) {
            this.logger.error('Failed to save project file', error);
        }
    }

    // Integration API for Project Management Extension
    public getProjectIntegrationAPI(): ProjectIntegration {
        return {
            getCurrentTask: () => this.getCurrentTask(),
            getProjectStatus: () => this.getProjectStatus(),
            validateTaskCompletion: () => this.validateTaskCompletion(),
            reportActivity: (activity: string) => this.recordActivity(activity),
            getProjectConstraints: () => this.getProjectConstraints(),
            checkProjectRisks: () => this.checkProjectRisks()
        };
    }

    public getCurrentTask(): Task | null {
        if (this.projectManagerExtension) {
            return this.projectManagerExtension.getCurrentTask();
        }
        return this.currentPlan?.currentTask || null;
    }

    public getAllTasks(): Task[] {
        if (this.projectManagerExtension) {
            // Get tasks from Project Management Extension
            return [];
        }
        return this.currentPlan?.tasks || [];
    }

    public getTasksByStatus(status: TaskStatus): Task[] {
        const tasks = this.getAllTasks();
        return tasks.filter(task => task.status === status);
    }

    public getReadyTasks(): Task[] {
        const tasks = this.getAllTasks();
        return tasks.filter(task => {
            if (task.status !== TaskStatus.notStarted) {
                return false;
            }
            
            // Check if all dependencies are completed
            return task.dependencies.every(depId => {
                const depTask = tasks.find(t => t.id === depId);
                return depTask && depTask.status === TaskStatus.completed;
            });
        });
    }

    public async startTask(taskId: string): Promise<void> {
        if (this.projectManagerExtension) {
            // Delegate to Project Management Extension
            this.logger.info('Delegating task start to Project Management Extension');
            return;
        }

        const task = this.currentPlan?.tasks.find(t => t.id === taskId);
        if (task && this.currentPlan) {
            task.status = TaskStatus.inProgress;
            task.startTime = new Date();
            this.currentPlan.currentTask = task;
            await this.saveProject();
            this.logger.info(`Started task: ${task.name}`);
        }
    }

    public async completeTask(taskId: string): Promise<void> {
        if (this.projectManagerExtension) {
            // Delegate to Project Management Extension
            this.logger.info('Delegating task completion to Project Management Extension');
            return;
        }

        const task = this.currentPlan?.tasks.find(t => t.id === taskId);
        if (task && this.currentPlan) {
            task.status = TaskStatus.completed;
            task.endTime = new Date();
            if (this.currentPlan.currentTask?.id === taskId) {
                this.currentPlan.currentTask = null;
            }
            await this.saveProject();
            this.logger.info(`Completed task: ${task.name}`);
        }
    }

    public async blockTask(taskId: string, reason: string): Promise<void> {
        if (this.projectManagerExtension) {
            // Delegate to Project Management Extension
            this.logger.info('Delegating task blocking to Project Management Extension');
            return;
        }

        const task = this.currentPlan?.tasks.find(t => t.id === taskId);
        if (task) {
            task.status = TaskStatus.blocked;
            task.blockers.push(reason);
            await this.saveProject();
            this.logger.info(`Blocked task: ${task.name} - ${reason}`);
        }
    }

    public async unblockTask(taskId: string): Promise<void> {
        if (this.projectManagerExtension) {
            // Delegate to Project Management Extension
            this.logger.info('Delegating task unblocking to Project Management Extension');
            return;
        }

        const task = this.currentPlan?.tasks.find(t => t.id === taskId);
        if (task && task.status === TaskStatus.blocked) {
            task.status = TaskStatus.notStarted;
            task.blockers = [];
            await this.saveProject();
            this.logger.info(`Unblocked task: ${task.name}`);
        }
    }

    public getProjectProgress(): { totalTasks: number; completedTasks: number; inProgressTasks: number; blockedTasks: number; progressPercentage: number; estimatedRemainingTime: number; } {
        const tasks = this.getAllTasks();
        const totalTasks = tasks.length;
        const inProgressTasks = tasks.filter(t => t.status === TaskStatus.inProgress).length;
        const blockedTasks = tasks.filter(t => t.status === TaskStatus.blocked).length;
        const completedTasks = tasks.filter(t => t.status === TaskStatus.completed).length;
        const progressPercentage = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

        // Calculate estimated remaining time
        const remainingTasks = tasks.filter(t => t.status !== TaskStatus.completed);
        const estimatedRemainingTime = remainingTasks.reduce((total, task) => total + (task.estimatedDuration || 0), 0);

        return {
            totalTasks,
            completedTasks,
            inProgressTasks,
            blockedTasks,
            progressPercentage,
            estimatedRemainingTime
        };
    }

    public getCriticalPath(): Task[] {
        // Simplified critical path for basic project tracking
        const tasks = this.getAllTasks();
        const inProgressTasks = tasks.filter(t => t.status === TaskStatus.inProgress);
        const blockedTasks = tasks.filter(t => t.status === TaskStatus.blocked);
        
        return [...inProgressTasks, ...blockedTasks];
    }

    public addTask(task: Task): void {
        if (this.projectManagerExtension) {
            // Delegate to Project Management Extension
            this.logger.info('Delegating task addition to Project Management Extension');
            return;
        }

        if (this.currentPlan) {
            this.currentPlan.tasks.push(task);
            this.saveProject();
        }
    }

    public removeTask(taskId: string): void {
        if (this.projectManagerExtension) {
            // Delegate to Project Management Extension
            this.logger.info('Delegating task removal to Project Management Extension');
            return;
        }

        if (this.currentPlan) {
            this.currentPlan.tasks = this.currentPlan.tasks.filter(task => task.id !== taskId);
            this.saveProject();
        }
    }

    public updateTask(taskId: string, updates: Partial<Task>): void {
        if (!this.currentPlan) return;

        const taskIndex = this.currentPlan.tasks.findIndex(t => t.id === taskId);
        if (taskIndex !== -1) {
            this.currentPlan.tasks[taskIndex] = { ...this.currentPlan.tasks[taskIndex], ...updates };
            this.currentPlan.lastUpdated = new Date();
            this.saveProject();
            this.logger.info('Task updated', { taskId, updates });
        }
    }

    public async addSubtasks(parentTaskId: string, subtasks: Partial<Task>[]): Promise<Task[]> {
        if (!this.currentPlan) {
            throw new Error('No project plan loaded');
        }

        const parentTask = this.currentPlan.tasks.find(t => t.id === parentTaskId);
        if (!parentTask) {
            throw new Error(`Parent task ${parentTaskId} not found`);
        }

        const addedSubtasks: Task[] = [];
        
        for (const subtaskData of subtasks) {
            const subtask: Task = {
                id: `${parentTaskId}-subtask-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
                name: subtaskData.name || 'Unnamed Subtask',
                description: subtaskData.description || '',
                status: subtaskData.status || TaskStatus.notStarted,
                startTime: new Date(),
                endTime: undefined,
                estimatedDuration: (subtaskData.estimatedHours || 1) * 60, // Convert hours to minutes
                dependencies: subtaskData.dependencies || [],
                blockers: [],
                priority: subtaskData.priority || TaskPriority.medium,
                parentTaskId: parentTaskId
            };

            this.currentPlan.tasks.push(subtask);
            addedSubtasks.push(subtask);
        }

        this.currentPlan.lastUpdated = new Date();
        await this.saveProject();
        
        this.logger.info('Subtasks added', { 
            parentTaskId, 
            subtaskCount: addedSubtasks.length,
            subtaskIds: addedSubtasks.map(t => t.id)
        });

        return addedSubtasks;
    }

    public enforceLinearProgression(): void {
        if (this.projectManagerExtension) {
            // Delegate to Project Management Extension
            this.logger.info('Delegating linear progression to Project Management Extension');
            return;
        }

        // Basic linear progression enforcement
        const tasks = this.getAllTasks();
        const inProgressTasks = tasks.filter(t => t.status === TaskStatus.inProgress);
        
        if (inProgressTasks.length > 1) {
            // Multiple tasks in progress - enforce linear progression
            inProgressTasks.slice(1).forEach(task => {
                task.status = TaskStatus.notStarted;
            });
            this.logger.info('Enforced linear progression - only one task in progress');
        }
    }

    public analyzeFeasibility(): BlockerAnalysis {
        if (this.projectManagerExtension) {
            // Delegate to Project Management Extension
            this.logger.info('Delegating feasibility analysis to Project Management Extension');
            return {
                isBlocked: false,
                blockers: [],
                feasibility: 'feasible',
                recommendations: [],
                estimatedImpact: 'low'
            };
        }

        // Basic feasibility analysis
        const currentTask = this.getCurrentTask();
        const blockers: string[] = [];
        
        if (currentTask && currentTask.status === TaskStatus.blocked) {
            blockers.push(...currentTask.blockers);
        }

        const feasibility: 'feasible' | 'questionable' | 'infeasible' = 
            blockers.length === 0 ? 'feasible' : 
            blockers.length <= 2 ? 'questionable' : 'infeasible';

        return {
            isBlocked: blockers.length > 0,
            blockers,
            feasibility,
            recommendations: blockers.length > 0 ? ['Resolve blockers before proceeding'] : [],
            estimatedImpact: blockers.length === 0 ? 'low' : blockers.length <= 2 ? 'medium' : 'high'
        };
    }

    public getLinearProgressState(): LinearProgressState {
        const tasks = this.getAllTasks();
        const currentTask = tasks.find(t => t.status === TaskStatus.inProgress) || null;
        const completedTasks = tasks.filter(t => t.status === TaskStatus.completed);
        const blockedTasks = tasks.filter(t => t.status === TaskStatus.blocked);
        const nextTask = tasks.find(t => t.status === TaskStatus.notStarted) || null;

        const totalProgress = tasks.length > 0 ? (completedTasks.length / tasks.length) * 100 : 0;

        return {
            currentTask,
            nextTask,
            blockedTasks,
            completedTasks,
            totalProgress,
            estimatedCompletion: null, // Basic version doesn't track end dates
            lastActivity: this.lastActivity,
            isOnTrack: true, // Basic version assumes on track
            deviations: []
        };
    }

    public recordActivity(activity: string, taskId?: string): void {
        this.lastActivity = new Date();
        this.logger.info('Activity recorded', { activity, taskId, timestamp: this.lastActivity });
    }

    public getAccountabilityReport(): {
        lastActivity: Date;
        timeSinceLastActivity: number;
        currentTaskDuration: number | null;
        overdueTasks: Task[];
        recommendations: string[];
    } {
        const currentTask = this.getCurrentTask();
        const timeSinceLastActivity = Date.now() - this.lastActivity.getTime();
        
        let currentTaskDuration: number | null = null;
        if (currentTask && currentTask.startTime) {
            currentTaskDuration = Date.now() - currentTask.startTime.getTime();
        }

        const overdueTasks: Task[] = [];
        const recommendations: string[] = [];

        if (currentTask && currentTaskDuration && currentTaskDuration > 4 * 60 * 60 * 1000) { // 4 hours
            recommendations.push('Current task has been in progress for over 4 hours. Consider taking a break or asking for help.');
        }

        if (timeSinceLastActivity > 30 * 60 * 1000) { // 30 minutes
            recommendations.push('No recent activity detected. Consider resuming work or updating task status.');
        }

        return {
            lastActivity: this.lastActivity,
            timeSinceLastActivity,
            currentTaskDuration,
            overdueTasks,
            recommendations
        };
    }

    public async validatePlan(): Promise<{
        status: 'missing' | 'empty' | 'invalid' | 'in_progress' | 'complete';
        ruleResults: string[];
        llmResults: { score: number; grade: string; summary: string; suggestions: string[]; } | null;
        recommendations: string[];
        llmIsCurrent: boolean;
        llmTimestamp: Date | null;
    }> {
        if (this.projectManagerExtension) {
            // Delegate to Project Management Extension
            this.logger.info('Delegating plan validation to Project Management Extension');
            return {
                status: 'in_progress',
                ruleResults: ['Using Project Management Extension for validation'],
                llmResults: null,
                recommendations: ['Continue using Project Management Extension for detailed validation'],
                llmIsCurrent: false,
                llmTimestamp: null
            };
        }

        if (!this.currentPlan) {
            return {
                status: 'missing',
                ruleResults: ['No project plan found'],
                llmResults: null,
                recommendations: ['Create a basic project plan or install Project Management Extension'],
                llmIsCurrent: false,
                llmTimestamp: null
            };
        }

        const ruleResults: string[] = [];
        const recommendations: string[] = [];

        if (this.currentPlan.tasks.length === 0) {
            ruleResults.push('No tasks defined');
            recommendations.push('Add tasks to the project plan');
        }

        const completedTasks = this.currentPlan.tasks.filter(t => t.status === TaskStatus.completed).length;
        const totalTasks = this.currentPlan.tasks.length;
        const progress = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

        let status: 'missing' | 'empty' | 'invalid' | 'in_progress' | 'complete';
        if (progress === 0) {
            status = 'empty';
        } else if (progress === 100) {
            status = 'complete';
        } else {
            status = 'in_progress';
        }

        return {
            status,
            ruleResults,
            llmResults: null,
            recommendations,
            llmIsCurrent: false,
            llmTimestamp: null
        };
    }

    public canStartTask(taskId: string): { canStart: boolean; reason?: string } {
        const task = this.getAllTasks().find(t => t.id === taskId);
        if (!task) {
            return { canStart: false, reason: 'Task not found' };
        }

        if (task.status !== TaskStatus.notStarted) {
            return { canStart: false, reason: 'Task is not in NOT_STARTED status' };
        }

        // Check dependencies
        const tasks = this.getAllTasks();
        const unmetDependencies = task.dependencies.filter(depId => {
            const depTask = tasks.find(t => t.id === depId);
            return !depTask || depTask.status !== TaskStatus.completed;
        });

        if (unmetDependencies.length > 0) {
            return { canStart: false, reason: `Dependencies not met: ${unmetDependencies.join(', ')}` };
        }

        return { canStart: true };
    }

    // Helper methods for integration
    private getProjectStatus(): 'active' | 'blocked' | 'complete' {
        const tasks = this.getAllTasks();
        const blockedTasks = tasks.filter(t => t.status === TaskStatus.blocked);
        const completedTasks = tasks.filter(t => t.status === TaskStatus.completed);
        
        if (blockedTasks.length > 0) return 'blocked';
        if (completedTasks.length === tasks.length) return 'complete';
        return 'active';
    }

    private validateTaskCompletion(): boolean {
        const currentTask = this.getCurrentTask();
        return currentTask?.status === TaskStatus.completed;
    }

    private getProjectConstraints(): string[] {
        // Basic constraints - could be enhanced
        return ['Time', 'Quality', 'Scope'];
    }

    private checkProjectRisks(): string[] {
        // Basic risk checking - could be enhanced
        const tasks = this.getAllTasks();
        const blockedTasks = tasks.filter(t => t.status === TaskStatus.blocked);
        const risks: string[] = [];
        
        if (blockedTasks.length > 0) {
            risks.push('Blocked tasks may delay project completion');
        }
        
        const inProgressTasks = tasks.filter(t => t.status === TaskStatus.inProgress);
        if (inProgressTasks.length > 1) {
            risks.push('Multiple tasks in progress may indicate scope creep');
        }
        
        return risks;
    }
}
