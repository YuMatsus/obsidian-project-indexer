import { App, PluginSettingTab, Setting } from 'obsidian';
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
	}
}