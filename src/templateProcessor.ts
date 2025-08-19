import { moment } from 'obsidian';

export class TemplateProcessor {
	processTemplateVariables(content: string, variables: Record<string, string> = {}): string {
		const now = moment();
		
		let processedContent = content;
		
		// Core Obsidian Templates plugin compatible variables
		processedContent = processedContent.replace(/\{\{title\}\}/g, variables.title || '');
		processedContent = processedContent.replace(/\{\{date\}\}/g, now.format('YYYY-MM-DD'));
		processedContent = processedContent.replace(/\{\{time\}\}/g, now.format('HH:mm'));
		
		// Custom format replacements - directly pass format to moment
		processedContent = processedContent.replace(/\{\{date:([^}]+)\}\}/g, (match, format) => {
			try {
				return now.format(format);
			} catch {
				return match;
			}
		});
		
		processedContent = processedContent.replace(/\{\{time:([^}]+)\}\}/g, (match, format) => {
			try {
				return now.format(format);
			} catch {
				return match;
			}
		});
		
		// Process any custom variables passed in
		for (const [key, value] of Object.entries(variables)) {
			const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
			processedContent = processedContent.replace(regex, value);
		}
		
		return processedContent;
	}
}