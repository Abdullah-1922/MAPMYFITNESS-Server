const express = require('express');
const app = express();
const cors = require('cors');
const port = process.env.PORT || 5000;
require('dotenv').config();
const jwt = require('jsonwebtoken');
app.use(cors());
app.use(express.json());


console.log(process.env.DB_USER);



const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.kdy82ie.mongodb.net/?retryWrites=true&w=majority`;


const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

//collections
const blogCollection = client.db("MAPMYFITNESS").collection("blogs");


async function run() {
  try {

    await client.connect();

    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {

    // await client.close();
  }
}

//jwt related api
app.post('/jwt', async (req, res) => {
  const user = req.body;
  const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' })
  res.send({ token })
})


// middlewares
const verifyToken = (req, res, next) => {
  // console.log('inside verify token', req.headers.authorization);
  if (!req.headers.authorization) {
    return res.status(401).send({ err: true, msg: 'Unauthorized' })
  }
  const token = req.headers.authorization.split(' ')[1]
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    if (err) {
      return res.status(401).send({ err: true, msg: 'Unauthorized' })
    }
    req.decoded = decoded
    next()
  })

}



//Blog
app.post('/blogs',async(req,res)=>{
  try{
    const blog =req.body;
    const result = await blogCollection.insertOne(blog);
    return res.send(result);
  }catch(err){
    return res.send({err:true,msg:err});
  }
})
app.get('/blogs',async(req,res)=>{
  try{
    const blogs = await blogCollection.find().toArray();
    return res.send(blogs);
  }catch(err){
    return res.send({err:true,msg:err});
    }
})








run().catch(console.dir);
app.get('/', (req, res) => {
  res.send('Hello World');
});


app.listen(port, () => {
  console.log(`MAPMYFITNESS is running ${port}`);
})