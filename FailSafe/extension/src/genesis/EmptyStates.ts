type EmptyStateType = 'no-workspace' | 'no-runs' | 'no-skills' | 'no-failures';

const EMPTY_STATE_MESSAGES: Record<EmptyStateType, { title: string; message: string }> = {
  'no-workspace': {
    title: 'No Workspace',
    message: 'Open a workspace folder to begin.',
  },
  'no-runs': {
    title: 'No Plans',
    message: 'No governance plans found. Create an intent to get started.',
  },
  'no-skills': {
    title: 'No Skills Installed',
    message: 'No skills registered in the skill registry.',
  },
  'no-failures': {
    title: 'No Failures',
    message: 'The Shadow Genome has no recorded failure patterns.',
  },
};

export function renderEmptyState(type: EmptyStateType): string {
  const state = EMPTY_STATE_MESSAGES[type];
  return `<!DOCTYPE html><html><head><title>${state.title}</title></head><body>
    <h1>${state.title}</h1>
    <p>${state.message}</p>
    <a href="/console/home">Back to Dashboard</a>
  </body></html>`;
}
