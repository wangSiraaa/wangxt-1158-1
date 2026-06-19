import { Router, type Request, type Response } from 'express'
import { readStore, writeStore, genId } from '../database.js'
import type { Section } from '../../shared/types.js'

const router = Router()

router.get('/', async (_req: Request, res: Response): Promise<void> => {
  try {
    const store = readStore()
    res.json({ success: true, data: store.sections })
  } catch (error) {
    res.status(500).json({ success: false, error: '获取断面列表失败' })
  }
})

router.get('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const store = readStore()
    const section = store.sections.find((s: Section) => s.id === req.params.id)
    if (!section) {
      res.status(404).json({ success: false, error: '断面不存在' })
      return
    }
    res.json({ success: true, data: section })
  } catch (error) {
    res.status(500).json({ success: false, error: '获取断面详情失败' })
  }
})

router.post('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, code } = req.body
    if (!name || !code) {
      res.status(400).json({ success: false, error: '断面名称和编码不能为空' })
      return
    }
    const store = readStore()
    const existing = store.sections.find((s: Section) => s.code === code)
    if (existing) {
      res.status(400).json({ success: false, error: '断面编码已存在' })
      return
    }
    const section: Section = {
      id: genId(),
      name,
      code,
      createdAt: new Date().toISOString(),
    }
    store.sections.push(section)
    writeStore(store)
    res.status(201).json({ success: true, data: section })
  } catch (error) {
    res.status(500).json({ success: false, error: '创建断面失败' })
  }
})

export default router
