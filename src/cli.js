import mrmCore from "mrm-core";
const { install, json, packageJson } = mrmCore;
import generateEditorConfig from "mrm-task-editorconfig";
import installLintStaged from "mrm-task-lint-staged";
import { $, cd } from "zx";

import {
	exitWithError,
	checkRequiredProgramsExist,
	checkGlobalGitSettings,
	optionsFromArgv,
	ensureProjectDirectory,
	generateGitIgnore,
	promptForModuleType,
	packagesStringToArray,
	getDependenciesToInstall,
	generateReadme,
	displayCompletedMessage,
} from "./lib.js";

const choices = {
	moduleType: "commonjs",
	dependencies: [],
};

export async function cli({ argv }) {
	try {
		await checkRequiredProgramsExist(["git", "node", "npm", "npx"]);
		await checkGlobalGitSettings(["user.name", "user.email"]);

		/**
		 * Collect user choices.
		 */

		const options = optionsFromArgv(argv);

		console.log({ options });

		choices.moduleType =
			options.moduleType || (await promptForModuleType());

		choices.dependencies = options.dependencies
			? packagesStringToArray(options.dependencies)
			: await getDependenciesToInstall();

		/**
		 * Ensure project directory exists.
		 */

		const projectDirectory = await ensureProjectDirectory(
			options.projectDirectory
		);

		/**
		 * Change to project directory.
		 */

		cd(projectDirectory);

		/**
		 * Initialise a new git repository.
		 */

		await $`git init`;

		/**
		 * Add a .gitignore file.
		 *
		 * @see https://github.com/github/gitignore
		 */

		await generateGitIgnore();

		/**
		 * Generate EditorConfig (.editorconfig).
		 *
		 * @see https://mrm.js.org/docs/mrm-task-editorconfig
		 */

		generateEditorConfig({ indent: "tab" });

		/**
		 * Generate a package.json file.
		 *
		 * Currently optimised for a Node.js application.
		 */

		await $`npm init --yes`;

		packageJson()
			.unset("version")
			.unset("description")
			.unset("main")
			.unset("keywords")
			.set("type", choices.moduleType)
			.set("private", true)
			// TODO: set: repository, bugs
			.save();

		/**
		 * Install project dependencies.
		 */
		const haveDependenciesToInstall = choices.dependencies.length > 0;
		if (haveDependenciesToInstall) {
			install(choices.dependencies, { dev: false });
		}

		/**
		 * Install Prettier and add npm run scripts.
		 */

		install("prettier");

		packageJson()
			.setScript(
				"format",
				'prettier --loglevel warn --write "**/*.{js,css,md}"'
			)
			.save();

		/**
		 * Install and add npm run scripts for ESLint.
		 */

		install(["eslint", "eslint-config-prettier", "eslint-plugin-node"]);

		packageJson()
			.setScript("lint", "eslint . --cache --fix")
			.prependScript("pretest", "npm run lint")
			.save();

		/**
		 * Generate ESLint configuration (.eslintrc.json).
		 */

		json(".eslintrc.json")
			.set("extends", [
				"eslint:recommended",
				"plugin:node/recommended",
				"prettier",
			])
			// TODO: What should ecmaVersion be?
			// eslintrc.set("parserOptions", {
			// 	ecmaVersion: 2021,
			// });
			.save();

		/**
		 * Install and add npm run scripts for lint-staged.
		 */

		installLintStaged({ lintStagedRules: {} });

		const projectPackageJson = packageJson().get();

		/**
		 * Generate a basic README.
		 */
		await generateReadme({
			projectDirectory,
			projectName: projectPackageJson.name,
		});

		/**
		 * Commit the project skeleton to git.
		 */

		await $`git add .`;
		await $`git commit -m "Add project skeleton"`;

		/**
		 * Provide user with next steps.
		 */

		displayCompletedMessage({ projectName: projectPackageJson.name });
	} catch (error) {
		exitWithError(error.message);
	}
}
