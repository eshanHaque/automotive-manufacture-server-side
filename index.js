const express = require('express');
const cors = require('cors');
require('dotenv').config();
const jwt = require('jsonwebtoken');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.uxn8q.mongodb.net/?retryWrites=true&w=majority`;

const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

function verifyJWT(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).send({ message: 'UnAuthorized access' })
  }
  const token = authHeader.split(' ')[1];
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, function (err, decoded) {
    if (err) {
      return res.status(403).send({ message: 'Forbidden access' })
    }
    req.decoded = decoded;
    next();
  })
}

async function run() {
  try {
    await client.connect();
    const productCollection = client.db('manufacturer-web').collection('products');
    const orderCollection = client.db('manufacturer-web').collection('order');
    const userCollection = client.db('manufacturer-web').collection('users');
    const reviewCollection = client.db('manufacturer-web').collection('review');


    const verifyAdmin = async (req, res, next) => {
      const request = req.decoded.email;
      const requestAcoount = await userCollection.findOne({ email: request });
      if (requestAcoount.role === 'admin') {
        next();
      }
      else {
        res.status(403).send({ message: 'forbidden' });
      }
    }

    app.get('/product', async(req, res) =>{
      const query = {};
      const cursor = productCollection.find(query);
      const products = await cursor.toArray();
      res.send(products);
  });
    app.get('/review', async(req, res) =>{
      const query = {};
      const cursor = reviewCollection.find(query);
      const reviews = await cursor.toArray();
      res.send(reviews);
  });

    app.delete('/product/:name', async(req, res) =>{
      const name = req.params.name;
      const filter = {name: name};
      const result = await productCollection.deleteOne(filter);
      res.send(result);
  });

    app.get('/products', async (req, res) => {
      const query = {};
      const cursor = productCollection.find(query).project({ name: 1 });
      const products = await cursor.toArray();
      res.send(products);
    });

    

    app.post('/product', verifyJWT, verifyAdmin, async (req, res) => {
      const product = req.body;
      const result = await productCollection.insertOne(product);
      res.send(result);
    })


    app.get('/order', verifyJWT, async (req, res) => {
      const userEmail = req.query.userEmail;
      const decodedEmail = req.decoded.email;
      if (userEmail === decodedEmail) {
        const query = { userEmail: userEmail };
        const orders = await orderCollection.find(query).toArray();
        return res.send(orders)
      }
      else {
        return res.status(403).send({ message: 'forbidden access' });
      }
    });
    
    app.get('/order/:id', verifyJWT, async(req, res) =>{
      const id = req.params.id;
      const query = {_id: ObjectId(id)};
      const order = await orderCollection.findOne(query);
      res.send(order);
    });
  
    app.post('/order', async (req, res) => {
      const order = req.body;
      const result = await orderCollection.insertOne(order);
      return res.send({ result });
    });


    app.get('/user', async (req, res) => {
      const users = await userCollection.find().toArray();
      res.send(users);
    })


    app.get('/admin/:email', async (req, res) => {
      const email = req.params.email;
      const user = await userCollection.findOne({ email: email });
      const isAdmin = user.role === 'admin';
      res.send({ admin: isAdmin })
    })

    app.put('/user/admin/:email', verifyJWT, verifyAdmin, async (req, res) => {
      const email = req.params.email;
      const filter = { email: email };
      const updateDoc = { $set: { role: 'admin' }, };
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
      const token = jwt.sign({ email: email }, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1hr' })
      res.send({ result, token });
    })
  }
  finally {

  }
};

run().catch(console.dir);

app.get('/', (req, res) => {
  res.send('Hello from factory')
})

app.listen(port, () => {
  console.log(`FActory app listening on port ${port}`)
})