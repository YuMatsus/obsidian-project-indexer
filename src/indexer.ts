import { App, TFile, TFolder, Notice } from 'obsidian';
import { ProjectIndexerSettings } from './types';
import * as utils from './utils';
import { TemplateProcessor } from './templateProcessor';

export class ProjectIndexer {
	private app: App;
	private settings: ProjectIndexerSettings;
	private templateProcessor: TemplateProcessor;

	constructor(app: App, settings: ProjectIndexerSettings) {
		this.app = app;
		this.settings = settings;
		this.templateProcessor = new TemplateProcessor();
	}

	async createProjectIndex(currentFile: TFile): Promise<void> {
		try {
			const metadata = this.app.metadataCache.getFileCache(currentFile);
			if (!metadata?.frontmatter) {
				console.error('Current note has no frontmatter');
				return;
			}

			const projectName = metadata.frontmatter.project;
			if (!projectName) {
				console.error('Current note has no "project" field in frontmatter');
				return;
			}

			const projectIndexFile = await this.ensureProjectIndexFile(projectName);
			await this.updateProjectIndex(projectIndexFile, projectName);
			new Notice(`Project index updated for: ${projectName}`);
		} catch (error) {
			console.error('Error creating project index:', error);
		}
	}

	async updateProjectIndexForFile(currentFile: TFile): Promise<void> {
		try {
			const metadata = this.app.metadataCache.getFileCache(currentFile);
			if (!metadata?.frontmatter) {
				new Notice('Current note has no frontmatter');
				return;
			}

			const projectName = metadata.frontmatter.project;
			if (!projectName) {
				new Notice('Current note has no "project" field in frontmatter');
				return;
			}

			const projectIndexPath = `${this.settings.projectIndexFolder}/${this.toFileName(projectName)}.md`;
			const projectIndexFile = this.app.vault.getAbstractFileByPath(projectIndexPath);
			
			if (!projectIndexFile || !(projectIndexFile instanceof TFile)) {
				new Notice(`Project index file not found for: ${projectName}. Use "Create project index" command first.`);
				return;
			}

			await this.updateProjectIndex(projectIndexFile, projectName);
			new Notice(`Project index updated for: ${projectName}`);
		} catch (error) {
			console.error('Error updating project index:', error);
			new Notice('Failed to update project index');
		}
	}

	private async ensureProjectIndexFile(projectName: string): Promise<TFile> {
		const folderPath = this.settings.projectIndexFolder;
		await this.ensureFolderExists(folderPath);

		const indexPath = `${folderPath}/${this.toFileName(projectName)}.md`;
		const indexAbstract = this.app.vault.getAbstractFileByPath(indexPath);

		if (indexAbstract instanceof TFile) {
			return indexAbstract;
		}
		if (indexAbstract) {
			throw new Error(`Index path exists and is not a file: ${indexPath}`);
		}
		
		// Get initial content - either from template or default
		const initialContent = await this.getInitialContent(projectName);
		const newFile = await this.app.vault.create(indexPath, initialContent);
		
		// Use Obsidian API to ensure required frontmatter
		await this.app.fileManager.processFrontMatter(newFile, (frontmatter) => {
			frontmatter.type = 'project_top';
			frontmatter.project = projectName;
		});
		
		return newFile;
	}

	// Creates all intermediate folders and ensures each segment is a folder.
	private async ensureFolderExists(folderPath: string): Promise<void> {
		if (!folderPath || !folderPath.trim()) {
			throw new Error('Project index folder is not configured.');
		}
		const parts = folderPath.split('/').filter(Boolean);
		let current = '';
		for (const part of parts) {
			current = current ? `${current}/${part}` : part;
			const entry = this.app.vault.getAbstractFileByPath(current);
			if (!entry) {
				await this.app.vault.createFolder(current);
			} else if (!(entry instanceof TFolder)) {
				throw new Error(`Path exists and is not a folder: ${current}`);
			}
		}
	}

