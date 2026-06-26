const TOOL_ID = 'd97113ef-c6a0-4b61-b0c3-c64c0824de4f'
const DISPLAY_NAME = 'UX writing copilot'
const CONTEXT_KEY = TOOL_ID + ':context'       // legacy single-context (migration only)
const API_KEY_KEY = TOOL_ID + ':apikey'
const AI_CFG_KEY = TOOL_ID + ':aicfg'
const ICON_CFG_KEY = TOOL_ID + ':iconcfg'
const TOK_KEY = TOOL_ID + ':tok'
const SKILLS_KEY = TOOL_ID + ':skills'
const CONTEXTS_KEY = TOOL_ID + ':contexts'
const ACTIVE_CTX_KEY = TOOL_ID + ':active-ctx'
const CHATS_KEY = TOOL_ID + ':chats'
const ACTIVE_CHAT_KEY = TOOL_ID + ':active-chat'

figma.showUI(__html__, { width: 340, height: 520 })
figma.root.setRelaunchData({ [TOOL_ID]: DISPLAY_NAME })

type TextLayerInfo = {
  id: string
  name: string
  characters: string
  contextType: string
  parentName: string
}

function detectContextType(node: TextNode): string {
  const name = node.name.toLowerCase()
  const parentName = (node.parent?.name ?? '').toLowerCase()
  const combined = name + ' ' + parentName
  if (combined.includes('error') || combined.includes('warning')) return 'error-message'
  if (combined.includes('button') || combined.includes('btn')) return 'button'
  if (name.includes('title') || name.includes('headline') || name.includes('heading')) return 'headline'
  if (combined.includes('empty') || combined.includes('zero state')) return 'empty-state'
  if (combined.includes('cta') || combined.includes('call-to-action')) return 'cta'
  if (combined.includes('placeholder')) return 'placeholder'
  if (combined.includes('tooltip')) return 'tooltip'
  if (combined.includes('success') || combined.includes('confirmation')) return 'success-message'
  if (combined.includes('description') || combined.includes('body')) return 'body-text'
  if (combined.includes('helper') || combined.includes('caption')) return 'helper-text'
  if (combined.includes('nav') || combined.includes('menu')) return 'navigation'
  if (combined.includes('notification') || combined.includes('toast') || combined.includes('alert')) return 'notification'
  return 'label'
}

function collectTextNodes(node: SceneNode, results: TextLayerInfo[]): void {
  if (node.type === 'TEXT' && node.characters.trim()) {
    results.push({
      id: node.id,
      name: node.name,
      characters: node.characters,
      contextType: detectContextType(node),
      parentName: node.parent?.name ?? ''
    })
  } else if ('children' in node) {
    for (const child of (node as FrameNode).children) {
      collectTextNodes(child, results)
    }
  }
}

function getSelectionTextNodes(): TextLayerInfo[] {
  const results: TextLayerInfo[] = []
  for (const node of figma.currentPage.selection) {
    collectTextNodes(node, results)
  }
  return results
}

async function loadNodeFonts(node: TextNode): Promise<void> {
  const seen = new Set<string>()
  if (node.fontName !== figma.mixed) {
    seen.add(JSON.stringify(node.fontName))
    try { await figma.loadFontAsync(node.fontName) } catch { /* continue */ }
  }
  const len = node.characters.length
  for (let i = 0; i < len; i++) {
    const fn = node.getRangeFontName(i, i + 1)
    if (fn !== figma.mixed) {
      const key = JSON.stringify(fn)
      if (!seen.has(key)) {
        seen.add(key)
        try { await figma.loadFontAsync(fn as FontName) } catch { /* continue */ }
      }
    }
  }
  await figma.loadFontAsync({ family: 'Inter', style: 'Regular' })
}

figma.on('selectionchange', () => {
  figma.ui.postMessage({ type: 'selection', layers: getSelectionTextNodes() })
})

