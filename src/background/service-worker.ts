/**
 * Background Service Worker
 * 接收 popup 消息，在隐藏窗口中打开目标页面并获取 DSL
 */

// TODO: 替换为实际的目标页面地址
const TARGET_URL = 'https://octo.hdesign.huawei.com/developerPreview/mcp/index.html'

const TAB_LOAD_TIMEOUT = 30_000
const DSL_POLL_INTERVAL = 1_000
const DSL_POLL_MAX_RETRIES = 15

const log = (...args: unknown[]) => console.log('[SW]', ...args)
const logError = (...args: unknown[]) => console.error('[SW]', ...args)

chrome.runtime.onInstalled.addListener(() => {
  log('插件已安装')
})

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  log('收到消息:', message)
  if (message.type === 'FETCH_DSL') {
    handleFetchDsl(message.code)
      .then((data) => {
        log('获取成功，数据类型:', typeof data)
        sendResponse({ success: true, data })
      })
      .catch((err) => {
        logError('获取失败:', err.message)
        sendResponse({ success: false, error: err.message })
      })
    return true
  }
})

/** 等待标签页加载完成，先检查当前状态，带超时兜底 */
function waitForTabLoad(tabId: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      chrome.tabs.onUpdated.removeListener(listener)
      logError('页面加载超时 (30s)')
      reject(new Error('页面加载超时'))
    }, TAB_LOAD_TIMEOUT)

    const done = () => {
      clearTimeout(timer)
      chrome.tabs.onUpdated.removeListener(listener)
      log('页面加载完成')
      resolve()
    }

    const listener = (id: number, info: { status?: string }) => {
      if (id === tabId) {
        log('tab 状态变化:', info.status)
        if (info.status === 'complete') done()
      }
    }

    chrome.tabs.get(tabId, (tab) => {
      log('tab 当前状态:', tab?.status)
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
    log(`轮询 DSL 第 ${i + 1}/${DSL_POLL_MAX_RETRIES} 次...`)
    try {
      const results = await chrome.scripting.executeScript({
        target: { tabId },
        world: 'MAIN',
        func: () => {
          return (window as any).__PUPPETEER__EVENT__.getEventMessage({ type: 'getDsl' })
        },
      })

      const data = results?.[0]?.result
      log(`轮询结果:`, data ? '有数据' : '无数据', typeof data)
      if (data) return data
    } catch (err) {
      logError(`轮询第 ${i + 1} 次出错:`, (err as Error).message)
    }

    await new Promise((r) => setTimeout(r, DSL_POLL_INTERVAL))
  }

  throw new Error('获取 DSL 超时，请稍后重试')
}

/** 创建隐藏窗口 → 加载目标页面 → 获取 DSL → 关闭窗口 */
async function handleFetchDsl(code: string): Promise<unknown> {
  log('开始获取 DSL, 口令:', code)
  log('目标地址:', TARGET_URL)

  log('创建隐藏窗口...')
  const win = await chrome.windows.create({
    url: TARGET_URL,
    state: 'minimized',
    focused: false,
  })

  const tabId = win?.tabs?.[0]?.id
  const winId = win?.id
  log('窗口 id:', winId, 'tab id:', tabId)

  if (!tabId || !winId) throw new Error('创建后台页面失败')

  try {
    log('等待页面加载...')
    await waitForTabLoad(tabId)

    log('执行 changeCode...')
    await chrome.scripting.executeScript({
      target: { tabId },
      world: 'MAIN',
      func: (c: string) => {
        console.log('[inject] changeCode, code:', c)
        return (window as any).__PUPPETEER__EVENT__.changeCode({ code: c })
      },
      args: [code],
    })
    log('changeCode 执行完成')

    log('开始轮询 DSL...')
    const data = await pollForDsl(tabId)
    log('DSL 获取成功')
    return data
  } catch (err) {
    logError('handleFetchDsl 出错:', (err as Error).message)
    throw err
  } finally {
    log('关闭隐藏窗口:', winId)
    chrome.windows.remove(winId)
  }
}
