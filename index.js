const express = require('express');
const cors = require('cors');
require('dotenv').config();
const jwt = require('jsonwebtoken');
const { MongoClient, ServerApiVersion, MongoRuntimeError } = require('mongodb');
const app = express();
const port = process.env.port || 5000;

app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.uxn8q.mongodb.net/?retryWrites=true&w=majority`;

const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

async function run() {
    try{
        await client.connect();
        const productCollection = client.db('manufacturer-web').collection('products');
        const orderCollection = client.db('manufacturer-web').collection('order');
        const userCollection = client.db('manufacturer-web').collection('users');


        app.get('/product', async(req, res) =>{
            const query = {};
            const cursor = productCollection.find(query);
            const products = await cursor.toArray();
            res.send(products);
        });



        app.get('/order', async(req,res) =>{
          const userEmail = req.query.userEmail;
          const query = {userEmail: userEmail};
          const orders = await orderCollection.find(query).toArray();
          res.send(orders)
        });


        app.post('/order', async(req, res) =>{
          const order = req.body;
          const result = await orderCollection.insertOne(order);
          return res.send({result});
        });


        app.get('/user', async(req, res) => {
          const users =await userCollection.find().toArray();
          res.send(users);
        })

        

        app.put('/user/admin/:email', async (req, res) => {
          const email = req.params.email;
          const filter = { email: email };
          const updateDoc = {$set:{role: 'admin'},};
          const result = await userCollection.updateOne(filter, updateDoc);
          res.send(result);
        })


        app.put('/user/:email', async (req, res) => {
          const email = req.params.email;
          const user = req.body;
          const filter = { email: email };
          const options = { upsert: true };
          const updateDoc = { $set: user, };
          const result = await userCollection.updateOne(filter, updateDoc, options);
          const token = jwt.sign({email:email}, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1hr' })
          res.send({result, token});
        })
    }
    finally{

    }
};

run().catch(console.dir);

app.get('/', (req, res) => {
  res.send('Hello from factory')
})

app.listen(port, () => {
  console.log(`FActory app listening on port ${port}`)
})