figma.ui.onmessage = async (msg: { type: string; [key: string]: unknown }) => {
  if (msg.type === 'resize') {
    figma.ui.resize(340, Math.max(60, Math.min(800, Math.round(msg.height as number))))
    return
  }

  if (msg.type === 'init') {
    const [legacyCtx, rawCfg, iconCfg, tok, skills, contexts, activeCtxId, chats, activeChatId] = await Promise.all([
      figma.clientStorage.getAsync(CONTEXT_KEY),
      figma.clientStorage.getAsync(AI_CFG_KEY),
      figma.clientStorage.getAsync(ICON_CFG_KEY),
      figma.clientStorage.getAsync(TOK_KEY),
      figma.clientStorage.getAsync(SKILLS_KEY),
      figma.clientStorage.getAsync(CONTEXTS_KEY),
      figma.clientStorage.getAsync(ACTIVE_CTX_KEY),
      figma.clientStorage.getAsync(CHATS_KEY),
      figma.clientStorage.getAsync(ACTIVE_CHAT_KEY)
    ])
    await figma.clientStorage.deleteAsync(API_KEY_KEY)
    const aiCfg = rawCfg as Record<string, unknown> | null
    if (aiCfg) {
      delete aiCfg.apiKey
      delete aiCfg.apiKeys
    }
    figma.ui.postMessage({
      type: 'init-data',
      legacyContext: legacyCtx ?? null,
      apiKey: '',
      aiCfg: aiCfg ?? null,
      iconCfg: iconCfg ?? null,
      layers: getSelectionTextNodes(),
      tok: tok ?? null,
      skills: skills ?? null,
      contexts: contexts ?? null,
      activeContextId: activeCtxId ?? null,
      chats: chats ?? null,
      activeChatId: activeChatId ?? null
    })
    return
  }

  if (msg.type === 'save-contexts') {
    await figma.clientStorage.setAsync(CONTEXTS_KEY, msg.data)
    figma.ui.postMessage({ type: 'contexts-saved' })
    return
  }

  if (msg.type === 'save-active-ctx') {
    await figma.clientStorage.setAsync(ACTIVE_CTX_KEY, msg.id)
    return
  }

  if (msg.type === 'save-chats') {
    await figma.clientStorage.setAsync(CHATS_KEY, msg.data)
    return
  }

  if (msg.type === 'save-active-chat') {
    await figma.clientStorage.setAsync(ACTIVE_CHAT_KEY, msg.id)
    return
  }

  if (msg.type === 'save-api-key') {
    figma.ui.postMessage({ type: 'api-key-saved' })
    return
  }

  if (msg.type === 'save-ai-cfg') {
    const cfg = msg.data as Record<string, unknown>
    const safe: Record<string, unknown> = {}
    for (const k of Object.keys(cfg)) {
      if (k !== 'apiKeys' && k !== 'apiKey') safe[k] = cfg[k]
    }
    await figma.clientStorage.setAsync(AI_CFG_KEY, safe)
    await figma.clientStorage.deleteAsync(API_KEY_KEY)
    figma.ui.postMessage({ type: 'ai-cfg-saved' })
    return
  }

  if (msg.type === 'save-icon-cfg') {
    await figma.clientStorage.setAsync(ICON_CFG_KEY, msg.data)
    figma.ui.postMessage({ type: 'icon-cfg-saved' })
    return
  }

  if (msg.type === 'save-tok') {
    await figma.clientStorage.setAsync(TOK_KEY, msg.data)
    return
  }

  if (msg.type === 'save-skills') {
    await figma.clientStorage.setAsync(SKILLS_KEY, msg.data)
    figma.ui.postMessage({ type: 'skills-saved' })
    return
  }

  if (msg.type === 'get-selection') {
    figma.ui.postMessage({ type: 'selection', layers: getSelectionTextNodes() })
    return
  }

  if (msg.type === 'get-frame-texts') {
    const results: TextLayerInfo[] = []
    for (const node of figma.currentPage.selection) {
      collectTextNodes(node, results)
    }
    figma.ui.postMessage({ type: 'frame-texts', layers: results })
    return
  }

  if (msg.type === 'update-text') {
    const nodeId = msg.nodeId as string
    const text = String(msg.text ?? '').trim()
    if (!text) {
      figma.ui.postMessage({ type: 'update-error', nodeId: nodeId, error: 'Empty text' })
      return
    }
    const node = await figma.getNodeByIdAsync(nodeId)
    if (node?.type === 'TEXT') {
      try {
        await loadNodeFonts(node)
        node.characters = text
        figma.ui.postMessage({ type: 'update-success', nodeId: nodeId })
      } catch {
        try {
          await figma.loadFontAsync({ family: 'Inter', style: 'Regular' })
          node.fontName = { family: 'Inter', style: 'Regular' }
          node.characters = text
          figma.ui.postMessage({ type: 'update-success', nodeId: nodeId })
        } catch (err2) {
          figma.ui.postMessage({ type: 'update-error', nodeId: nodeId, error: String(err2) })
        }
      }
    } else {
      figma.ui.postMessage({ type: 'update-error', nodeId: nodeId, error: 'Layer not found' })
    }
    return
  }

  if (msg.type === 'update-all-texts') {
    const updates = msg.updates as Array<{ nodeId: string; text: string }>
    let applied = 0
    for (const u of updates) {
      const text = String(u.text ?? '').trim()
      if (!text) continue
      const node = await figma.getNodeByIdAsync(u.nodeId)
      if (node?.type === 'TEXT') {
        try {
          await loadNodeFonts(node)
          node.characters = text
          applied++
        } catch {
          try {
            await figma.loadFontAsync({ family: 'Inter', style: 'Regular' })
            node.fontName = { family: 'Inter', style: 'Regular' }
            node.characters = text
            applied++
          } catch { /* skip */ }
        }
      }
    }
    figma.ui.postMessage({ type: 'all-updated', applied })
    return
  }
}
