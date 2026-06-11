import { BaseSeeder } from '@adonisjs/lucid/seeders'
import Board from '#models/board'
import Column from '#models/column'
import Group from '#models/group'
import Card from '#models/card'

export default class extends BaseSeeder {
  async run() {
    await Card.query().delete()
    await Group.query().delete()
    await Column.query().delete()
    await Board.query().delete()

    const board = await Board.create({
      title: 'World History Overview',
      imageUrl: null,
    })

    const ancient = await Column.create({ boardId: board.id, title: 'Ancient World', position: 0 })
    const medieval = await Column.create({ boardId: board.id, title: 'Medieval Period', position: 1 })
    const modern = await Column.create({ boardId: board.id, title: 'Early Modern', position: 2 })

    const meso = await Group.create({ columnId: ancient.id, title: 'Mesopotamia', position: 0 })
    const egypt = await Group.create({ columnId: ancient.id, title: 'Ancient Egypt', position: 1 })
    const crusades = await Group.create({ columnId: medieval.id, title: 'The Crusades', position: 0 })
    const renaissance = await Group.create({ columnId: modern.id, title: 'The Renaissance', position: 0 })

    await Card.createMany([
      {
        groupId: meso.id,
        title: 'The Tigris & Euphrates',
        description: 'The cradle of civilization — earliest known writing, agriculture, and urban life.',
        linkUrl: 'https://en.wikipedia.org/wiki/Mesopotamia',
        linkTitle: 'Wikipedia: Mesopotamia',
        position: 0,
      },
      {
        groupId: meso.id,
        title: 'Code of Hammurabi',
        description: '282 laws inscribed on a stone stele — one of the oldest deciphered writings.',
        youtubeUrl: 'https://www.youtube.com/watch?v=2A0Vxg8sJZQ',
        position: 1,
      },
      {
        groupId: egypt.id,
        title: 'The Pyramid Age',
        description: 'Old Kingdom Egypt, circa 2686–2181 BC. The Great Pyramids at Giza.',
        imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e3/Kheops-Pyramid.jpg/640px-Kheops-Pyramid.jpg',
        position: 0,
      },
      {
        groupId: crusades.id,
        title: 'First Crusade, 1096',
        description: "Pope Urban II's call at Clermont launched a series of religious wars.",
        linkUrl: 'https://en.wikipedia.org/wiki/First_Crusade',
        linkTitle: 'Wikipedia: First Crusade',
        position: 0,
      },
      {
        groupId: renaissance.id,
        title: 'Italian Renaissance',
        description: 'A cultural rebirth beginning in 14th-century Florence.',
        position: 0,
      },
    ])

    console.log(`Seeded board id=${board.id}`)
  }
}
