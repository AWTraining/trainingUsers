const express = require('express')
const app = express()
const port = 3000
const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: 'db-test-tirocinio.comgurfumldw.eu-west-3.rds.amazonaws.com',
  user: 'admin',
  password: 'fdsijfisdjf21',
  database: 'test',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

let bodyParser = require('body-parser');
app.use(bodyParser.json())


app.get('/', (req, res) => {
  res.send('Ciao in get')
})


app.post('/', (req, res) => {
  console.log(req.body)
  if (req.headers['aw-lang'] === 'it') {
    res.send('Ciao in post');
  }
  else {
    res.send('Hello in post');
  }
})

///users/:username GET - Info dell'utente 
app.get('/user/:username', async (req, res) => {
  let username = req.params.username
  let result = await pool.query('SELECT * FROM users WHERE username = \'' + username + '\'')
  console.log(result[0][0])
  let response = result[0][0]
  res.send({
    user: response
  })
})

///users GET - Lista di tutti gli utenti
app.get('/users', async (req, res) => {
  let result = await pool.query('SELECT * FROM users')
  console.log(result[0])
  let response = result[0]
  res.send({
    users: response
  })
})

///users POST - Aggiungere un utente


app.post('/users', async (req, res) => {
  const minimumKeys = ['username', 'email']
  const keys = ['username', 'email', 'name', 'last_name']
  let newUser = req.body
  console.log(newUser)
  // devono esistere almeno tutte le min keys
  let exists = true
  for (key of minimumKeys) {
    if (!req.body.hasOwnProperty(key)) {
      exists = false
    }
  }

  if (!exists) {
    return res.send('missing params', 500)
  }

  let params = {}
  params.username = req.body.username
  params.email = req.body.email

  if (req.body.last_name) params.last_name = req.body.last_name
  if (req.body.name) params.name = req.body.name

  await pool.query('INSERT INTO users SET ?', params)

  res.send({
    newUser: params
  }, 200)
})

///users/:username PUT - Modificare campi dell'utente

app.put('/users/:username', async (req, res) => {
  let currentUser = req.params.username
  let editUser = req.body
  console.log(editUser)
  // devono esistere almeno tutte le min keys
  let params = {}

  if (req.body.last_name) params.last_name = req.body.last_name
  if (req.body.name) params.name = req.body.name
  if (req.body.username) params.username = req.body.username
  if (req.body.email) params.email = req.body.email
  try {
    await pool.query('UPDATE users SET ? WHERE username =\'' + currentUser + '\'', params)
  } catch (error) {
      res.send('missing params', 500)
  }


  res.send("user edited", 200)

})

///tags GET - Lista di tutti i tag (interessi)

app.get('/tags', async (req, res) => {
  let result = await pool.query('SELECT * FROM tags')
  console.log(result[0])
  let response = result[0]
  res.send({
    tags: response
  })
})


///tags POST - Aggiungere un nuovo interesse

app.post('/tags', async (req, res) => {
  let newTag = req.body
  console.log(newTag)
  let result = await pool.query('INSERT INTO tags (tag, descrizione) VALUES (\'' + newTag['tag'] + '\',\'' + newTag['descrizione'] + '\')')
  let response = result
  console.log(response)
  res.send({
    newTag: response
  })


})

///users/:username/tag GET - Lista degli interessi utente

app.get('/users/:username/tag', async (req, res) => {
  let currentUser = req.params.username
  let result = await pool.query('SELECT tags.tag FROM test.users INNER JOIN test.usersTag   ON test.users.id = test.usersTag.userid   INNER JOIN test.tags      ON test.tags.id = test.usersTag.tagid  WHERE users.username = \'' + currentUser + '\'')
  console.log(result[0])
  let response = result[0]
  res.send({
    currentUser, 'tags': response
  })
})

///users/:username/tag/:tagId POST - Aggiungere un tag all'utente

app.post('/users/:username/tag/:tagId', async (req, res) => {
  let currentUser = req.params.username
  let tagId = req.params.tagId
  let currentUserId = await pool.query('SELECT id FROM users WHERE username =\'' + currentUser + '\'')
  let result = await pool.query('INSERT INTO usersTag (userid,tagid) VALUES (\'' + currentUserId[0][0]['id'] + '\',\'' + tagId + '\')')
  let response = result
  console.log(response)
  res.send({
    newTagUser: response
  })

  console.log(currentUser)
  console.log(tagId)
  console.log(currentUserId[0][0]['id'])


})



///users/tag/:tagId GET - Tutti gli utenti con quel tag 

app.get('/users/tag/:tagId', async (req, res) => {
  let currentTag = req.params.tagId
  let currentTagNameQ = await pool.query('SELECT tag FROM tags WHERE id =' + currentTag)
  let result = await pool.query('SELECT test.users.username, test.users.name, test.users.last_name FROM test.users INNER JOIN test.usersTag   ON test.users.id = test.usersTag.userid   INNER JOIN test.tags      ON test.tags.id = test.usersTag.tagid  WHERE test.usersTag.tagid = \'' + currentTag + '\'')
  console.log(result[0])
  let response = result[0]
  let currentTagName = currentTagNameQ[0][0]['tag']
  res.send({
    currentTagName, 'users': response
  })
})

app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`)
})