#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { syncVersions } = require('./version-sync');
const { packageExtension } = require('./package-extension');

function generateChangelog() {
  try {
    console.log('📝 Generating changelog...');
    
    // Get the last tag
    let lastTag;
    try {
      lastTag = execSync('git describe --tags --abbrev=0 HEAD^', { encoding: 'utf8' }).trim();
    } catch {
      lastTag = null; // First release
    }
    
    // Get commits since last tag
    const gitLogCmd = lastTag 
      ? `git log ${lastTag}..HEAD --pretty=format:"- %s (%h)"`
      : `git log --pretty=format:"- %s (%h)"`;
    
    const commits = execSync(gitLogCmd, { encoding: 'utf8' }).trim();
    
    if (!commits) {
      console.log('⚠️  No commits found for changelog');
      return '';
    }
    
    const changelog = commits
      .split('\n')
      .filter(line => line.trim())
      .filter(line => !line.includes('Merge pull request'))
      .filter(line => !line.includes('SAVEPOINT'))
      .join('\n');
    
    console.log('✅ Changelog generated');
    return changelog;
    
  } catch (error) {
    console.error('❌ Error generating changelog:', error.message);
    return '';
  }
}

function prepareRelease(targetVersion) {
  console.log('🚀 Preparing release...');
  
  try {
    // 1. Sync versions
    console.log('\n1️⃣ Syncing versions...');
    if (targetVersion) {
      process.env.TARGET_VERSION = targetVersion;
    }
    const finalVersion = syncVersions();
    
    // 2. Clean and build
    console.log('\n2️⃣ Building extension...');
    execSync('npm run clean', { stdio: 'inherit' });
    execSync('npm run build', { stdio: 'inherit' });
    
    // 3. Generate changelog
    console.log('\n3️⃣ Generating changelog...');
    const changelog = generateChangelog();
    
    // 4. Package extension
    console.log('\n4️⃣ Packaging extension...');
    const packageName = packageExtension();
    
    // 5. Create release notes
    console.log('\n5️⃣ Creating release notes...');
    const releaseNotes = `# QuickGestures v${finalVersion}

## What's Changed
${changelog || '- Initial release'}

## Installation
1. Download the \`${packageName}\` file
2. Extract the contents
3. Load the extension in Chrome developer mode

## Chrome Web Store
This version will be available on the Chrome Web Store shortly.

---
**Full Changelog**: https://github.com/deneblab/QuickGestures/releases/tag/v${finalVersion}`;

    fs.writeFileSync('RELEASE_NOTES.md', releaseNotes);
    
    console.log('\n✅ Release preparation complete!');
    console.log(`📦 Package: ${packageName}`);
    console.log(`📝 Release notes: RELEASE_NOTES.md`);
    console.log(`🏷️  Version: ${finalVersion}`);
    console.log(`\n🔄 Next steps:`);
    console.log(`   1. Review the package and release notes`);
    console.log(`   2. Create a git tag: git tag v${finalVersion}`);
    console.log(`   3. Push the tag: git push origin v${finalVersion}`);
    console.log(`   4. GitHub Actions will create the release automatically`);
    
  } catch (error) {
    console.error('\n❌ Error preparing release:', error.message);
    process.exit(1);
  }
}

// CLI handling
if (require.main === module) {
  const targetVersion = process.argv[2];
  prepareRelease(targetVersion);
}

module.exports = { prepareRelease, generateChangelog };