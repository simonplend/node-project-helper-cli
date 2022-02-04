# bootstrap

> A command line tool for bootstrapping new Node.js projects.

## Features

- Git
	- Checks global git configuration is set
	- Initialises a git repository
	- Adds a Node.js specific `.gitignore` file
	- Commits the bootstrapped project skeleton
- Creates a `package.json` file
	- Configurable module type (CommonJS or ECMAScript modules)
- Installs project specific dependencies
- Code formatting
	- Adds an [EditorConfig](https://editorconfig.org/) (`.editorconfig`) file
	- Installs [Prettier](https://prettier.io/) and integrates it with
	[lint-staged](https://www.npmjs.com/package/lint-staged)
- Code linting with [ESLint](https://eslint.org/)
- Documentation
	- Generates a basic `README.md`

See the [bootstrap CLI tool project](https://github.com/users/simonplend/projects/4/views/1)
for potential feature additions.

## Requirements

- Git
- Node.js, npm and npx
- [Configure npm init defaults](#configure-npm-init-defaults)
- [Add a global git config](#add-a-global-git-config)

## Install

Install globally:

```
npm install -g github:simonplend/bootstrap
```

Or run as a one off:

```bash
npx github:simonplend/bootstrap
```

## Usage

```bash
bootstrap <project_name> [flags]
```

### Options

<dl>
	<dt><code>--esm</code></dt>
	<dd>Project will use ECMAScript (ES) modules by default</dd>
	<dt><code>--dependencies="&lt;package_name&gt; &lt;package_name&gt;"</code></dt>
	<dd>Names of packages to install as dependencies</dd>
</dl>

## Configure npm init defaults

```sh
npm set init-author-name "$YOUR_NAME"
npm set init-author-email "$YOUR_EMAIL_ADDRESS"
npm set init-author-url "$YOUR_WEBSITE"
npm set init-license "MIT"
npm set init-version "1.0.0"
```

## Add a global git config

Add a global configuration for git in your home directory, named `.gitconfig`.

```dosbat
[init]
  defaultBranch = main
[user]
  email = $YOUR_EMAIL_ADDRESS
  name = $YOUR_NAME
[core]
  editor = vim
```
