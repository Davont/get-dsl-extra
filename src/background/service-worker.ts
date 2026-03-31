/**
 * Background Service Worker
 * 接收 popup 消息，在隐藏窗口中打开目标页面并获取 DSL
 */

const TARGET_URL = 'https://octo.hdesign.huawei.com/developerPreview/mcp/index.html'

const TAB_LOAD_TIMEOUT = 30_000
const API_READY_INTERVAL = 500
const API_READY_MAX_RETRIES = 20
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

/** 等待页面上 __PUPPETEER__EVENT__ 对象就绪 */
async function waitForApiReady(tabId: number): Promise<void> {
  for (let i = 0; i < API_READY_MAX_RETRIES; i++) {
    log(`检查 __PUPPETEER__EVENT__ 是否就绪 (${i + 1}/${API_READY_MAX_RETRIES})...`)
    try {
      const results = await chrome.scripting.executeScript({
        target: { tabId },
        world: 'MAIN',
        func: () => {
          const evt = (window as any).__PUPPETEER__EVENT__
          return {
            exists: !!evt,
            hasChangeCode: typeof evt?.changeCode === 'function',
            hasGetEventMessage: typeof evt?.getEventMessage === 'function',
          }
        },
      })

      const info = results?.[0]?.result
      log('API 状态:', info)

      if (info?.exists && info?.hasChangeCode && info?.hasGetEventMessage) {
        log('__PUPPETEER__EVENT__ 已就绪')
        return
      }
    } catch (err) {
      logError(`检查 API 出错:`, (err as Error).message)
    }

    await new Promise((r) => setTimeout(r, API_READY_INTERVAL))
  }

  throw new Error('页面 API (__PUPPETEER__EVENT__) 未就绪，请确认目标网站是否正常')
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

/** 创建窗口 → 加载目标页面 → 等待 API 就绪 → 获取 DSL → 关闭窗口 */
async function handleFetchDsl(code: string): Promise<unknown> {
  log('开始获取 DSL, 口令:', code)
  log('目标地址:', TARGET_URL)

  log('创建窗口...')
  const win = await chrome.windows.create({
    url: TARGET_URL,
    focused: false,
  })

  const tabId = win?.tabs?.[0]?.id
  const winId = win?.id
  log('窗口 id:', winId, 'tab id:', tabId)

  if (!tabId || !winId) throw new Error('创建后台页面失败')

  try {
    log('等待页面加载...')
    await waitForTabLoad(tabId)

    log('等待 __PUPPETEER__EVENT__ 就绪...')
    await waitForApiReady(tabId)

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
    log('关闭窗口:', winId)
    chrome.windows.remove(winId)
  }
}
