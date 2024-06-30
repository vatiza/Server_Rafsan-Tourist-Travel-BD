const express = require("express");
const app = express();
const cors = require("cors");
const port = process.env.PORT || 5000;
require("dotenv").config();
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
//middlewares
app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.ub65wqu.mongodb.net/?appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();
    const carouselCollections = client
      .db("RafsanToursTravelsDB")
      .collection("carousel");
    const placesCollection = client
      .db("RafsanToursTravelsDB")
      .collection("places");

    const testimonialsCollections=client.db("RafsanToursTravelsDB").collection("testimonials");

    app.get("/places", async (req, res) => {
      const result = await placesCollection.find().toArray();
      res.send(result);
    });
    app.get('/places/:id',async(req,res)=>{
      const id=req.params.id;
      console.log(id)
      const query={_id: new ObjectId(id)}
      const result=await placesCollection.findOne(query);
      res.send(result);
    })
app.get("/testimonials",async(req,res)=>{
  const result=await testimonialsCollections.find().toArray();
  res.send(result);
})

    app.get("/carousel", async (req, res) => {
      const result = await carouselCollections.find().toArray();
      res.send(result);
    });

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Rafsan is Running");
});

app.listen(port, () => {
  console.log("Rafsan  is running on port:", port);
});
