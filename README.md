# Obsidian Project Indexer Plugin

Automatically generate and maintain project index notes with customizable frontmatter columns for Obsidian.

## Features

- **Manual Project Index Generation**: Create project index notes with a single command from any note containing a `project` frontmatter field
- **Update Existing Index**: Update project index tables without recreating the entire file
- **Create Notes from Templates**: Create new notes from templates directly from project_top files with frontmatter inheritance
- **Customizable Columns**: Configure which frontmatter fields appear as columns in the index table
- **Organized Structure**: Project index files are created in a designated folder for better organization
- **Table Management**: Automatically updates existing tables when regenerating the index
- **Template Support**: Use custom templates for new project index files with variable substitution
- **Frontmatter Inheritance**: Automatically inherit specified frontmatter fields when creating notes from templates

## Installation

### From Obsidian Community Plugins (Coming Soon)

1. Open Settings → Community plugins
2. Search for "Project Indexer"
3. Click Install, then Enable

### Manual Installation

1. Download `main.js`, `manifest.json` from the latest release
2. Create a folder `project-indexer` in your vault's plugins folder: `<vault>/.obsidian/plugins/`
3. Copy the downloaded files into the `project-indexer` folder
4. Reload Obsidian and enable the plugin in Settings → Community plugins

## Usage

### Basic Setup

1. Add a `project` field to your note's frontmatter:

```yaml
---
project: MyProject
status: in-progress
priority: high
---
```

2. Run the command "Create project index from current note" from the Command Palette (Ctrl/Cmd + P)

3. A project index file will be created at `<configured-folder>/MyProject.md` with a table containing all notes in that project

### Updating Project Index

To update an existing project index with the latest notes:

1. Open any note that belongs to the project (has the same `project` field in frontmatter)
2. Run the command "Update project index for current note" from the Command Palette
3. The project index table will be refreshed with the current list of project notes

### Creating Notes from Templates

To create a new note from a template within a project:

1. Open the project_top file (project index file with `type: project_top` in frontmatter)
2. Run the command "Create note from template (project top)" from the Command Palette
3. Select a template from your template folder
4. Enter a name for the new note
5. The new note will be created with:
   - Template content with variables replaced
   - Inherited frontmatter fields from the project_top file

### Example Output

The generated project index will look like this:

```markdown
---
type: project_top
project: MyProject
---

# MyProject

## Notes

| Note | status | priority |
| :--- | :--- | :--- |
| [[Task 1]] | in-progress | high |
| [[Task 2]] | completed | medium |
| [[Task 3]] | pending | low |
```

## Configuration

Access plugin settings via Settings → Project Indexer

### Settings

- **Project index folder**: Specify the folder where project index files will be created (default: `projects`)
- **Frontmatter columns**: Comma-separated list of frontmatter fields to include as table columns (default: `status, priority`)
- **Inherited frontmatter fields**: Comma-separated list of frontmatter fields to inherit when creating notes from templates (default: `project`)

### Template Settings

- **Use template**: Enable to use custom templates when creating new project index files
- **Template folder**: Select the folder containing your template files (optional, used for both project index and note creation)
- **Default template**: Choose a default template file for project index creation (leave empty to use default content)

### Template Variables

When using templates, the following variables are automatically replaced:

- `{{title}}` - The project name (for project index) or note name (for note creation)
- `{{project}}` - The project name
- `{{date}}` - Current date (YYYY-MM-DD)
- `{{time}}` - Current time (HH:mm)
- `{{date:FORMAT}}` - Custom date format (e.g., `{{date:YYYY/MM/DD}}`)
- `{{time:FORMAT}}` - Custom time format (e.g., `{{time:HH:mm:ss}}`)
- Any inherited frontmatter field (e.g., `{{status}}`, `{{priority}}`)

**Note**: 
- For project index files: The required frontmatter fields (`type: project_top` and `project: [project name]`) are automatically added regardless of template content.
- For notes created from templates: The specified inherited frontmatter fields are automatically merged with the template's frontmatter.

## Development

### Prerequisites

- Node.js 16+
- npm or yarn

### Setup

```bash
# Clone the repository
git clone https://github.com/YuMatsus/obsidian-project-indexer.git

# Install dependencies
npm install

# Start development build
npm run dev
```

### Build

```bash
# Production build
npm run build

# Type checking
npx tsc --noEmit --skipLibCheck

# Linting
npx eslint . --ext .ts
```

### Release

```bash
# Patch release
npm version patch && git push --follow-tags

# Minor release  
npm version minor && git push --follow-tags

# Major release
npm version major && git push --follow-tags
```

## License

MIT

