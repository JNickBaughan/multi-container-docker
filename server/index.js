const keys = require('./keys');

// Express App Setup
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');

const app = express();
const middlewares = [
    cors(),
    bodyParser.json()
]
app.use(...middlewares)

const { Pool } = require('pg');
const pgClient = new Pool({
    user: keys.pgUser,
    host: keys.pgHost,
    database: keys.pgDatabase,
    password: keys.pgPassword,
    port: keys.pgPort
})
pgClient.on('error', () => {
    console.log('lost connections to postGres')
})

pgClient.query('CREATE TABLE IF NOT EXISTS values (number INT)')
.catch(err => {
    console.log(err)
})

// Redis Client Setup
const redis = require('redis');
const redisClient = redis.createClient({
    host: keys.redisHost,
    port: keys.redisPort,
    retry_strategy: () => 1000
});

const redisPublisher = redisClient.duplicate();

// express route handlers 
app.get('/', (req, res) => {
    res.send('test');
})

app.get('/values/all', async (req, res) => {
    const values = await pgClient.query('SELECT * FROM values');
    res.send(values.rows)
})

app.get('/values/current', async (req, res) => {
    redisClient.hgetall('values', (err, values) => {
        res.send(values);
    })
})

app.post('/values', async (req, res) => {
    const index = req.body.index;
    if(parseInt(index) > 40) {
        res.status(422).send('index too high');
    }
    redisClient.hset('values', index, "Nothing yet!");
    redisPublisher.publish('insert', index);
    pgClient.query('INSERT INTO values(number) VALUES($1)', [index]);
    res.send({ working: true})
})

app.listen(5000, err => {
    if(err){
        console.log(err)
    }else{
        console.log('listening on PORT: 5000')
    }

})