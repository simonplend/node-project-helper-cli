# bootstrap

> A command line tool for bootstrapping new Node.js projects.

Features are documented under [Options](#options).
Potential feature additions are tracked on
[this project](https://github.com/users/simonplend/projects/4/views/1).

## Requirements

- Git and GitHub CLI (if you want to use the `--git` option)
	- [Add a global git config](#add-a-global-git-config)
- Node.js, npm and npx
	- [Configure npm init defaults](#configure-npm-init-defaults)

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
	<dt><code>--git</code></dt>
	<dd>Create a git repository with a Node.js specific <code>.gitignore</code> and push project skeleton to GitHub.</dd>
	<dt><code>--esm</code></dt>
	<dd>Project will use ECMAScript (ES) modules by default.</dd>
	<dt><code>--editorconfig</code></dt>
	<dd>Generate an <a href="https://editorconfig.org/">EditorConfig</a> file (<code>.editorconfig</code>).</dd>
	<dt><code>--prettier</code></dt>
	<dd>Install <a href="https://prettier.io/">Prettier</a> and add npm run scripts.</dd>
	<dt><code>--eslint</code></dt>
	<dd>Install <a href="https://eslint.org/">ESLint</a>, generate configuration (<code>.eslintrc.json</code>) and add npm run scripts.</dd>
	<dt><code>--lint-staged</code></dt>
	<dd>Install and configure <a href="https://www.npmjs.com/package/lint-staged">lint-staged</a>.</dd>
	<dt><code>--readme</code></dt>
	<dd>Generate a basic README.</dd>
	<dt><code>--dependencies="&lt;package_name&gt; &lt;package_name&gt;"</code></dt>
	<dd>Install packages as project dependencies.</dd>
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
