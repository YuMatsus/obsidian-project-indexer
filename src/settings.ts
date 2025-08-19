import { App, PluginSettingTab, Setting, FuzzySuggestModal, TFile, TFolder } from 'obsidian';
import ProjectIndexerPlugin from './main';

export class ProjectIndexerSettingTab extends PluginSettingTab {
	plugin: ProjectIndexerPlugin;

	constructor(app: App, plugin: ProjectIndexerPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		containerEl.createEl('h2', { text: 'Project Indexer Settings' });

		new Setting(containerEl)
			.setName('Project index folder')
			.setDesc('Folder where project index files will be created')
			.addText(text => text
				.setPlaceholder('projects')
				.setValue(this.plugin.settings.projectIndexFolder)
				.onChange(async (value) => {
					this.plugin.settings.projectIndexFolder = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Frontmatter columns')
			.setDesc('Comma-separated list of frontmatter fields to include as table columns')
			.addText(text => text
				.setPlaceholder('status, priority')
				.setValue(this.plugin.settings.frontmatterColumns.join(', '))
				.onChange(async (value) => {
					this.plugin.settings.frontmatterColumns = value
						.split(',')
						.map(col => col.trim())
						.filter(col => col.length > 0);
					await this.plugin.saveSettings();
				}));

		containerEl.createEl('h3', { text: 'Template Settings' });

		new Setting(containerEl)
			.setName('Use template')
			.setDesc('Use a template when creating new project index files')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.useTemplate)
				.onChange(async (value) => {
					this.plugin.settings.useTemplate = value;
					await this.plugin.saveSettings();
					this.display(); // Refresh to show/hide template settings
				}));

		if (this.plugin.settings.useTemplate) {
			new Setting(containerEl)
				.setName('Template folder')
				.setDesc('Folder containing template files (leave empty to search all folders)')
				.addText(text => {
					text
						.setPlaceholder('Templates folder path')
						.setValue(this.plugin.settings.templateFolder)
						.setDisabled(true); // Make input read-only
					text.inputEl.style.width = '300px';
				})
				.addButton(button => {
					button
						.setButtonText('Select')
						.onClick(() => {
							new FolderSearchModal(this.app, async (folder: TFolder) => {
								const chosenPath = folder.path === '/' ? '' : folder.path;
								this.plugin.settings.templateFolder = chosenPath;
								await this.plugin.saveSettings();
								this.display();
							}).open();
						});
				});

			new Setting(containerEl)
				.setName('Default template')
				.setDesc('Path to default template (leave empty to show picker each time)')
				.addText(text => {
					text
						.setValue(this.plugin.settings.templatePath)
						.setDisabled(true); // Make input read-only
					text.inputEl.style.width = '300px';
				})
				.addButton(button => {
					button
						.setButtonText('Select')
						.onClick(() => {
							new TemplateSearchModal(
								this.app, 
								this.plugin.settings.templateFolder,
								async (file: TFile) => {
									this.plugin.settings.templatePath = file.path;
									await this.plugin.saveSettings();
									this.display();
								}
							).open();
						});
				})
				.addButton(button => {
					button
						.setButtonText('Clear')
						.onClick(async () => {
							this.plugin.settings.templatePath = '';
							await this.plugin.saveSettings();
							this.display();
						});
				});
		}
	}
}

class TemplateSearchModal extends FuzzySuggestModal<TFile> {
	onChoose: (file: TFile) => void;
	templateFolder: string;

	constructor(app: App, templateFolder: string, onChoose: (file: TFile) => void) {
		super(app);
		this.templateFolder = templateFolder;
		this.onChoose = onChoose;
		this.setPlaceholder('Select a template...');
	}

	getItems(): TFile[] {
		const files = this.app.vault.getMarkdownFiles();
		
		if (!this.templateFolder) {
			return files;
		}
		
		return files.filter(file => file.path.startsWith(this.templateFolder));
	}

	getItemText(file: TFile): string {
		return file.path;
	}

	onChooseItem(file: TFile): void {
		this.onChoose(file);
	}
}

class FolderSearchModal extends FuzzySuggestModal<TFolder> {
	onChoose: (folder: TFolder) => void;

	constructor(app: App, onChoose: (folder: TFolder) => void) {
		super(app);
		this.onChoose = onChoose;
		this.setPlaceholder('Select a folder...');
	}

	getItems(): TFolder[] {
		const folders: TFolder[] = [];
		const rootFolder = this.app.vault.getRoot();
		
		const collectFolders = (folder: TFolder): void => {
			folders.push(folder);
			for (const child of folder.children) {
				if (child instanceof TFolder) {
					collectFolders(child);
				}
			}
		};
		
		collectFolders(rootFolder);
		return folders
			.filter(f => !f.path.startsWith('.obsidian'))
			.sort((a, b) => a.path.localeCompare(b.path));
	}

	getItemText(folder: TFolder): string {
		return folder.path || '/';
	}

	onChooseItem(folder: TFolder): void {
		this.onChoose(folder);
	}
}