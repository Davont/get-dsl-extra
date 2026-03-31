/**
 * 核心模块：根据口令获取 DSL 内容
 *
 * TODO: 对接实际的 loadPage 逻辑
 * 原始调用方式: await loadPage({ code, filePath, chromePath })
 */

/**
 * 根据口令获取 DSL
 * @param code 用户输入的口令
 * @returns DSL 内容字符串
 */
export async function fetchDsl(code: string): Promise<string> {
  // TODO: 替换为实际的 API 调用或页面解析逻辑
  // 原始实现使用 Puppeteer 的 loadPage({ code, filePath, chromePath })
  // 在 Chrome 插件中，需要改为 fetch 请求或 content script 注入
  throw new Error('fetchDsl 尚未实现，请对接实际的 DSL 获取逻辑')
}
