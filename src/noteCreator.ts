import { App, TFile, Notice, FuzzySuggestModal, Modal } from 'obsidian';
import { ProjectIndexerSettings } from './types';
import { TemplateProcessor } from './templateProcessor';

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

			// Prompt for file name
			const fileName = await this.promptForFileName();
			if (!fileName) {
				return;
			}

			// Get template content
			const templateContent = await this.app.vault.read(templateFile);

			// Prepare variables for template processing
			const templateVariables: Record<string, string> = {
				title: fileName,
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

			// Create new file path
			const newFilePath = await this.getNewFilePath(fileName);

			// Create new file with processed template content (including its original frontmatter)
			const newFile = await this.app.vault.create(newFilePath, processedContent);

			// Use Obsidian's processFrontMatter API to merge/inherit frontmatter fields
			await this.app.fileManager.processFrontMatter(newFile, (frontmatter) => {
				// Inherit frontmatter fields from project_top
				for (const field of this.settings.inheritedFrontmatterFields) {
					if (metadata.frontmatter && metadata.frontmatter[field] !== undefined) {
						frontmatter[field] = metadata.frontmatter[field];
					}
				}
			});

			// Open the new file
			await this.app.workspace.getLeaf().openFile(newFile);
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


	private async promptForFileName(): Promise<string | null> {
		return new Promise((resolve) => {
			new FileNameModal(
				this.app,
				(fileName: string | null) => {
					resolve(fileName);
				}
			).open();
		});
	}

	private async getNewFilePath(fileName: string): Promise<string> {
		// Sanitize file name
		const sanitizedName = fileName.replace(/[\\/:*?"<>|]/g, '-');
		
		// Get active file folder or root
		const activeFile = this.app.workspace.getActiveFile();
		const folder = activeFile ? activeFile.parent?.path || '' : '';
		
		// Add .md extension if not present
		const fileNameWithExt = sanitizedName.endsWith('.md') ? sanitizedName : `${sanitizedName}.md`;
		
		// Create full path
		const basePath = folder ? `${folder}/${fileNameWithExt}` : fileNameWithExt;
		
		// Check if file exists and add number if needed
		let counter = 1;
		let finalPath = basePath;
		while (this.app.vault.getAbstractFileByPath(finalPath)) {
			const nameWithoutExt = fileNameWithExt.slice(0, -3);
			finalPath = folder ? `${folder}/${nameWithoutExt} ${counter}.md` : `${nameWithoutExt} ${counter}.md`;
			counter++;
		}
		
		return finalPath;
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

class FileNameModal extends Modal {
	onChoose: (fileName: string | null) => void;
	private customInputEl: HTMLInputElement;

	constructor(app: App, onChoose: (fileName: string | null) => void) {
		super(app);
		this.onChoose = onChoose;
	}

	onOpen(): void {
		const { contentEl } = this;
		
		contentEl.createEl('h3', { text: 'Create new note' });
		
		const inputContainer = contentEl.createDiv('input-container');
		inputContainer.style.marginBottom = '1em';
		
		this.customInputEl = inputContainer.createEl('input', {
			type: 'text',
			placeholder: 'Enter file name...',
		});
		this.customInputEl.style.width = '100%';
		this.customInputEl.style.padding = '0.5em';
		
		// Focus input after a short delay to ensure modal is fully opened
		setTimeout(() => {
			this.customInputEl.focus();
		}, 10);
		
		// Handle enter key
		this.customInputEl.addEventListener('keydown', (e) => {
			if (e.key === 'Enter') {
				e.preventDefault();
				this.submitInput();
			} else if (e.key === 'Escape') {
				e.preventDefault();
				this.onChoose(null);
				this.close();
			}
		});
		
		// Create button container
		const buttonContainer = contentEl.createDiv('modal-button-container');
		buttonContainer.style.display = 'flex';
		buttonContainer.style.justifyContent = 'flex-end';
		buttonContainer.style.gap = '0.5em';
		
		// Cancel button
		const cancelButton = buttonContainer.createEl('button', { text: 'Cancel' });
		cancelButton.addEventListener('click', () => {
			this.onChoose(null);
			this.close();
		});
		
		// Create button
		const createButton = buttonContainer.createEl('button', { 
			text: 'Create',
			cls: 'mod-cta'
		});
		createButton.addEventListener('click', () => {
			this.submitInput();
		});
	}

	private submitInput(): void {
		const value = this.customInputEl.value.trim();
		if (value) {
			this.onChoose(value);
			this.close();
		} else {
			// Show error or focus input if empty
			this.customInputEl.focus();
			this.customInputEl.style.borderColor = 'var(--text-error)';
			setTimeout(() => {
				this.customInputEl.style.borderColor = '';
			}, 2000);
		}
	}

	onClose(): void {
		const { contentEl } = this;
		contentEl.empty();
	}
}