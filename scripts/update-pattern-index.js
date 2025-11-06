#!/usr/bin/env node

/**
 * Script to automatically update patterns/index.json based on pattern files
 * Reads all JSON files in public/patterns/ and generates the index
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const patternsDir = path.join(__dirname, '..', 'public', 'patterns');
const indexPath = path.join(patternsDir, 'index.json');

// Category order for sorting
const categoryOrder = { beginner: 0, intermediate: 1, advanced: 2 };

try {
  // Read all files in patterns directory
  const files = fs.readdirSync(patternsDir);
  
  // Filter for JSON files, excluding index.json
  const patternFiles = files.filter(file => 
    file.endsWith('.json') && file !== 'index.json'
  );
  
  console.log(`Found ${patternFiles.length} pattern files`);
  
  // Read each pattern file and extract metadata
  const patterns = patternFiles.map(filename => {
    const filePath = path.join(patternsDir, filename);
    const content = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    
    return {
      filename,
      category: content.difficulty || 'intermediate',
      name: content.name
    };
  });
  
  // Sort patterns: first by category, then alphabetically by name
  patterns.sort((a, b) => {
    const categoryDiff = categoryOrder[a.category] - categoryOrder[b.category];
    if (categoryDiff !== 0) return categoryDiff;
    return a.name.localeCompare(b.name);
  });
  
  // Create index object
  const index = {
    patterns
  };
  
  // Write index.json
  fs.writeFileSync(indexPath, JSON.stringify(index, null, 2) + '\n');
  
  console.log('✅ Successfully updated index.json');
  console.log(`   - Beginner: ${patterns.filter(p => p.category === 'beginner').length}`);
  console.log(`   - Intermediate: ${patterns.filter(p => p.category === 'intermediate').length}`);
  console.log(`   - Advanced: ${patterns.filter(p => p.category === 'advanced').length}`);
  
} catch (error) {
  console.error('❌ Error updating index.json:', error.message);
  process.exit(1);
}
