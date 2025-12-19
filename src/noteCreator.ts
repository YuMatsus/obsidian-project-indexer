import { App, TFile, Notice, FuzzySuggestModal } from 'obsidian';
import { ProjectIndexerSettings } from './types';
import { TemplateProcessor } from './templateProcessor';

type AppWithCommands = App & {
	commands: {
		executeCommandById(id: string): boolean;
	};
};

export class NoteCreator {
	private app: App;
	private settings: ProjectIndexerSettings;
	private templateProcessor: TemplateProcessor;

	constructor(app: App, settings: ProjectIndexerSettings) {
		this.app = app;
		this.settings = settings;
		this.templateProcessor = new TemplateProcessor();
	}

	async createNoteFromProjectTop(projectTopFile: TFile): Promise<void> {
		try {
			// Get project top metadata
			const metadata = this.app.metadataCache.getFileCache(projectTopFile);
			if (!metadata?.frontmatter) {
				new Notice('Project top file has no frontmatter');
				return;
			}

			const projectName = metadata.frontmatter.project;
			if (!projectName) {
				new Notice('Project top file has no "project" field in frontmatter');
				return;
			}

			// Select template
			const templateFile = await this.selectTemplate();
			if (!templateFile) {
				return;
			}

			// Create note using Obsidian's default "new note" command to inherit native behavior
			const newFile = await this.createNoteUsingDefaultBehavior();
			if (!newFile) {
				new Notice('Failed to create new note');
				return;
			}

			// Get template content
			const templateContent = await this.app.vault.read(templateFile);

			// Prepare variables for template processing
			const templateVariables: Record<string, string> = {
				title: newFile.basename,
				project: projectName
			};
			
			// Add all inherited frontmatter fields as variables
			for (const field of this.settings.inheritedFrontmatterFields) {
				if (metadata.frontmatter && metadata.frontmatter[field] !== undefined) {
					templateVariables[field] = String(metadata.frontmatter[field]);
				}
			}

			// Process template variables (like {{title}}, {{date}}, etc.)
			const processedContent = this.templateProcessor.processTemplateVariables(templateContent, templateVariables);
			
			// Replace the auto-created file contents with the processed template (frontmatter included)
			await this.app.vault.modify(newFile, processedContent);

			// Use Obsidian's processFrontMatter API to merge/inherit frontmatter fields
			await this.app.fileManager.processFrontMatter(newFile, (frontmatter) => {
				// Inherit frontmatter fields from project_top
				for (const field of this.settings.inheritedFrontmatterFields) {
					if (metadata.frontmatter && metadata.frontmatter[field] !== undefined) {
						frontmatter[field] = metadata.frontmatter[field];
					}
				}
			});

			new Notice(`Created new note from template: ${newFile.name}`);
		} catch (error) {
			console.error('Error creating note from template:', error);
			new Notice('Failed to create note from template');
		}
	}

	private async selectTemplate(): Promise<TFile | null> {
		// Always show template selector for creating notes from project_top
		// The default template in settings is only for project_top creation itself
		return new Promise((resolve) => {
			new TemplateSelector(
				this.app,
				this.settings.templateFolder,
				(file: TFile | null) => {
					resolve(file);
				}
			).open();
		});
	}
	private async createNoteUsingDefaultBehavior(): Promise<TFile | null> {
		const commandIds = ['app:make-new-note', 'file-explorer:new-file'];
		
		for (const commandId of commandIds) {
			const file = await this.createNoteViaCommand(commandId);
			if (file) {
				return file;
			}
		}
		
		return this.createNoteViaFallback();
	}
	
	private async createNoteViaCommand(commandId: string): Promise<TFile | null> {
		const commandManager = (this.app as Partial<AppWithCommands>).commands;
		if (!commandManager?.executeCommandById) {
			return null;
		}
		
		return new Promise((resolve) => {
			const previousFile = this.app.workspace.getActiveFile();
			let timeoutId: number | undefined;
			
			const cleanup = () => {
				this.app.workspace.off('file-open', handler);
				if (timeoutId) {
					window.clearTimeout(timeoutId);
				}
			};
			
			const handler = (file: TFile | null) => {
				if (file && file !== previousFile) {
					cleanup();
					resolve(file);
				}
			};
			
			timeoutId = window.setTimeout(() => {
				cleanup();
				const activeFile = this.app.workspace.getActiveFile();
				resolve(activeFile && activeFile !== previousFile ? activeFile : null);
			}, 5000);
			
			this.app.workspace.on('file-open', handler);
			const executed = commandManager.executeCommandById(commandId);
			if (!executed) {
				cleanup();
				resolve(null);
			}
		});
	}
	
	private async createNoteViaFallback(): Promise<TFile | null> {
		try {
			const activeFile = this.app.workspace.getActiveFile();
			const sourcePath = activeFile?.path ?? '';
			const parentFolder = this.app.fileManager.getNewFileParent(sourcePath);
			const folderPath = parentFolder.path === '/' ? '' : parentFolder.path;
			
			const newFilePath = this.generateUntitledPath(folderPath);
			const file = await this.app.vault.create(newFilePath, '');
			
			const leaf = this.app.workspace.getLeaf(false);
			await leaf.openFile(file);
			return file;
		} catch (error) {
			console.error('Fallback note creation failed', error);
			return null;
		}
	}
	
	private generateUntitledPath(folderPath: string): string {
		const baseName = 'Untitled';
		let counter = 0;
		
		while (true) {
			const suffix = counter === 0 ? '' : ` ${counter}`;
			const candidateName = `${baseName}${suffix}.md`;
			const candidatePath = folderPath ? `${folderPath}/${candidateName}` : candidateName;
			
			if (!this.app.vault.getAbstractFileByPath(candidatePath)) {
				return candidatePath;
			}
			
			counter++;
		}
	}
}

class TemplateSelector extends FuzzySuggestModal<TFile> {
	private resolveCallback: (file: TFile | null) => void;
	templateFolder: string;
	private hasSelected = false;

	constructor(app: App, templateFolder: string, onChoose: (file: TFile | null) => void) {
		super(app);
		this.templateFolder = templateFolder;
		this.resolveCallback = onChoose;
		this.setPlaceholder('Select a template...');
	}

	getItems(): TFile[] {
		const files = this.app.vault.getMarkdownFiles();
		
		if (!this.templateFolder || this.templateFolder === '') {
			return files;
		}
		
		return files.filter(file => file.path.startsWith(this.templateFolder));
	}

	getItemText(file: TFile): string {
		return file.path;
	}

	onChooseItem(file: TFile): void {
		this.hasSelected = true;
		this.resolveCallback(file);
	}

	onClose(): void {
		// Use setTimeout to ensure onChooseItem has a chance to execute first
		setTimeout(() => {
			if (!this.hasSelected) {
				this.resolveCallback(null);
			}
		}, 0);
	}
}
