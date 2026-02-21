import * as fs from 'fs';
import * as path from 'path';
import matter from 'gray-matter';

export interface EntityEntry {
  path: string;      // Relative path without .md (e.g., "people/pedro")
  aliases: string[]; // All names that link to this entity
}

export interface EntityIndex {
  entries: Map<string, string>;  // lowercase alias -> path
  byPath: Map<string, EntityEntry>;
}

/**
 * Build an entity index from all markdown files in the vault.
 * Extracts linkable names from:
 * - Filename (without .md)
 * - Frontmatter `title` field
 * - Frontmatter `aliases` array
 */
export function buildEntityIndex(vaultPath: string): EntityIndex {
  const entries = new Map<string, string>();
  const byPath = new Map<string, EntityEntry>();
  
  // Folders to scan for entities
  const entityFolders = ['people', 'projects', 'agents', 'lessons', 'decisions', 'commitments'];
  
  for (const folder of entityFolders) {
    const folderPath = path.join(vaultPath, folder);
    if (!fs.existsSync(folderPath)) continue;
    
    const files = fs.readdirSync(folderPath).filter(f => f.endsWith('.md'));
    
    for (const file of files) {
      const filePath = path.join(folderPath, file);
      const content = fs.readFileSync(filePath, 'utf-8');
      const { data: frontmatter } = matter(content);
      
      const relativePath = `${folder}/${file.replace('.md', '')}`;
      const baseName = file.replace('.md', '');
      
      const aliases: string[] = [baseName];
      
      // Add title if different from filename
      if (frontmatter.title && frontmatter.title.toLowerCase() !== baseName.toLowerCase()) {
        aliases.push(frontmatter.title);
      }
      
      // Add explicit aliases
      if (Array.isArray(frontmatter.aliases)) {
        aliases.push(...frontmatter.aliases);
      }
      
      // Register all aliases
      for (const alias of aliases) {
        const key = alias.toLowerCase();
        if (!entries.has(key)) {
          entries.set(key, relativePath);
        }
      }
      
      byPath.set(relativePath, { path: relativePath, aliases });
    }
  }
  
  return { entries, byPath };
}

/**
 * Get all entities sorted by alias length (longest first)
 * This ensures "Justin Dukes" is matched before "Justin"
 */
export function getSortedAliases(index: EntityIndex): Array<{ alias: string; path: string }> {
  const result: Array<{ alias: string; path: string }> = [];
  
  for (const [alias, path] of index.entries) {
    result.push({ alias, path });
  }
  
  // Sort by length descending
  result.sort((a, b) => b.alias.length - a.alias.length);
  
  return result;
}
