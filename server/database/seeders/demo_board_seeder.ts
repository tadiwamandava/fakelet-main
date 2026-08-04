import { BaseSeeder } from '@adonisjs/lucid/seeders'
import User from '#models/user'
import Board from '#models/board'
import Column from '#models/column'
import Group from '#models/group'
import Card from '#models/card'
import env from '#start/env'

/**
 * Sample content for local development / demos: one board with two columns,
 * groups, and a mix of grouped and ungrouped cards. Restricted to dev & test
 * so it never runs against a production database. Idempotent by board title.
 */
export default class extends BaseSeeder {
  static environment = ['development', 'testing']

  async run() {
    const DEMO_TITLE = 'Sample Board: Photosynthesis'

    // Don't duplicate on re-seed.
    const existing = await Board.findBy('title', DEMO_TITLE)
    if (existing) {
      console.log('[seed] Demo board already exists — skipping.')
      return
    }

    const admin = await User.findBy('email', env.get('ADMIN_EMAIL', 'admin@k20center.ou.edu'))
    const createdBy = admin?.id ?? null

    const board = await Board.create({
      title: DEMO_TITLE,
      description: 'A demo board showing columns, groups, and cards.',
      references: ['Campbell Biology, 12th ed.', 'Khan Academy — Photosynthesis'],
      createdBy,
    })

    // Column 1 — grouped cards plus one ungrouped card on the column itself
    const overview = await Column.create({ boardId: board.id, title: 'Overview', position: 0, createdBy })

    const concepts = await Group.create({ columnId: overview.id, title: 'Key Concepts', position: 0, createdBy })
    await Card.createMany([
      {
        groupId: concepts.id,
        title: 'Light-dependent reactions',
        description: 'Occur in the thylakoid membranes; convert light energy into ATP and NADPH.',
        position: 0,
        createdBy,
      },
      {
        groupId: concepts.id,
        title: 'The Calvin cycle',
        description: 'Light-independent reactions that fix CO₂ into glucose using ATP and NADPH.',
        position: 1,
        createdBy,
      },
    ])

    await Card.create({
      columnId: overview.id,
      title: 'Quick summary',
      description: '6CO₂ + 6H₂O + light → C₆H₁₂O₆ + 6O₂',
      position: 0,
      createdBy,
    })

    // Column 2 — a video resource
    const resources = await Column.create({ boardId: board.id, title: 'Resources', position: 1, createdBy })
    const videos = await Group.create({ columnId: resources.id, title: 'Videos', position: 0, createdBy })
    await Card.create({
      groupId: videos.id,
      title: 'Crash Course: Photosynthesis',
      description: 'A 13-minute overview of the process.',
      youtubeUrl: 'https://www.youtube.com/watch?v=sQK3Yr4Sc_k',
      position: 0,
      createdBy,
    })

    console.log(`[seed] Created demo board "${DEMO_TITLE}" with columns, groups, and cards.`)
  }
}
