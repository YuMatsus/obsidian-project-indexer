export interface ProjectIndexerSettings {
	projectIndexFolder: string;
	frontmatterColumns: string[];
	useTemplate: boolean;
	templateFolder: string;
	templatePath: string;
}

export const DEFAULT_SETTINGS: ProjectIndexerSettings = {
	projectIndexFolder: 'projects',
	frontmatterColumns: ['status', 'priority'],
	useTemplate: false,
	templateFolder: 'templates',
	templatePath: ''
};