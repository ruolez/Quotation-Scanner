# GitHub Setup Instructions

## Step 1: Authenticate GitHub CLI

Open a new terminal and run:

```bash
gh auth login
```

Follow the prompts:
1. Choose "GitHub.com"
2. Choose "HTTPS"
3. Choose "Login with a web browser"
4. Copy the one-time code
5. Press Enter to open browser
6. Paste the code and authorize

## Step 2: Create GitHub Repository

Run the following command to create the repository:

```bash
gh repo create Quotation-Scanner --public --description "Modern web application for scanning and tracking quotation processing with barcode input" --source=. --remote=origin
```

Or manually create it:
1. Go to https://github.com/new
2. Repository name: `Quotation-Scanner`
3. Description: `Modern web application for scanning and tracking quotation processing with barcode input`
4. Choose Public or Private
5. **DO NOT** initialize with README, .gitignore, or license
6. Click "Create repository"

## Step 3: Push to GitHub

If you created manually, add the remote:

```bash
git remote add origin https://github.com/YOUR_USERNAME/Quotation-Scanner.git
```

Then push:

```bash
git branch -M main
git push -u origin main
```

## Step 4: Update README and Installer

After creating the repository, update these files with your GitHub username:

### In README.md:
Replace `YOUR_USERNAME` with your GitHub username in:
- Line 21: `https://raw.githubusercontent.com/YOUR_USERNAME/...`
- Line 28: `git clone https://github.com/YOUR_USERNAME/...`

### In instal.sh:
Replace `YOUR_USERNAME` on line 24:
```bash
REPO_URL="https://github.com/YOUR_USERNAME/Quotation-Scanner.git"
```

### Commit and push changes:

```bash
git add README.md instal.sh
git commit -m "docs: Update repository URLs with GitHub username"
git push
```

## Step 5: Verify Installation

Test the installer on a fresh Ubuntu 24 system:

```bash
curl -fsSL https://raw.githubusercontent.com/YOUR_USERNAME/Quotation-Scanner/main/instal.sh | sudo bash
```

## Repository Created Successfully! 🎉

Your repository is now ready at:
```
https://github.com/YOUR_USERNAME/Quotation-Scanner
```

## Next Steps

1. Add repository topics on GitHub:
   - python
   - flask
   - docker
   - barcode-scanner
   - sql-server
   - material-design
   - ubuntu

2. Consider adding:
   - GitHub Issues templates
   - Pull request template
   - Contributing guidelines
   - License file

3. Set up GitHub Actions (optional):
   - Docker image build
   - Automated testing
   - Security scanning
