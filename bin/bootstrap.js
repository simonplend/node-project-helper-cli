#! /usr/bin/env node

import { argv } from "zx";

import { cli } from "../src/cli.js";

await cli({ argv });
