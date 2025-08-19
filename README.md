# Obsidian Project Indexer Plugin

Automatically generate and maintain project index notes with customizable frontmatter columns for Obsidian.

## Features

- **Manual Project Index Generation**: Create project index notes with a single command from any note containing a `project` frontmatter field
- **Customizable Columns**: Configure which frontmatter fields appear as columns in the index table
- **Organized Structure**: Project index files are created in a designated folder for better organization
- **Table Management**: Automatically updates existing tables when regenerating the index
- **Template Support**: Use custom templates for new project index files with variable substitution

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

### Template Settings

- **Use template**: Enable to use custom templates when creating new project index files
- **Template folder**: Select the folder containing your template files (optional)
- **Default template**: Choose a default template file (leave empty to use default content)

### Template Variables

When using templates, the following variables are automatically replaced:

- `{{title}}` - The project name
- `{{date}}` - Current date (YYYY-MM-DD)
- `{{time}}` - Current time (HH:mm)
- `{{date:FORMAT}}` - Custom date format (e.g., `{{date:YYYY/MM/DD}}`)
- `{{time:FORMAT}}` - Custom time format (e.g., `{{time:HH:mm:ss}}`)

**Note**: The required frontmatter fields (`type: project_top` and `project: [project name]`) are automatically added regardless of template content.

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