	// Sanitizes a project name to a safe filename (prevents nested paths/invalid chars).
	private toFileName(name: string): string {
		return name
			.trim()
			.replace(/[/\\:*?"<>|]/g, '-') // strip invalid filename chars on common filesystems
			.replace(/\s+/g, ' ')
			.replace(/^\.+/, '') // avoid leading dots
			.slice(0, 180); // conservative limit to avoid OS path length issues
	}

	private async getInitialContent(projectName: string): Promise<string> {
		if (this.settings.useTemplate && this.settings.templatePath) {
			// Try to use specified template
			const templateFile = this.app.vault.getAbstractFileByPath(this.settings.templatePath);
			if (templateFile instanceof TFile) {
				const templateContent = await this.app.vault.read(templateFile);
				// Pass project name as title variable for compatibility
				return this.templateProcessor.processTemplateVariables(templateContent, { 
					title: projectName,
					project: projectName 
				});
			}
		}
		
		// No template configured or template not found, use default
		return this.createDefaultIndexContent(projectName);
	}

	private createDefaultIndexContent(projectName: string): string {
		return this.createInitialIndexContent(projectName);
	}

	private createInitialIndexContent(projectName: string): string {
		const lines: string[] = [];
		
		lines.push(`---`);
		lines.push(`type: project_top`);
		lines.push(`project: ${projectName}`);
		lines.push(`---`);
		lines.push('');
		lines.push(`# ${projectName}`);
		lines.push('');
		lines.push('## Notes');
		lines.push('');
		
		return lines.join('\n');
	}

	private async updateProjectIndex(indexFile: TFile, projectName: string): Promise<void> {
		const projectNotes = await this.collectProjectNotes(projectName);
		let content = await this.app.vault.read(indexFile);

		if (!utils.hasHeader(content, 'Notes')) {
			content = utils.appendHeader(content, 'Notes');
		}

		const tableData = this.buildTableData(projectNotes);
		const headers = ['Note', ...this.settings.frontmatterColumns];
		const tableLines = utils.createTable(headers, tableData);

		const existingTable = utils.getTableFromSection(content, 'Notes');
		const sectionLines = utils.getSectionContent(content, 'Notes');
		const newSectionLines: string[] = [];
		
		// Always ensure there's one empty line at the beginning
		newSectionLines.push('');
		
		if (existingTable) {
			// Replace existing table with new one
			let tableReplaced = false;
			let skipRemainingTableLines = false;
			
			for (const line of sectionLines) {
				const trimmed = line.trim();
				
				// Skip the first empty line since we already added it
				if (newSectionLines.length === 1 && trimmed === '') {
					continue;
				}
				
				// If we encounter a table line
				if (trimmed.startsWith('|')) {
					if (!tableReplaced) {
						// Replace the old table with new one
						newSectionLines.push(...tableLines);
						tableReplaced = true;
						skipRemainingTableLines = true;
					}
					// Skip old table lines
					continue;
				}
				
				// Add non-table lines
				if (!skipRemainingTableLines || !trimmed.startsWith('|')) {
					skipRemainingTableLines = false;
					newSectionLines.push(line);
				}
			}
			
			// If no table was found in the section (shouldn't happen but just in case)
			if (!tableReplaced) {
				newSectionLines.push(...tableLines);
			}
		} else {
			// No existing table, just add the new one
			newSectionLines.push(...tableLines);
		}
		
		content = utils.replaceSectionContent(content, 'Notes', newSectionLines);

		await this.app.vault.modify(indexFile, content);
	}

	private async collectProjectNotes(projectName: string): Promise<TFile[]> {
		const files = this.app.vault.getMarkdownFiles();
		const projectNotes: TFile[] = [];

		for (const file of files) {
			const metadata = this.app.metadataCache.getFileCache(file);
			if (metadata?.frontmatter?.project === projectName) {
				const type = metadata.frontmatter.type;
				if (type !== 'project_index' && type !== 'project_top') {
					projectNotes.push(file);
				}
			}
		}

		return projectNotes;
	}

	private buildTableData(notes: TFile[]): string[][] {
		const rows: string[][] = [];

		for (const note of notes) {
			const metadata = this.app.metadataCache.getFileCache(note);
			const frontmatter = metadata?.frontmatter || {};
			
			const noteLink = `[[${note.basename}]]`;
			const row = [noteLink];

			for (const column of this.settings.frontmatterColumns) {
				const value = frontmatter[column];
				row.push(utils.normalizeValue(value));
			}

			rows.push(row);
		}

		rows.sort((a, b) => {
			const linkA = utils.extractWikiLinkTarget(a[0]).toLowerCase();
			const linkB = utils.extractWikiLinkTarget(b[0]).toLowerCase();
			return linkA.localeCompare(linkB);
		});

		return rows;
	}
}