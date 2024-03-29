const express = require('express');
const app = express();
const cors = require('cors');
const port = process.env.PORT || 5000;

require('dotenv').config();
const nodemailer = require("nodemailer");
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser')
const moment = require('moment-timezone');
const stripe = require('stripe')(process.env.STRIPE_PAYMENT_SECRET_KEY)
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



//email  ////////////////////////////////////////////////////////

const sendEmail =(emailAddress, emailData)=>{
//create transporter
const transporter =nodemailer.createTransport({
  service:'gmail',
  host:'smtp.gmail.com',
  port:587,
  secure:false,
  auth:{
    user: process.env.USER,
    pass: process.env.PASS
  }
})

transporter.verify((error,success)=>{
  if(error){
    console.log(error);
  }
  else{
    console.log('surver is ready for ee');
  }
})

const mailBody = {
  from: process.env.MAIL,
  to: emailAddress,
  subject: emailData?.subject,
  html: `<p>${emailData?.message}</p>`,
}

transporter.sendMail(mailBody, (error, info) => {
  if (error) {
    console.log(error)
  } else {
    console.log('Email sent: ' + info.response)
  }
})


}










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
const classCollection = client.db("MAPMYFITNESS").collection("classes");
const paymentCollection = client.db("MAPMYFITNESS").collection("payments");
const forumCollection = client.db("MAPMYFITNESS").collection("forum");


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
    if (isExist) {
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
  //send login user info without any client data for js file
  app.get('/user', verifyToken, async (req, res) => {
    const userEmail = req.user.email;
    console.log(userEmail, 'fffff');
    const query = { email: userEmail };
    const result = await userCollection.findOne(query);
    res.send(result);
  })
  //update user login time
  app.put('/user/:email', async (req, res) => {
    const email = req.params.email;
    const isExist = await userCollection.findOne({ email: email })
    if (isExist) {
      const result = await userCollection.updateOne({ email: email }, {
        $set: {
          lastLogin: Date.now()
        }
      });

    }
  }
  )
  // get login user info from userCollection
  app.get('/userInfo/:email', async (req, res) => {
    const email = req.params.email;
    const query = { email: email }

    const user = await userCollection.findOne(query);

    return res.send(user);
  })
  // get all user
  app.get('/getallUser', verifyToken, async (req, res) => {
    const result = await userCollection.find({}).toArray();

    return res.send(result);
  })
  //delete a user
  app.delete('/deleteUser/:email', verifyToken, async (req, res) => {
    const email = req.params.email;
    const query = { email: email }
    const user = await userCollection.deleteOne(query)
    res.send(user);
  })
  // make user admin
  app.put('/makeUserAdmin/:email', async (req, res) => {
    const email = req.params.email;
    const filter = { email: email }
    const updateDoc = { $set: { role: 'admin' } };
    const result = await userCollection.updateOne(filter, updateDoc)
    res.send(result);
  })
  // update user profile  also update trainer profile
  app.put('/user/update/:email', async (req, res) => {
    const email = req.params.email;
    const filter = { email: email }
    const updatedProfile = req.body;
    const updatedName = updatedProfile.userName
    const updatedPhoto = updatedProfile.userPhoto
    const result = await userCollection.updateOne(filter, { $set: { userName: updatedName, userPhoto: updatedPhoto } })
    const updateTrainer = await trainerCollection.updateOne(filter, { $set: { name: updatedName, profileImage: updatedPhoto } })
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

    const result = await blogCollection.findOne(query);
    return res.send(result);
  })
  // add like in blog
  app.put('/like', verifyToken, async (req, res) => {
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
  app.put('/unlike', verifyToken, async (req, res) => {
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
  //get my posted blog
  app.get('/myBlogs/:email', verifyToken, async (req, res) => {
    const email = req.params.email;
    const query = { email: email }
    const result = await blogCollection.find(query).toArray();


    return res.send(result)
  }
  )

  // get blog like count
  app.get('/likeCount/:id', async (req, res) => {
    const id = req.params.id
    const query = { _id: new ObjectId(id) }
    const result = await blogCollection.findOne(query);
    const count = result?.likes?.length;
    return res.send(count?.toString());
  })


  app.get('/checkLike/:id', async (req, res) => {

    const id = req.params.id
    const query = { _id: new ObjectId(id) }
    const result = await blogCollection.findOne(query)
    const email = req.query.email

    const isLiked = result?.likes?.includes(email)
    if (isLiked) {
      return res.send(true)
    }
    return res.send(false)
  })

  //Get blog for home page
  app.get('/homeblog', async (req, res) => {
    const result = await blogCollection.find().sort({ date: -1 }).limit(4).toArray();
    return res.send(result)
  })

  /////////////////////////////////////forum ///////////////////////////////////////////////
  //add forum
  app.post('/addForum', async (req, res) => {
    const forum = req.body
    const result = await forumCollection.insertOne(forum)
    res.send(result)
  })
  // get all forum
  app.get('/forums', async (req, res) => {

    const query = req.query;

    const page = parseInt(query.page);
    const size = parseInt(query.size);

    const forums = await forumCollection.find().sort({ date: -1 })
      .skip(page * size)
      .limit(size)
      .toArray();
    return res.send(forums);
  })
  // get published forum number
  app.get('/forumsCount', async (req, res) => {

    const count = await forumCollection.estimatedDocumentCount()
    return res.send({ count });

  })
  // get single forum
  app.get('/forum/:id', verifyToken, async (req, res) => {
    const id = req.params.id;
    const query = { _id: new ObjectId(id) }

    const result = await forumCollection.findOne(query);
    return res.send(result);
  })
  // add like in forum
  app.put('/forumLike', verifyToken, async (req, res) => {
    const { id, email } = req.body;

    const query = { _id: new ObjectId(id) }
    const option = { upsert: true };
    const forum = await forumCollection.findOne(query);
    const isLiked = forum?.likes?.includes(email);
    if (isLiked) {
      return res.send('already liked');
    }
    const updateDoc = await forumCollection.updateOne(query, { $push: { likes: email } }, option)
    return res.send(updateDoc);
  })
  app.put('/forumUnlike', verifyToken, async (req, res) => {
    const { id, email } = req.body;

    const query = { _id: new ObjectId(id) }
    const option = { upsert: true };
    const forum = await forumCollection.findOne(query);
    const isLiked = forum?.likes?.includes(email);


    if (isLiked) {
      const updateDoc = await forumCollection.updateOne(query, { $pull: { likes: email } }, option)
      return res.send(updateDoc);
    }
    return res.send('already unlike');
  })
  // get forum like count
  app.get('/forumLikeCount/:id', async (req, res) => {
    const id = req.params.id
    const query = { _id: new ObjectId(id) }
    const result = await forumCollection.findOne(query);
    const count = result?.likes?.length;
    return res.send(count?.toString());
  })

  app.get('/checkForumLike/:id', verifyToken, async (req, res) => {
    const id = req.params.id
    const query = { _id: new ObjectId(id) }
    const result = await forumCollection.findOne(query)
    const email = req.query.email

    const isLiked = result?.likes?.includes(email)
    if (isLiked) {
      return res.send(true)
    }
    return res.send(false)
  })


  //NEWSLETTER/////////////////////////////////////////////////////////////////////////////
  //subscribe newsletter 
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
  //get all newsletter subscriber
  app.get('/newsLetterSubscriber', verifyToken, async (req, res) => {
    const result = await newsLetterSubCollection.find().toArray()
    return res.send(result)
  })

  //////////////////////////Trainer related Api//////////////////////////////////////////

  //add trainer


  app.post('/addTrainer', verifyToken, async (req, res) => {
    const trainer = req.body
    isExist = await trainerCollection.findOne({ email: trainer?.email })
    if (isExist) {
      return res.send({ err: true, msg: 'Trainer already exist' })
    }
    const updateUser = await userCollection.updateOne({ email: trainer?.email }, { $set: { trainerStatus: 'pending' } })
    console.log(updateUser);
    const result = await trainerCollection.insertOne(trainer)
    return res.send(result)
  })
  //make an user trainer
  app.put('/makeUserTrainer/:email', verifyToken, async (req, res) => {
    const email = req.params.email
    const currentDateMoment = moment().tz('Asia/Dhaka');
    const updateUser = await userCollection.updateOne({ email: email }, { $set: { trainerStatus: 'verified', } })
    const updateTrainer = await trainerCollection.updateOne({ email: email }, { $set: { trainerStatus: 'verified', trainerFrom: currentDateMoment.format('YYYY-MM-DD') } })
    return res.send(updateUser)
  })
  //reject user application for trainer
  app.put('/rejectTrainer/:email', verifyToken, async (req, res) => {
    const email = req.params.email

    const updateUser = await userCollection.updateOne({ email: email }, { $set: { trainerStatus: 'rejected' } })
    const updateTrainer = await trainerCollection.deleteOne({ email: email })
    return res.send(updateUser)
  })


  // get all pending trainer
  app.get('/getPendingTrainer', async (req, res) => {
    const result = await trainerCollection.find({ trainerStatus: 'pending' }).toArray()
    return res.send(result)
  })

  // get all verified trainer
  app.get('/getVerifiedTrainer', async (req, res) => {
    const result = await trainerCollection.find({ trainerStatus: 'verified' }).toArray()
    return res.send(result)
  })
  // makeTrainerPending 
  app.put('/makeTrainerPending/:email', async (req, res) => {
    const email = req.params.email
    await userCollection.updateOne({ email: email }, { $set: { trainerStatus: 'pending' } })
    const updateUser = await trainerCollection.updateOne({ email: email }, { $set: { trainerStatus: 'pending' } })
    return res.send(updateUser)
  })

  // get trainer for home page
  app.get('/homePageTrainer', async (req, res) => {
    const query = {
      trainerStatus: 'verified'
    }
    const result = await trainerCollection.find(query).limit(4).toArray();
    return res.send(result)
  })
  // get a trainer
  app.get('/getTrainer/:id', async (req, res) => {
    const id = req.params.id

    const query = { _id: new ObjectId(id) }
    const result = await trainerCollection.findOne(query)
    return res.send(result)
  })

  // get login trainer
  app.get('/getLoginTrainer/:email', async (req, res) => {
    const email = req.params.email

    const query = { email: email }
    const result = await trainerCollection.findOne(query)
    return res.send(result)
  })
  //get trainer classes for user
  app.get('/getTrainerClasses/:id', async (req, res) => {
    const id = req.params.id
    console.log(id);
    const query = { _id: new ObjectId(id) }


    const result1 = await trainerCollection.findOne(query)
    const query1 = { trainerEmail: result1?.email }
    const result = await classCollection.find(query1).toArray()

    return res.send(result)
  })
  //get trainer classes trainer dashboard
  app.get('/getMyAddedClasses/:email', async (req, res) => {
    const email = req.params.email
    console.log(email);
    const query = { email: email }


    const result1 = await trainerCollection.findOne(query)
    const query1 = { trainerEmail: result1?.email }
    const result = await classCollection.find(query1).toArray()

    return res.send(result)
  })
  // get joined students in a class
  app.get('/joinedStudents/:id', async (req, res) => {
    const { id } = req.params
    const query = { _id: new ObjectId(id) }
    const result = await classCollection.findOne(query, { projection: { classStudent: 1 } })
    console.log(result?.classStudent);
    return res.send(result?.classStudent)

  })
  // remove join student
  app.patch('/deleteJoinedStudent', async (req, res) => {
    const info = req.body

    const query = { _id: new ObjectId(info.id) }
    const result = await classCollection.updateOne(query, { $pull: { classStudent: info.email } })
    res.send(result)
  })
  // class  /////////////////////////////////////////////////////////////////////////
  //add class 
  app.post('/addClass', async (req, res) => {

    const classInfo = req.body
    const result = await classCollection.insertOne(classInfo)
    return res.send(result)
  })

  //get all classes

  app.get('/getAllClasses', async (req, res) => {
    const result = await classCollection.find({}).toArray()
    return res.send(result)
  })
  //get classes for home page
  app.get('/getHomeClasses', async (req, res) => {
    const result = await classCollection.find({}).limit(6).toArray()
    return res.send(result)
  })
  //get single class by id
  app.get('/getClassInfo/:id', async (req, res) => {
    const id = req.params.id
    const query = { _id: new ObjectId(id) }
    const result = await classCollection.findOne(query)
    return res.send(result)
  })
  // user join classes 
  app.patch('/joinClasses', verifyToken, async (req, res) => {
    const data = req.body

    const { id, email } = req.body;

    const query = { _id: new ObjectId(id) }

    const option = { upsert: true };
    const classData = await classCollection.findOne(query);
    const isJoined = classData?.classStudent?.includes(email);
    if (isJoined) {
      return res.send('already joined in the class');
    }
    const updateDoc = await classCollection.updateOne(query, { $push: { classStudent: email } })
    return res.send(updateDoc);
  })
//get Recommended class
app.get('/recommendedClasses',async(req,res)=>{
  const result =await classCollection.aggregate([
    {
      $match: {
        classPrice: 'free' // Filter classes with status 'free'
      }
    }
    
  ]).limit(3).toArray()
  return res.send(result)
})
  // get user joined classes
  app.get('/userJoinedClasses/:email', async (req, res) => {
    const { email } = req.params
    console.log(email, 'jj');
    const query = { classStudent: { $elemMatch: { $eq: email } } }
    const result = await classCollection.find(query).toArray()

    res.send(result)
  })
  //delete user course by class id and user email
  app.patch('/deleteUserClass', async (req, res) => {
    const { userEmail, classId } = req.body
    const query = { _id: new ObjectId(classId) }
    const result = await classCollection.updateOne(query, { $pull: { classStudent: userEmail } })
    res.send(result)
    console.log(result);
  })



  // payment api .Generate client secret key for stripe
  app.post('/createPaymentIntent', verifyToken, async (req, res) => {
    const { price } = req.body
    const amount = Number(price * 100)
    if (!price || amount < 1) {
      return res.send({ error: 'Please provide a valid amount' })
    }
    const { client_secret } = await stripe.paymentIntents.create({
      amount: amount,
      currency: 'usd',
      payment_method_types: ['card']
    })

    res.send({ clientSecret: client_secret })
  })
  // save payment data 
  app.post('/payment', async (req, res) => {
    const payment = req.body
    const result = await paymentCollection.insertOne(payment)
    //SEND EMAIL
    if (result.insertedId) {
      // To guest
      sendEmail(payment.userEmail, {
        subject: 'Payment Successful!',
        message: ` Your user status is ${payment.packageName} now .Total payment ${payment
        .packagePrice}.Date ${payment.date}. Transaction Id: ${payment.transactionId}`,
      })

    
    return res.send(result)}
  })
  //get all payment users
  app.get('/getAllPaymentUsers', async (req, res) => {
    const result = await paymentCollection.find({}).toArray()
    res.send(result)
  })
  //update user status
  app.patch('/updateUserStatus', async (req, res) => {
    const info = req.body
    const filter = { email: info.userEmail }
    const status = info.packageName
    const options = { upsert: true }
    const updatedDoc = {
      $set: {
        userStatus: status
      }
    }
    const result = await userCollection.updateOne(filter, updatedDoc, options)
    return res.send(result)
  })

  //user states
  app.get('/getUserStates', async (req, res) => {
    const userCounts = await userCollection.aggregate([
      {
        $group: {
          _id: "$userStatus",
          count: { $sum: 1 }
        }
      }
    ]).toArray()
    res.send(userCounts)
  })
  //get newsletter to premium convention
  app.get('/newsToPremium', async (req, res) => {
    const result = await paymentCollection.aggregate([
      {
        $group: {
          _id: "$userEmail",
          count: { $sum: 1 }
        }
      },
      {
        $group: {
          _id: null,
          totalUniquePaymentEmails: { $sum: 1 }
        }
      },
      {
        $project: {
          _id: 0,
          totalUniquePaymentEmails: 1
        }
      }
    ]).toArray()
   
   const result2 = (await newsLetterSubCollection.estimatedDocumentCount()).toLocaleString()
   const result3 = (await userCollection.estimatedDocumentCount()).toLocaleString()
    const data=[{
      PremiumUsers:result[0].totalUniquePaymentEmails,
      NewsLetterSubscribers:result2,
      totalUsers:result3
    }]
    res.send(data)
  })

//get payment data
app.get('/getPaymentProfit',async(req,res)=>{
  const result =await paymentCollection.aggregate([
    {
      $group: {
        _id: '$userEmail',
        totalPrices: { $sum: '$packagePrice' },
        count: { $sum: 1 }
      }
    },
    {
      $group: {
        _id: null,
        totalPrice: { $sum: '$totalPrices' },
        userCountWithMultiplePayments: { $sum: { $cond: { if: { $gt: ['$count', 1] }, then: 1, else: 0 } } },
        uniqueUserCount: { $sum: 1 } // Count of unique users
      }
    },
    {
      $project: {
        _id: 0,
        totalPrice: 1,
        userCountWithMultiplePayments: 1,
        uniqueUserCount: 1
      }
    }
  ]).toArray()
  res.send(result)
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