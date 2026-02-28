import * as vscode from 'vscode';
import { ConfigManager } from '../shared/ConfigManager';

interface GovernanceCeremonyLike {
  showQuickPick(): Promise<void>;
}

export class FirstRunOnboarding {
  constructor(
    private readonly configManager: ConfigManager,
    private readonly ceremony: GovernanceCeremonyLike,
  ) {}

  async checkAndRun(): Promise<void> {
    if (!this.isFirstRun()) return;

    const action = await vscode.window.showInformationMessage(
      'FailSafe detected AI agents in your workspace. Set up governance?',
      'Set Up Agent Governance',
      'Not Now',
    );

    if (action === 'Set Up Agent Governance') {
      await this.ceremony.showQuickPick();
    }

    await this.markOnboarded();
  }

  private isFirstRun(): boolean {
    return !this.configManager.getGlobalState<boolean>('failsafe.onboarded', false);
  }

  private async markOnboarded(): Promise<void> {
    await this.configManager.setGlobalState('failsafe.onboarded', true);
  }
}
