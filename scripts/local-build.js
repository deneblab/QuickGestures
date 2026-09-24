#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

function calculateVersion() {
  try {
    // abcversion reads BaseVersion from .abcversion.json and derives the patch from git history
    const version = execSync('abcversion -p semversion', {
      encoding: 'utf8',
      cwd: path.join(__dirname, '..'),
      stdio: ['ignore', 'pipe', 'pipe']
    }).trim();

    if (!version) throw new Error('abcversion returned an empty version');
    return version;
  } catch (error) {
    console.error('❌ Error calculating version:', error.message);
    console.error('   Install abcversion: https://github.com/deneblab/abcversion#installation');
    process.exit(1);
  }
}

function updateVersionFiles(version) {
  try {
    // Update package.json
    const packageJsonPath = path.join(__dirname, '../package.json');
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    packageJson.version = version;
    fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n');
    
    // Update manifest.json
    const manifestJsonPath = path.join(__dirname, '../manifest.json');
    const manifestJson = JSON.parse(fs.readFileSync(manifestJsonPath, 'utf8'));
    manifestJson.version = version;
    fs.writeFileSync(manifestJsonPath, JSON.stringify(manifestJson, null, 2) + '\n');
    
    console.log(`✅ Updated versions to: ${version}`);
    return version;
  } catch (error) {
    console.error('❌ Error updating version files:', error.message);
    process.exit(1);
  }
}

function runBuild() {
  try {
    console.log('🔨 Running build...');
    execSync('npm run build', { stdio: 'inherit', cwd: path.join(__dirname, '..') });
    console.log('✅ Build completed successfully');
  } catch (error) {
    console.error('❌ Build failed:', error.message);
    process.exit(1);
  }
}

function main() {
  console.log('🚀 Starting local build with semver...\n');
  
  // Calculate next version using abcversion
  const newVersion = calculateVersion();
  console.log(`📦 Calculated version: ${newVersion}`);
  
  // Update package.json and manifest.json
  updateVersionFiles(newVersion);
  
  // Run the build process
  runBuild();
  
  console.log('\n🎉 Local build complete!');
  console.log(`📁 Extension ready in ./dist directory`);
  console.log(`📋 Version: ${newVersion}`);
  console.log('\n💡 To test: Load unpacked extension from ./dist in Chrome');
}

if (require.main === module) {
  main();
}