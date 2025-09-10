# SocketNote Versioning Guide

This guide explains how versioning, naming, and release management works for the SocketNote project.

## 🔢 Versioning Strategy

### Semantic Versioning (SemVer)
We use the standard `MAJOR.MINOR.PATCH` format:

- **MAJOR** (1.0.0 → 2.0.0): Breaking changes, incompatible API changes
- **MINOR** (1.0.0 → 1.1.0): New features, backward compatible
- **PATCH** (1.0.0 → 1.0.1): Bug fixes, backward compatible

### Current Version: 1.0.0
The app is currently at version 1.0.0 (initial release).

## 📝 Version Update Examples

### Bug Fixes (PATCH)
```bash
# Fix: File upload timeout issue
# Version: 1.0.0 → 1.0.1

git add .
git commit -m "fix: resolve file upload timeout for large files"
git tag v1.0.1
git push origin main --tags
```

### New Features (MINOR)
```bash
# Feature: Add dark mode
# Version: 1.0.1 → 1.1.0

git add .
git commit -m "feat: add dark mode toggle with system preference detection"
git tag v1.1.0
git push origin main --tags
```

### Breaking Changes (MAJOR)
```bash
# Breaking: Change API endpoints structure
# Version: 1.1.0 → 2.0.0

git add .
git commit -m "BREAKING: restructure API endpoints for better organization"
git tag v2.0.0
git push origin main --tags
```

## 🏷️ Git Tagging Strategy

### Create and Push Tags
```bash
# Create a new tag
git tag v1.0.1

# Push tag to GitHub
git push origin v1.0.1

# Push all tags
git push origin --tags
```

### View Tags
```bash
# List all tags
git tag

# View tag details
git show v1.0.1
```

## 📋 Commit Message Convention

Use **Conventional Commits** for better tracking:

### Format:
```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

### Types:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

### Examples:
```bash
git commit -m "feat(upload): add support for video file uploads"
git commit -m "fix(folders): resolve folder deletion error for nested folders"
git commit -m "docs(readme): update installation instructions"
git commit -m "refactor(api): optimize database queries for better performance"
```

##  Release Workflow

### 1. Development Branch
```bash
# Create feature branch
git checkout -b feature/dark-mode

# Make changes and commit
git add .
git commit -m "feat(ui): add dark mode toggle"

# Push feature branch
git push origin feature/dark-mode
```

### 2. Merge to Main
```bash
# Switch to main
git checkout main

# Merge feature
git merge feature/dark-mode

# Update version in package.json files
# Update version in client/src/App.jsx footer
```

### 3. Create Release
```bash
# Tag the release
git tag v1.1.0

# Push everything
git push origin main --tags
```

## 📦 Package.json Version Updates

### Root package.json
```json
{
  "name": "socketnote",
  "version": "1.1.0",
  "description": "Local network notes sharing app with folder management and file attachments"
}
```

### Client package.json
```json
{
  "name": "socketnote-client",
  "version": "1.1.0"
}
```

### Server package.json
```json
{
  "name": "socketnote-server", 
  "version": "1.1.0"
}
```

## 🎯 GitHub Releases

### Create GitHub Release
1. Go to your repository on GitHub
2. Click "Releases" → "Create a new release"
3. Choose tag: `v1.1.0`
4. Release title: `SocketNote v1.1.0 - Dark Mode Support`
5. Description:
```markdown
## 🎨 New Features
- Added dark mode toggle
- System preference detection
- Improved UI contrast

## 🐛 Bug Fixes
- Fixed folder deletion issue
- Resolved file upload timeout

## 📦 Installation
```bash
git clone https://github.com/Sachinbgithub/SocketNote.git
cd SocketNote
npm run install-all
npm run dev
```
```

## 🔄 Version Update Script

Create a script to automate version updates:

### update-version.sh (Linux/Mac)
```bash
#!/bin/bash
VERSION=$1

# Update package.json files
sed -i "s/\"version\": \".*\"/\"version\": \"$VERSION\"/" package.json
sed -i "s/\"version\": \".*\"/\"version\": \"$VERSION\"/" client/package.json
sed -i "s/\"version\": \".*\"/\"version\": \"$VERSION\"/" server/package.json

# Update App.jsx footer
sed -i "s/v[0-9]\+\.[0-9]\+\.[0-9]\+/v$VERSION/" client/src/App.jsx

echo "Version updated to $VERSION"
```

### update-version.bat (Windows)
```batch
@echo off
set VERSION=%1

REM Update package.json files
powershell -Command "(Get-Content package.json) -replace '\"version\": \".*\"', '\"version\": \"%VERSION%\"' | Set-Content package.json"
powershell -Command "(Get-Content client/package.json) -replace '\"version\": \".*\"', '\"version\": \"%VERSION%\"' | Set-Content client/package.json"
powershell -Command "(Get-Content server/package.json) -replace '\"version\": \".*\"', '\"version\": \"%VERSION%\"' | Set-Content server/package.json"

REM Update App.jsx footer
powershell -Command "(Get-Content client/src/App.jsx) -replace 'v[0-9]+\.[0-9]+\.[0-9]+', 'v%VERSION%' | Set-Content client/src/App.jsx"

echo Version updated to %VERSION%
```

### Usage:
```bash
# Linux/Mac
./update-version.sh 1.1.0

# Windows
update-version.bat 1.1.0
```

## 📈 Version History Example

```
v1.0.0 - Initial release
├── Basic note management
├── Folder organization
├── File uploads
└── Local network sharing

v1.0.1 - Bug fixes
├── Fixed file upload timeout
├── Resolved folder deletion issue
└── Improved error handling

v1.1.0 - New features
├── Added dark mode
├── Enhanced search functionality
└── Improved UI/UX

v1.2.0 - Future features
├── Real-time collaboration
├── User authentication
└── Cloud backup integration
```

## 🚀 Quick Release Checklist

### Before Release:
- [ ] Update version in all package.json files
- [ ] Update version in client/src/App.jsx footer
- [ ] Test all functionality
- [ ] Update CHANGELOG.md
- [ ] Commit all changes

### During Release:
- [ ] Create git tag
- [ ] Push to GitHub
- [ ] Create GitHub release
- [ ] Write release notes

### After Release:
- [ ] Update documentation
- [ ] Notify users (if applicable)
- [ ] Plan next version features

## 📚 Additional Resources

- [Semantic Versioning](https://semver.org/)
- [Conventional Commits](https://www.conventionalcommits.org/)
- [GitHub Releases](https://docs.github.com/en/repositories/releasing-projects-on-github)

---

**Note**: Always test thoroughly before creating a release tag. Once a tag is pushed, it's considered permanent and should not be changed.
```

## ✅ **Versioning Guide Created!**

I've created a comprehensive `VERSIONING_GUIDE.md` file that includes:

-  **Semantic Versioning strategy**
- 📝 **Version update examples**
- 🏷️ **Git tagging workflow**
- 📋 **Commit message conventions**
-  **Release workflow**
- 📦 **Package.json updates**
- 🎯 **GitHub releases**
- 🔄 **Automated version update scripts**
- 📈 **Version history examples**
- 🚀 **Quick release checklist**

This guide will serve as your reference for all future versioning and release management. You can refer to it anytime you need to:
- Update versions
- Create releases
- Follow proper commit conventions
- Manage git tags
- Create GitHub releases

The file is now saved in your project root and ready to use! 🎉
 