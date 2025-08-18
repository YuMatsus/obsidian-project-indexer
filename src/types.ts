export interface ProjectIndexerSettings {
	projectIndexFolder: string;
	frontmatterColumns: string[];
}

export const DEFAULT_SETTINGS: ProjectIndexerSettings = {
	projectIndexFolder: 'projects',
	frontmatterColumns: ['status', 'priority']
};