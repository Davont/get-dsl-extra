/**
 * Background Service Worker
 * 处理插件后台任务，如跨域请求、消息转发等
 */

chrome.runtime.onInstalled.addListener(() => {
  console.log('Get DSL Extra 插件已安装')
})

// 监听来自 popup 的消息
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === 'FETCH_DSL') {
    handleFetchDsl(message.code)
      .then((data) => sendResponse({ success: true, data }))
      .catch((err) => sendResponse({ success: false, error: err.message }))
    return true // 异步响应
  }
})

/**
 * 在 Service Worker 中获取 DSL（可用于跨域请求场景）
 * TODO: 对接实际逻辑
 */
async function handleFetchDsl(code: string): Promise<string> {
  console.log('收到口令:', code)
  throw new Error('Service Worker 中的 fetchDsl 尚未实现')
}
