/**
 * 核心模块：根据口令获取 DSL
 * - 插件环境：通过 chrome.runtime.sendMessage 让 background 在页面中执行脚本
 * - 开发环境（npm run dev）：返回 mock 数据，方便调试 UI
 */

const FETCH_TIMEOUT = 60_000

/** 判断是否在 Chrome 插件环境中 */
function isExtensionContext(): boolean {
  return typeof chrome !== 'undefined' && !!chrome.runtime?.id
}

/** 带超时的 Promise 包装 */
function withTimeout<T>(promise: Promise<T>, ms: number, msg: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) => setTimeout(() => reject(new Error(msg)), ms)),
  ])
}

/** 根据口令获取 DSL */
export async function fetchDsl(code: string): Promise<string> {
  const env = isExtensionContext() ? '插件' : '开发'
  console.log(`[fetchDsl] 环境: ${env}, 口令: ${code}`)

  if (isExtensionContext()) {
    return await withTimeout(
      fetchDslFromExtension(code),
      FETCH_TIMEOUT,
      '获取 DSL 超时（60秒），请检查网络或目标网站是否可访问',
    )
  }
  return await fetchDslMock(code)
}

/** 插件模式：发消息给 background，由它创建隐藏窗口获取 DSL */
async function fetchDslFromExtension(code: string): Promise<string> {
  console.log('[fetchDsl] 发送消息给 background...')

  const response = await chrome.runtime.sendMessage({
    type: 'FETCH_DSL',
    code,
  })

  console.log('[fetchDsl] background 响应:', response)

  if (!response?.success) {
    throw new Error(response?.error || '获取 DSL 失败')
  }

  const data = response.data
  return typeof data === 'string' ? data : JSON.stringify(data)
}

/** 开发调试模式：返回 mock 数据 */
async function fetchDslMock(code: string): Promise<string> {
  console.log('[dev mock] 模拟获取中...')
  await new Promise((r) => setTimeout(r, 1500))

  return JSON.stringify(
    {
      _mock: true,
      code,
      components: [
        { type: 'view', style: { width: 375, height: 812 } },
        { type: 'text', content: '这是 mock DSL 数据' },
      ],
    },
    null,
    2,
  )
}
