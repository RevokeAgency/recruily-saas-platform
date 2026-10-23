import { Config } from "@remotion/cli/config"

import { webpackOverride } from "./webpack-override.cjs"

Config.setEntryPoint("src/index.ts")
Config.setVideoImageFormat("jpeg")
Config.setJpegQuality(95)
Config.setCodec("h264")
Config.setCrf(16)
Config.setOverwriteOutput(true)
Config.overrideWebpackConfig(webpackOverride)
