const express = require('express');
const app = express();
const cors = require('cors');
const port = process.env.PORT || 5000;
require('dotenv').config();
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser')

const corsOptions = {
  origin: ['http://localhost:5173', 'http://localhost:5174'],
  credentials: true,
  optionSuccessStatus: 200,
}
app.use(cors(corsOptions))
app.use(express.json());
app.use(cookieParser())



// middlewares
const verifyToken = async (req, res, next) => {
  const token = req.cookies?.token
  
  if (!token) {
    return res.status(401).send({ message: 'unauthorized access' })
  }
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    if (err) {
      console.log(err)
      return res.status(401).send({ message: 'unauthorized access' })
    }
    req.user = decoded
    next()
  })
}
app.post('/jwt', async (req, res) => {
  const user = req.body
  console.log( user)
  const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
    expiresIn: '365d',
  })
 
     res
     .cookie('token', token , {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
    }).send({ success: true })
    
})


// Logout
app.get('/logout', async (req, res) => {
  try {

    res
      .clearCookie('token', {
        maxAge: 0,
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
      })
      .send({ success: true })
    console.log('Logout successful')
  } catch (err) {
    res.status(500).send(err)
  }
})

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
const newsLetterSubCollection = client.db("MAPMYFITNESS").collection("newsletterSub");
const userCollection = client.db("MAPMYFITNESS").collection("users");


async function run() {
  try {

    await client.connect();

    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {

    // await client.close();
  }
}
/////////////////////////////////////////////////
try{


//Save user to mongodb
app.put('/users/:email',async(req,res)=>{
    const user = req.body;
    const options = { upsert: true };
    const isExist = await userCollection.findOne({email:user?.email})
    if(isExist){
    const result = await userCollection.updateOne({email:user?.email},{ $set: {
      lastLogin: Date.now()
    } },options);


        return res.send({message:"User already exist"})
    }
    const result = await userCollection.insertOne(user);
    res.send(result);
})



                       //Blog//



//  add blog 
app.post('/addBlog', verifyToken,async (req, res) => {
 
    const blog = req.body;
    const result = await blogCollection.insertOne(blog);
    return res.send(result);
 
})

 // get all blogs
app.get('/blogs', async (req, res) => {
  
    const query = req.query;

    const page = parseInt(query.page);
    const size = parseInt(query.size);

    const blogs = await blogCollection.find()
      .skip(page * size)
      .limit(size)
      .toArray();
    return res.send(blogs);
 
})
// get published blog number
app.get('/blogsCount', async (req, res) => {
  
    const count = await blogCollection.estimatedDocumentCount()
    return res.send({ count });
 
})
// get single blog
app.get('/blog/:id',async(req,res)=>{
  const id = req.params.id;
  const query = { _id:new ObjectId(id) }
  console.log(query);
  const result = await blogCollection.findOne(query);
  return res.send(result);
})
// add like in blog
app.put('/like',async(req,res)=>{
  const {id,email}=req.body;
  console.log(email,'user in like',id);
  const query = { _id:new ObjectId(id) }
  const option = { upsert: true };
  const blog = await blogCollection.findOne(query);
  const isLiked = blog?.likes?.includes(email);
  if(isLiked){
   return res.send ('already liked');
  }
  const updateDoc=await blogCollection.updateOne(query,{$push:{likes:email}})
  return res.send(updateDoc);
})
app.put('/unlike',async(req,res)=>{
  const {id,email}=req.body;
  console.log(email,'user in like',id);
  const query = { _id:new ObjectId(id) }
  const option = { upsert: true };
  const blog = await blogCollection.findOne(query);
  const isLiked = blog?.likes?.includes(email);
  if(isLiked){
   const updateDoc=await blogCollection.updateOne(query,{$pull:{likes:email}})
  return res.send(updateDoc);
  }
  return res.send ('already unlike');
})
// get blog like count
app.get('/likeCount/:id',async(req,res)=>{
  const id=req.params.id
  console.log(id ,'id in the count');
  const query = { _id: new ObjectId(id) }
  const result = await blogCollection.findOne(query);
 
  const count = result?.likes?.length;
  console.log(result?.likes?.length,'result in the count');
  return res.send(count?.toString());
})

//NEWSLETTER
app.post('/newsLetter', async (req, res) => {
  
    const newsLetterSub = req.body;
    const email = newsLetterSub?.email;
    const result1 = await newsLetterSubCollection.findOne({ email });
    if (!result1) {
      const result = await newsLetterSubCollection.insertOne(newsLetterSub);
      return res.send(result);
    }
    return res.send({ err: true, msg: 'Already Subscribed' });

 
})

}catch(err){
  console.log(err);
}









run().catch(console.dir);
app.get('/', (req, res) => {
  res.send('Hello World');
});


app.listen(port, () => {
  console.log(`MAPMYFITNESS is running ${port}`);
})