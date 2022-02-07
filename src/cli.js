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
	generateReadme,
	displayCompletedMessage,
} from "./lib.js";

const requiredPrograms = ["node", "npm", "npx"];

export async function cli(argv) {
	try {
		/**
		 * Parse command line arguments and check dependencies.
		 */

		const options = optionsFromArgv(argv);

		if (options.git) {
			requiredPrograms.push("git", "gh");

			await checkGlobalGitSettings(["user.name", "user.email"]);
		}

		await checkRequiredProgramsExist(requiredPrograms);

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
		 * Initialise a new git repository with a .gitignore file.
		 */

		if (options.git) {
			await $`git init`;
			await generateGitIgnore();
		}

		/**
		 * Generate an EditorConfig file (.editorconfig).
		 *
		 * @see @see https://mrm.js.org/docs/mrm-task-editorconfig
		 */

		if (options.editorconfig) {
			generateEditorConfig({ indent: "tab" });
		}

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
			.set("type", options.moduleType)
			.set("private", true)
			// TODO: set: repository, bugs
			.save();

		/**
		 * Install project dependencies.
		 */

		const haveDependenciesToInstall = options.dependencies.length > 0;
		if (haveDependenciesToInstall) {
			install(options.dependencies, { dev: false });
		}

		/**
		 * Install Prettier and add npm run scripts.
		 */

		if (options.prettier) {
			install("prettier");

			packageJson()
				.setScript(
					"format",
					'prettier --loglevel warn --write "**/*.{js,css,md}"'
				)
				.save();
		}

		/**
		 * Install and add npm run scripts for ESLint.
		 *
		 * Generate ESLint configuration (.eslintrc.json).
		 */

		if (options.eslint) {
			install(["eslint", "eslint-config-prettier", "eslint-plugin-node"]);

			packageJson()
				.setScript("lint", "eslint . --cache --fix")
				.prependScript("pretest", "npm run lint")
				.save();

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
		}

		/**
		 * Install and add npm run scripts for lint-staged.
		 */

		if (
			options.lintStaged &&
			options.git &&
			(options.prettier || options.eslint)
		) {
			installLintStaged({ lintStagedRules: {} });
		}

		const projectPackageJson = packageJson().get();

		/**
		 * Generate a basic README.
		 */

		if (options.readme) {
			await generateReadme({
				projectDirectory,
				projectName: projectPackageJson.name,
			});
		}

		/**
		 * Commit the project skeleton to git.
		 */

		if (options.git) {
			await $`git add .`;
			await $`git commit -m "Add project skeleton"`;
		}

		/**
		 * Create new GitHub repository from local repository.
		 */

		if (options.git) {
			await $`gh repo create ${projectPackageJson.name} --private --source=. --remote=origin --push`;
		}

		/**
		 * Provide user with next steps.
		 */

		displayCompletedMessage({ projectName: projectPackageJson.name });
	} catch (error) {
		exitWithError(error.message);
	}
}
