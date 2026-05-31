const { ObjectId } = require('mongodb')
const { getDb } = require('../adapters/mongo')

const DEFAULT_CARD_SIZE = { width: 192, height: 120 }

const DEFAULT_CARDS = [
  { text: 'Eu tenho sucesso', color: '#D4F268', x: 40, y: 60, fontSize: 16, ...DEFAULT_CARD_SIZE },
  { text: 'Eu sou abundante', color: '#EBC8D6', x: 220, y: 120, fontSize: 18, ...DEFAULT_CARD_SIZE },
  {
    text: 'Eu construo empresas multimilionárias',
    color: '#C4C9D9',
    x: 80,
    y: 240,
    fontSize: 15,
    ...DEFAULT_CARD_SIZE,
  },
]

function formatCard(card) {
  return {
    id: card._id.toString(),
    text: card.text,
    color: card.color,
    x: card.x,
    y: card.y,
    fontSize: card.fontSize,
    width: card.width ?? DEFAULT_CARD_SIZE.width,
    height: card.height ?? DEFAULT_CARD_SIZE.height,
  }
}

async function seedDefaultCards(userId) {
  const db = getDb()
  const count = await db.collection('mural_cards').countDocuments({ userId: new ObjectId(userId) })
  if (count > 0) return

  const docs = DEFAULT_CARDS.map((card) => ({
    userId: new ObjectId(userId),
    ...card,
  }))
  await db.collection('mural_cards').insertMany(docs)
}

async function getMuralCards(userId) {
  await seedDefaultCards(userId)

  const db = getDb()
  const cards = await db
    .collection('mural_cards')
    .find({ userId: new ObjectId(userId) })
    .toArray()

  return cards.map(formatCard)
}

async function createCard(userId, text = 'Nova afirmação') {
  const db = getDb()
  const doc = {
    userId: new ObjectId(userId),
    text,
    color: '#FBFCD4',
    x: 100 + Math.random() * 200,
    y: 80 + Math.random() * 200,
    fontSize: 16,
    width: DEFAULT_CARD_SIZE.width,
    height: DEFAULT_CARD_SIZE.height,
  }

  const result = await db.collection('mural_cards').insertOne(doc)
  return formatCard({ _id: result.insertedId, ...doc })
}

async function updateCard(userId, cardId, updates) {
  const db = getDb()
  const allowed = {}
  if (updates.text !== undefined) allowed.text = updates.text
  if (updates.color !== undefined) allowed.color = updates.color
  if (updates.x !== undefined) allowed.x = updates.x
  if (updates.y !== undefined) allowed.y = updates.y
  if (updates.fontSize !== undefined) allowed.fontSize = updates.fontSize
  if (updates.width !== undefined) allowed.width = updates.width
  if (updates.height !== undefined) allowed.height = updates.height

  const result = await db.collection('mural_cards').findOneAndUpdate(
    { _id: new ObjectId(cardId), userId: new ObjectId(userId) },
    { $set: allowed },
    { returnDocument: 'after' }
  )

  if (!result) {
    const err = new Error('Card não encontrado')
    err.status = 404
    throw err
  }

  return formatCard(result)
}

async function deleteCard(userId, cardId) {
  const db = getDb()
  const result = await db.collection('mural_cards').deleteOne({
    _id: new ObjectId(cardId),
    userId: new ObjectId(userId),
  })

  if (result.deletedCount === 0) {
    const err = new Error('Card não encontrado')
    err.status = 404
    throw err
  }
}

module.exports = { getMuralCards, createCard, updateCard, deleteCard }
