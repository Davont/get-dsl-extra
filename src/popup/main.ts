/**
 * Popup 主逻辑
 * 用户输入口令 → 点击确定 → 获取 DSL → 下载到本地
 */

import { fetchDsl } from '../core/fetch-dsl'

const codeInput = document.getElementById('codeInput') as HTMLInputElement
const submitBtn = document.getElementById('submitBtn') as HTMLButtonElement
const statusEl = document.getElementById('status') as HTMLDivElement

/** 更新状态提示 */
function setStatus(text: string, type: 'loading' | 'success' | 'error') {
  statusEl.textContent = text
  statusEl.className = `status ${type}`
}

/** 清空状态 */
function clearStatus() {
  statusEl.textContent = ''
  statusEl.className = 'status'
}

/** 触发浏览器下载 */
function downloadFile(content: string, filename: string) {
  const blob = new Blob([content], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

/** 提交口令并下载 DSL */
async function handleSubmit() {
  const code = codeInput.value.trim()
  if (!code) {
    setStatus('请输入口令', 'error')
    return
  }

  console.log('[popup] 提交口令:', code)
  submitBtn.disabled = true
  setStatus('正在获取 DSL...', 'loading')

  try {
    console.log('[popup] 调用 fetchDsl...')
    const dsl = await fetchDsl(code)
    console.log('[popup] 获取成功, 长度:', dsl.length)
    downloadFile(dsl, `dsl-${Date.now()}.json`)
    setStatus('下载成功', 'success')
  } catch (err) {
    const msg = err instanceof Error ? err.message : '未知错误'
    console.error('[popup] 获取失败:', msg)
    setStatus(`获取失败: ${msg}`, 'error')
  } finally {
    submitBtn.disabled = false
  }
}

submitBtn.addEventListener('click', handleSubmit)

// 回车也可以提交
codeInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') handleSubmit()
})
