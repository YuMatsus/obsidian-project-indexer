import { Plugin } from 'obsidian';
import { ProjectIndexer } from './indexer';
import { ProjectIndexerSettingTab } from './settings';
import { ProjectIndexerSettings, DEFAULT_SETTINGS } from './types';
import { NoteCreator } from './noteCreator';

export default class ProjectIndexerPlugin extends Plugin {
	settings: ProjectIndexerSettings;
	indexer: ProjectIndexer;
	noteCreator: NoteCreator;

	async onload() {
		await this.loadSettings();
		
		this.indexer = new ProjectIndexer(this.app, this.settings);
		this.noteCreator = new NoteCreator(this.app, this.settings);

		this.addCommand({
			id: 'create-project-index',
			name: 'Create project index from current note',
			editorCallback: async (editor, view) => {
				const file = view.file;
				if (file) {
					await this.indexer.createProjectIndex(file);
				}
			}
		});

		this.addCommand({
			id: 'update-project-index',
			name: 'Update project index for current note',
			editorCallback: async (editor, view) => {
				const file = view.file;
				if (file) {
					await this.indexer.updateProjectIndexForFile(file);
				}
			}
		});

		this.addCommand({
			id: 'create-note-from-template',
			name: 'Create note from template (project top)',
			checkCallback: (checking: boolean) => {
				const activeFile = this.app.workspace.getActiveFile();
				if (activeFile) {
					const metadata = this.app.metadataCache.getFileCache(activeFile);
					const isProjectTop = metadata?.frontmatter?.type === 'project_top';
					
					if (checking) {
						return isProjectTop;
					}
					
					if (isProjectTop) {
						this.noteCreator.createNoteFromProjectTop(activeFile);
					}
				}
				return false;
			}
		});

		this.addSettingTab(new ProjectIndexerSettingTab(this.app, this));
	}

	onunload() {
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
		this.indexer = new ProjectIndexer(this.app, this.settings);
		this.noteCreator = new NoteCreator(this.app, this.settings);
	}
}