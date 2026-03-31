/**
 * 默认配置
 * chromePath / filePath 用于 Puppeteer 调试模式，Chrome 插件模式下不需要
 */

/** macOS 下 Chrome 默认安装路径 */
const DEFAULT_CHROME_PATH =
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'

/** 默认 DSL 导出目录 */
const DEFAULT_FILE_PATH = `${homePath()}/Downloads`

function homePath(): string {
  if (typeof process !== 'undefined' && process.env?.HOME) {
    return process.env.HOME
  }
  return '~'
}

export const config = {
  chromePath: (typeof process !== 'undefined' && process.env?.CHROME_PATH)
    ? process.env.CHROME_PATH
    : DEFAULT_CHROME_PATH,
  filePath: DEFAULT_FILE_PATH,
}
