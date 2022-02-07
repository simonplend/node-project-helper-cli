import { resolve } from "node:path";

import minimist from "minimist";
import { fetch } from "undici";
import which from "which";
import { $, chalk, fs, question } from "zx";

export const moduleTypes = ["module", "commonjs"];

export function exitWithError(errorMessage) {
	console.error(chalk.red(errorMessage));
	process.exit(1);
}

/**
 * @see https://www.npmjs.com/package/minimist
 */
export function optionsFromArgv(argv) {
	argv = minimist(argv, {
		string: ["dependencies"],
		boolean: [
			"esm",
			"git",
			"editorconfig",
			"prettier",
			"eslint",
			"lint-staged",
			"readme",
		],
		default: {
			esm: false,
			git: false,
			editorconfig: true,
			prettier: true,
			eslint: true,
			"lint-staged": true,
			readme: true,
		},
	});

	return {
		projectDirectory: argv._[0],
		moduleType: argv.esm ? "module" : "commonjs",
		dependencies: argv.dependencies
			? packagesStringToArray(argv.dependencies)
			: [],
		git: argv.git,
		editorconfig: argv.editorconfig,
		prettier: argv.prettier,
		eslint: argv.eslint,
		lintStaged: argv["lint-staged"],
		readme: argv.readme,
	};
}

export async function checkRequiredProgramsExist(programs) {
	try {
		for (let program of programs) {
			await which(program);
		}
	} catch (error) {
		throw new Error(`Error: Required command ${error.message}`);
	}
}

async function getGlobalGitSettingValue(settingName) {
	$.verbose = false;

	let settingValue = "";
	try {
		settingValue = (
			await $`git config --global --get ${settingName}`
		).stdout.trim();
	} catch (error) {
		// Ignore process output
	}

	$.verbose = true;

	return settingValue;
}

export async function checkGlobalGitSettings(settingsToCheck) {
	for (let settingName of settingsToCheck) {
		const settingValue = await getGlobalGitSettingValue(settingName);
		if (!settingValue) {
			console.warn(
				chalk.yellow(
					`Warning: Global git setting '${settingName}' is not set.`
				)
			);
		}
	}
}

export async function ensureProjectDirectory(projectDirectory) {
	// TODO: Validation should happen elsewhere
	if (!projectDirectory) {
		throw new Error("Error: You must specify the <PROJECT_NAME> argument");
	}

	projectDirectory = resolve(projectDirectory);

	if (!(await fs.pathExists(projectDirectory))) {
		await fs.ensureDir(projectDirectory);

		console.log(
			chalk.green(`Created project directory: ${projectDirectory}`)
		);
	}

	return projectDirectory;
}

/**
 * @see https://github.com/github/gitignore
 */
export async function generateGitIgnore() {
	const response = await fetch(
		"https://raw.githubusercontent.com/github/gitignore/main/Node.gitignore"
	);
	const gitIgnoreContents = await response.text();

	await fs.writeFile(".gitignore", gitIgnoreContents);
}

async function doPromptForModuleType(moduleTypes) {
	// TODO: Change to be 'Use ECMAScript (ES) modules by default?'
	const moduleType = await question(
		`Which Node.js module system do you want to use? (${moduleTypes.join(
			" or "
		)}) `,
		{
			choices: moduleTypes,
		}
	);

	return moduleType;
}

export async function promptForModuleType() {
	const selectedModuleType = await doPromptForModuleType(moduleTypes);

	const isValidModuleType = moduleTypes.includes(selectedModuleType);
	if (!isValidModuleType) {
		console.error(
			chalk.red(
				`Error: Module system must be either '${moduleTypes.join(
					"' or '"
				)}'\n`
			)
		);

		return await promptForModuleType();
	}

	return selectedModuleType;
}

function packagesStringToArray(packages) {
	return packages
		.trim()
		.split(" ")
		.filter((pkg) => pkg);
}

async function promptForPackages() {
	let packagesToInstall = await question(
		"Which npm packages do you want to install? "
	);

	packagesToInstall = packagesStringToArray(packagesToInstall);

	return packagesToInstall;
}

async function identifyInvalidNpmPackages(packages) {
	$.verbose = false;

	let invalidPackages = [];
	for (const pkg of packages) {
		try {
			await $`npm view ${pkg}`;
		} catch (error) {
			invalidPackages.push(pkg);
		}
	}

	$.verbose = true;

	return invalidPackages;
}

export async function getDependenciesToInstall() {
	const packagesToInstall = await promptForPackages();
	const invalidPackages = await identifyInvalidNpmPackages(packagesToInstall);

	const allPackagesExist = invalidPackages.length === 0;
	if (!allPackagesExist) {
		console.error(
			chalk.red(
				`Error: The following packages do not exist on npm: ${invalidPackages.join(
					", "
				)}\n`
			)
		);

		return await getDependenciesToInstall();
	}

	return packagesToInstall;
}

export async function generateReadme({ projectDirectory, projectName }) {
	const readmeContents = `# ${projectName}

...
`;

	await fs.writeFile(`${projectDirectory}/README.md`, readmeContents);
}

export function displayCompletedMessage({ projectName }) {
	console.log(
		chalk.green(
			`\n✔️ The project '${projectName}' has been successfully bootstrapped!\n`
		)
	);
}
