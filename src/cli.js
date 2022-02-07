import mrmCore from "mrm-core";
const { install, json, packageJson } = mrmCore;
import generateEditorConfig from "mrm-task-editorconfig";
import generateLicenseFile from "mrm-task-license";
import installLintStaged from "mrm-task-lint-staged";
import { $, cd } from "zx";

import {
	exitWithError,
	loadConfig,
	getPresetOptionValue,
	combinePresetFlagsWithArgv,
	optionsFromArgv,
	checkRequiredProgramsExist,
	checkGlobalGitSettings,
	ensureProjectDirectory,
	generateGitIgnore,
	generateReadme,
	displayCompletedMessage,
} from "./lib.js";

const requiredPrograms = ["node", "npm", "npx"];

export async function cli(argv) {
	try {
		/**
		 * Handle config, presets and command line arguments.
		 */

		const config = loadConfig();

		const presetOptionValue = getPresetOptionValue(argv);
		if (presetOptionValue) {
			argv = combinePresetFlagsWithArgv({
				presetName: presetOptionValue,
				config,
				argv,
			});
		}

		const options = await optionsFromArgv(argv);

		/**
		 * Check for programs and settings.
		 */

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
		 * Generate package.json file if one doesn't already exist.
		 *
		 * Currently optimised for a Node.js application.
		 */

		if (!packageJson().exists()) {
			await $`npm init --yes`;

			packageJson()
				.unset("version")
				.unset("description")
				.unset("main")
				.unset("keywords")
				.set("type", options.moduleType)
				.set("private", true)
				.save();
		}

		/**
		 * Install project dependencies.
		 */

		const haveDependenciesToInstall = options.dependencies.length > 0;
		if (haveDependenciesToInstall) {
			install(options.dependencies, { dev: false });
		}

		/**
		 * Install project development dependencies.
		 */

		const haveDevDependenciesToInstall = options.devDependencies.length > 0;
		if (haveDevDependenciesToInstall) {
			install(options.devDependencies, { dev: true });
		}

		/**
		 * Install Prettier and add npm run scripts.
		 */

		if (options.prettier) {
			install("prettier", { dev: true });

			packageJson()
				.setScript(
					"format",
					'prettier --loglevel warn --write "**/*.{js,css,md}"'
				)
				.save();
		}

		/**
		 * Install ESLint, generate configuration (.eslintrc.json)
		 * and add npm run scripts.
		 */

		if (options.eslint) {
			const eslintDependencies = ["eslint", "eslint-plugin-node"];
			const extendsPresets = [
				"eslint:recommended",
				"plugin:node/recommended",
			];

			if (options.prettier) {
				eslintDependencies.push("eslint-config-prettier");
				extendsPresets.push("prettier");
			}

			install(eslintDependencies, { dev: true });

			packageJson()
				.setScript("lint", "eslint . --cache --fix")
				.prependScript("pretest", "npm run lint")
				.save();

			json(".eslintrc.json")
				.set("extends", extendsPresets)
				// TODO: What should ecmaVersion be?
				// eslintrc.set("parserOptions", {
				// 	ecmaVersion: 2021,
				// });
				.save();
		}

		/**
		 * Install and configure lint-staged.
		 */

		if (options.lintStaged) {
			installLintStaged({ lintStagedRules: {} });
		}

		const projectPackageJson = packageJson().get();

		/**
		 * Generate a license file.
		 */

		if (options.license) {
			const params = generateLicenseFile.parameters;

			generateLicenseFile({
				license: params.license.default(),
				licenseFile: "LICENSE.md",
				name: params.name.default(),
				email: params.email.default,
			});
		}

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
		 *
		 * @see https://cli.github.com/manual/gh_repo_create
		 */

		if (options.github) {
			const visibilityFlag = options.public ? "--public" : "--private";

			await $`gh repo create ${projectPackageJson.name} ${visibilityFlag} --source=. --remote=origin --push`;

			// TODO: set fields in package.json: repository, bugs
		}

		/**
		 * Completed.
		 */

		displayCompletedMessage({ projectName: projectPackageJson.name });
	} catch (error) {
		return exitWithError(`Error: ${error.message}`);
	}
}
