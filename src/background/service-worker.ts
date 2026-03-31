/**
 * Background Service Worker
 * 接收 popup 消息，在隐藏窗口中打开目标页面并获取 DSL
 */

// TODO: 替换为实际的目标页面地址
const TARGET_URL = 'https://www.example.com/index'

const TAB_LOAD_TIMEOUT = 30_000
const DSL_POLL_INTERVAL = 1_000
const DSL_POLL_MAX_RETRIES = 15

chrome.runtime.onInstalled.addListener(() => {
  console.log('Get DSL Extra 插件已安装')
})

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === 'FETCH_DSL') {
    handleFetchDsl(message.code)
      .then((data) => sendResponse({ success: true, data }))
      .catch((err) => sendResponse({ success: false, error: err.message }))
    return true
  }
})

/** 等待标签页加载完成，先检查当前状态，带超时兜底 */
function waitForTabLoad(tabId: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      chrome.tabs.onUpdated.removeListener(listener)
      reject(new Error('页面加载超时'))
    }, TAB_LOAD_TIMEOUT)

    const done = () => {
      clearTimeout(timer)
      chrome.tabs.onUpdated.removeListener(listener)
      resolve()
    }

    const listener = (id: number, info: { status?: string }) => {
      if (id === tabId && info.status === 'complete') done()
    }

    // 先检查是否已经加载完成，避免竞态
    chrome.tabs.get(tabId, (tab) => {
      if (tab?.status === 'complete') {
        done()
      } else {
        chrome.tabs.onUpdated.addListener(listener)
      }
    })
  })
}

/** 轮询获取 DSL，拿到数据立即返回 */
async function pollForDsl(tabId: number): Promise<unknown> {
  for (let i = 0; i < DSL_POLL_MAX_RETRIES; i++) {
    const results = await chrome.scripting.executeScript({
      target: { tabId },
      world: 'MAIN',
      func: () => {
        return (window as any).__PUPPETEER__EVENT__.getEventMessage({ type: 'getDsl' })
      },
    })

    const data = results?.[0]?.result
    if (data) return data

    await new Promise((r) => setTimeout(r, DSL_POLL_INTERVAL))
  }

  throw new Error('获取 DSL 超时，请稍后重试')
}

/** 创建隐藏窗口 → 加载目标页面 → 获取 DSL → 关闭窗口 */
async function handleFetchDsl(code: string): Promise<unknown> {
  const win = await chrome.windows.create({
    url: TARGET_URL,
    state: 'minimized',
    focused: false,
  })

  const tabId = win?.tabs?.[0]?.id
  const winId = win?.id
  if (!tabId || !winId) throw new Error('创建后台页面失败')

  try {
    await waitForTabLoad(tabId)

    // 通过口令切换页面
    await chrome.scripting.executeScript({
      target: { tabId },
      world: 'MAIN',
      func: (c: string) => {
        return (window as any).__PUPPETEER__EVENT__.changeCode({ code: c })
      },
      args: [code],
    })

    // 轮询获取 DSL，拿到就返回
    return await pollForDsl(tabId)
  } finally {
    chrome.windows.remove(winId)
  }
}
