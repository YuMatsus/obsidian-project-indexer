export function extractWikiLinkTarget(cell: string): string {
	if (!cell || cell === '') return '';
	const inner = cell.match(/\[\[([^\]]+)\]\]/)?.[1] || cell;
	const target = inner.split('|')[0] || inner;
	const normalized = target.replace(/\\/g, '/');
	const withoutAnchor = normalized.replace(/#.*$/, '').replace(/\^.*$/, '');
	const basename = withoutAnchor.split('/').pop() || withoutAnchor;
	return basename.trim();
}

export function normalizeValue(value: unknown): string {
	if (value === null || value === undefined) return '';
	if (typeof value === 'boolean') return value ? 'true' : 'false';
	return String(value);
}

export function hasHeader(content: string, headerText: string, level = 2): boolean {
	const lines = content.split('\n');
	const headerPrefix = '#'.repeat(level) + ' ';
	for (const line of lines) {
		if (line.trim() === headerPrefix + headerText) {
			return true;
		}
	}
	return false;
}

export function appendHeader(content: string, headerText: string, level = 2): string {
	const headerLine = '#'.repeat(level) + ' ' + headerText;
	return content + '\n\n' + headerLine + '\n';
}

export function getSectionContent(content: string, headerText: string, level = 2): string[] {
	const lines = content.split('\n');
	const headerPrefix = '#'.repeat(level) + ' ';
	let inSection = false;
	const sectionLines: string[] = [];
	
	for (let i = 0; i < lines.length; i++) {
		const line = lines[i];
		const trimmed = line.trim();
		
		if (trimmed === headerPrefix + headerText) {
			inSection = true;
			continue;
		}
		
		if (inSection) {
			if (trimmed.startsWith('#') && !trimmed.startsWith('#'.repeat(level + 1))) {
				break;
			}
			sectionLines.push(line);
		}
	}
	
	return sectionLines;
}

export function replaceSectionContent(content: string, headerText: string, newContent: string[], level = 2): string {
	const lines = content.split('\n');
	const headerPrefix = '#'.repeat(level) + ' ';
	let inSection = false;
	const result: string[] = [];
	let sectionStart = -1;
	let sectionEnd = -1;
	
	for (let i = 0; i < lines.length; i++) {
		const line = lines[i];
		const trimmed = line.trim();
		
		if (trimmed === headerPrefix + headerText) {
			inSection = true;
			sectionStart = i;
			result.push(line);
			continue;
		}
		
		if (inSection) {
			if (trimmed.startsWith('#') && !trimmed.startsWith('#'.repeat(level + 1))) {
				sectionEnd = i;
				inSection = false;
			}
		}
		
		if (!inSection || sectionEnd !== -1) {
			result.push(line);
		}
	}
	
	if (sectionStart !== -1) {
		const before = result.slice(0, sectionStart + 1);
		const after = sectionEnd !== -1 ? result.slice(sectionEnd) : [];
		return [...before, ...newContent, ...after].join('\n');
	}
	
	return content;
}

export function createTable(headers: string[], rows: string[][], alignments?: string[]): string[] {
	const tableLines: string[] = [];
	
	const headerLine = '| ' + headers.join(' | ') + ' |';
	tableLines.push(headerLine);
	
	const separatorCells = headers.map((_, i) => {
		const align = alignments?.[i] || 'left';
		if (align === 'center') return ':---:';
		if (align === 'right') return '---:';
		return ':---';
	});
	const separatorLine = '| ' + separatorCells.join(' | ') + ' |';
	tableLines.push(separatorLine);
	
	for (const row of rows) {
		const normalizedRow = headers.map((_, i) => row[i] || '');
		const rowLine = '| ' + normalizedRow.join(' | ') + ' |';
		tableLines.push(rowLine);
	}
	
	return tableLines;
}

export function parseTable(lines: string[]): { headers: string[], rows: string[][] } {
	if (lines.length < 3) return { headers: [], rows: [] };
	
	const headerLine = lines[0];
	const headers = headerLine.split('|').slice(1, -1).map(h => h.trim());
	
	const rows: string[][] = [];
	for (let i = 2; i < lines.length; i++) {
		const line = lines[i].trim();
		if (!line.startsWith('|')) continue;
		const cells = line.split('|').slice(1, -1).map(c => c.trim());
		rows.push(cells);
	}
	
	return { headers, rows };
}

export function getTableFromSection(content: string, headerText: string): { headers: string[], rows: string[][] } | null {
	const sectionLines = getSectionContent(content, headerText);
	const tableLines: string[] = [];
	let inTable = false;
	
	for (const line of sectionLines) {
		const trimmed = line.trim();
		if (trimmed.startsWith('|')) {
			inTable = true;
			tableLines.push(line);
		} else if (inTable) {
			break;
		}
	}
	
	if (tableLines.length === 0) return null;
	return parseTable(tableLines);
}