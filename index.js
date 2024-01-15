const express = require('express');
const app = express();
const cors = require('cors');
const port = process.env.PORT || 5000;
require('dotenv').config();
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser')
const moment = require('moment-timezone');
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
  console.log(user)
  const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
    expiresIn: '365d',
  })

  res
    .cookie('token', token, {
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
const trainerCollection = client.db("MAPMYFITNESS").collection("trainers");


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
try {


  //Save user to mongodb
  app.put('/users/:email', async (req, res) => {
    const user = req.body;
    const options = { upsert: true };
    const isExist = await userCollection.findOne({ email: user?.email })
    if (isExist ) {
      const result = await userCollection.updateOne({ email: user?.email }, {
        $set: {
          lastLogin: Date.now()
        }
      }, options);


      return res.send({ message: "User already exist" })
    }

    const result = await userCollection.insertOne(user);
    res.send(result);
  })

// get login user info from userCollection
app.get('/userInfo/:email',verifyToken, async(req,res)=>{
  const email = req.params.email;
  const query = {email: email}
  const user = await userCollection.findOne(query);
  res.send(user);
})
// get all user
app.get('/getallUser',verifyToken,async(req,res)=>{
  const result = await userCollection.find().toArray();
 return res.send(result);
})
//delete a user
app.delete('/deleteUser/:email',verifyToken, async(req,res)=>{
  const email = req.params.email;
  const query = {email: email}
  const user = await userCollection.deleteOne(query)
  res.send(user);
})
// make user admin
app.put('/makeUserAdmin/:email',async(req,res)=>{
  const email = req.params.email;
  const filter = {email: email}
  const updateDoc = { $set: {role: 'admin'} };
  const result = await userCollection.updateOne(filter,updateDoc)
  res.send(result);
})
// update user profile  also update trainer profile
app.put('/user/update/:email',async(req,res)=>{
  const email = req.params.email;
  const filter = {email: email}
  const updatedProfile = req.body;
  const updatedName=updatedProfile.userName
  const updatedPhoto =updatedProfile.userPhoto
 const result = await userCollection.updateOne(filter,{$set:{userName:updatedName,userPhoto:updatedPhoto}})
 const updateTrainer = await trainerCollection.updateOne(filter,{$set:{name:updatedName,profileImage:updatedPhoto}})
 return res.send(updateTrainer)

})


  //Blog//

  //  add blog 
  app.post('/addBlog', verifyToken, async (req, res) => {

    const blog = req.body;
    const result = await blogCollection.insertOne(blog);
    return res.send(result);

  })

  // get all blogs
  app.get('/blogs', async (req, res) => {

    const query = req.query;

    const page = parseInt(query.page);
    const size = parseInt(query.size);

    const blogs = await blogCollection.find().sort({ date: -1 })
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
  app.get('/blog/:id', async (req, res) => {
    const id = req.params.id;
    const query = { _id: new ObjectId(id) }
    console.log(query);
    const result = await blogCollection.findOne(query);
    return res.send(result);
  })
  // add like in blog
  app.put('/like',verifyToken, async (req, res) => {
    const { id, email } = req.body;

    const query = { _id: new ObjectId(id) }
    const option = { upsert: true };
    const blog = await blogCollection.findOne(query);
    const isLiked = blog?.likes?.includes(email);
    if (isLiked) {
      return res.send('already liked');
    }
    const updateDoc = await blogCollection.updateOne(query, { $push: { likes: email } })
    return res.send(updateDoc);
  })
  app.put('/unlike', verifyToken,async (req, res) => {
    const { id, email } = req.body;

    const query = { _id: new ObjectId(id) }
    const option = { upsert: true };
    const blog = await blogCollection.findOne(query);
    const isLiked = blog?.likes?.includes(email);


    if (isLiked) {
      const updateDoc = await blogCollection.updateOne(query, { $pull: { likes: email } })
      return res.send(updateDoc);
    }
    return res.send('already unlike');
  })

  // get blog like count
  app.get('/likeCount/:id', async (req, res) => {
    const id = req.params.id


    const query = { _id: new ObjectId(id) }

    const result = await blogCollection.findOne(query);

    const count = result?.likes?.length;

    return res.send(count?.toString());



  })


  app.get('/checkLike/:id',async(req,res)=>{

    const id=req.params.id
    const query={_id:new ObjectId(id)}
    const result=await blogCollection.findOne(query)
    const email=req.query.email
   
    const isLiked=result?.likes?.includes(email)
    if(isLiked){
      return res.send(true)
    }
    return res.send(false)
  })

  //Get blog for home page
  app.get('/homeblog',async(req,res)=>{
    const result = await blogCollection.find().sort({ date: -1 }).limit(4).toArray();
   return res.send(result)
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

  // Trainer related Api

  //add trainer


  app.post('/addTrainer',verifyToken,async(req,res)=>{
    const trainer=req.body
    isExist =await trainerCollection.findOne({email:trainer?.email})
    if(isExist){
      return res.send({err:true,msg:'Trainer already exist'})}
      const  updateUser = await userCollection.updateOne({email:trainer?.email},{$set:{trainerStatus:'pending'}})
      console.log(updateUser);
    const result=await trainerCollection.insertOne(trainer)
    return res.send(result)
  })
  //make an user trainer
  app.put('/makeUserTrainer/:email',verifyToken,async(req,res)=>{
    const email=req.params.email
    const currentDateMoment = moment().tz('Asia/Dhaka');
    const updateUser = await userCollection.updateOne({email:email},{$set:{trainerStatus:'verified',}})
      const updateTrainer = await trainerCollection.updateOne({email:email},{$set:{trainerStatus:'verified',trainerFrom:currentDateMoment.format('YYYY-MM-DD')}})
    return res.send(updateUser)
  })
  //reject user application for trainer
  app.put('/rejectTrainer/:email',verifyToken,async(req,res)=>{
    const email=req.params.email
    
    const updateUser = await userCollection.updateOne({email:email},{$set:{trainerStatus:'rejected'}})
      const updateTrainer = await trainerCollection.deleteOne({email:email})
    return res.send(updateUser)
  })

 // get all pending trainer
 app.get('/getPendingTrainer',async(req,res)=>{
  const result=await trainerCollection.find({trainerStatus:'pending'}).toArray()
  return res.send(result)
 })
 

 // get all verified trainer
 app.get('/getVerifiedTrainer',async(req,res)=>{
  const result=await trainerCollection.find({trainerStatus:'verified'}).toArray()
  return res.send(result)
 })

 // makeTrainerPending 
 app.put('/makeTrainerPending/:email',async(req,res)=>{
  const email=req.params.email
  
   await userCollection.updateOne({email:email},{$set:{trainerStatus:'pending'}})
  const updateUser = await trainerCollection.updateOne({email:email},{$set:{trainerStatus:'pending'}})
  return res.send(updateUser)
 })

} catch (err) {
  console.log(err);
}









run().catch(console.dir);
app.get('/', (req, res) => {
  res.send('Hello World');
});


app.listen(port, () => {
  console.log(`MAPMYFITNESS is running ${port}`);
})