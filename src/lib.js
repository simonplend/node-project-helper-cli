import * as path from "node:path";
import { fileURLToPath } from "node:url";

import minimist from "minimist";
import mrmCore from "mrm-core";
const { template } = mrmCore;
import { fetch } from "undici";
import which from "which";
import { $, chalk, fs } from "zx";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const configFilepath = path.join(
	process.env.HOME || process.env.USERPROFILE,
	".config/bootstrap.json"
);

export function exitWithError(errorMessage) {
	console.error(chalk.red(errorMessage));
	process.exitCode = 1;
}

export function loadConfig() {
	return fs.existsSync(configFilepath)
		? fs.readJSONSync(configFilepath)
		: null;
}

export function getPresetOptionValue(argv) {
	argv = minimist(argv, {
		string: ["preset"],
		alias: {
			preset: "p",
		},
	});

	return argv.preset ? argv.preset : null;
}

export function combinePresetFlagsWithArgv({ presetName, config, argv }) {
	const preset = getPresetFromConfig({
		presetName,
		config,
	});

	if (typeof preset.extends === "string") {
		const basePreset = getPresetFromConfig({
			presetName: preset.extends,
			config,
		});

		argv = [...basePreset.flags, ...preset.flags, ...argv];
	} else {
		argv = [...preset.flags, ...argv];
	}

	return argv;
}

function getPresetFromConfig({ presetName, config }) {
	const preset = config?.presets[presetName];
	if (typeof preset !== "object") {
		throw new Error(
			`Preset '${presetName}' not defined in ${configFilepath}`
		);
	}

	return preset;
}

/**
 * @see https://www.npmjs.com/package/minimist
 */
export async function optionsFromArgv(argv) {
	argv = minimist(argv, {
		string: ["dependencies", "dev-dependencies"],
		boolean: [
			"git",
			"github",
			"public",
			"esm",
			"editorconfig",
			"prettier",
			"eslint",
			"lint-staged",
			"license",
			"readme",
		],
		default: {
			git: false,
			github: false,
			public: false,
			esm: false,
			editorconfig: false,
			prettier: false,
			eslint: false,
			"lint-staged": false,
			license: false,
			readme: false,
			dependencies: "",
			"dev-dependencies": "",
		},
	});

	const projectName = argv._[0];
	if (!projectName) {
		throw new Error("You must specify the <project_name> argument");
	}

	const options = {
		projectName,
		projectDirectory: path.resolve(projectName),
		git: argv.git,
		github: argv.github,
		public: argv.public,
		moduleType: argv.esm ? "module" : "commonjs",
		dependencies: argv.dependencies
			? packagesStringToArray(argv.dependencies)
			: [],
		devDependencies: argv["dev-dependencies"]
			? packagesStringToArray(argv["dev-dependencies"])
			: [],
		editorconfig: argv.editorconfig,
		prettier: argv.prettier,
		eslint: argv.eslint,
		lintStaged: argv["lint-staged"],
		license: argv.license,
		readme: argv.readme,
	};

	if (options.github && !options.git) {
		throw new Error(`Can't use --github flag without the --git flag.`);
	}

	if (options.public && !options.github) {
		throw new Error(`Can't use --public flag without the --github flag.`);
	}

	if (options.lintStaged) {
		const gitPathStats = fs.statSync(`${options.projectDirectory}/.git`, {
			throwIfNoEntry: false,
		});
		const existingGitRepository =
			gitPathStats && gitPathStats.isDirectory();

		if (!existingGitRepository && !options.git) {
			throw new Error(
				`Can't use --lint-staged flag.\nRequires --git flag or existing directory to contain a git repository.`
			);
		}
	}

	if (options.dependencies.length) {
		console.log(
			chalk.blue(
				`Checking packages in --dependencies exist... (${options.dependencies.join(
					", "
				)})`
			)
		);
		await verifyNpmPackagesExist(options.dependencies);
	}

	if (options.devDependencies.length) {
		console.log(
			chalk.blue(
				`Checking packages in --dev-dependencies exist... (${options.devDependencies.join(
					", "
				)})`
			)
		);
		await verifyNpmPackagesExist(options.devDependencies);
	}

	return options;
}

export async function checkRequiredProgramsExist(programs) {
	try {
		for (let program of programs) {
			await which(program);
		}
	} catch (error) {
		throw new Error(`Required program ${error.message}`);
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

function packagesStringToArray(packages) {
	return packages
		.trim()
		.split(" ")
		.filter((pkg) => pkg);
}

async function identifyInvalidNpmPackages(packages) {
	$.verbose = false;

	let invalidPackages = [];
	// TODO: Run these checks in parallel.
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

export async function verifyNpmPackagesExist(packages) {
	const invalidPackages = await identifyInvalidNpmPackages(packages);

	const allPackagesExist = invalidPackages.length === 0;
	if (!allPackagesExist) {
		throw new Error(
			`The following packages do not exist on npm: ${invalidPackages.join(
				", "
			)}`
		);
	}
}

export async function generateReadme({ projectName, licenseDescription }) {
	const readmeTemplate = path.join(__dirname, `../templates/README.md`);

	template("README.md", readmeTemplate)
		.apply({ projectName, licenseDescription })
		.save();
}

export function displayCompletedMessage({ projectName }) {
	console.log(
		chalk.green(
			`\n✔️ The project '${projectName}' has been successfully bootstrapped!\n`
		)
	);
}
