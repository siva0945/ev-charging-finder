const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

function copyFolderSync(from, to) {
  if (!fs.existsSync(from)) return;
  if (!fs.existsSync(to)) {
    fs.mkdirSync(to, { recursive: true });
  }
  fs.readdirSync(from).forEach(element => {
    const fromPath = path.join(from, element);
    const toPath = path.join(to, element);
    if (fs.lstatSync(fromPath).isDirectory()) {
      copyFolderSync(fromPath, toPath);
    } else {
      fs.copyFileSync(fromPath, toPath);
    }
  });
}

function build() {
  try {
    console.log('=== Step 1: Installing Frontend Dependencies ===');
    execSync('npm install', { cwd: path.join(__dirname, 'frontend'), stdio: 'inherit' });

    console.log('\n=== Step 2: Building Frontend Bundle (Production) ===');
    process.env.VITE_API_URL = '/api';
    execSync('npm run build', { cwd: path.join(__dirname, 'frontend'), stdio: 'inherit' });

    console.log('\n=== Step 3: Cleaning Backend public/ Directory ===');
    const publicDir = path.join(__dirname, 'backend', 'public');
    if (fs.existsSync(publicDir)) {
      // Use rmSync or rmdirSync based on Node version
      if (fs.rmSync) {
        fs.rmSync(publicDir, { recursive: true, force: true });
      } else {
        fs.rmdirSync(publicDir, { recursive: true });
      }
    }
    fs.mkdirSync(publicDir, { recursive: true });

    console.log('\n=== Step 4: Serving Assets Integration ===');
    copyFolderSync(path.join(__dirname, 'frontend', 'dist'), publicDir);

    console.log('\n✨ Production build completed successfully!');
    console.log('You can now run: npm start --prefix backend');
    console.log('This will start the full-stack app on http://localhost:5000');
  } catch (error) {
    console.error('\n❌ Build process failed:', error.message);
    process.exit(1);
  }
}

build();
