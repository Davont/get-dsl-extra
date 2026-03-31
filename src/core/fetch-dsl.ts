/**
 * 核心模块：根据口令获取 DSL 内容
 *
 * TODO: 对接实际的 loadPage 逻辑
 * 原始调用方式: await loadPage({ code, filePath, chromePath })
 */

import { config } from './config'

interface LoadPageParams {
  code: string
  filePath: string
  chromePath: string
}

/**
 * 根据口令获取 DSL
 * @param code 用户输入的口令
 * @returns DSL 内容字符串
 */
export async function fetchDsl(code: string): Promise<string> {
  const params: LoadPageParams = {
    code,
    filePath: config.filePath,
    chromePath: config.chromePath,
  }

  // TODO: 替换为实际的 loadPage 实现
  return loadPage(params)
}

/**
 * 加载页面并获取 DSL
 * TODO: 对接实际逻辑
 */
async function loadPage({ code, filePath, chromePath }: LoadPageParams): Promise<string> {
  console.log('loadPage params:', { code, filePath, chromePath })
  throw new Error('loadPage 尚未实现，请对接实际的 DSL 获取逻辑')
}
