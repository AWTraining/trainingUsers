const express = require('express')
const app = express()
const port = 3000
const mysql = require('mysql2/promise');
const { v4: uuidv4 } = require('uuid');
const multer = require("multer");
const path = require("path");
const fs = require('fs')
const fastcsv = require("fast-csv");

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

///users/:username GET - Info dell'utente 
app.get('/user/:id', async (req, res) => {
  let userid = req.params.id
  let result = await pool.query('SELECT * FROM users WHERE id = \'' + userid + '\'')
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
  const minimumKeys = ['last_name', 'first_name', 'email']
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
  params.last_name = req.body.last_name
  params.first_name = req.body.first_name
  params.email = req.body.email
  if (req.body.ip_address) params.ip_address = req.body.ip_address
  if (req.body.birthdate) params.birthdate = req.body.birthdate
  if (req.body.gender) params.gender = req.body.gender


  await pool.query('INSERT INTO users SET ?', params)

  res.send({
    newUser: params
  }, 200)
})

///users/:username PUT - Modificare campi dell'utente

app.put('/users/:id', async (req, res) => {
  let currentUserid = req.params.id
  let editUser = req.body
  console.log(editUser)
  // devono esistere almeno tutte le min keys
  let params = {}

  if (req.body.last_name) params.last_name = req.body.last_name
  if (req.body.first_name) params.first_name = req.body.first_name
  if (req.body.ip_address) params.ip_address = req.body.ip_address
  if (req.body.birthdate) params.birthdate = req.body.birthdate
  if (req.body.gender) params.gender = req.body.gender
  if (req.body.email) params.email = req.body.email
  try {
    await pool.query('UPDATE users SET ? WHERE id =\'' + currentUserid + '\'', params)
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

app.get('/users/:id/tag', async (req, res) => {
  let currentUserid = req.params.id
  let result = await pool.query('SELECT tags.tag FROM test.users INNER JOIN test.usersTag   ON test.users.id = test.usersTag.userid   INNER JOIN test.tags      ON test.tags.id = test.usersTag.tagid  WHERE users.id = \'' + currentUserid + '\'')
  console.log(result[0])
  let response = result[0]
  res.send({
    currentUser, 'tags': response
  })
})

///users/:username/tag/:tagId POST - Aggiungere un tag all'utente

app.post('/users/:id/tag/:tagId', async (req, res) => {
  let currentUserId = req.params.id
  let tagId = req.params.tagId
  let result = await pool.query('INSERT INTO usersTag (userid,tagid) VALUES (\'' + currentUserId + '\',\'' + tagId + '\')')
  let response = result
  console.log(response)
  res.send({
    newTagUser: response
  })
})



///users/tag/:tagId GET - Tutti gli utenti con quel tag 

app.get('/users/tag/:tagId', async (req, res) => {
  let currentTag = req.params.tagId
  let currentTagNameQ = await pool.query('SELECT tag FROM tags WHERE id =' + currentTag)
  let result = await pool.query('SELECT test.users.first_name, test.users.last_name FROM test.users INNER JOIN test.usersTag   ON test.users.id = test.usersTag.userid   INNER JOIN test.tags      ON test.tags.id = test.usersTag.tagid  WHERE test.usersTag.tagid = \'' + currentTag + '\'')
  console.log(result[0])
  let response = result[0]
  let currentTagName = currentTagNameQ[0][0]['tag']
  res.send({
    currentTagName, 'users': response
  })
})

//storage
let upload = (destinationPath, fileName, originalname) => {
  let storage = multer.diskStorage({
    destination: destinationPath,
    filename: (req, file, cb) => {
      if (originalname === false) {
        return cb(null, `${fileName}_${path.extname(file.originalname)}`)
      }
      else {
        return cb(null, `${file.originalname}`)
      }
    }
  })
  let uploaded = multer({
    storage
  })
  return uploaded
}

///users/:username/uploadImgProfile PUT - Aggiunge un'immagine profilo ad un utente

app.put("/users/:id/uploadImgProfile", upload('./upload/uploadImgProfile', uuidv4(), false).single('profile'), async (req, res) => {
  let currentUserid = req.params.id


  let oldImgProfileQ = await pool.query(`SELECT img_profile from users WHERE id = "${currentUserid}"`)
  let oldImgProfile = oldImgProfileQ[0][0]['img_profile']
  fs.unlink(`${[[oldImgProfile]]}`, (err) => {
    if (err) {
      console.error(err)
      return
    }
  })

  console.log(oldImgProfile)


  await pool.query(`UPDATE users SET img_profile = "${req.file.destination}/${req.file.filename}" WHERE id = "${currentUserid}"`)

  res.send("Immagine caricata con successo")
})

//csv upload and import
app.post("/uploadcsv", upload('./upload/uploadcsv', "", true).single('csv'), async (req, res) => {


  let stream = fs.createReadStream(`${req.file.destination}/${req.file.filename}`);
  let csvData = []
  let csvStream = fastcsv
    .parse()
    .on("data", (data) => {
      csvData.push(data);
    })
    .on("end", async () => {
      // remove the first line: header
      csvData.shift();

      await pool.query(`CREATE TABLE IF NOT EXISTS test.car_models (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      car_model VARCHAR(45) NULL DEFAULT NULL);`)

      await pool.query(`CREATE TABLE IF NOT EXISTS test.cities (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      city VARCHAR(45) NULL DEFAULT NULL);`)

      await pool.query(`CREATE TABLE IF NOT EXISTS test.countries  (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      country VARCHAR(45) NULL DEFAULT NULL);`)

      await pool.query(`CREATE TABLE IF NOT EXISTS test.users  (
      id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      first_name VARCHAR(255) NOT NULL,
      last_name VARCHAR(255) NOT NULL,
      email VARCHAR(255) NOT NULL,
      ip_address VARCHAR(255) NULL DEFAULT NULL,
      signup_date DATE NULL DEFAULT NULL,
      birthdate DATE NULL DEFAULT NULL,
      gender CHAR(1) NULL DEFAULT NULL,
      imgProfile VARCHAR(255) NULL DEFAULT NULL,
      id_car_model INT NULL DEFAULT NULL,
      id_city INT NULL DEFAULT NULL,
      id_country INT NULL DEFAULT NULL,
      INDEX FK_uses_car_models_idx (id_car_model ASC) VISIBLE,
      INDEX FK_users_cities_idx (id_city ASC) VISIBLE,
      INDEX FK_uses_countries_idx (id_country ASC) VISIBLE,
      CONSTRAINT FK_users_car_models
        FOREIGN KEY (id_car_model)
        REFERENCES test.car_models (id)
        ON DELETE RESTRICT
        ON UPDATE RESTRICT,
      CONSTRAINT FK_users_cities
        FOREIGN KEY (id_city)
        REFERENCES test.cities (id)
        ON DELETE RESTRICT
        ON UPDATE RESTRICT,
      CONSTRAINT FK_uses_countries
        FOREIGN KEY (id_country)
        REFERENCES test.countries (id)
        ON DELETE RESTRICT
        ON UPDATE RESTRICT);`)

      for (let i = 0; i < csvData.length; i++) {

        await pool.query(`INSERT INTO car_models (car_model) 
      SELECT "${csvData[i][5]}" FROM DUAL
      WHERE NOT EXISTS 
      (SELECT car_model FROM car_models WHERE car_model= "${csvData[i][5]}");`)


        await pool.query(`INSERT INTO cities (city) 
      SELECT "${csvData[i][7]}" FROM DUAL
      WHERE NOT EXISTS 
      (SELECT city FROM cities WHERE city = "${csvData[i][7]}");`)

        await pool.query(`INSERT INTO countries (country) 
      SELECT "${csvData[i][8]}" FROM DUAL
      WHERE NOT EXISTS 
      (SELECT country FROM countries WHERE country = "${csvData[i][8]}");`)

        await pool.query(`INSERT INTO users (first_name, last_name, email, ip_address, signup_date, birthdate, gender, id_car_model, id_city, id_country) 
      SELECT "${csvData[i][1]}","${csvData[i][2]}", "${csvData[i][3]}", "${csvData[i][4]}", "${stringToDate(csvData[i][6], "mm/dd/yyyy", "/").toISOString()}", "${stringToDate(csvData[i][9], "mm/dd/yyyy", "/").toISOString()}", "${csvData[i][10]}",
      (SELECT car_models.id FROM car_models WHERE car_models.car_model = "${csvData[i][5]}"), 
      (SELECT cities.id FROM cities WHERE cities.city = "${csvData[i][7]}"),
      (SELECT countries.id FROM countries WHERE countries.country = "${csvData[i][8]}")  FROM DUAL
      WHERE NOT EXISTS 
      (SELECT first_name, last_name, email FROM users WHERE first_name= "${csvData[i][1]}" AND last_name= "${csvData[i][2]}" AND email = "${csvData[i][3]}");`)

        console.log('fatto' + (i + 1))
      }

      console.log('FINITOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOO')

      res.send("CSV caricato con successo")
    })
  stream.pipe(csvStream);
})

function stringToDate(_date, _format, _delimiter) {
  let formatLowerCase = _format.toLowerCase();
  let formatItems = formatLowerCase.split(_delimiter);
  let dateItems = _date.split(_delimiter);
  let monthIndex = formatItems.indexOf("mm");
  let dayIndex = formatItems.indexOf("dd");
  let yearIndex = formatItems.indexOf("yyyy");
  let month = parseInt(dateItems[monthIndex]);
  let formatedDate = new Date(dateItems[yearIndex], month, dateItems[dayIndex]);
  return formatedDate;
}

function errHandler(err, req, res, next) {
  if (err instanceof multer.MulterError) {
    res.json({
      success: 0,
      message: err.message
    })
  }
}
app.use(errHandler);

app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`)
})